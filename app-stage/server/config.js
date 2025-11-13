// Configuration pour le serveur
module.exports = {
  // Port du serveur
  PORT: process.env.PORT || 3001,

  // Environnement
  NODE_ENV: process.env.NODE_ENV || 'development',

  // URL du frontend
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',

  // Clés de sécurité
  JWT_SECRET: process.env.JWT_SECRET || 'votre-cle-secrete-jwt-personnalisee-formation-center-2024',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'votre-cle-secrete-refresh-personnalisee-formation-center-2024',

  // Configuration de la base de données
  DATABASE_PATH: process.env.DATABASE_PATH || './database.sqlite',

  // Configuration des uploads
  UPLOAD_PATH: process.env.UPLOAD_PATH || './uploads',
  MAX_FILE_SIZE: process.env.MAX_FILE_SIZE || 10485760,

  // Niveau de log
  LOG_LEVEL: process.env.LOG_LEVEL || 'info'
};