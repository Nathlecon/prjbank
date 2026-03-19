# Documentation Complète — NathBank & NathStore
## Guide de A à Z — Tout ce qu'il faut savoir

---

## 1. Vue d'ensemble du projet

NathBank & NathStore est un écosystème **full-stack** complet, développé de zéro sans framework frontend. Il se compose de 3 modules qui communiquent entre eux :

- **NathBank** : une banque en ligne (frontend + backend)
- **NathStore** : une boutique e-commerce qui paye via NathBank
- **NathProject** : un portail SNT de présentation du projet

Le tout tourne sur une seule machine en local.

---

## 2. Stack technique

| Outil | Rôle | Version |
|-------|------|---------|
| Node.js | Exécuter le serveur backend | v24.14.0 |
| Express | Framework HTTP pour l'API REST | npm |
| sql.js | Base de données SQLite en mémoire | npm |
| bcrypt | Hasher les mots de passe | npm |
| jsonwebtoken (JWT) | Authentification sécurisée | npm |
| HTML/CSS/JS vanilla | Tout le frontend | ES2022 |
| VS Code + Live Server | Environnement de dev | port 5500 |

---

## 3. Structure des fichiers

```
projet-banque/
├── CCM.md                    ← Documentation
├── secret.html               ← Portail SNT
├── start.sh                  ← Script de lancement Mac
├── .gitignore
│
├── banque/                   ← BACKEND (tout le serveur)
│   ├── index.js             ← Point d'entrée du serveur
│   ├── database.js          ← Gestion SQLite
│   ├── banque.db            ← Fichier base de données
│   ├── seed.js              ← Script pour remplir la BDD de produits
│   ├── middleware/
│   │   └── auth.js          ← Vérification JWT
│   ├── routes/
│   │   ├── auth.js          ← Inscription / Connexion
│   │   ├── comptes.js      ← Solde et dépôt
│   │   ├── transactions.js  ← Paiements et historique
│   │   ├── admin.js         ← Gestion produits NathStore
│   │   ├── categories.js    ← Gestion catégories dynamiques
│   │   ├── panier.js        ← Panier persistant en BDD
│   │   └── commandes.js     ← Historique des commandes
│   ├── package.json
│   └── package-lock.json
│
├── banque-frontend/          ← FRONTEND NathBank
│   ├── index.html           ← Page connexion / inscription
│   ├── dashboard.html       ← Dashboard utilisateur
│   └── paiement.html        ← Page de confirmation paiement
│
└── nathstore/               ← FRONTEND NathStore
    ├── index.html           ← Boutique
    ├── admin.html           ← Panel admin
    └── admin-help.html      ← Guide import JSON
```

---

## 4. Le Backend — Comment ça marche

### 4.1 Lancement du serveur

```bash
cd ~/projet-banque/banque
node index.js
```

Le serveur démarre sur `http://localhost:3000`.

### 4.2 index.js — Le cerveau du serveur

`index.js` est le fichier principal. Il fait plusieurs choses :
1. Crée l'application Express
2. Active CORS (pour que le frontend puisse communiquer avec le backend malgré les différents ports)
3. Importe et branche toutes les routes
4. Initialise la base de données
5. Lance le serveur sur le port 3000

```javascript
// Exemple simplifié de ce que fait index.js
const express = require('express');
const app = express();
app.use(cors());
app.use(express.json());
// Branchement des routes
app.use('/api/auth', authRoutes);
app.use('/api/comptes', comptesRoutes);
// etc...
// Démarrage
db.initDatabase().then(() => app.listen(3000));
```

### 4.3 database.js — La base de données

Le projet utilise **sql.js**, une version de SQLite qui fonctionne en JavaScript pur. Contrairement à SQLite classique, sql.js charge toute la BDD en mémoire RAM et la sauvegarde dans un fichier `.db` à chaque modification.

