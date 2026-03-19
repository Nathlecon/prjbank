// ─── clear-commandes.js ───
// Supprime toutes les commandes et leurs items
const db = require('./database');
async function main() {
  await db.initDatabase();
  db.run('DELETE FROM commandes_items');
  db.run('DELETE FROM commandes');
  console.log('✅ Toutes les commandes supprimées');
  process.exit(0);
}
main();
