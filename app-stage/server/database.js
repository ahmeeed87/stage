const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const EventEmitter = require("events");
class DatabaseManager extends EventEmitter {
  constructor() {
    super();
    this.dbPath = path.resolve(__dirname, "database.sqlite");
    this.db = new sqlite3.Database(this.dbPath, err => {
      if (err) {
        console.error("DB error:", err);
        this.emit("error", err);
      } else {
        console.log("DB connected");
        this.emit("connected");
        this.initDatabase();
      }
    });
  }
  async initDatabase() {
    try {
      await this.createTables();
      // Ensure required columns exist (migrations for existing DB)
      try {
        const userCols = await this.getAll("PRAGMA table_info('users')");
        const hasIsActive = userCols.some((c) => c && c.name === 'isActive');
        if (!hasIsActive) {
          await this.runQuery("ALTER TABLE users ADD COLUMN isActive INTEGER DEFAULT 1");
          console.log('DB migration: added isActive column to users');
        }
      } catch (migErr) {
        // Non-fatal migration error, log and continue
        console.warn('DB migration check failed:', migErr && migErr.message ? migErr.message : migErr);
      }
      console.log("DB initialized");
      this.emit("initialized");
    } catch (error) {
      console.error("Init error:", error);
      this.emit("error", error);
    }
  }
  async createTables() {
    const tables = [
  "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT UNIQUE, email TEXT UNIQUE, password TEXT, firstName TEXT, lastName TEXT, centerName TEXT, role TEXT DEFAULT \"user\", isActive INTEGER DEFAULT 1, createdAt DATETIME DEFAULT CURRENT_TIMESTAMP)",
      "CREATE TABLE IF NOT EXISTS candidates (id INTEGER PRIMARY KEY, firstName TEXT, lastName TEXT, email TEXT, phone TEXT, registrationDate TEXT, formationId INTEGER, centerName TEXT, status TEXT DEFAULT \"Actif\", createdAt DATETIME DEFAULT CURRENT_TIMESTAMP)",
      "CREATE TABLE IF NOT EXISTS formations (id INTEGER PRIMARY KEY, title TEXT, description TEXT, startDate TEXT, endDate TEXT, price REAL, maxParticipants INTEGER, centerName TEXT, status TEXT DEFAULT \"Planifié\", createdAt DATETIME DEFAULT CURRENT_TIMESTAMP)",
      "CREATE TABLE IF NOT EXISTS payments (id INTEGER PRIMARY KEY, candidateId INTEGER, formationId INTEGER, amount REAL, paymentDate TEXT, paymentMethod TEXT, receiptNumber TEXT UNIQUE, status TEXT DEFAULT \"Payé\", createdAt DATETIME DEFAULT CURRENT_TIMESTAMP)",
      "CREATE TABLE IF NOT EXISTS certificates (id INTEGER PRIMARY KEY, candidateId INTEGER, formationId INTEGER, certificateNumber TEXT UNIQUE, issueDate TEXT, status TEXT DEFAULT \"Généré\", createdAt DATETIME DEFAULT CURRENT_TIMESTAMP)",
      "CREATE TABLE IF NOT EXISTS notifications (id INTEGER PRIMARY KEY, title TEXT, message TEXT, status TEXT DEFAULT \"Non lu\", createdAt DATETIME DEFAULT CURRENT_TIMESTAMP)"
    ];
    for (const sql of tables) {
      await this.runQuery(sql);
    }
  }
  async runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }
  async getRow(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }
  async getAll(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }
  async getUserById(id) { return this.getRow("SELECT * FROM users WHERE id = ?", [id]); }
  async getUserByUsername(username) { return this.getRow("SELECT * FROM users WHERE username = ?", [username]); }
  async getUserByEmail(email) { return this.getRow("SELECT * FROM users WHERE email = ?", [email]); }
  async getAllUsers() { return this.getAll("SELECT * FROM users ORDER BY createdAt DESC"); }
  async authenticateUser(username, password) {
    const user = await this.getUserByUsername(username);
    if (!user) return null;
    if (password === user.password) return user;
    return null;
  }
  async createUser(userData) {
    const result = await this.runQuery(
      "INSERT INTO users (username, email, password, firstName, lastName, centerName, role, isActive) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        userData.username,
        userData.email,
        userData.password,
        userData.firstName || "",
        userData.lastName || "",
        userData.centerName || null,
        userData.role || "user",
        userData.isActive === undefined ? 1 : (userData.isActive ? 1 : 0)
      ]
    );
    return this.getUserById(result.lastID);
  }
  async updateUser(id, updates) {
    const fields = [];
    const values = [];
    Object.entries(updates).forEach(([key, value]) => {
      if (key !== "id" && value !== undefined) {
        fields.push(key + " = ?");
        values.push(value);
      }
    });
    if (fields.length === 0) return null;
    values.push(id);
    await this.runQuery("UPDATE users SET " + fields.join(", ") + " WHERE id = ?", values);
    return this.getUserById(id);
  }
  async deleteUser(id) {
    const result = await this.runQuery("DELETE FROM users WHERE id = ?", [id]);
    return result.changes > 0;
  }
  async getAllCandidates(centerName = null) {
    let sql = "SELECT * FROM candidates";
    if (centerName) sql += " WHERE centerName = ?";
    sql += " ORDER BY createdAt DESC";
    return this.getAll(sql, centerName ? [centerName] : []);
  }
  async getCandidateById(id) { return this.getRow("SELECT * FROM candidates WHERE id = ?", [id]); }
  async createCandidate(candidateData) {
    const result = await this.runQuery(
      "INSERT INTO candidates (firstName, lastName, email, phone, registrationDate, formationId, centerName, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [candidateData.firstName, candidateData.lastName, candidateData.email || null, candidateData.phone || null, new Date().toISOString().split("T")[0], candidateData.formationId || null, candidateData.centerName || null, "Actif"]
    );
    return this.getCandidateById(result.lastID);
  }
  async updateCandidate(id, updates) {
    const fields = [];
    const values = [];
    Object.entries(updates).forEach(([key, value]) => {
      if (key !== "id" && value !== undefined) {
        fields.push(key + " = ?");
        values.push(value);
      }
    });
    if (fields.length === 0) return null;
    values.push(id);
    await this.runQuery("UPDATE candidates SET " + fields.join(", ") + " WHERE id = ?", values);
    return this.getCandidateById(id);
  }
  async deleteCandidate(id) {
    const result = await this.runQuery("DELETE FROM candidates WHERE id = ?", [id]);
    return result.changes > 0;
  }
  async getAllFormations(centerName = null) {
    let sql = "SELECT * FROM formations";
    if (centerName) sql += " WHERE centerName = ?";
    sql += " ORDER BY createdAt DESC";
    return this.getAll(sql, centerName ? [centerName] : []);
  }
  async getFormationById(id) { return this.getRow("SELECT * FROM formations WHERE id = ?", [id]); }
  async createFormation(formationData) {
    const result = await this.runQuery(
      "INSERT INTO formations (title, description, startDate, endDate, price, maxParticipants, centerName, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [formationData.title, formationData.description || null, formationData.startDate || null, formationData.endDate || null, formationData.price || 0, formationData.maxParticipants || 20, formationData.centerName || null, "Planifié"]
    );
    return this.getFormationById(result.lastID);
  }
  async updateFormation(id, updates) {
    const fields = [];
    const values = [];
    Object.entries(updates).forEach(([key, value]) => {
      if (key !== "id" && value !== undefined) {
        fields.push(key + " = ?");
        values.push(value);
      }
    });
    if (fields.length === 0) return null;
    values.push(id);
    await this.runQuery("UPDATE formations SET " + fields.join(", ") + " WHERE id = ?", values);
    return this.getFormationById(id);
  }
  async deleteFormation(id) {
    const result = await this.runQuery("DELETE FROM formations WHERE id = ?", [id]);
    return result.changes > 0;
  }
  async checkFormationCapacity(formationId) {
    const formation = await this.getFormationById(formationId);
    if (!formation) return { hasReachedMax: false, message: "" };
    const candidates = await this.getAll("SELECT COUNT(*) as count FROM candidates WHERE formationId = ?", [formationId]);
    const count = candidates[0]?.count || 0;
    return { hasReachedMax: count >= (formation.maxParticipants || 20), message: "" };
  }
  async getAllPayments() { return this.getAll("SELECT * FROM payments ORDER BY createdAt DESC"); }
  async createPayment(paymentData) {
    const result = await this.runQuery(
      "INSERT INTO payments (candidateId, formationId, amount, paymentDate, paymentMethod, receiptNumber) VALUES (?, ?, ?, ?, ?, ?)",
      [paymentData.candidateId, paymentData.formationId || null, paymentData.amount, paymentData.paymentDate || new Date().toISOString().split("T")[0], paymentData.paymentMethod || "cash", "REC-" + Date.now()]
    );
    return this.getRow("SELECT * FROM payments WHERE id = ?", [result.lastID]);
  }
  async getAllCertificates() { return this.getAll("SELECT * FROM certificates ORDER BY createdAt DESC"); }
  async createCertificate(certificateData) {
    const result = await this.runQuery(
      "INSERT INTO certificates (candidateId, formationId, certificateNumber, issueDate) VALUES (?, ?, ?, ?)",
      [certificateData.candidateId, certificateData.formationId || null, "CERT-" + Date.now(), new Date().toISOString().split("T")[0]]
    );
    return this.getRow("SELECT * FROM certificates WHERE id = ?", [result.lastID]);
  }
  async getAllNotifications() { return this.getAll("SELECT * FROM notifications ORDER BY createdAt DESC"); }
  async createNotification(notificationData) {
    const result = await this.runQuery(
      "INSERT INTO notifications (title, message, status) VALUES (?, ?, ?)",
      [notificationData.title, notificationData.message || null, "Non lu"]
    );
    return this.getRow("SELECT * FROM notifications WHERE id = ?", [result.lastID]);
  }
  async markNotificationAsRead(id) {
    await this.runQuery("UPDATE notifications SET status = ? WHERE id = ?", ["Lu", id]);
    return this.getRow("SELECT * FROM notifications WHERE id = ?", [id]);
  }
  getDefaultSettings() { return { centerName: "Forci Plus", theme: "light", language: "fr" }; }
  async getDefaultSettingsAsync() { return this.getDefaultSettings(); }
  async getDashboardStats() {
    const candidates = await this.getAll("SELECT COUNT(*) as count FROM candidates");
    const formations = await this.getAll("SELECT COUNT(*) as count FROM formations");
    const payments = await this.getAll("SELECT COALESCE(SUM(amount), 0) as total FROM payments");
    const certificates = await this.getAll("SELECT COUNT(*) as count FROM certificates");
    return { totalCandidates: candidates[0]?.count || 0, totalFormations: formations[0]?.count || 0, totalRevenue: payments[0]?.total || 0, issuedCertificates: certificates[0]?.count || 0 };
  }
  async close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close(err => {
          if (err) reject(err);
          else { console.log("DB closed"); resolve(); }
        });
      } else { resolve(); }
    });
  }
  getDebugInfo() { return { memoryUsage: process.memoryUsage(), uptime: process.uptime() }; }
  getConnectionStats() { return { connected: true, database: this.dbPath }; }
  async getDetailedHealthCheck() {
    try {
      const stats = await this.getDashboardStats();
      return { healthy: true, database: "sqlite", ...stats };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }
  async checkForLocks() { return { locked: false }; }
  async logPerformanceMetrics() { console.log("Metrics:", this.getConnectionStats()); }
  async resetAllData() {
    const tables = ["users", "candidates", "formations", "payments", "certificates", "notifications"];
    for (const table of tables) {
      await this.runQuery("DELETE FROM " + table);
    }
    return true;
  }
  async clearAllDataCompletely() { return this.resetAllData(); }
}
module.exports = DatabaseManager;
