class DatabaseManager {
  constructor() {
    this.storageKey = 'formation-center-data';
    this.initDatabase();
  }

  initDatabase() {
    // Only initialize if no data exists
    const existingData = localStorage.getItem(this.storageKey);
    if (!existingData) {
      const initialData = {
        candidates: [],
        payments: [],
        formations: [],
        certificates: [],
        notifications: [],
        settings: this.getDefaultSettings()
      };
      localStorage.setItem(this.storageKey, JSON.stringify(initialData));
    }
  }

  // Force complete data reset - removes all existing data
  forceResetAllData() {
    localStorage.removeItem(this.storageKey);
    this.initDatabase();
    return true;
  }

  getSampleCandidates() {
    return [
      
    ];
  }

  getSampleFormations() {
    return [
     
    ];
  }

  getSamplePayments() {
    return [
      
    ];
  }

  getSampleCertificates() {
    return [
     
    ];
  }

  getSampleNotifications() {
    return [
      
    ];
  }

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
    const data = JSON.parse(localStorage.getItem(this.storageKey));
    return data.candidates || [];
  }

  getCandidateById(id) {
    const candidates = this.getAllCandidates();
    return candidates.find(candidate => candidate.id === id);
  }

  createCandidate(candidate) {
    const data = JSON.parse(localStorage.getItem(this.storageKey));
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
    localStorage.setItem(this.storageKey, JSON.stringify(data));
    return newCandidate;
  }

  updateCandidate(id, updates) {
    const data = JSON.parse(localStorage.getItem(this.storageKey));
    const candidates = data.candidates || [];
    const index = candidates.findIndex(candidate => candidate.id === id);
    if (index !== -1) {
      candidates[index] = { ...candidates[index], ...updates };
      data.candidates = candidates;
      localStorage.setItem(this.storageKey, JSON.stringify(data));
      return candidates[index];
    }
    return null;
  }

  deleteCandidate(id) {
    const data = JSON.parse(localStorage.getItem(this.storageKey));
    const candidates = data.candidates || [];
    const filteredCandidates = candidates.filter(candidate => candidate.id !== id);
    data.candidates = filteredCandidates;
    localStorage.setItem(this.storageKey, JSON.stringify(data));
    return true;
  }

  // Méthodes pour les paiements
  getAllPayments() {
    const data = JSON.parse(localStorage.getItem(this.storageKey));
    return data.payments || [];
  }

  getPaymentsByCandidate(candidateId) {
    const payments = this.getAllPayments();
    return payments.filter(payment => payment.candidateId === candidateId);
  }

  createPayment(payment) {
    const data = JSON.parse(localStorage.getItem(this.storageKey));
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
    
    localStorage.setItem(this.storageKey, JSON.stringify(data));
    return newPayment;
  }

  deletePayment(id) {
    const data = JSON.parse(localStorage.getItem(this.storageKey));
    const payments = data.payments || [];
    const paymentIndex = payments.findIndex(payment => payment.id === id);
    
    if (paymentIndex !== -1) {
      const payment = payments[paymentIndex];
      
      // Mettre à jour le montant payé du candidat (soustraire le montant supprimé)
      const candidates = data.candidates || [];
      const candidateIndex = candidates.findIndex(c => c.id === payment.candidateId);
      if (candidateIndex !== -1) {
        candidates[candidateIndex].totalPaid = Math.max(0, candidates[candidateIndex].totalPaid - payment.amount);
        // Recalculer le reste à payer
        const formation = data.formations.find(f => f.id === payment.formationId);
        if (formation) {
          candidates[candidateIndex].remainingAmount = Math.max(0, formation.price - candidates[candidateIndex].totalPaid);
        }
        data.candidates = candidates;
      }
      
      // Supprimer le paiement
      payments.splice(paymentIndex, 1);
      data.payments = payments;
      localStorage.setItem(this.storageKey, JSON.stringify(data));
      return true;
    }
    return false;
  }

  // Méthodes pour les formations
  getAllFormations() {
    const data = JSON.parse(localStorage.getItem(this.storageKey));
    return data.formations || [];
  }

  getFormationById(id) {
    const formations = this.getAllFormations();
    return formations.find(formation => formation.id === id);
  }

  createFormation(formation) {
    const data = JSON.parse(localStorage.getItem(this.storageKey));
    const formations = data.formations || [];
    const newFormation = {
      ...formation,
      id: Date.now(),
      currentCandidates: 0,
      status: "Planifié"
    };
    formations.push(newFormation);
    data.formations = formations;
    localStorage.setItem(this.storageKey, JSON.stringify(data));
    return newFormation;
  }

  updateFormation(id, updates) {
    const data = JSON.parse(localStorage.getItem(this.storageKey));
    const formations = data.formations || [];
    const index = formations.findIndex(formation => formation.id === id);
    if (index !== -1) {
      formations[index] = { ...formations[index], ...updates };
      data.formations = formations;
      localStorage.setItem(this.storageKey, JSON.stringify(data));
      return formations[index];
    }
    return null;
  }

  deleteFormation(id) {
    const data = JSON.parse(localStorage.getItem(this.storageKey));
    const formations = data.formations || [];
    const index = formations.findIndex(formation => formation.id === id);
    if (index !== -1) {
      formations.splice(index, 1);
      data.formations = formations;
      localStorage.setItem(this.storageKey, JSON.stringify(data));
      return true;
    }
    return false;
  }

  // Méthodes pour les attestations
  getAllCertificates() {
    const data = JSON.parse(localStorage.getItem(this.storageKey));
    return data.certificates || [];
  }

  createCertificate(certificate) {
    const data = JSON.parse(localStorage.getItem(this.storageKey));
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
    localStorage.setItem(this.storageKey, JSON.stringify(data));
    return newCertificate;
  }

  // Méthodes pour les notifications
  getAllNotifications() {
    const data = JSON.parse(localStorage.getItem(this.storageKey));
    return data.notifications || [];
  }

  createNotification(notification) {
    const data = JSON.parse(localStorage.getItem(this.storageKey));
    const notifications = data.notifications || [];
    const newNotification = {
      ...notification,
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      status: "Non lu"
    };
    notifications.push(newNotification);
    data.notifications = notifications;
    localStorage.setItem(this.storageKey, JSON.stringify(data));
    return newNotification;
  }

  markNotificationAsRead(id) {
    const data = JSON.parse(localStorage.getItem(this.storageKey));
    const notifications = data.notifications || [];
    const index = notifications.findIndex(notification => notification.id === id);
    if (index !== -1) {
      notifications[index].status = "Lu";
      data.notifications = notifications;
      localStorage.setItem(this.storageKey, JSON.stringify(data));
      return notifications[index];
    }
    return null;
  }

  // Sauvegarder toutes les notifications
  saveNotifications(notifications) {
    const data = JSON.parse(localStorage.getItem(this.storageKey));
    data.notifications = notifications;
    localStorage.setItem(this.storageKey, JSON.stringify(data));
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

  // Debug method to get data counts
  getDataCounts() {
    return {
      candidates: this.getAllCandidates().length,
      formations: this.getAllFormations().length,
      payments: this.getAllPayments().length,
      certificates: this.getAllCertificates().length,
      notifications: this.getAllNotifications().length,
      sampleDataCleared: this.isSampleDataCleared()
    };
  }

  // Paramètres
  getSetting(key) {
    const data = JSON.parse(localStorage.getItem(this.storageKey));
    return data.settings?.[key];
  }

  setSetting(key, value) {
    const data = JSON.parse(localStorage.getItem(this.storageKey));
    data.settings = data.settings || {};
    data.settings[key] = value;
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  // Reset all data to initial state
  resetAllData() {
    return this.forceResetAllData();
  }

  // COMPLETE DATA CLEARING - removes all data including sample data
  clearAllDataCompletely() {
    const initialData = {
      candidates: [],
      payments: [],
      formations: [],
      certificates: [],
      notifications: [],
      settings: this.getDefaultSettings()
    };
    localStorage.setItem(this.storageKey, JSON.stringify(initialData));
    return true;
  }

  // Clear sample data and prevent re-initialization
  clearSampleData() {
    const data = this.getData();
    // Mark that sample data has been cleared
    data.sampleDataCleared = true;
    localStorage.setItem(this.storageKey, JSON.stringify(data));
    return true;
  }

  // Check if sample data has been manually cleared
  isSampleDataCleared() {
    const data = this.getData();
    return data.sampleDataCleared === true;
  }

  // Get all data from storage
  getData() {
    try {
      const data = JSON.parse(localStorage.getItem(this.storageKey));
      if (!data) {
        return {
          candidates: [],
          payments: [],
          formations: [],
          certificates: [],
          notifications: [],
          settings: this.getDefaultSettings()
        };
      }
      return data;
    } catch (error) {
      console.error('Error getting data:', error);
      return {
        candidates: [],
        payments: [],
        formations: [],
        certificates: [],
        notifications: [],
        settings: this.getDefaultSettings()
      };
    }
  }

  // Save all data to storage
  saveData(data) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Error saving data:', error);
      return false;
    }
  }

  // Initialize with sample data if empty
  initializeWithSampleData() {
    const data = JSON.parse(localStorage.getItem(this.storageKey));
    
    // Don't add sample data if it has been manually cleared
    if (data.sampleDataCleared === true) {
      return;
    }
    
    let hasChanges = false;
    
    // Only add sample data if the database is completely empty (first time use)
    if (!data.candidates || data.candidates.length === 0) {
      data.candidates = this.getSampleCandidates();
      hasChanges = true;
    }
    if (!data.formations || data.formations.length === 0) {
      data.formations = this.getSampleFormations();
      hasChanges = true;
    }
    if (!data.payments || data.payments.length === 0) {
      data.payments = this.getSamplePayments();
      hasChanges = true;
    }
    if (!data.certificates || data.certificates.length === 0) {
      data.certificates = this.getSampleCertificates();
      hasChanges = true;
    }
    if (!data.notifications || data.notifications.length === 0) {
      data.notifications = this.getSampleNotifications();
      hasChanges = true;
    }
    
    // Only save if we actually added sample data
    if (hasChanges) {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    }
  }
}

export default DatabaseManager; 