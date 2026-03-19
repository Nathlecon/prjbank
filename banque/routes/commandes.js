const express = require('express');
const router = express.Router();
const db = require('../database');
const authMiddleware = require('../middleware/auth');

// GET /api/commandes — Historique des commandes
router.get('/', authMiddleware, (req, res) => {
  try {
    const commandes = db.all('SELECT * FROM commandes WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
    if (!commandes || !commandes.length) return res.json([]);

    const result = commandes.map((commande) => {
      const items = db.all('SELECT * FROM commandes_items WHERE commande_id = ?', [commande.id]);
      return { ...commande, items: items || [] };
    });
    
    res.json(result);
  } catch (err) {
    res.json([]);
  }
});

// POST /api/commandes — Créer une commande après paiement
router.post('/', authMiddleware, (req, res) => {
  const { total, items } = req.body;

  try {
    db.run('INSERT INTO commandes (user_id, total) VALUES (?, ?)', [req.user.id, total]);
    
    // Récupérer l'ID de la commande créée
    const commande = db.get('SELECT id FROM commandes WHERE user_id = ? ORDER BY id DESC LIMIT 1', [req.user.id]);
    
    if (!commande) {
      return res.status(500).json({ erreur: 'Erreur serveur' });
    }
    
    const commande_id = commande.id;
    
    // Insérer les items
    items.forEach(item => {
      db.run(`
        INSERT INTO commandes_items (commande_id, produit_id, nom, emoji, prix, quantite)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [commande_id, item.produit_id, item.nom, item.emoji, item.prix, item.quantite]);
    });

    // Vider le panier après commande
    db.run('DELETE FROM paniers WHERE user_id = ?', [req.user.id]);
    
    res.json({ message: '✅ Commande enregistrée !', commande_id });
  } catch (err) {
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

module.exports = router;
