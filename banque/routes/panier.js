const express = require('express');
const router = express.Router();
const db = require('../database');
const authMiddleware = require('../middleware/auth');

// GET /api/panier — Récupérer son panier
router.get('/', authMiddleware, (req, res) => {
  try {
    const items = db.all(`
      SELECT p.*, pr.nom, pr.emoji, pr.prix, pr.categorie, pr.description, pr.badge
      FROM paniers p
      JOIN produits pr ON p.produit_id = pr.id
      WHERE p.user_id = ?
    `, [req.user.id]);
    res.json(items || []);
  } catch (err) {
    res.json([]);
  }
});

// POST /api/panier — Sauvegarder tout le panier
router.post('/', authMiddleware, (req, res) => {
  const { items } = req.body; // [{ produit_id, quantite }]

  // Vider l'ancien panier
  db.run('DELETE FROM paniers WHERE user_id = ?', [req.user.id]);
  
  if (!items || items.length === 0) {
    return res.json({ message: '✅ Panier vidé' });
  }

  // Insérer les nouveaux éléments
  items.forEach(item => {
    db.run('INSERT INTO paniers (user_id, produit_id, quantite) VALUES (?, ?, ?)', 
      [req.user.id, item.produit_id, item.quantite]
    );
  });
  
  res.json({ message: '✅ Panier sauvegardé' });
});

// DELETE /api/panier — Vider le panier
router.delete('/', authMiddleware, (req, res) => {
  db.run('DELETE FROM paniers WHERE user_id = ?', [req.user.id]);
  res.json({ message: '✅ Panier vidé' });
});

module.exports = router;
