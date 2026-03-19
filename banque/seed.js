const produits = [
  { nom: "Air Max 2026", emoji: "👟", categorie: "mode", prix: 89.99, description: "Sneakers ultra confortables, semelle air révolutionnaire", badge: "NEW" },
  { nom: "Hoodie Oversized", emoji: "🧥", categorie: "mode", prix: 49.99, description: "Hoodie coton premium, coupe oversize tendance", badge: null },
  { nom: "Casquette NY", emoji: "🧢", categorie: "mode", prix: 24.99, description: "Casquette brodée New York, ajustable", badge: null },
  { nom: "Cargo Pants", emoji: "👖", categorie: "mode", prix: 64.99, description: "Pantalon cargo multi-poches, style streetwear", badge: "TREND" },
  { nom: "Jordan 1 Low", emoji: "👟", categorie: "mode", prix: 119.99, description: "Colorway exclusif, édition limitée 2026", badge: "LIMITED" },
  { nom: "USB-C Hub 7-en-1", emoji: "💻", categorie: "tech", prix: 34.99, description: "HDMI 4K, USB 3.0, SD card, charge rapide 100W", badge: null },
  { nom: "SSD Externe 1To", emoji: "💾", categorie: "tech", prix: 79.99, description: "Lecture 1050 Mo/s, format poche, USB-C", badge: null },
  { nom: "Webcam 4K", emoji: "📷", categorie: "tech", prix: 89.99, description: "Autofocus IA, micro antibruit, plug & play", badge: "NEW" },
  { nom: "Clavier Mécanique", emoji: "⌨️", categorie: "tech", prix: 129.99, description: "Switches red, rétroéclairage RGB, TKL compact", badge: null },
  { nom: "Souris Gaming", emoji: "🖱️", categorie: "tech", prix: 59.99, description: "16000 DPI, 6 boutons programmables, sans fil", badge: null },
  { nom: "Casque Bluetooth", emoji: "🎧", categorie: "tech", prix: 149.99, description: "ANC actif, 30h autonomie, son Hi-Fi", badge: "TOP" },
  { nom: "Manette Pro PS5", emoji: "🎮", categorie: "gaming", prix: 59.99, description: "Compatible PC/PS5, gâchettes adaptatives, vibration HD", badge: null },
  { nom: "Tapis de souris XXL", emoji: "🖱️", categorie: "gaming", prix: 19.99, description: "Surface RGB, 90x40cm, antidérapant", badge: null },
  { nom: "Chaise Gaming", emoji: "🪑", categorie: "gaming", prix: 249.99, description: "Support lombaire, accoudoirs 4D, inclinaison 180°", badge: "TOP" },
  { nom: "Carte PSN 50€", emoji: "🎮", categorie: "gaming", prix: 50.00, description: "Code PlayStation Store, livraison instantanée", badge: null },
  { nom: "Jeu FIFA 2026", emoji: "⚽", categorie: "gaming", prix: 39.99, description: "Mode carrière révolutionnaire, Ultimate Team amélioré", badge: "NEW" },
  { nom: "Box Snacks USA", emoji: "🍕", categorie: "food", prix: 29.99, description: "20 snacks américains introuvables en France", badge: "BEST" },
  { nom: "Energy Drink Pack", emoji: "🥤", categorie: "food", prix: 19.99, description: "Pack 12 canettes, 6 saveurs différentes", badge: null },
  { nom: "Café Specialty", emoji: "☕", categorie: "food", prix: 14.99, description: "Grains single origin Éthiopie, torréfaction artisanale", badge: null },
  { nom: "Box Ramen Premium", emoji: "🍜", categorie: "food", prix: 24.99, description: "8 sachets ramen japonais authentiques, saveurs variées", badge: "NEW" },
];

async function seed() {
  // 1. Login admin
  const loginRes = await fetch('http://localhost:3000/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@nathstore.com', mot_de_passe: 'admin2026' })
  });
  const { token } = await loginRes.json();

  if (!token) { console.log('❌ Login admin échoué'); return; }
  console.log('✅ Connecté admin');

  // 2. Insérer les produits
  for (const p of produits) {
    const res = await fetch('http://localhost:3000/api/admin/produits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(p)
    });
    const data = await res.json();
    console.log(`${res.ok ? '✅' : '❌'} ${p.nom} — ${data.message || data.erreur}`);
  }

  console.log('\n🎉 Seed terminé ! 20 produits ajoutés.');
}

seed();
