require('dotenv').config();

const express = require('express');
const cors = require('cors');
const db = require('./database');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const authRoutes = require('./routes/auth');
const comptesRoutes = require('./routes/comptes');
const transactionsRoutes = require('./routes/transactions');
const adminRoutes = require('./routes/admin');
const panierRoutes = require('./routes/panier');
const commandesRoutes = require('./routes/commandes');
const categoriesRoutes = require('./routes/categories');

app.use('/api/auth', authRoutes);
app.use('/api/comptes', comptesRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/panier', panierRoutes);
app.use('/api/commandes', commandesRoutes);
app.use('/api/categories', categoriesRoutes);

// === GITHUB STATS ===
app.get('/api/github-stats', async (req, res) => {
  const token = process.env.GITHUB_TOKEN;
  const repo = 'Nathlecon/prjbank';
  try {
    const headers = { 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json' };
    const [langRes, commitRes] = await Promise.all([
      fetch('https://api.github.com/repos/' + repo + '/languages', { headers }),
      fetch('https://api.github.com/repos/' + repo + '/commits?per_page=1', { headers })
    ]);
    const languages = await langRes.json();
    const linkHeader = commitRes.headers.get('Link') || '';
    const match = linkHeader.match(/page=(\d+)>; rel="last"/);
    const totalCommits = match ? parseInt(match[1]) : null;
    res.json({ languages, totalCommits });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/github-commits', async (req, res) => {
  const token = process.env.GITHUB_TOKEN;
  const repo = 'Nathlecon/prjbank';
  try {
    const headers = { 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json' };
    const response = await fetch('https://api.github.com/repos/' + repo + '/commits?per_page=10', { headers });
    const commits = await response.json();
    res.json(commits);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/', (req, res) => {
  res.json({ message: '✅ API Bancaire en ligne !', version: '1.0.0' });
});

db.initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Serveur lancé sur http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Erreur lors du démarrage:', err);
  process.exit(1);
});