const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class DatabaseManager {
  constructor() {
    this.dbPath = path.join(__dirname, 'database.sqlite');
    this.db = null;
    this.initialized = false;
  }

  initDatabase() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err);
          reject(err);
          return;
        }
        console.log('Connected to SQLite database');
        this.createTables().then(() => {
          this.initialized = true;
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

  // Helper method to run SQL queries with promises
  runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (!this.isReady()) {
        reject(new Error('Database not initialized'));
        return;
      }
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  // Helper method to get single row
  getRow(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (!this.isReady()) {
        reject(new Error('Database not initialized'));
        return;
      }
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // Helper method to get all rows
  getAll(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (!this.isReady()) {
        reject(new Error('Database not initialized'));
        return;
      }
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
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
  async getAllCandidates() {
    try {
      return await this.getAll('SELECT * FROM candidates ORDER BY createdAt DESC');
    } catch (error) {
      console.error('Error getting all candidates:', error);
      return [];
    }
  }

  async getCandidateById(id) {
    try {
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
        registrationDate, status, totalPaid, remainingAmount, formationId, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      
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
      // Générer un numéro de reçu
      const paymentCount = await this.getAll('SELECT COUNT(*) as count FROM payments');
      const receiptNumber = `REC-${new Date().getFullYear()}-${String(paymentCount[0].count + 1).padStart(3, '0')}`;
      
      const sql = `INSERT INTO payments (
        candidateId, formationId, amount, paymentDate, paymentMethod, 
        status, receiptNumber, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
      
      const params = [
        payment.candidateId,
        payment.formationId,
        payment.amount,
        payment.paymentDate || new Date().toISOString().split('T')[0],
        payment.paymentMethod || 'cash',
        payment.status || 'Payé',
        receiptNumber,
        payment.notes || null
      ];

      const result = await this.runQuery(sql, params);
      
      // Mettre à jour le montant payé du candidat
      await this.updateCandidatePaymentTotals(payment.candidateId);
      
      return await this.getRow('SELECT * FROM payments WHERE id = ?', [result.id]);
    } catch (error) {
      console.error('Error creating payment:', error);
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
  async getAllFormations() {
    try {
      return await this.getAll('SELECT * FROM formations ORDER BY createdAt DESC');
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
        currentCandidates, startDate, endDate, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      
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
        formation.status || 'Planifié'
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

  // Statistiques du dashboard
  async getDashboardStats() {
    try {
      const candidates = await this.getAllCandidates();
      const payments = await this.getAllPayments();
      const formations = await this.getAllFormations();
      const certificates = await this.getAllCertificates();

      const totalRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0);
      const pendingPayments = candidates.filter(c => c.remainingAmount > 0).length;
      const activeFormations = formations.filter(f => f.status === "En cours").length;
      const issuedCertificates = certificates.filter(c => c.status === "Généré").length;

      return {
        totalCandidates: candidates.length,
        totalFormations: formations.length,
        totalRevenue,
        pendingPayments,
        activeFormations,
        issuedCertificates
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
    // No sample data initialization needed
    console.log('No sample data to initialize');
  }

  // Close database connection
  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
        } else {
          console.log('Database connection closed');
        }
      });
    }
  }
}

module.exports = DatabaseManager;