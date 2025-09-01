# Gestion Administrative - Application de Gestion de Centre de Formation

## Description
Application complète de gestion administrative pour centres de formation, développée avec React, Electron et Node.js.

## Fonctionnalités
- **Tableau de bord** : Vue d'ensemble des statistiques
- **Gestion des candidats** : Ajout, modification, suppression des candidats
- **Gestion des formations** : Création et suivi des programmes de formation
- **Gestion des paiements** : Suivi des paiements et génération de reçus
- **Gestion des attestations** : Génération et gestion des certificats
- **Système de notifications** : Alertes et rappels
- **Paramètres** : Configuration du système
- **Interface moderne** : Design responsive avec thème sombre/clair

## Prérequis
- **Node.js** version 16.0.0 ou supérieure
- **npm** (inclus avec Node.js)

## Installation

### 1. Installer les dépendances principales
```bash
npm install
```

### 2. Installer les dépendances du serveur
```bash
cd server
npm install
cd ..
```

## Démarrage de l'application

### Option 1 : Démarrage complet automatique (Recommandé)
Double-cliquez sur le fichier `start-complete-app.bat`

### Option 2 : Démarrage manuel
1. **Démarrer le serveur backend :**
   ```bash
   cd server
   npm start
   ```

2. **Dans un nouveau terminal, démarrer l'application :**
   ```bash
   npm run electron-dev
   ```

### Option 3 : Application web uniquement
```bash
npm start
```
L'application sera accessible sur http://localhost:3000

## Structure de l'application

```
app-stage/
├── src/                    # Code source React
│   ├── components/         # Composants réutilisables
│   ├── pages/             # Pages de l'application
│   ├── contexts/          # Contextes React (thème, authentification)
│   └── utils/             # Utilitaires et services
├── server/                 # Serveur backend Node.js
│   ├── server.js          # Serveur principal
│   └── database.js        # Gestionnaire de base de données
├── public/                 # Fichiers publics et Electron
└── build/                  # Dossier de build (créé après npm run build)
```

## Configuration

### Variables d'environnement
Créez un fichier `.env` dans le dossier `server/` :

```env
PORT=3000
NODE_ENV=production
FRONTEND_URL=http://localhost:3000
JWT_SECRET=votre-secret-jwt
JWT_REFRESH_SECRET=votre-secret-refresh
```

### Base de données
L'application utilise SQLite par défaut. Les données sont stockées dans `server/database.sqlite`.

## Build de production

### 1. Build de l'application React
```bash
npm run build
```

### 2. Build de l'application Electron
```bash
npm run electron-pack
```

### 3. Build complet avec distribution
```bash
npm run dist
```

## Déploiement

### Serveur de production
1. Copiez le dossier `server/` sur votre serveur
2. Installez les dépendances : `npm install --production`
3. Configurez les variables d'environnement
4. Démarrez avec : `npm start`

### Application desktop
1. Exécutez `npm run dist`
2. Les fichiers d'installation seront dans le dossier `dist/`
3. Distribuez le fichier `.exe` (Windows) ou `.dmg` (Mac) généré

## Support technique

Pour toute question ou problème technique, contactez l'équipe de développement.

## Licence
Application développée pour [Nom du Client] - Tous droits réservés.

---
**Version :** 1.0.0  
**Date :** $(Get-Date -Format "dd/MM/yyyy")  
**Développé par :** [Votre nom/entreprise]
