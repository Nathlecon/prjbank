const express = require('express');
const router = express.Router();
const db = require('../database');
const authMiddleware = require('../middleware/auth');

router.post('/payer', authMiddleware, (req, res) => {
  const { montant, description } = req.body;
  
  try {
    const compte = db.get('SELECT * FROM comptes WHERE user_id = ?', [req.user.id]);
    if (!compte) return res.status(404).json({ erreur: 'Compte introuvable' });
    if (compte.solde < montant) return res.status(400).json({ erreur: '❌ Fonds insuffisants' });
    
    const nouveauSolde = compte.solde - montant;
    db.run('UPDATE comptes SET solde = ? WHERE user_id = ?', [nouveauSolde, req.user.id]);
    db.run('INSERT INTO transactions (de_compte, montant, description) VALUES (?, ?, ?)',
      [compte.id, montant, description]
    );
    
    res.json({ message: '✅ Paiement validé', nouveau_solde: nouveauSolde });
  } catch (err) {
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

router.get('/historique', authMiddleware, (req, res) => {
  try {
    const compte = db.get('SELECT id FROM comptes WHERE user_id = ?', [req.user.id]);
    if (!compte) return res.status(404).json({ erreur: 'Compte introuvable' });
    
    const transactions = db.all('SELECT * FROM transactions WHERE de_compte = ? ORDER BY created_at DESC',
      [compte.id]
    );
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

module.exports = router;
