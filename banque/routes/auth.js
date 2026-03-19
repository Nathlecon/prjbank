const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../database');

const SECRET = 'mon_secret_jwt_super_secure_123';

router.post('/register', (req, res) => {
  const { nom, email, mot_de_passe } = req.body;
  if (!nom || !email || !mot_de_passe) {
    return res.status(400).json({ erreur: 'Tous les champs sont requis' });
  }
  
  try {
    const hash = bcrypt.hashSync(mot_de_passe, 10);
    const result = db.run('INSERT INTO users (nom, email, mot_de_passe) VALUES (?, ?, ?)', [nom, email, hash]);
    
    // Créer un compte avec 100€ de départ
    // Note: this.lastID n'est pas disponible avec sql.js, on doit récupérer l'ID autrement
    const user = db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (user) {
      db.run('INSERT INTO comptes (user_id, solde) VALUES (?, ?)', [user.id, 100]);
    }
    
    res.json({ message: '✅ Compte créé avec 100€ de départ !' });
  } catch (err) {
    res.status(400).json({ erreur: 'Email déjà utilisé' });
  }
});

router.post('/login', (req, res) => {
  const { email, mot_de_passe } = req.body;
  
  try {
    const user = db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) return res.status(400).json({ erreur: 'Utilisateur introuvable' });
    
    const valide = bcrypt.compareSync(mot_de_passe, user.mot_de_passe);
    if (!valide) return res.status(400).json({ erreur: 'Mot de passe incorrect' });
    
    const token = jwt.sign({ id: user.id, email: user.email }, SECRET, { expiresIn: '24h' });
    res.json({ message: '✅ Connecté !', token, nom: user.nom });
  } catch (err) {
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

module.exports = router;
