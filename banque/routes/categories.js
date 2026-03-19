const express = require('express');
const router = express.Router();
const { run, get, all } = require('../database');
const jwt = require('jsonwebtoken');

const SECRET_ADMIN = 'admin_secret_nathstore_456';

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

// GET /api/categories — liste toutes les catégories (public)
router.get('/', (req, res) => {
  const cats = all('SELECT * FROM categories ORDER BY ordre ASC, id ASC');
  res.json(cats);
});

// POST /api/categories — ajouter une catégorie (admin)
router.post('/', adminAuth, (req, res) => {
  const { nom, emoji, ordre } = req.body;
  if (!nom || !emoji) return res.status(400).json({ erreur: 'nom et emoji requis' });

  // Vérifier que le nom ne contient que des lettres/chiffres/tirets
  if (!/^[a-z0-9-]+$/.test(nom)) {
    return res.status(400).json({ erreur: 'Le nom doit être en minuscules, sans espaces ni caractères spéciaux (ex: "high-tech")' });
  }

  try {
    const r = run(
      'INSERT INTO categories (nom, emoji, ordre) VALUES (?, ?, ?)',
      [nom, emoji, ordre || 0]
    );
    res.json({ message: '✅ Catégorie ajoutée !', id: r.changes });
  } catch {
    res.status(400).json({ erreur: 'Ce nom de catégorie existe déjà' });
  }
});

// PUT /api/categories/:id — modifier une catégorie (admin)
router.put('/:id', adminAuth, (req, res) => {
  const { nom, emoji, ordre } = req.body;
  if (!nom || !emoji) return res.status(400).json({ erreur: 'nom et emoji requis' });

  if (!/^[a-z0-9-]+$/.test(nom)) {
    return res.status(400).json({ erreur: 'Le nom doit être en minuscules, sans espaces ni caractères spéciaux' });
  }

  try {
    run(
      'UPDATE categories SET nom=?, emoji=?, ordre=? WHERE id=?',
      [nom, emoji, ordre || 0, req.params.id]
    );
    res.json({ message: '✅ Catégorie modifiée !' });
  } catch {
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// DELETE /api/categories/:id — supprimer une catégorie (admin)
router.delete('/:id', adminAuth, (req, res) => {
  const cat = get('SELECT * FROM categories WHERE id = ?', [req.params.id]);
  if (!cat) return res.status(404).json({ erreur: 'Catégorie introuvable' });

  // Vérifier qu'aucun produit n'utilise cette catégorie
  const produits = all('SELECT COUNT(*) as count FROM produits WHERE categorie = ?', [cat.nom]);
  if (produits[0].count > 0) {
    return res.status(400).json({ erreur: `Impossible de supprimer — ${produits[0].count} produit(s) utilisent cette catégorie` });
  }

  try {
    run('DELETE FROM categories WHERE id = ?', [req.params.id]);
    res.json({ message: '✅ Catégorie supprimée !' });
  } catch {
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

module.exports = router;