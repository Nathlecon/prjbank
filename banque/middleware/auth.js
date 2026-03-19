const jwt = require('jsonwebtoken');
const SECRET = 'mon_secret_jwt_super_secure_123';

module.exports = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) return res.status(401).json({ erreur: 'Token manquant' });

  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ erreur: 'Token invalide' });
  }
};