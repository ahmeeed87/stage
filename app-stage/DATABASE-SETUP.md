# Configuration de la Base de Données SQLite

## 🎉 Migration Terminée !

Le projet a été migré avec succès de la base de données en mémoire vers **SQLite**.

## 📊 Structure de la Base de Données

### Tables Créées :

1. **`candidates`** - Informations des candidats
   - id, firstName, lastName, email, phone, cin, address, birthDate
   - registrationDate, status, totalPaid, remainingAmount, formationId, notes
   - createdAt, updatedAt

2. **`formations`** - Informations des formations
   - id, title, description, duration, price, instructor
   - maxParticipants, currentCandidates, startDate, endDate, status
   - createdAt, updatedAt

3. **`payments`** - Informations des paiements
   - id, candidateId, formationId, amount, paymentDate, paymentMethod
   - status, receiptNumber, notes, createdAt, updatedAt

4. **`certificates`** - Informations des certificats
   - id, candidateId, formationId, certificateNumber, issueDate, status, notes
   - createdAt, updatedAt

5. **`notifications`** - Informations des notifications
   - id, title, message, type, status, date, createdAt, updatedAt

6. **`settings`** - Paramètres de l'application
   - id, key, value, createdAt, updatedAt

## 🚀 Démarrage du Serveur

### Option 1 : Script Automatique
```bash
# Double-cliquez sur le fichier
start-server.bat
```

### Option 2 : Manuel
```bash
# Aller dans le dossier server
cd server

# Installer les dépendances
npm install

# Démarrer le serveur
node server.js
```

## 📁 Fichiers de Base de Données

- **Fichier SQLite** : `server/database.sqlite`
- **Configuration** : `server/config.example.js`

## ⚙️ Configuration

1. **Copiez le fichier de configuration** :
   ```bash
   cp server/config.example.js server/config.js
   ```

2. **Modifiez les clés de sécurité** dans `server/config.js` :
   ```javascript
   JWT_SECRET: 'votre-cle-secrete-personnalisee',
   JWT_REFRESH_SECRET: 'votre-cle-refresh-personnalisee'
   ```

## 🔧 Avantages de SQLite

✅ **Persistance des données** - Les données ne sont plus perdues au redémarrage  
✅ **Performance** - Accès rapide aux données  
✅ **Fiabilité** - Base de données robuste et testée  
✅ **Simplicité** - Aucune configuration serveur requise  
✅ **Portabilité** - Fichier unique facile à sauvegarder  

## 📈 Fonctionnalités

- **CRUD complet** pour toutes les entités
- **Relations entre tables** avec clés étrangères
- **Génération automatique** des numéros de reçu et certificats
- **Calcul automatique** des totaux de paiement
- **Gestion des paramètres** de l'application
- **Statistiques du dashboard** en temps réel

## 🛠️ Maintenance

### Sauvegarde
```bash
# Copiez simplement le fichier database.sqlite
cp server/database.sqlite backup/database-backup-$(date +%Y%m%d).sqlite
```

### Réinitialisation
```bash
# Supprimez le fichier database.sqlite pour repartir à zéro
rm server/database.sqlite
```

## 🔍 Vérification

Une fois le serveur démarré, vous devriez voir :
```
✅ Database initialized successfully
🚀 Server running on port 3001
📊 API available at http://localhost:3001/api
🏥 Health check: http://localhost:3001/api/health
```

## 📞 Support

Si vous rencontrez des problèmes :
1. Vérifiez que Node.js est installé
2. Vérifiez que les dépendances sont installées (`npm install`)
3. Vérifiez les permissions d'écriture dans le dossier `server/`
4. Consultez les logs du serveur pour plus de détails
