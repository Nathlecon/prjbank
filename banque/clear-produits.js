// ─── clear-produits.js ───
// Supprime tous les produits du catalogue
const db = require('./database');
async function main() {
  await db.initDatabase();
  db.run('DELETE FROM produits');
  console.log('✅ Tous les produits supprimés');
  process.exit(0);
}
main();
