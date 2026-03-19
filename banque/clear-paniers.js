// ─── clear-paniers.js ───
// Vide tous les paniers de tous les utilisateurs
const db = require('./database');
async function main() {
  await db.initDatabase();
  db.run('DELETE FROM paniers');
  console.log('✅ Tous les paniers vidés');
  process.exit(0);
}
main();
