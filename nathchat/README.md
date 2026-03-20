# NathChat 💬

Messagerie temps réel intégrée à KernelAndCo.

## Structure

```
nathchat/
├── server.js        ← Serveur Node.js + Express + WebSockets
├── package.json     ← Dépendances
├── nathchat.db      ← Base de données sql.js (créée auto au démarrage)
└── public/
    └── index.html   ← Frontend complet
```

## Installation

```bash
cd nathchat
npm install
```

## Démarrage

```bash
# Assure-toi que NathBank tourne sur le port 3000
node server.js
# ou avec rechargement automatique :
npm run dev
```

Puis ouvre : **http://localhost:3002**

## Fonctionnement

- NathChat tourne sur le **port 3002**
- NathBank doit tourner sur le **port 3000** (pour le login)
- L'auth utilise le même JWT secret que NathBank
- La DB sql.js est sauvegardée dans `nathchat.db`

## Salons par défaut

- `#général` — discussion principale
- `#random` — conversations libres
- `#nathbank` — discussions liées à NathBank

## Fonctionnalités

- ✅ Login avec compte NathBank
- ✅ Chat global + salons
- ✅ WebSockets temps réel
- ✅ Historique des messages persisté
- ✅ Présence en ligne (liste live)
- ✅ Réactions avec emojis (👍 ❤️ 😂 😮 😢 🔥)
- ✅ Indicateur "est en train d'écrire..."
- ✅ Création de nouveaux salons
- ✅ Design dark premium
