class ApiService {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
    this.token = localStorage.getItem('auth_token');
    this.refreshToken = localStorage.getItem('refresh_token');
  }

  // Set authentication token
  setAuthToken(token, refreshToken = null) {
    this.token = token;
    if (refreshToken) {
      this.refreshToken = refreshToken;
    }
    localStorage.setItem('auth_token', token);
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken);
    }
  }

  // Clear authentication
  clearAuth() {
    this.token = null;
    this.refreshToken = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
  }

  // Get headers for API requests
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    return headers;
  }

  // Make HTTP request with error handling
  async makeRequest(endpoint, options = {}) {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const config = {
        headers: this.getHeaders(),
        ...options,
      };

      const response = await fetch(url, config);
      
      // Handle token refresh if 401
      if (response.status === 401 && this.refreshToken) {
        const refreshed = await this.refreshAuthToken();
        if (refreshed) {
          // Retry the original request
          config.headers = this.getHeaders();
          const retryResponse = await fetch(url, config);
          return this.handleResponse(retryResponse);
        }
      }

      return this.handleResponse(response);
    } catch (error) {
      console.error('API Request Error:', error);
      throw new Error(`Network error: ${error.message}`);
    }
  }

  // Handle API response
  async handleResponse(response) {
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }
      
      return data;
    } else {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return await response.text();
    }
  }

  // Refresh authentication token
  async refreshAuthToken() {
    try {
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        this.setAuthToken(data.token, data.refreshToken);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }

  // Authentication endpoints
  async login(credentials) {
    return this.makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async register(userData) {
    return this.makeRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async logout() {
    try {
      await this.makeRequest('/auth/logout', {
        method: 'POST',
      });
    } finally {
      this.clearAuth();
    }
  }

  async getProfile() {
    return this.makeRequest('/auth/profile');
  }

  // Candidates API
  async getCandidates(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.makeRequest(`/candidates${queryString ? `?${queryString}` : ''}`);
  }

  async getCandidateById(id) {
    return this.makeRequest(`/candidates/${id}`);
  }

  async createCandidate(candidateData) {
    return this.makeRequest('/candidates', {
      method: 'POST',
      body: JSON.stringify(candidateData),
    });
  }

  async updateCandidate(id, updates) {
    return this.makeRequest(`/candidates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteCandidate(id) {
    return this.makeRequest(`/candidates/${id}`, {
      method: 'DELETE',
    });
  }

  async searchCandidates(query) {
    return this.makeRequest(`/candidates/search?q=${encodeURIComponent(query)}`);
  }

  // Formations API
  async getFormations(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.makeRequest(`/formations${queryString ? `?${queryString}` : ''}`);
  }

  async getFormationById(id) {
    return this.makeRequest(`/formations/${id}`);
  }

  async createFormation(formationData) {
    return this.makeRequest('/formations', {
      method: 'POST',
      body: JSON.stringify(formationData),
    });
  }

  async updateFormation(id, updates) {
    return this.makeRequest(`/formations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteFormation(id) {
    return this.makeRequest(`/formations/${id}`, {
      method: 'DELETE',
    });
  }

  async getFormationStats(id) {
    return this.makeRequest(`/formations/${id}/stats`);
  }

  // Payments API
  async getPayments(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.makeRequest(`/payments${queryString ? `?${queryString}` : ''}`);
  }

  async getPaymentById(id) {
    return this.makeRequest(`/payments/${id}`);
  }

  async createPayment(paymentData) {
    return this.makeRequest('/payments', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  }

  async updatePayment(id, updates) {
    return this.makeRequest(`/payments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deletePayment(id) {
    return this.makeRequest(`/payments/${id}`, {
      method: 'DELETE',
    });
  }

  async getPaymentReceipt(id) {
    return this.makeRequest(`/payments/${id}/receipt`);
  }

  // Certificates API
  async getCertificates(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.makeRequest(`/certificates${queryString ? `?${queryString}` : ''}`);
  }

  async getCertificateById(id) {
    return this.makeRequest(`/certificates/${id}`);
  }

  async createCertificate(certificateData) {
    return this.makeRequest('/certificates', {
      method: 'POST',
      body: JSON.stringify(certificateData),
    });
  }

  async updateCertificate(id, updates) {
    return this.makeRequest(`/certificates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteCertificate(id) {
    return this.makeRequest(`/certificates/${id}`, {
      method: 'DELETE',
    });
  }

  async generateCertificatePDF(id) {
    return this.makeRequest(`/certificates/${id}/pdf`);
  }

  async verifyCertificate(certificateNumber) {
    return this.makeRequest(`/certificates/verify/${certificateNumber}`);
  }

  // Notifications API
  async getNotifications(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.makeRequest(`/notifications${queryString ? `?${queryString}` : ''}`);
  }

  async getNotificationById(id) {
    return this.makeRequest(`/notifications/${id}`);
  }

  async createNotification(notificationData) {
    return this.makeRequest('/notifications', {
      method: 'POST',
      body: JSON.stringify(notificationData),
    });
  }

  async updateNotification(id, updates) {
    return this.makeRequest(`/notifications/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteNotification(id) {
    return this.makeRequest(`/notifications/${id}`, {
      method: 'DELETE',
    });
  }

  async markNotificationAsRead(id) {
    return this.makeRequest(`/notifications/${id}/read`, {
      method: 'PATCH',
    });
  }

  async markAllNotificationsAsRead() {
    return this.makeRequest('/notifications/read-all', {
      method: 'PATCH',
    });
  }

  // Dashboard API
  async getDashboardStats() {
    return this.makeRequest('/dashboard/stats');
  }

  async getDashboardCharts(timeRange = 'month') {
    return this.makeRequest(`/dashboard/charts?range=${timeRange}`);
  }

  async getRecentActivity(limit = 10) {
    return this.makeRequest(`/dashboard/activity?limit=${limit}`);
  }

  // Reports API
  async generateReport(type, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.makeRequest(`/reports/${type}${queryString ? `?${queryString}` : ''}`);
  }

  async exportReport(type, format = 'pdf', params = {}) {
    const queryString = new URLSearchParams({ ...params, format }).toString();
    return this.makeRequest(`/reports/${type}/export?${queryString}`);
  }

  // Settings API
  async getSettings() {
    return this.makeRequest('/settings');
  }

  async updateSettings(updates) {
    return this.makeRequest('/settings', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async getSetting(key) {
    return this.makeRequest(`/settings/${key}`);
  }

  async setSetting(key, value) {
    return this.makeRequest(`/settings/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    });
  }

  // File upload API
  async uploadFile(file, type = 'document') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    return this.makeRequest('/upload', {
      method: 'POST',
      headers: {
        // Remove Content-Type to let browser set it with boundary
        'Authorization': this.getHeaders()['Authorization'],
      },
      body: formData,
    });
  }

  async deleteFile(fileId) {
    return this.makeRequest(`/upload/${fileId}`, {
      method: 'DELETE',
    });
  }

  // Data sync API
  async syncData() {
    return this.makeRequest('/sync');
  }

  async getSyncStatus() {
    return this.makeRequest('/sync/status');
  }

  async backupData() {
    return this.makeRequest('/backup');
  }

  async restoreData(backupId) {
    return this.makeRequest(`/backup/${backupId}/restore`, {
      method: 'POST',
    });
  }

  // Health check
  async healthCheck() {
    return this.makeRequest('/health');
  }

  // Get API version
  async getApiVersion() {
    return this.makeRequest('/version');
  }
}

export default ApiService;
