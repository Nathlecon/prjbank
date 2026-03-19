// ─── clear-all.js ───
// ⚠️ DANGER — Supprime TOUT dans la BDD (garde juste les admins)
const db = require('./database');
async function main() {
  await db.initDatabase();
  db.run('DELETE FROM commandes_items');
  db.run('DELETE FROM commandes');
  db.run('DELETE FROM paniers');
  db.run('DELETE FROM transactions');
  db.run('DELETE FROM produits');
  db.run('DELETE FROM categories');
  db.run('DELETE FROM comptes');
  db.run('DELETE FROM users');
  console.log('✅ BDD entièrement vidée (admins conservés)');
  process.exit(0);
}
main();