**Fonctionnement :**
- Au démarrage, si `banque.db` existe, il le charge en mémoire
- Sinon, il crée une nouvelle base vide
- Après chaque requête d'écriture (`INSERT`, `UPDATE`, `DELETE`), il sauvegarde automatiquement le fichier

**Les 8 tables créées automatiquement :**

```sql
users              -- Comptes utilisateurs
comptes            -- Comptes bancaires (solde)
transactions       -- Historique des paiements
produits           -- Produits NathStore
categories         -- Catégories dynamiques
admins             -- Comptes administrateurs
paniers            -- Paniers sauvegardés
commandes          -- Commandes passées
commandes_items    -- Détail de chaque commande
```

**Les 3 fonctions utilitaires exposées :**
- `run(sql, params)` — Exécute une requête sans retour (INSERT, UPDATE, DELETE)
- `get(sql, params)` — Retourne une seule ligne
- `all(sql, params)` — Retourne toutes les lignes correspondantes

### 4.4 middleware/auth.js — L'authentification JWT

Un **middleware** c'est une fonction qui s'exécute entre la requête et la réponse. `auth.js` vérifie que l'utilisateur est bien connecté avant d'accéder aux routes protégées.

**Comment ça marche :**
1. Le client envoie une requête avec un header `Authorization: Bearer <token>`
2. Le middleware extrait le token
3. Il le vérifie avec la clé secrète JWT
4. Si valide, il met l'utilisateur dans `req.user` et laisse passer
5. Si invalide, il retourne une erreur 401

```javascript
// Exemple d'utilisation dans une route protégée
router.get('/solde', authMiddleware, (req, res) => {
  // req.user.id est disponible ici
});
```

**Deux secrets JWT distincts :**
- Users : `mon_secret_jwt_super_secure_123`
- Admins : `admin_secret_nathstore_456`

---

## 5. Les Routes API — Toutes les endpoints

### 5.1 Auth (`/api/auth`)

#### POST `/api/auth/register`
Créer un nouveau compte utilisateur.

**Body requis :**
```json
{
  "nom": "Nathanael",
  "email": "nath@mail.com",
  "mot_de_passe": "1234"
}
```

**Ce que ça fait :**
1. Vérifie que tous les champs sont présents
2. Hash le mot de passe avec bcrypt (coût 10)
3. Insère l'utilisateur en BDD
4. Crée automatiquement un compte bancaire avec **100€ de solde de départ**
5. Retourne un message de confirmation

---

#### POST `/api/auth/login`
Se connecter.

**Body requis :**
```json
{
  "email": "nath@mail.com",
  "mot_de_passe": "1234"
}
```

**Ce que ça fait :**
1. Cherche l'utilisateur par email
2. Compare le mot de passe avec le hash bcrypt
3. Si correct, génère un token JWT valable 24h
4. Retourne le token + le nom de l'utilisateur

**Réponse :**
```json
{
  "message": "✅ Connecté !",
  "token": "eyJhbGci...",
  "nom": "Nathanael"
}
```

---

### 5.2 Comptes (`/api/comptes`) — Protégé JWT

#### GET `/api/comptes/solde`
Retourne le solde du compte connecté.

#### POST `/api/comptes/deposer`
Déposer de l'argent sur son compte.

**Body :**
```json
{ "montant": 500 }
```

**Règle :** Maximum 10 000€ de solde. Si le dépôt dépasse cette limite, il est refusé.

---

### 5.3 Transactions (`/api/transactions`) — Protégé JWT

#### POST `/api/transactions/payer`
Effectuer un paiement (débite le compte).

**Body :**
```json
{
  "montant": 89.99,
  "description": "Air Max 2026 x1, USB-C Hub x2"
}
```

**Ce que ça fait :**
1. Vérifie que le solde est suffisant
2. Débite le compte
3. Enregistre la transaction en BDD
4. Retourne le nouveau solde

---

#### GET `/api/transactions/historique`
Retourne l'historique de toutes les transactions du compte connecté.

