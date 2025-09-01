class DatabaseManager {
  constructor() {
    this.storageKey = 'formation-center-data';
    this.initDatabase();
  }

  initDatabase() {
    // Only initialize if no data exists
    const existingData = this.getData();
    if (!existingData) {
      const initialData = {
        candidates: [],
        payments: [],
        formations: [],
        certificates: [],
        notifications: [],
        settings: this.getDefaultSettings()
      };
      this.saveData(initialData);
    }
  }

  // Get all data from storage
  getData() {
    try {
      // In a real server, this would be a database connection
      // For demo purposes, we'll use a simple in-memory store
      if (!this._data) {
        this._data = {
          candidates: [],
          payments: [],
          formations: [],
          certificates: [],
          notifications: [],
          settings: this.getDefaultSettings()
        };
      }
      return this._data;
    } catch (error) {
      console.error('Error getting data:', error);
      return null;
    }
  }

  // Save all data to storage
  saveData(data) {
    try {
      this._data = data;
      return true;
    } catch (error) {
      console.error('Error saving data:', error);
      return false;
    }
  }

  // Force complete data reset - removes all existing data
  forceResetAllData() {
    this._data = null;
    this.initDatabase();
    return true;
  }

  // COMPLETE DATA CLEARING - removes all data including sample data
  clearAllDataCompletely() {
    this._data = {
      candidates: [],
      payments: [],
      formations: [],
      certificates: [],
      notifications: [],
      settings: this.getDefaultSettings()
    };
    this.saveData(this._data);
    return true;
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
  getAllCandidates() {
    const data = this.getData();
    return data.candidates || [];
  }

  getCandidateById(id) {
    const candidates = this.getAllCandidates();
    return candidates.find(candidate => candidate.id === id);
  }

  createCandidate(candidate) {
    const data = this.getData();
    const candidates = data.candidates || [];
    const newCandidate = { 
      ...candidate, 
      id: Date.now(),
      registrationDate: new Date().toISOString().split('T')[0],
      status: "Actif",
      totalPaid: 0,
      remainingAmount: 0
    };
    candidates.push(newCandidate);
    data.candidates = candidates;
    this.saveData(data);
    return newCandidate;
  }

  updateCandidate(id, updates) {
    const data = this.getData();
    const candidates = data.candidates || [];
    const index = candidates.findIndex(candidate => candidate.id === id);
    if (index !== -1) {
      candidates[index] = { ...candidates[index], ...updates };
      data.candidates = candidates;
      this.saveData(data);
      return candidates[index];
    }
    return null;
  }

  deleteCandidate(id) {
    const data = this.getData();
    const candidates = data.candidates || [];
    const filteredCandidates = candidates.filter(candidate => candidate.id !== id);
    data.candidates = filteredCandidates;
    this.saveData(data);
    return true;
  }

  // Méthodes pour les paiements
  getAllPayments() {
    const data = this.getData();
    return data.payments || [];
  }

  getPaymentsByCandidate(candidateId) {
    const payments = this.getAllPayments();
    return payments.filter(payment => payment.candidateId === candidateId);
  }

  createPayment(payment) {
    const data = this.getData();
    const payments = data.payments || [];
    const newPayment = {
      ...payment,
      id: Date.now(),
      paymentDate: new Date().toISOString().split('T')[0],
      receiptNumber: `REC-${new Date().getFullYear()}-${String(payments.length + 1).padStart(3, '0')}`,
      status: "Payé"
    };
    payments.push(newPayment);
    data.payments = payments;
    
    // Mettre à jour le montant payé du candidat
    const candidates = data.candidates || [];
    const candidateIndex = candidates.findIndex(c => c.id === payment.candidateId);
    if (candidateIndex !== -1) {
      candidates[candidateIndex].totalPaid += payment.amount;
      candidates[candidateIndex].remainingAmount = Math.max(0, candidates[candidateIndex].remainingAmount - payment.amount);
      data.candidates = candidates;
    }
    
    this.saveData(data);
    return newPayment;
  }

  savePayments(payments) {
    const data = this.getData();
    data.payments = payments;
    this.saveData(data);
  }

  // Méthodes pour les formations
  getAllFormations() {
    const data = this.getData();
    return data.formations || [];
  }

  getFormationById(id) {
    const formations = this.getAllFormations();
    return formations.find(formation => formation.id === id);
  }

  createFormation(formation) {
    const data = this.getData();
    const formations = data.formations || [];
    const newFormation = {
      ...formation,
      id: Date.now(),
      currentCandidates: 0,
      maxParticipants: formation.maxParticipants || 20, // Default max participants
      status: "Planifié"
    };
    formations.push(newFormation);
    data.formations = formations;
    this.saveData(data);
    return newFormation;
  }

  // Check if formation has reached maximum capacity
  checkFormationCapacity(formationId) {
    const formation = this.getFormationById(formationId);
    if (!formation) return { hasReachedMax: false, message: '' };
    
    const candidates = this.getAllCandidates();
    const formationCandidates = candidates.filter(c => c.formationId === formationId);
    
    const hasReachedMax = formationCandidates.length >= (formation.maxParticipants || 20);
    const message = hasReachedMax 
      ? `Formation "${formation.title}" a atteint le nombre maximum de candidats (${formation.maxParticipants})`
      : '';
    
    return { hasReachedMax, message };
  }

  updateFormation(id, updates) {
    const data = this.getData();
    const formations = data.formations || [];
    const index = formations.findIndex(formation => formation.id === id);
    if (index !== -1) {
      formations[index] = { ...formations[index], ...updates };
      data.formations = formations;
      this.saveData(data);
      return formations[index];
    }
    return null;
  }

  deleteFormation(id) {
    const data = this.getData();
    const formations = data.formations || [];
    const index = formations.findIndex(formation => formation.id === id);
    if (index !== -1) {
      formations.splice(index, 1);
      data.formations = formations;
      this.saveData(data);
      return true;
    }
    return false;
  }

  // Méthodes pour les attestations
  getAllCertificates() {
    const data = this.getData();
    return data.certificates || [];
  }

  createCertificate(certificate) {
    const data = this.getData();
    const certificates = data.certificates || [];
    const newCertificate = {
      ...certificate,
      id: Date.now(),
      certificateNumber: `CERT-${new Date().getFullYear()}-${String(certificates.length + 1).padStart(3, '0')}`,
      issueDate: new Date().toISOString().split('T')[0],
      status: "Généré"
    };
    certificates.push(newCertificate);
    data.certificates = certificates;
    this.saveData(data);
    return newCertificate;
  }

  saveCertificates(certificates) {
    const data = this.getData();
    data.certificates = certificates;
    this.saveData(data);
  }

  // Méthodes pour les notifications
  getAllNotifications() {
    const data = this.getData();
    return data.notifications || [];
  }

  createNotification(notification) {
    const data = this.getData();
    const notifications = data.notifications || [];
    const newNotification = {
      ...notification,
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      status: "Non lu"
    };
    notifications.push(newNotification);
    data.notifications = notifications;
    this.saveData(data);
    return newNotification;
  }

  markNotificationAsRead(id) {
    const data = this.getData();
    const notifications = data.notifications || [];
    const index = notifications.findIndex(notification => notification.id === id);
    if (index !== -1) {
      notifications[index].status = "Lu";
      data.notifications = notifications;
      this.saveData(data);
      return notifications[index];
    }
    return null;
  }

  // Sauvegarder toutes les notifications
  saveNotifications(notifications) {
    const data = this.getData();
    data.notifications = notifications;
    this.saveData(data);
  }

  // Statistiques du dashboard
  getDashboardStats() {
    const candidates = this.getAllCandidates();
    const payments = this.getAllPayments();
    const formations = this.getAllFormations();
    const certificates = this.getAllCertificates();

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
  }

  // Paramètres
  getSetting(key) {
    const data = this.getData();
    return data.settings?.[key];
  }

  setSetting(key, value) {
    const data = this.getData();
    data.settings = data.settings || {};
    data.settings[key] = value;
    this.saveData(data);
  }

  // Reset all data to initial state
  resetAllData() {
    return this.forceResetAllData();
  }

  // Clear all data completely
  clearAllData() {
    this._data = null;
    return true;
  }

  // Initialize with sample data if empty
  initializeWithSampleData() {
    const data = this.getData();
    if (!data.candidates || data.candidates.length === 0) {
      data.candidates = []; // No sample data to initialize
    }
    if (!data.formations || data.formations.length === 0) {
      data.formations = []; // No sample data to initialize
    }
    if (!data.payments || data.payments.length === 0) {
      data.payments = []; // No sample data to initialize
    }
    if (!data.certificates || data.certificates.length === 0) {
      data.certificates = []; // No sample data to initialize
    }
    if (!data.notifications || data.notifications.length === 0) {
      data.notifications = []; // No sample data to initialize
    }
    this.saveData(data);
  }
}

module.exports = DatabaseManager;
