// ─── clear-users.js ───
// Supprime tous les utilisateurs et leurs comptes bancaires
const db = require('./database');
async function main() {
  await db.initDatabase();
  db.run('DELETE FROM paniers');
  db.run('DELETE FROM commandes_items');
  db.run('DELETE FROM commandes');
  db.run('DELETE FROM transactions');
  db.run('DELETE FROM comptes');
  db.run('DELETE FROM users');
  console.log('✅ Tous les utilisateurs supprimés');
  process.exit(0);
}
main();