---

### 5.4 Admin (`/api/admin`)

#### POST `/api/admin/setup`
Créer le premier compte admin (protégé par une clé secrète).

**Body :**
```json
{
  "email": "admin@nathstore.com",
  "mot_de_passe": "admin2026",
  "secret": "NATHSTORE_ADMIN_2026"
}
```

#### POST `/api/admin/login`
Connexion admin (retourne un token JWT admin).

#### GET `/api/admin/produits`
Liste tous les produits (**route publique**, utilisée par le shop).

#### POST `/api/admin/produits` — Protégé JWT admin
Ajouter un produit.

**Body :**
```json
{
  "nom": "Air Max 2026",
  "emoji": "👟",
  "categorie": "mode",
  "prix": 89.99,
  "description": "Sneakers ultra confortables",
  "badge": "NEW"
}
```

#### PUT `/api/admin/produits/:id` — Protégé JWT admin
Modifier un produit existant.

#### DELETE `/api/admin/produits/:id` — Protégé JWT admin
Supprimer un produit.

---

### 5.5 Catégories (`/api/categories`)

#### GET `/api/categories`
Liste toutes les catégories triées par ordre (**route publique**).

**Retourne :**
```json
[
  { "id": 1, "nom": "mode", "emoji": "👟", "ordre": 1 },
  { "id": 2, "nom": "tech", "emoji": "💻", "ordre": 2 }
]
```

#### POST `/api/categories` — Protégé JWT admin
Ajouter une catégorie.

**Body :**
```json
{
  "nom": "sport",
  "emoji": "⚽",
  "ordre": 5
}
```

**Règle :** Le nom doit être en minuscules, sans espaces ni caractères spéciaux.

#### PUT `/api/categories/:id` — Protégé JWT admin
Modifier une catégorie.

#### DELETE `/api/categories/:id` — Protégé JWT admin
Supprimer une catégorie. **Refusé si des produits utilisent encore cette catégorie.**

---

### 5.6 Panier (`/api/panier`) — Protégé JWT

#### GET `/api/panier`
Récupère le panier sauvegardé de l'utilisateur connecté.

#### POST `/api/panier`
Sauvegarde/remplace le panier complet.

**Body :**
```json
{
  "items": [
    { "produit_id": 1, "quantite": 2 },
    { "produit_id": 5, "quantite": 1 }
  ]
}
```

**Ce que ça fait :** Supprime l'ancien panier et insère les nouveaux items.

#### DELETE `/api/panier`
Vide le panier.

---

### 5.7 Commandes (`/api/commandes`) — Protégé JWT

#### GET `/api/commandes`
Retourne toutes les commandes de l'utilisateur avec le détail des produits.

#### POST `/api/commandes`
Enregistre une nouvelle commande après paiement.

**Body :**
```json
{
  "total": 179.98,
  "items": [
    {
      "produit_id": 1,
      "nom": "Air Max 2026",
      "emoji": "👟",
      "prix": 89.99,
      "quantite": 2
    }
  ]
}
```

**Ce que ça fait :**
1. Crée la commande en BDD
2. Insère chaque item dans `commandes_items`
3. Vide automatiquement le panier

---

## 6. Frontend NathBank

### 6.1 index.html — Connexion / Inscription

Page d'accueil de NathBank. Permet de :
- Se connecter à un compte existant
- Créer un nouveau compte

**Ce qui se passe techniquement lors de la connexion :**
1. L'utilisateur entre email + mot de passe
2. Le JS fait un `fetch` sur `POST /api/auth/login`
3. Si succès, le token JWT est sauvegardé dans `localStorage`
4. L'utilisateur est redirigé vers `dashboard.html`

**Design :** noir & or luxueux, font Cormorant Garamond.

---

### 6.2 dashboard.html — Tableau de bord

