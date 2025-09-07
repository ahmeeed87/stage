const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const EventEmitter = require('events');

class DatabaseManager extends EventEmitter {
  constructor() {
    super();
    this.dbPath = path.join(__dirname, 'database.sqlite');
    this.db = null;
    this.initialized = false;
    this.connectionPool = [];
    this.maxConnections = 5;
    this.activeConnections = 0;
    this.pendingQueries = [];
    this.isProcessingQueue = false;
    this.queryTimeout = 30000; // 30 seconds
    this.retryAttempts = 3;
    this.retryDelay = 1000; // 1 second
    
    // Connection state tracking
    this.connectionStats = {
      totalQueries: 0,
      failedQueries: 0,
      averageQueryTime: 0,
      lastQueryTime: null,
      connectionErrors: 0
    };
    
    // Prepared statement cache
    this.statementCache = new Map();
    this.maxCacheSize = 100;
  }

  initDatabase() {
    return new Promise((resolve, reject) => {
      // Configure SQLite for better performance and connection management
      this.db = new sqlite3.Database(this.dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
        if (err) {
          console.error('Error opening database:', err);
          this.connectionStats.connectionErrors++;
          this.emit('error', err);
          reject(err);
          return;
        }
        
        console.log('Connected to SQLite database');
        this.emit('connected');
        
        // Configure database settings for better performance and thread safety
        this.db.serialize(() => {
          // Enable WAL mode for better concurrency and thread safety
          this.db.run('PRAGMA journal_mode = WAL', (err) => {
            if (err) console.error('Error setting WAL mode:', err);
          });
          
          // Set busy timeout to prevent database locks
          this.db.run('PRAGMA busy_timeout = 30000', (err) => {
            if (err) console.error('Error setting busy timeout:', err);
          });
          
          // Optimize for performance
          this.db.run('PRAGMA synchronous = NORMAL', (err) => {
            if (err) console.error('Error setting synchronous mode:', err);
          });
          
          this.db.run('PRAGMA cache_size = 10000', (err) => {
            if (err) console.error('Error setting cache size:', err);
          });
          
          this.db.run('PRAGMA temp_store = MEMORY', (err) => {
            if (err) console.error('Error setting temp store:', err);
          });
          
          // Enable foreign key constraints
          this.db.run('PRAGMA foreign_keys = ON', (err) => {
            if (err) console.error('Error enabling foreign keys:', err);
          });
          
          // Set query optimizer
          this.db.run('PRAGMA optimize', (err) => {
            if (err) console.error('Error optimizing database:', err);
          });
        });
        
        this.createTables().then(() => {
          this.initialized = true;
          this.emit('initialized');
          resolve();
        }).catch(reject);
      });
    });
  }

  createTables() {
    return new Promise((resolve, reject) => {
      const tables = [
        // Table des candidats
        `CREATE TABLE IF NOT EXISTS candidates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          firstName TEXT NOT NULL,
          lastName TEXT NOT NULL,
          email TEXT UNIQUE,
          phone TEXT,
          cin TEXT UNIQUE,
          address TEXT,
          birthDate TEXT,
          registrationDate TEXT DEFAULT CURRENT_DATE,
          status TEXT DEFAULT 'Actif',
          totalPaid REAL DEFAULT 0,
          remainingAmount REAL DEFAULT 0,
          formationId INTEGER,
          centerName TEXT,
          notes TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,

        // Table des formations
        `CREATE TABLE IF NOT EXISTS formations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT,
          duration TEXT,
          price REAL NOT NULL,
          instructor TEXT,
          maxParticipants INTEGER DEFAULT 20,
          currentCandidates INTEGER DEFAULT 0,
          startDate TEXT,
          endDate TEXT,
          status TEXT DEFAULT 'Planifié',
          centerName TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,

        // Table des paiements
        `CREATE TABLE IF NOT EXISTS payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          candidateId INTEGER NOT NULL,
          formationId INTEGER NOT NULL,
          amount REAL NOT NULL,
          paymentDate TEXT DEFAULT CURRENT_DATE,
          paymentMethod TEXT DEFAULT 'cash',
          status TEXT DEFAULT 'Payé',
          receiptNumber TEXT,
          notes TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (candidateId) REFERENCES candidates (id),
          FOREIGN KEY (formationId) REFERENCES formations (id)
        )`,

        // Table des certificats
        `CREATE TABLE IF NOT EXISTS certificates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          candidateId INTEGER NOT NULL,
          formationId INTEGER NOT NULL,
          certificateNumber TEXT UNIQUE,
          issueDate TEXT DEFAULT CURRENT_DATE,
          status TEXT DEFAULT 'Généré',
          notes TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (candidateId) REFERENCES candidates (id),
          FOREIGN KEY (formationId) REFERENCES formations (id)
        )`,

        // Table des notifications
        `CREATE TABLE IF NOT EXISTS notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          type TEXT DEFAULT 'info',
          status TEXT DEFAULT 'Non lu',
          date TEXT DEFAULT CURRENT_DATE,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,

        // Table des paramètres
        `CREATE TABLE IF NOT EXISTS settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key TEXT UNIQUE NOT NULL,
          value TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,

        // Table des utilisateurs
        `CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          firstName TEXT NOT NULL,
          lastName TEXT NOT NULL,
          centerName TEXT,
          role TEXT DEFAULT 'user',
          isActive BOOLEAN DEFAULT 1,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )`
      ];

      let completed = 0;
      tables.forEach((sql, index) => {
        this.db.run(sql, (err) => {
          if (err) {
            console.error(`Error creating table ${index + 1}:`, err);
            reject(err);
            return;
          }
          completed++;
          if (completed === tables.length) {
            this.initializeDefaultSettings().then(resolve).catch(reject);
          }
        });
      });
    });
  }

  initializeDefaultSettings() {
    return new Promise((resolve, reject) => {
      const defaultSettings = this.getDefaultSettings();
      const settings = Object.entries(defaultSettings);
      
      let completed = 0;
      if (settings.length === 0) {
        resolve();
        return;
      }

      settings.forEach(([key, value]) => {
        this.db.run(
          'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)',
          [key, JSON.stringify(value)],
          (err) => {
            if (err) {
              console.error('Error inserting default setting:', err);
              reject(err);
              return;
            }
            completed++;
            if (completed === settings.length) {
              resolve();
            }
          }
        );
      });
    });
  }

  // Check if database is ready
  isReady() {
    return this.initialized && this.db !== null;
  }

  // Check database health
  async checkHealth() {
    try {
      if (!this.isReady()) {
        return { healthy: false, error: 'Database not initialized' };
      }
      
      // Simple query to test database connectivity
      await this.getRow('SELECT 1 as test');
      return { healthy: true, timestamp: new Date().toISOString() };
    } catch (error) {
      console.error('Database health check failed:', error);
      return { healthy: false, error: error.message };
    }
  }

  // Enhanced query execution with retry logic and performance tracking
  async runQuery(sql, params = [], options = {}) {
    const startTime = Date.now();
    const { retryCount = 0, timeout = this.queryTimeout } = options;
    
    return new Promise((resolve, reject) => {
      if (!this.isReady()) {
        const error = new Error('Database not initialized');
        this.connectionStats.failedQueries++;
        this.emit('queryError', { sql, error, retryCount });
        reject(error);
        return;
      }
      
      // Add timeout to prevent hanging connections
      const timeoutId = setTimeout(() => {
        const error = new Error(`Database query timeout after ${timeout}ms`);
        this.connectionStats.failedQueries++;
        this.emit('queryTimeout', { sql, timeout, retryCount });
        reject(error);
      }, timeout);
      
      this.db.run(sql, params, function(err) {
        clearTimeout(timeoutId);
        const queryTime = Date.now() - startTime;
        
        if (err) {
          this.connectionStats.failedQueries++;
          this.emit('queryError', { sql, error: err, queryTime, retryCount });
          
          // Retry logic for certain errors
          if (retryCount < this.retryAttempts && this.shouldRetry(err)) {
            console.log(`Retrying query (attempt ${retryCount + 1}/${this.retryAttempts}):`, err.message);
            setTimeout(() => {
              this.runQuery(sql, params, { ...options, retryCount: retryCount + 1 })
                .then(resolve)
                .catch(reject);
            }, this.retryDelay * (retryCount + 1));
            return;
          }
          
          console.error('Database query error:', err);
          reject(err);
        } else {
          this.connectionStats.totalQueries++;
          this.connectionStats.lastQueryTime = new Date();
          this.updateAverageQueryTime(queryTime);
          this.emit('querySuccess', { sql, queryTime, retryCount });
          resolve({ id: this.lastID, changes: this.changes });
        }
      }.bind(this));
    });
  }

  // Helper method to get single row with enhanced error handling
  async getRow(sql, params = [], options = {}) {
    const startTime = Date.now();
    const { retryCount = 0, timeout = this.queryTimeout } = options;
    
    return new Promise((resolve, reject) => {
      if (!this.isReady()) {
        const error = new Error('Database not initialized');
        this.connectionStats.failedQueries++;
        this.emit('queryError', { sql, error, retryCount });
        reject(error);
        return;
      }
      
      const timeoutId = setTimeout(() => {
        const error = new Error(`Database query timeout after ${timeout}ms`);
        this.connectionStats.failedQueries++;
        this.emit('queryTimeout', { sql, timeout, retryCount });
        reject(error);
      }, timeout);
      
      this.db.get(sql, params, (err, row) => {
        clearTimeout(timeoutId);
        const queryTime = Date.now() - startTime;
        
        if (err) {
          this.connectionStats.failedQueries++;
          this.emit('queryError', { sql, error: err, queryTime, retryCount });
          
          if (retryCount < this.retryAttempts && this.shouldRetry(err)) {
            console.log(`Retrying getRow query (attempt ${retryCount + 1}/${this.retryAttempts}):`, err.message);
            setTimeout(() => {
              this.getRow(sql, params, { ...options, retryCount: retryCount + 1 })
                .then(resolve)
                .catch(reject);
            }, this.retryDelay * (retryCount + 1));
            return;
          }
          
          console.error('Database getRow error:', err);
          reject(err);
        } else {
          this.connectionStats.totalQueries++;
          this.connectionStats.lastQueryTime = new Date();
          this.updateAverageQueryTime(queryTime);
          this.emit('querySuccess', { sql, queryTime, retryCount });
          resolve(row);
        }
      });
    });
  }

  // Helper method to get all rows with enhanced error handling
  async getAll(sql, params = [], options = {}) {
    const startTime = Date.now();
    const { retryCount = 0, timeout = this.queryTimeout } = options;
    
    return new Promise((resolve, reject) => {
      if (!this.isReady()) {
        const error = new Error('Database not initialized');
        this.connectionStats.failedQueries++;
        this.emit('queryError', { sql, error, retryCount });
        reject(error);
        return;
      }
      
      const timeoutId = setTimeout(() => {
        const error = new Error(`Database query timeout after ${timeout}ms`);
        this.connectionStats.failedQueries++;
        this.emit('queryTimeout', { sql, timeout, retryCount });
        reject(error);
      }, timeout);
      
      this.db.all(sql, params, (err, rows) => {
        clearTimeout(timeoutId);
        const queryTime = Date.now() - startTime;
        
        if (err) {
          this.connectionStats.failedQueries++;
          this.emit('queryError', { sql, error: err, queryTime, retryCount });
          
          if (retryCount < this.retryAttempts && this.shouldRetry(err)) {
            console.log(`Retrying getAll query (attempt ${retryCount + 1}/${this.retryAttempts}):`, err.message);
            setTimeout(() => {
              this.getAll(sql, params, { ...options, retryCount: retryCount + 1 })
                .then(resolve)
                .catch(reject);
            }, this.retryDelay * (retryCount + 1));
            return;
          }
          
          console.error('Database getAll error:', err);
          reject(err);
        } else {
          this.connectionStats.totalQueries++;
          this.connectionStats.lastQueryTime = new Date();
          this.updateAverageQueryTime(queryTime);
          this.emit('querySuccess', { sql, queryTime, retryCount, rowCount: rows.length });
          resolve(rows);
        }
      });
    });
  }

  // Helper methods for enhanced database management
  shouldRetry(error) {
    const retryableErrors = [
      'SQLITE_BUSY',
      'SQLITE_LOCKED',
      'SQLITE_PROTOCOL',
      'SQLITE_CORRUPT'
    ];
    return retryableErrors.some(errType => error.message.includes(errType));
  }

  updateAverageQueryTime(queryTime) {
    const totalTime = this.connectionStats.averageQueryTime * (this.connectionStats.totalQueries - 1) + queryTime;
    this.connectionStats.averageQueryTime = totalTime / this.connectionStats.totalQueries;
  }

  // Transaction management
  async beginTransaction() {
    return this.runQuery('BEGIN TRANSACTION');
  }

  async commitTransaction() {
    return this.runQuery('COMMIT');
  }

  async rollbackTransaction() {
    return this.runQuery('ROLLBACK');
  }

  // Execute multiple queries in a transaction
  async executeTransaction(queries) {
    await this.beginTransaction();
    try {
      const results = [];
      for (const { sql, params } of queries) {
        const result = await this.runQuery(sql, params);
        results.push(result);
      }
      await this.commitTransaction();
      return results;
    } catch (error) {
      await this.rollbackTransaction();
      throw error;
    }
  }

  // Get connection statistics
  getConnectionStats() {
    return {
      ...this.connectionStats,
      activeConnections: this.activeConnections,
      pendingQueries: this.pendingQueries.length,
      statementCacheSize: this.statementCache.size,
      isReady: this.isReady()
    };
  }

  // Get default settings only (no sample data)
  getDefaultSettings() {
    return {
      centerName: "Forci Plus",
      centerAddress: "1 er étage, Imm Ayadi, A coté d'impasse Sidi Assem Jendouba 8100 8100 Jendouba, Tunisia",
      centerPhone: "+216 78 123 456",
      centerEmail: "contact@forciplus.tn",
      paymentReminderDays: 7,
      autoGenerateCertificates: true,
      theme: "light",
      language: "fr"
    };
  }

  // Méthodes CRUD pour les candidats
  async getAllCandidates(centerName = null) {
    try {
      let sql = 'SELECT * FROM candidates';
      let params = [];
      
      if (centerName) {
        sql += ' WHERE centerName = ?';
        params.push(centerName);
      }
      
      sql += ' ORDER BY createdAt DESC';
      return await this.getAll(sql, params);
    } catch (error) {
      console.error('Error getting all candidates:', error);
      // Return empty array instead of throwing to prevent crashes
      return [];
    }
  }

  async getCandidateById(id) {
    try {
      if (!id || isNaN(id)) {
        throw new Error('Invalid candidate ID');
      }
      return await this.getRow('SELECT * FROM candidates WHERE id = ?', [id]);
    } catch (error) {
      console.error('Error getting candidate by id:', error);
      return null;
    }
  }

  async createCandidate(candidate) {
    try {
      const sql = `INSERT INTO candidates (
        firstName, lastName, email, phone, cin, address, birthDate, 
        registrationDate, status, totalPaid, remainingAmount, formationId, centerName, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      
      const params = [
        candidate.firstName,
        candidate.lastName,
        candidate.email || null,
        candidate.phone || null,
        candidate.cin || null,
        candidate.address || null,
        candidate.birthDate || null,
        new Date().toISOString().split('T')[0],
        candidate.status || 'Actif',
        candidate.totalPaid || 0,
        candidate.remainingAmount || 0,
        candidate.formationId || null,
        candidate.centerName || null,
        candidate.notes || null
      ];

      const result = await this.runQuery(sql, params);
      return await this.getCandidateById(result.id);
    } catch (error) {
      console.error('Error creating candidate:', error);
      throw error;
    }
  }

  async updateCandidate(id, updates) {
    try {
      const fields = [];
      const values = [];
      
      Object.keys(updates).forEach(key => {
        if (key !== 'id') {
          fields.push(`${key} = ?`);
          values.push(updates[key]);
        }
      });
      
      if (fields.length === 0) {
        return await this.getCandidateById(id);
      }
      
      values.push(id);
      const sql = `UPDATE candidates SET ${fields.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`;
      
      await this.runQuery(sql, values);
      return await this.getCandidateById(id);
    } catch (error) {
      console.error('Error updating candidate:', error);
      throw error;
    }
  }

  async deleteCandidate(id) {
    try {
      await this.runQuery('DELETE FROM candidates WHERE id = ?', [id]);
      return true;
    } catch (error) {
      console.error('Error deleting candidate:', error);
      throw error;
    }
  }

  // Méthodes pour les paiements
  async getAllPayments() {
    try {
      return await this.getAll('SELECT * FROM payments ORDER BY createdAt DESC');
    } catch (error) {
      console.error('Error getting all payments:', error);
      return [];
    }
  }

  async getPaymentsByCandidate(candidateId) {
    try {
      return await this.getAll('SELECT * FROM payments WHERE candidateId = ? ORDER BY createdAt DESC', [candidateId]);
    } catch (error) {
      console.error('Error getting payments by candidate:', error);
      return [];
    }
  }

  async createPayment(payment) {
    try {
      // Use transaction to ensure data consistency
      const queries = [];
      
      // Generate receipt number
      const paymentCount = await this.getAll('SELECT COUNT(*) as count FROM payments');
      const receiptNumber = `REC-${new Date().getFullYear()}-${String(paymentCount[0].count + 1).padStart(3, '0')}`;
      
      // Insert payment
      const paymentSql = `INSERT INTO payments (
        candidateId, formationId, amount, paymentDate, paymentMethod, 
        status, receiptNumber, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
      
      const paymentParams = [
        payment.candidateId,
        payment.formationId,
        payment.amount,
        payment.paymentDate || new Date().toISOString().split('T')[0],
        payment.paymentMethod || 'cash',
        payment.status || 'Payé',
        receiptNumber,
        payment.notes || null
      ];

      queries.push({ sql: paymentSql, params: paymentParams });
      
      // Update candidate payment totals
      const updateSql = `UPDATE candidates SET 
        totalPaid = (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE candidateId = ? AND status != 'Annulé'),
        updatedAt = CURRENT_TIMESTAMP 
        WHERE id = ?`;
      queries.push({ sql: updateSql, params: [payment.candidateId, payment.candidateId] });
      
      // Execute in transaction
      const results = await this.executeTransaction(queries);
      const paymentId = results[0].id;
      
      return await this.getRow('SELECT * FROM payments WHERE id = ?', [paymentId]);
    } catch (error) {
      console.error('Error creating payment:', error);
      this.emit('paymentError', { error, payment });
      throw error;
    }
  }

  async updateCandidatePaymentTotals(candidateId) {
    try {
      const payments = await this.getAll('SELECT SUM(amount) as totalPaid FROM payments WHERE candidateId = ? AND status != ?', [candidateId, 'Annulé']);
      const totalPaid = payments[0].totalPaid || 0;
      
      await this.runQuery(
        'UPDATE candidates SET totalPaid = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
        [totalPaid, candidateId]
      );
    } catch (error) {
      console.error('Error updating candidate payment totals:', error);
    }
  }

  async savePayments(payments) {
    // Cette méthode n'est plus nécessaire avec SQLite
    console.log('savePayments method is deprecated with SQLite');
  }

  // Méthodes pour les formations
  async getAllFormations(centerName = null) {
    try {
      let sql = 'SELECT * FROM formations';
      let params = [];
      
      if (centerName) {
        sql += ' WHERE centerName = ?';
        params.push(centerName);
      }
      
      sql += ' ORDER BY createdAt DESC';
      return await this.getAll(sql, params);
    } catch (error) {
      console.error('Error getting all formations:', error);
      return [];
    }
  }

  async getFormationById(id) {
    try {
      return await this.getRow('SELECT * FROM formations WHERE id = ?', [id]);
    } catch (error) {
      console.error('Error getting formation by id:', error);
      return null;
    }
  }

  async createFormation(formation) {
    try {
      const sql = `INSERT INTO formations (
        title, description, duration, price, instructor, maxParticipants, 
        currentCandidates, startDate, endDate, status, centerName
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      
      const params = [
        formation.title,
        formation.description || null,
        formation.duration || null,
        formation.price,
        formation.instructor || null,
        formation.maxParticipants || 20,
        0, // currentCandidates starts at 0
        formation.startDate || null,
        formation.endDate || null,
        formation.status || 'Planifié',
        formation.centerName || null
      ];

      const result = await this.runQuery(sql, params);
      return await this.getFormationById(result.id);
    } catch (error) {
      console.error('Error creating formation:', error);
      throw error;
    }
  }

  // Check if formation has reached maximum capacity
  async checkFormationCapacity(formationId) {
    try {
      const formation = await this.getFormationById(formationId);
      if (!formation) return { hasReachedMax: false, message: '' };
      
      const candidates = await this.getAll('SELECT COUNT(*) as count FROM candidates WHERE formationId = ?', [formationId]);
      const candidateCount = candidates[0].count;
      
      const hasReachedMax = candidateCount >= (formation.maxParticipants || 20);
      const message = hasReachedMax 
        ? `Formation "${formation.title}" a atteint le nombre maximum de candidats (${formation.maxParticipants})`
        : '';
      
      return { hasReachedMax, message };
    } catch (error) {
      console.error('Error checking formation capacity:', error);
      return { hasReachedMax: false, message: '' };
    }
  }

  async updateFormation(id, updates) {
    try {
      const fields = [];
      const values = [];
      
      Object.keys(updates).forEach(key => {
        if (key !== 'id') {
          fields.push(`${key} = ?`);
          values.push(updates[key]);
        }
      });
      
      if (fields.length === 0) {
        return await this.getFormationById(id);
      }
      
      values.push(id);
      const sql = `UPDATE formations SET ${fields.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`;
      
      await this.runQuery(sql, values);
      return await this.getFormationById(id);
    } catch (error) {
      console.error('Error updating formation:', error);
      throw error;
    }
  }

  async deleteFormation(id) {
    try {
      await this.runQuery('DELETE FROM formations WHERE id = ?', [id]);
      return true;
    } catch (error) {
      console.error('Error deleting formation:', error);
      throw error;
    }
  }

  // Méthodes pour les attestations
  async getAllCertificates() {
    try {
      return await this.getAll('SELECT * FROM certificates ORDER BY createdAt DESC');
    } catch (error) {
      console.error('Error getting all certificates:', error);
      return [];
    }
  }

  async createCertificate(certificate) {
    try {
      // Générer un numéro de certificat
      const certCount = await this.getAll('SELECT COUNT(*) as count FROM certificates');
      const certificateNumber = `CERT-${new Date().getFullYear()}-${String(certCount[0].count + 1).padStart(3, '0')}`;
      
      const sql = `INSERT INTO certificates (
        candidateId, formationId, certificateNumber, issueDate, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?)`;
      
      const params = [
        certificate.candidateId,
        certificate.formationId,
        certificateNumber,
        certificate.issueDate || new Date().toISOString().split('T')[0],
        certificate.status || 'Généré',
        certificate.notes || null
      ];

      const result = await this.runQuery(sql, params);
      return await this.getRow('SELECT * FROM certificates WHERE id = ?', [result.id]);
    } catch (error) {
      console.error('Error creating certificate:', error);
      throw error;
    }
  }

  async saveCertificates(certificates) {
    // Cette méthode n'est plus nécessaire avec SQLite
    console.log('saveCertificates method is deprecated with SQLite');
  }

  // Méthodes pour les notifications
  async getAllNotifications() {
    try {
      return await this.getAll('SELECT * FROM notifications ORDER BY createdAt DESC');
    } catch (error) {
      console.error('Error getting all notifications:', error);
      return [];
    }
  }

  async createNotification(notification) {
    try {
      const sql = `INSERT INTO notifications (
        title, message, type, status, date
      ) VALUES (?, ?, ?, ?, ?)`;
      
      const params = [
        notification.title,
        notification.message,
        notification.type || 'info',
        notification.status || 'Non lu',
        notification.date || new Date().toISOString().split('T')[0]
      ];

      const result = await this.runQuery(sql, params);
      return await this.getRow('SELECT * FROM notifications WHERE id = ?', [result.id]);
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  async markNotificationAsRead(id) {
    try {
      await this.runQuery(
        'UPDATE notifications SET status = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
        ['Lu', id]
      );
      return await this.getRow('SELECT * FROM notifications WHERE id = ?', [id]);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  async saveNotifications(notifications) {
    // Cette méthode n'est plus nécessaire avec SQLite
    console.log('saveNotifications method is deprecated with SQLite');
  }

  // Statistiques du dashboard - optimized to prevent N+1 queries
  async getDashboardStats() {
    try {
      // Use single optimized query instead of multiple separate queries
      const stats = await this.getRow(`
        SELECT 
          (SELECT COUNT(*) FROM candidates) as totalCandidates,
          (SELECT COUNT(*) FROM formations) as totalFormations,
          (SELECT COALESCE(SUM(amount), 0) FROM payments) as totalRevenue,
          (SELECT COUNT(*) FROM candidates WHERE remainingAmount > 0) as pendingPayments,
          (SELECT COUNT(*) FROM formations WHERE status = 'En cours') as activeFormations,
          (SELECT COUNT(*) FROM certificates WHERE status = 'Généré') as issuedCertificates
      `);

      return {
        totalCandidates: stats.totalCandidates,
        totalFormations: stats.totalFormations,
        totalRevenue: stats.totalRevenue,
        pendingPayments: stats.pendingPayments,
        activeFormations: stats.activeFormations,
        issuedCertificates: stats.issuedCertificates
      };
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      return {
        totalCandidates: 0,
        totalFormations: 0,
        totalRevenue: 0,
        pendingPayments: 0,
        activeFormations: 0,
        issuedCertificates: 0
      };
    }
  }

  // Paramètres
  async getSetting(key) {
    try {
      const result = await this.getRow('SELECT value FROM settings WHERE key = ?', [key]);
      return result ? JSON.parse(result.value) : null;
    } catch (error) {
      console.error('Error getting setting:', error);
      return null;
    }
  }

  async setSetting(key, value) {
    try {
      await this.runQuery(
        'INSERT OR REPLACE INTO settings (key, value, updatedAt) VALUES (?, ?, CURRENT_TIMESTAMP)',
        [key, JSON.stringify(value)]
      );
    } catch (error) {
      console.error('Error setting setting:', error);
      throw error;
    }
  }

  async getDefaultSettingsAsync() {
    return this.getDefaultSettings();
  }

  // Force complete data reset - removes all existing data
  async forceResetAllData() {
    try {
      const tables = ['candidates', 'payments', 'formations', 'certificates', 'notifications'];
      for (const table of tables) {
        await this.runQuery(`DELETE FROM ${table}`);
      }
      await this.initializeDefaultSettings();
      return true;
    } catch (error) {
      console.error('Error resetting data:', error);
      throw error;
    }
  }

  // COMPLETE DATA CLEARING - removes all data including sample data
  async clearAllDataCompletely() {
    return await this.forceResetAllData();
  }

  // Reset all data to initial state
  async resetAllData() {
    return await this.forceResetAllData();
  }

  // Clear all data completely
  async clearAllData() {
    return await this.forceResetAllData();
  }

  // Initialize with sample data if empty
  async initializeWithSampleData() {
    // Initialize with default admin user
    await this.initializeDefaultAdmin();
    console.log('Default admin user initialized');
  }

  // Initialize default admin user
  async initializeDefaultAdmin() {
    try {
      // Check if admin user already exists
      const existingAdmin = await this.getRow('SELECT id FROM users WHERE username = ?', ['admin']);
      
      if (!existingAdmin) {
        // Create default admin user with hashed password
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash('admin', 10);
        
        await this.runQuery(`
          INSERT INTO users (username, email, password, firstName, lastName, centerName, role, isActive)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          'admin',
          'admin@example.com',
          hashedPassword,
          'Admin',
          'User',
          'Demo Center',
          'admin',
          1
        ]);
        
        console.log('Default admin user created');
      }
    } catch (error) {
      console.error('Error initializing default admin:', error);
    }
  }

  // User management methods
  async createUser(userData) {
    try {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const sql = `INSERT INTO users (
        username, email, password, firstName, lastName, centerName, role, isActive
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
      
      const params = [
        userData.username,
        userData.email,
        hashedPassword,
        userData.firstName,
        userData.lastName,
        userData.centerName || null,
        userData.role || 'user',
        1
      ];

      await this.runQuery(sql, params);
      
      // Get the user by username since we can't rely on result.id
      return await this.getUserByUsername(userData.username);
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async getUserById(id) {
    try {
      const user = await this.getRow('SELECT id, username, email, firstName, lastName, centerName, role, isActive, createdAt FROM users WHERE id = ?', [id]);
      return user;
    } catch (error) {
      console.error('Error getting user by id:', error);
      return null;
    }
  }

  async getUserByUsername(username) {
    try {
      const user = await this.getRow('SELECT * FROM users WHERE username = ? AND isActive = 1', [username]);
      return user;
    } catch (error) {
      console.error('Error getting user by username:', error);
      return null;
    }
  }

  async getUserByEmail(email) {
    try {
      const user = await this.getRow('SELECT * FROM users WHERE email = ? AND isActive = 1', [email]);
      return user;
    } catch (error) {
      console.error('Error getting user by email:', error);
      return null;
    }
  }

  async authenticateUser(username, password) {
    try {
      const user = await this.getUserByUsername(username);
      if (!user) {
        return null;
      }

      const bcrypt = require('bcryptjs');
      const isValidPassword = await bcrypt.compare(password, user.password);
      
      if (isValidPassword) {
        // Return user without password
        const { password: _, ...userWithoutPassword } = user;
        return userWithoutPassword;
      }
      
      return null;
    } catch (error) {
      console.error('Error authenticating user:', error);
      return null;
    }
  }

  async updateUser(id, updates) {
    try {
      const fields = [];
      const values = [];
      
      Object.keys(updates).forEach(key => {
        if (key !== 'id' && key !== 'password') {
          fields.push(`${key} = ?`);
          values.push(updates[key]);
        }
      });
      
      if (fields.length === 0) {
        return await this.getUserById(id);
      }
      
      values.push(id);
      const sql = `UPDATE users SET ${fields.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`;
      
      await this.runQuery(sql, values);
      return await this.getUserById(id);
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  async deleteUser(id) {
    try {
      // Soft delete - set isActive to 0
      await this.runQuery('UPDATE users SET isActive = 0, updatedAt = CURRENT_TIMESTAMP WHERE id = ?', [id]);
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  async getAllUsers() {
    try {
      return await this.getAll('SELECT id, username, email, firstName, lastName, centerName, role, isActive, createdAt FROM users ORDER BY createdAt DESC');
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  }

  // Enhanced database connection cleanup with monitoring
  close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        console.log('Closing database connection...');
        this.emit('closing');
        
        // Finalize all prepared statements
        this.db.serialize(() => {
          // Clear statement cache
          this.statementCache.clear();
          
          // Optimize database before closing
          this.db.run('PRAGMA optimize', (err) => {
            if (err) {
              console.error('Error optimizing database before close:', err);
            }
          });
          
          // Close WAL mode gracefully
          this.db.run('PRAGMA journal_mode = DELETE', (err) => {
            if (err) {
              console.error('Error switching from WAL mode:', err);
            }
          });
          
          this.db.close((err) => {
            if (err) {
              console.error('Error closing database:', err);
              this.connectionStats.connectionErrors++;
              this.emit('closeError', err);
              reject(err);
            } else {
              console.log('Database connection closed successfully');
              this.emit('closed');
              this.db = null;
              this.initialized = false;
              this.activeConnections = 0;
              resolve();
            }
          });
        });
      } else {
        resolve();
      }
    });
  }

  // Force close database connection (for emergency cleanup)
  forceClose() {
    if (this.db) {
      try {
        this.statementCache.clear();
        this.db.close();
        this.db = null;
        this.initialized = false;
        this.activeConnections = 0;
        this.emit('forceClosed');
        console.log('Database connection force closed');
      } catch (error) {
        console.error('Error force closing database:', error);
        this.emit('forceCloseError', error);
      }
    }
  }

  // Comprehensive debugging and monitoring methods
  getDebugInfo() {
    return {
      connectionStats: this.getConnectionStats(),
      databasePath: this.dbPath,
      isReady: this.isReady(),
      initialized: this.initialized,
      timestamp: new Date().toISOString(),
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    };
  }

  // Log database performance metrics
  logPerformanceMetrics() {
    const stats = this.getConnectionStats();
    console.log('=== Database Performance Metrics ===');
    console.log(`Total Queries: ${stats.totalQueries}`);
    console.log(`Failed Queries: ${stats.failedQueries}`);
    console.log(`Success Rate: ${((stats.totalQueries - stats.failedQueries) / stats.totalQueries * 100).toFixed(2)}%`);
    console.log(`Average Query Time: ${stats.averageQueryTime.toFixed(2)}ms`);
    console.log(`Last Query Time: ${stats.lastQueryTime}`);
    console.log(`Connection Errors: ${stats.connectionErrors}`);
    console.log(`Statement Cache Size: ${stats.statementCacheSize}`);
    console.log('=====================================');
  }

  // Health check with detailed diagnostics
  async getDetailedHealthCheck() {
    try {
      const startTime = Date.now();
      
      // Basic connectivity test
      await this.getRow('SELECT 1 as test');
      const responseTime = Date.now() - startTime;
      
      // Get database info
      const dbInfo = await this.getRow('PRAGMA database_list');
      const walInfo = await this.getRow('PRAGMA journal_mode');
      const pageCount = await this.getRow('PRAGMA page_count');
      const pageSize = await this.getRow('PRAGMA page_size');
      
      return {
        healthy: true,
        responseTime,
        timestamp: new Date().toISOString(),
        database: {
          path: dbInfo.file,
          journalMode: walInfo.journal_mode,
          pageCount: pageCount.page_count,
          pageSize: pageSize.page_size,
          sizeKB: Math.round((pageCount.page_count * pageSize.page_size) / 1024)
        },
        connectionStats: this.getConnectionStats(),
        memoryUsage: process.memoryUsage()
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        connectionStats: this.getConnectionStats()
      };
    }
  }

  // Monitor database locks and performance
  async checkForLocks() {
    try {
      const lockInfo = await this.getRow('PRAGMA database_list');
      const walInfo = await this.getRow('PRAGMA journal_mode');
      
      return {
        hasLocks: false, // SQLite doesn't provide direct lock info
        journalMode: walInfo.journal_mode,
        databasePath: lockInfo.file,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        hasLocks: true,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Cleanup old prepared statements
  cleanupStatementCache() {
    if (this.statementCache.size > this.maxCacheSize) {
      const entries = Array.from(this.statementCache.entries());
      const toDelete = entries.slice(0, entries.length - this.maxCacheSize);
      
      toDelete.forEach(([key]) => {
        this.statementCache.delete(key);
      });
      
      console.log(`Cleaned up ${toDelete.length} cached statements`);
    }
  }
}

module.exports = DatabaseManager;