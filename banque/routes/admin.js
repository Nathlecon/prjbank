const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../database');

const SECRET_ADMIN = 'admin_secret_nathstore_456';

// ─── MIDDLEWARE ADMIN ───
function adminAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ erreur: 'Token manquant' });
  try {
    req.admin = jwt.verify(token, SECRET_ADMIN);
    next();
  } catch {
    res.status(401).json({ erreur: 'Token admin invalide' });
  }
}

// ─── CRÉER COMPTE ADMIN ───
router.post('/setup', (req, res) => {
  const { email, mot_de_passe, secret } = req.body;

  // Clé secrète pour créer le premier admin
  if (secret !== 'NATHSTORE_ADMIN_2026') {
    return res.status(403).json({ erreur: 'Clé secrète invalide' });
  }

  try {
    const hash = bcrypt.hashSync(mot_de_passe, 10);
    db.run('INSERT INTO admins (email, mot_de_passe) VALUES (?, ?)', [email, hash]);
    res.json({ message: '✅ Compte admin créé !' });
  } catch (err) {
    res.status(400).json({ erreur: 'Email déjà utilisé' });
  }
});

// ─── LOGIN ADMIN ───
router.post('/login', (req, res) => {
  const { email, mot_de_passe } = req.body;
  
  try {
    const admin = db.get('SELECT * FROM admins WHERE email = ?', [email]);
    if (!admin) return res.status(400).json({ erreur: 'Admin introuvable' });
    
    const valide = bcrypt.compareSync(mot_de_passe, admin.mot_de_passe);
    if (!valide) return res.status(400).json({ erreur: 'Mot de passe incorrect' });
    
    const token = jwt.sign({ id: admin.id, email: admin.email }, SECRET_ADMIN, { expiresIn: '24h' });
    res.json({ message: '✅ Connecté !', token });
  } catch (err) {
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// ─── LISTER PRODUITS ───
router.get('/produits', (req, res) => {
  try {
    const rows = db.all('SELECT * FROM produits ORDER BY created_at DESC', []);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

router.post('/produits', adminAuth, (req, res) => {
  const { nom, emoji, categorie, prix, description, badge } = req.body;
  if (!nom || !emoji || !categorie || prix === undefined || prix === null) {
    return res.status(400).json({ erreur: 'Champs requis manquants' });
  }
  
  try {
    db.run(
      'INSERT INTO produits (nom, emoji, categorie, prix, description, badge) VALUES (?, ?, ?, ?, ?, ?)',
      [nom, emoji, categorie, prix, description || '', badge || null]
    );
    res.json({ message: '✅ Produit ajouté !' });
  } catch (err) {
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// ─── MODIFIER PRODUIT ───
router.put('/produits/:id', adminAuth, (req, res) => {
  const { nom, emoji, categorie, prix, description, badge, actif } = req.body;
  
  try {
    db.run(
      'UPDATE produits SET nom=?, emoji=?, categorie=?, prix=?, description=?, badge=?, actif=? WHERE id=?',
      [nom, emoji, categorie, prix, description, badge, actif ?? 1, req.params.id]
    );
    res.json({ message: '✅ Produit modifié !' });
  } catch (err) {
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// ─── SUPPRIMER PRODUIT ───
router.delete('/produits/:id', adminAuth, (req, res) => {
  try {
    db.run('DELETE FROM produits WHERE id = ?', [req.params.id]);
    res.json({ message: '✅ Produit supprimé !' });
  } catch (err) {
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

module.exports = router;