Page principale de l'utilisateur connecté. Affiche :
- Le solde disponible
- Le total dépensé
- Le nombre de transactions
- L'historique complet des transactions
- Un bouton "Déposer" (ouvre une modal)

**Au chargement de la page :**
1. Récupère le token depuis `localStorage`
2. Fait `GET /api/comptes/solde` pour le solde
3. Fait `GET /api/transactions/historique` pour l'historique
4. Affiche tout dynamiquement

---

### 6.3 paiement.html — Confirmation de paiement

Page animée qui confirme qu'un paiement a été effectué. Reçoit les informations via les paramètres d'URL.

---

## 7. Frontend NathStore

### 7.1 index.html — La boutique

Page principale du shop. Fonctionnalités complètes :

**Chargement initial :**
1. Charge les catégories depuis `GET /api/categories`
2. Génère dynamiquement les boutons de filtre (nav + pills)
3. Charge les produits depuis `GET /api/admin/produits`
4. Si l'utilisateur est connecté (token dans `localStorage`), charge son panier depuis la BDD

**Filtrage par catégorie :**
- Clic sur une catégorie → filtre les produits affichés
- Les boutons nav et pills sont synchronisés

**Login obligatoire pour acheter :**
- Clic sur "+" sans être connecté → ouvre la modal de connexion
- Une fois connecté, le panier est chargé depuis la BDD

**Panier sidebar :**
- S'ouvre en glissant depuis la droite
- Permet de modifier les quantités
- Sauvegarde automatiquement en BDD à chaque modification (`POST /api/panier`)
- Affiche le total en temps réel

**Paiement :**
1. Clic sur "Payer avec NathBank"
2. Modal de confirmation affiche le total et le nom de l'utilisateur
3. Clic "Confirmer" → `POST /api/transactions/payer`
4. Si succès → `POST /api/commandes` pour enregistrer
5. Panier vidé, message de confirmation avec nouveau solde

**Historique des commandes :**
- Bouton "Commandes" dans la nav (visible si connecté)
- Modal avec toutes les commandes passées

**Dark/Light mode :**
- Toggle dans la nav, change le thème via `data-theme` sur `<html>`

---

### 7.2 admin.html — Panel d'administration

Accessible sur `http://127.0.0.1:5500/nathstore/admin.html`

**Connexion :**
- Email : `admin@nathstore.com`
- Mot de passe : `admin2026`
- Token admin stocké dans `localStorage` (`adminToken`)

**Section Catégories :**
- Affichage de toutes les catégories sous forme de cards
- Formulaire pour ajouter une catégorie (nom + emoji + ordre)
- Bouton modifier (ouvre une modal)
- Bouton supprimer (bloqué si des produits utilisent la catégorie)

**Section Import JSON :**
- **Onglet "Coller du JSON"** : textarea pour coller directement du JSON
- **Onglet "Uploader un fichier"** : drag & drop ou sélection d'un fichier `.json`
- Barre de progression pendant l'import
- Message de confirmation avec nombre de produits importés / ignorés

**Format JSON attendu pour l'import :**
```json
[
  {
    "nom": "Air Max 2026",
    "emoji": "👟",
    "categorie": "mode",
    "prix": 89.99,
    "description": "Sneakers ultra confortables",
    "badge": "NEW"
  }
]
```

**Champs requis :** `nom`, `emoji`, `categorie`, `prix`
**Champs optionnels :** `description`, `badge`

**Section Ajouter un produit :**
- Formulaire manuel pour ajouter un produit
- Le select de catégorie est chargé dynamiquement depuis l'API

**Section Gérer les produits :**
- Tableau avec tous les produits
- Bouton "Modifier" → modal d'édition complète
- Bouton "Supprimer" → confirmation avant suppression

**Stats en haut :**
- Total produits
- Produits actifs
- Prix moyen
- Nombre de catégories

---

### 7.3 admin-help.html — Guide d'import JSON

