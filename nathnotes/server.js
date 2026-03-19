const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = 3001;
const JWT_SECRET = 'nathnotes_secret_key_2026';

const dbPath = path.join(__dirname, 'nathnotes.db');

let db;

// Save DB to file
function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

// SQL helpers
function run(sql, params = []) {
  try {
    db.run(sql, params);
    saveDatabase();
    return { changes: db.getRowsModified() };
  } catch (err) {
    console.error('Erreur SQL:', err);
    throw err;
  }
}

function get(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return row;
    }
    stmt.free();
    return null;
  } catch (err) {
    console.error('Erreur SQL:', err);
    throw err;
  }
}

function all(sql, params = []) {
  try {
    const results = [];
    const stmt = db.prepare(sql);
    stmt.bind(params);
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  } catch (err) {
    console.error('Erreur SQL:', err);
    throw err;
  }
}

// Init DB
async function initDB() {
  const SQL = await initSqlJs();
  
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
    console.log('✅ Base de données chargée');
  } else {
    db = new SQL.Database();
    console.log('✅ Base de données créée');
  }

  // Create tables
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT DEFAULT '',
    content TEXT DEFAULT '',
    folder TEXT DEFAULT 'all',
    favorite INTEGER DEFAULT 0,
    deleted INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    icon TEXT DEFAULT '📁',
    color TEXT DEFAULT '#e8b84b',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  saveDatabase();
  console.log('✅ Tables créées');
}

// Middleware
app.use(cors({
  origin: true, // Allow all origins for dev
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Rate limiting for /auth/login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per IP
  message: { error: 'Trop de tentatives. Réessayez dans 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth middleware - supports both cookie and Authorization header
const authenticate = (req, res, next) => {
  // Check cookie first
  let token = req.cookies?.token;
  
  // Fallback to Authorization header
  if (!token) {
    token = req.headers.authorization?.split(' ')[1];
  }
  
  if (!token) {
    return res.status(401).json({ error: 'Non autorisé' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invalide' });
  }
};

// Routes

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Champs requis' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = run(
      'INSERT INTO users (email, password, name) VALUES (?, ?, ?)',
      [email, hashedPassword, name]
    );
    
    const token = jwt.sign({ userId: result.lastInsertRowid }, JWT_SECRET, { expiresIn: '7d' });
    
    // Set httpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    res.json({ 
      user: { id: result.lastInsertRowid, email, name } 
    });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Email déjà utilisé' });
    }
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/auth/login - with rate limiting
app.post('/api/auth/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }
    
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }
    
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    
    // Set httpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    res.json({ 
      user: { id: user.id, email: user.email, name: user.name } 
    });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/auth/me
app.get('/api/auth/me', authenticate, (req, res) => {
  const user = get('SELECT id, email, name FROM users WHERE id = ?', [req.userId]);
  if (!user) {
    return res.status(404).json({ error: 'User non trouvé' });
  }
  res.json(user);
});

// POST /api/auth/logout
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

// GET /api/notes - toutes les notes du user
app.get('/api/notes', authenticate, (req, res) => {
  const notes = all(
    'SELECT * FROM notes WHERE user_id = ? AND deleted = 0 ORDER BY updated_at DESC',
    [req.userId]
  );
  res.json(notes);
});

// GET /api/notes/deleted - corbeille
app.get('/api/notes/deleted', authenticate, (req, res) => {
  const notes = all(
    'SELECT * FROM notes WHERE user_id = ? AND deleted = 1 ORDER BY updated_at DESC',
    [req.userId]
  );
  res.json(notes);
});

// POST /api/notes - créer une note
app.post('/api/notes', authenticate, (req, res) => {
  const { title = '', content = '', folder = 'all' } = req.body;
  
  const result = run(
    'INSERT INTO notes (user_id, title, content, folder) VALUES (?, ?, ?, ?)',
    [req.userId, title, content, folder]
  );
  
  const note = get('SELECT * FROM notes WHERE id = ?', [result.lastInsertRowid]);
  
  res.json(note);
});

// PUT /api/notes/:id - modifier une note
app.put('/api/notes/:id', authenticate, (req, res) => {
  const { id } = req.params;
  const { title, content, folder, favorite } = req.body;
  
  // Vérifier que la note appartient au user
  const note = get('SELECT * FROM notes WHERE id = ? AND user_id = ?', [id, req.userId]);
  if (!note) {
    return res.status(404).json({ error: 'Note non trouvée' });
  }
  
  run(
    'UPDATE notes SET title = ?, content = ?, folder = ?, favorite = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [title ?? note.title, content ?? note.content, folder ?? note.folder, favorite ?? note.favorite, id]
  );
  
  const updated = get('SELECT * FROM notes WHERE id = ?', [id]);
  
  res.json(updated);
});

// DELETE /api/notes/:id - soft delete
app.delete('/api/notes/:id', authenticate, (req, res) => {
  const { id } = req.params;
  
  const note = get('SELECT * FROM notes WHERE id = ? AND user_id = ?', [id, req.userId]);
  if (!note) {
    return res.status(404).json({ error: 'Note non trouvée' });
  }
  
  run('UPDATE notes SET deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
  
  res.json({ success: true });
});

// POST /api/notes/:id/restore - restaurer depuis la corbeille
app.post('/api/notes/:id/restore', authenticate, (req, res) => {
  const { id } = req.params;
  
  const note = get('SELECT * FROM notes WHERE id = ? AND user_id = ?', [id, req.userId]);
  if (!note) {
    return res.status(404).json({ error: 'Note non trouvée' });
  }
  
  run('UPDATE notes SET deleted = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
  
  res.json({ success: true });
});

// GET /api/folders - récupérer les dossiers
app.get('/api/folders', authenticate, (req, res) => {
  // Dossiers par défaut
  const defaultFolders = [
    { id: 'all', name: 'Tout', icon: '📁', color: '#e8b84b', is_default: true },
    { id: 'work', name: 'Travail', icon: '💼', color: '#569cd6', is_default: true },
    { id: 'personal', name: 'Perso', icon: '🏠', color: '#4ec9b0', is_default: true },
    { id: 'ideas', name: 'Idées', icon: '💡', color: '#9b6ef3', is_default: true }
  ];
  
  // Ajouter les dossiers personnalisés
  const customFolders = all(
    'SELECT * FROM folders WHERE user_id = ? ORDER BY created_at DESC',
    [req.userId]
  );
  
  res.json([...defaultFolders, ...customFolders.map(f => ({...f, is_default: false}))]);
});

// POST /api/folders - créer un dossier
app.post('/api/folders', authenticate, (req, res) => {
  const { name, icon = '📁', color = '#e8b84b' } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Nom requis' });
  }
  
  const result = run(
    'INSERT INTO folders (user_id, name, icon, color) VALUES (?, ?, ?, ?)',
    [req.userId, name, icon, color]
  );
  
  const folder = get('SELECT * FROM folders WHERE id = ?', [result.lastInsertRowid]);
  
  res.json({ ...folder, is_default: false });
});

// Root
app.get('/', (req, res) => {
  res.json({ message: '📝 NathNotes API', version: '1.0.0' });
});

// Start server
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ NathNotes server: http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Erreur démarrage:', err);
  process.exit(1);
});

