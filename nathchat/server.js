const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const path = require('path');
const initSqlJs = require('sql.js');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = 3002;
const JWT_SECRET = 'nathbank_secret_key'; // même secret que NathBank
const DB_PATH = path.join(__dirname, 'nathchat.db');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── BASE DE DONNÉES ────────────────────────────────────────────────────────

let db;

async function initDB() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'public',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS room_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(room_id, user_id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS reactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    emoji TEXT NOT NULL,
    UNIQUE(message_id, user_id, emoji),
    FOREIGN KEY (message_id) REFERENCES messages(id)
  )`);

  // Salons par défaut
  const existing = db.exec("SELECT COUNT(*) as c FROM rooms");
  const count = existing[0].values[0][0];
  if (count === 0) {
    db.run("INSERT INTO rooms (name, type) VALUES ('général', 'public')");
    db.run("INSERT INTO rooms (name, type) VALUES ('random', 'public')");
    db.run("INSERT INTO rooms (name, type) VALUES ('nathbank', 'public')");
  }

  saveDB();
  console.log('✅ Base de données NathChat initialisée');
}

function saveDB() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// ─── UTILS DB ───────────────────────────────────────────────────────────────

function getRooms() {
  const res = db.exec("SELECT * FROM rooms ORDER BY id ASC");
  if (!res.length) return [];
  return res[0].values.map(r => ({ id: r[0], name: r[1], type: r[2], created_at: r[3] }));
}

function getMessages(roomId, limit = 50) {
  const res = db.exec(`SELECT * FROM messages WHERE room_id = ${roomId} ORDER BY created_at ASC LIMIT ${limit}`);
  if (!res.length) return [];
  return res[0].values.map(m => ({
    id: m[0], room_id: m[1], user_id: m[2], username: m[3],
    content: m[4], created_at: m[5]
  }));
}

function insertMessage(roomId, userId, username, content) {
  db.run(
    "INSERT INTO messages (room_id, user_id, username, content) VALUES (?, ?, ?, ?)",
    [roomId, userId, username, content]
  );
  saveDB();
  const res = db.exec("SELECT last_insert_rowid() as id");
  const id = res[0].values[0][0];
  const msg = db.exec(`SELECT * FROM messages WHERE id = ${id}`);
  const m = msg[0].values[0];
  return { id: m[0], room_id: m[1], user_id: m[2], username: m[3], content: m[4], created_at: m[5] };
}

function toggleReaction(messageId, userId, emoji) {
  const exists = db.exec(
    `SELECT id FROM reactions WHERE message_id = ${messageId} AND user_id = '${userId}' AND emoji = '${emoji}'`
  );
  if (exists.length && exists[0].values.length) {
    db.run(`DELETE FROM reactions WHERE message_id = ${messageId} AND user_id = '${userId}' AND emoji = '${emoji}'`);
    saveDB();
    return false;
  } else {
    db.run("INSERT INTO reactions (message_id, user_id, emoji) VALUES (?, ?, ?)", [messageId, userId, emoji]);
    saveDB();
    return true;
  }
}

function getReactions(messageId) {
  const res = db.exec(`SELECT emoji, COUNT(*) as count FROM reactions WHERE message_id = ${messageId} GROUP BY emoji`);
  if (!res.length) return [];
  return res[0].values.map(r => ({ emoji: r[0], count: r[1] }));
}

// ─── VÉRIFICATION JWT ───────────────────────────────────────────────────────

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// ─── ROUTES API ─────────────────────────────────────────────────────────────

app.get('/api/rooms', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!verifyToken(token)) return res.status(401).json({ error: 'Non autorisé' });
  res.json(getRooms());
});

app.get('/api/rooms/:id/messages', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!verifyToken(token)) return res.status(401).json({ error: 'Non autorisé' });
  const messages = getMessages(req.params.id);
  // Ajouter les réactions à chaque message
  const withReactions = messages.map(m => ({
    ...m,
    reactions: getReactions(m.id)
  }));
  res.json(withReactions);
});

app.post('/api/rooms', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!verifyToken(token)) return res.status(401).json({ error: 'Non autorisé' });
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Nom requis' });
  db.run("INSERT INTO rooms (name, type) VALUES (?, 'public')", [name]);
  saveDB();
  res.json({ success: true, rooms: getRooms() });
});

// ─── WEBSOCKET ──────────────────────────────────────────────────────────────

// Map des clients connectés : ws => { userId, username, roomId }
const clients = new Map();

function broadcast(data, excludeWs = null) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN && client !== excludeWs) {
      client.send(msg);
    }
  });
}

function broadcastToRoom(roomId, data, excludeWs = null) {
  const msg = JSON.stringify(data);
  clients.forEach((info, ws) => {
    if (info.roomId === roomId && ws.readyState === WebSocket.OPEN && ws !== excludeWs) {
      ws.send(msg);
    }
  });
}

function getOnlineUsers() {
  const users = [];
  const seen = new Set();
  clients.forEach(info => {
    if (!seen.has(info.userId)) {
      seen.add(info.userId);
      users.push({ userId: info.userId, username: info.username });
    }
  });
  return users;
}

wss.on('connection', (ws) => {
  console.log('🔌 Nouvelle connexion WebSocket');

  ws.on('message', (raw) => {
    let data;
    try { data = JSON.parse(raw); } catch { return; }

    const { type, token, payload } = data;

    // ── Auth ─────────────────────────────────────────────────────────────
    if (type === 'auth') {
      const user = verifyToken(token);
      if (!user) {
        ws.send(JSON.stringify({ type: 'error', message: 'Token invalide' }));
        ws.close();
        return;
      }
      clients.set(ws, { userId: user.id || user.userId, username: user.username, roomId: null });
      ws.send(JSON.stringify({ type: 'auth_ok', user: { userId: user.id || user.userId, username: user.username } }));
      ws.send(JSON.stringify({ type: 'rooms', rooms: getRooms() }));
      broadcast({ type: 'online_users', users: getOnlineUsers() });
      console.log(`✅ ${user.username} connecté`);
      return;
    }

    // Vérifier que le client est authentifié
    const client = clients.get(ws);
    if (!client) {
      ws.send(JSON.stringify({ type: 'error', message: 'Non authentifié' }));
      return;
    }

    // ── Rejoindre un salon ───────────────────────────────────────────────
    if (type === 'join_room') {
      const { roomId } = payload;
      client.roomId = roomId;
      clients.set(ws, client);
      const messages = getMessages(roomId).map(m => ({ ...m, reactions: getReactions(m.id) }));
      ws.send(JSON.stringify({ type: 'room_history', roomId, messages }));
      broadcastToRoom(roomId, {
        type: 'system',
        roomId,
        message: `${client.username} a rejoint le salon`
      }, ws);
      return;
    }

    // ── Envoyer un message ───────────────────────────────────────────────
    if (type === 'send_message') {
      const { roomId, content } = payload;
      if (!content?.trim()) return;
      const message = insertMessage(roomId, client.userId, client.username, content.trim());
      broadcastToRoom(roomId, { type: 'new_message', message: { ...message, reactions: [] } });
      ws.send(JSON.stringify({ type: 'new_message', message: { ...message, reactions: [] } }));
      return;
    }

    // ── Réaction ─────────────────────────────────────────────────────────
    if (type === 'react') {
      const { messageId, emoji, roomId } = payload;
      const added = toggleReaction(messageId, client.userId, emoji);
      const reactions = getReactions(messageId);
      broadcastToRoom(roomId, { type: 'reaction_update', messageId, reactions });
      ws.send(JSON.stringify({ type: 'reaction_update', messageId, reactions }));
      return;
    }

    // ── Typing indicator ─────────────────────────────────────────────────
    if (type === 'typing') {
      const { roomId } = payload;
      broadcastToRoom(roomId, {
        type: 'user_typing',
        username: client.username,
        roomId
      }, ws);
      return;
    }
  });

  ws.on('close', () => {
    const client = clients.get(ws);
    if (client) {
      console.log(`❌ ${client.username} déconnecté`);
      clients.delete(ws);
      broadcast({ type: 'online_users', users: getOnlineUsers() });
    }
  });
});

// ─── DÉMARRAGE ──────────────────────────────────────────────────────────────

initDB().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 NathChat server running on http://localhost:${PORT}`);
  });
});