Page de documentation complète expliquant :
- Le format JSON attendu
- Description de chaque champ
- Les catégories disponibles
- Des exemples copiables en un clic
- Les erreurs fréquentes
- Des conseils et astuces

---

## 8. Le Portail SNT (secret.html racine)

Landing page de présentation du projet avec :
- Architecture du projet
- Toutes les routes API listées avec méthodes colorées
- Stack technique
- Roadmap interactive (items cliquables pour cocher)
- Boutons pour ouvrir NathStore et NathBank

**Design :** dark, grille en arrière-plan, animations scroll reveal, style startup moderne.

---

## 9. Comptes de test

| Type | Email | Mot de passe | Notes |
|------|-------|-------------|-------|
| Utilisateur | `nath@mail.com` | `1234` | Solde initial 100€ |
| Admin | `admin@nathstore.com` | `admin2026` | Accès panel admin |

---

## 10. Comment lancer le projet

### Sur Mac

```bash
cd ~/projet-banque/banque
node index.js
```

Puis ouvrir `banque-frontend/index.html` ou `nathstore/index.html` avec Live Server dans VS Code.

Urls :
- Backend API : `http://localhost:3000`
- NathBank : `http://127.0.0.1:5500/banque-frontend`
- NathStore : `http://127.0.0.1:5500/nathstore`
- Portail SNT : `http://127.0.0.1:5500/secret.html`

### Configuration Live Server (important)

Dans `settings.json` de VS Code, ajouter :
```json
"liveServer.settings.ignoreFiles": ["**/*.db", "**/*.db-shm", "**/*.db-wal"]
```

Sans ça, chaque écriture en BDD recharge la page automatiquement.

---

## 11. Script seed.js — Remplir la BDD de produits

```bash
cd ~/projet-banque/banque
node seed.js
```

Ce script se connecte en tant qu'admin et insère automatiquement 20 produits répartis dans les 4 catégories de base (mode, tech, gaming, food).

---

## 12. Git — Sauvegarder et pousser le code

```bash
git add .                          # Préparer tous les fichiers modifiés
git commit -m "Description"        # Créer une sauvegarde locale
git push origin main               # Envoyer sur GitHub
```

Repo GitHub : `https://github.com/mickaelalves67170-ship-it/KernelAndCo.git`

Le `node_modules` est ignoré via `.gitignore` — après un clone, faire `npm install` dans `banque/`.

---

## 13. Problèmes connus et solutions

| Problème | Cause | Solution |
|---------|-------|----------|
| Page qui recharge à chaque action | Live Server détecte les écritures SQLite | Ajouter `ignoreFiles` dans settings.json |
| `Cannot find module './routes/categories'` | Fichier manquant | Créer `banque/routes/categories.js` |
| Erreur sqlite3 sur Windows | Module compilé pour Mac | Utiliser sql.js à la place |
| Push Git rejeté | Historiques divergents | `git push origin main --force` |
| HTTP 400 sur push | Fichiers trop lourds (node_modules) | Ajouter `.gitignore` et `git rm -r --cached node_modules` |

---

## 14. Architecture de communication

```
[NathStore frontend]                [NathBank frontend]
        |                                   |
        | fetch() HTTP                      | fetch() HTTP
        |                                   |
        v                                   v
[Backend Node.js Express - port 3000]
        |
        | sql.js
        |
        v
[banque.db - SQLite]
```

**Flux d'un achat sur NathStore :**
1. Utilisateur clique "+" → vérifie si connecté
2. Si non connecté → modal login → `POST /api/auth/login`
3. Token JWT stocké dans `localStorage`
4. Panier chargé depuis `GET /api/panier`
5. Modifications du panier → `POST /api/panier` (sauvegarde auto)
6. Clic "Payer" → `POST /api/transactions/payer` (débite le compte)
7. Succès → `POST /api/commandes` (enregistre la commande)
8. Panier vidé, confirmation affichée

---

© 2026 Nathanael — Projet SNT
