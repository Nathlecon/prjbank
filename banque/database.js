const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'banque.db');

let db;

async function initDatabase() {
  const SQL = await initSqlJs();
  
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
    console.log('✅ Base de données chargée');
  } else {
    db = new SQL.Database();
    console.log('✅ Base de données créée');
  }

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    mot_de_passe TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS comptes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    solde REAL DEFAULT 0,
    devise TEXT DEFAULT 'EUR',
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    de_compte INTEGER,
    vers_compte INTEGER,
    montant REAL NOT NULL,
    description TEXT,
    statut TEXT DEFAULT 'validée',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (de_compte) REFERENCES comptes(id),
    FOREIGN KEY (vers_compte) REFERENCES comptes(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT UNIQUE NOT NULL,
    emoji TEXT NOT NULL,
    ordre INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS produits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    emoji TEXT NOT NULL,
    categorie TEXT NOT NULL,
    prix REAL NOT NULL,
    description TEXT,
    badge TEXT,
    actif INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    mot_de_passe TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS paniers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    produit_id INTEGER NOT NULL,
    quantite INTEGER DEFAULT 1,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (produit_id) REFERENCES produits(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS commandes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    total REAL NOT NULL,
    statut TEXT DEFAULT 'payée',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS commandes_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    commande_id INTEGER NOT NULL,
    produit_id INTEGER NOT NULL,
    nom TEXT NOT NULL,
    emoji TEXT NOT NULL,
    prix REAL NOT NULL,
    quantite INTEGER NOT NULL,
    FOREIGN KEY (commande_id) REFERENCES commandes(id)
  )`);

  // Insérer les 4 catégories de base si la table est vide
  const existing = all('SELECT COUNT(*) as count FROM categories');
  if (existing[0].count === 0) {
    db.run(`INSERT INTO categories (nom, emoji, ordre) VALUES ('mode', '👟', 1)`);
    db.run(`INSERT INTO categories (nom, emoji, ordre) VALUES ('tech', '💻', 2)`);
    db.run(`INSERT INTO categories (nom, emoji, ordre) VALUES ('gaming', '🎮', 3)`);
    db.run(`INSERT INTO categories (nom, emoji, ordre) VALUES ('food', '🍕', 4)`);
    console.log('✅ Catégories de base insérées');
  }

  console.log('✅ Tables créées');
  saveDatabase();
  return db;
}

function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

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

module.exports = { initDatabase, run, get, all, saveDatabase };