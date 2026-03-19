// ─── clear-categories.js ───
// Supprime toutes les catégories (attention : les produits garderont leur ancienne catégorie en texte)
const db = require('./database');
async function main() {
  await db.initDatabase();
  db.run('DELETE FROM categories');
  console.log('✅ Toutes les catégories supprimées');
  process.exit(0);
}
main();
