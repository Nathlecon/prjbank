// ─── clear-transactions.js ───
// Supprime tout l'historique des transactions
const db = require('./database');
async function main() {
  await db.initDatabase();
  db.run('DELETE FROM transactions');
  console.log('✅ Toutes les transactions supprimées');
  process.exit(0);
}
main();
