const express = require('express');
const router = express.Router();
const db = require('../database');
const authMiddleware = require('../middleware/auth');

// GET /api/comptes/solde — Voir son solde
router.get('/solde', authMiddleware, (req, res) => {
  try {
    const compte = db.get('SELECT * FROM comptes WHERE user_id = ?', [req.user.id]);
    if (!compte) return res.status(404).json({ erreur: 'Compte introuvable' });
    res.json({solde: compte.solde, devise: compte.devise});
  } catch (err) {
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// POST /api/comptes/deposer — Déposer de l'argent
router.post('/deposer', authMiddleware, (req, res) => {
  const { montant } = req.body;

  if (!montant || montant <= 0) {
    return res.status(400).json({ erreur: 'Montant invalide' });
  }

  if (montant > 10000000000000) {
    return res.status(400).json({ erreur: 'Dépôt maximum : 10 000€' });
  }

  try {
    const compte = db.get('SELECT * FROM comptes WHERE user_id = ?', [req.user.id]);
    if (!compte) return res.status(404).json({ erreur: 'Compte introuvable' });

    const nouveauSolde = compte.solde + montant;

    db.run('UPDATE comptes SET solde = ? WHERE user_id = ?', [nouveauSolde, req.user.id]);
    db.run(
      'INSERT INTO transactions (vers_compte, montant, description) VALUES (?, ?, ?)',
      [compte.id, montant, `Dépôt de ${montant.toFixed(2)}€`]
    );
    
    res.json({ message: '✅ Dépôt effectué !', nouveau_solde: nouveauSolde });
  } catch (err) {
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

module.exports = router;
