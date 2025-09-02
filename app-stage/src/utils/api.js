class ApiService {
  constructor() {
    // Use environment variable or fallback to localhost for development
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
    this.token = localStorage.getItem('auth_token');
    this.refreshToken = localStorage.getItem('refresh_token');
    
    // Rate limiting configuration
    this.rateLimitConfig = {
      maxRetries: 3,
      baseDelay: 1000, // 1 second
      maxDelay: 30000, // 30 seconds
      retryStatuses: [429, 500, 502, 503, 504]
    };
    
    // Request tracking for rate limiting
    this.requestQueue = [];
    this.isProcessingQueue = false;
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

  // Calculate exponential backoff delay
  calculateBackoffDelay(attempt) {
    const delay = Math.min(
      this.rateLimitConfig.baseDelay * Math.pow(2, attempt),
      this.rateLimitConfig.maxDelay
    );
    // Add jitter to prevent thundering herd
    return delay + Math.random() * 1000;
  }

  // Wait for specified time
  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Process request queue with rate limiting
  async processRequestQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      
      try {
        // Add delay between requests to respect rate limits
        if (this.requestQueue.length > 0) {
          await this.wait(100); // 100ms delay between requests
        }
        
        const result = await this.executeRequest(request.execute);
        request.resolve(result);
      } catch (error) {
        request.reject(error);
      }
    }

    this.isProcessingQueue = false;
  }

  // Add request to queue
  async queueRequest(requestFn) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        execute: requestFn,
        resolve,
        reject
      });
      
      this.processRequestQueue();
    });
  }

  // Execute a single request with retry logic
  async executeRequest(requestFn, retryCount = 0) {
    try {
      return await requestFn();
    } catch (error) {
      // Check if we should retry
      if (retryCount < this.rateLimitConfig.maxRetries && 
          this.rateLimitConfig.retryStatuses.includes(error.status)) {
        
        const delay = this.calculateBackoffDelay(retryCount);
        console.log(`Request failed with status ${error.status}, retrying in ${delay}ms (attempt ${retryCount + 1})`);
        
        await this.wait(delay);
        return this.executeRequest(requestFn, retryCount + 1);
      }
      
      throw error;
    }
  }

  // Make HTTP request with error handling and rate limiting
  async makeRequest(endpoint, options = {}) {
    const requestFn = async () => {
      try {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
          headers: this.getHeaders(),
          ...options,
        };

        const response = await fetch(url, config);
        
        // Handle rate limiting specifically
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const delay = retryAfter ? parseInt(retryAfter) * 1000 : this.calculateBackoffDelay(0);
          
          console.log(`Rate limited, waiting ${delay}ms before retry`);
          await this.wait(delay);
          
          // Retry the request once after waiting
          const retryResponse = await fetch(url, config);
          return this.handleResponse(retryResponse);
        }
        
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
    };

    // Queue the request to respect rate limits
    return this.queueRequest(requestFn);
  }

  // Handle API response
  async handleResponse(response) {
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      
      if (!response.ok) {
        const error = new Error(data.message || `HTTP ${response.status}`);
        error.status = response.status;
        error.data = data;
        throw error;
      }
      
      return data;
    } else {
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}`);
        error.status = response.status;
        throw error;
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

  // Utility method to check if error is rate limiting
  isRateLimitError(error) {
    return error.status === 429;
  }

  // Utility method to get retry after delay from error
  getRetryAfterDelay(error) {
    if (error.data && error.data.retryAfter) {
      return parseInt(error.data.retryAfter) * 1000;
    }
    return this.rateLimitConfig.baseDelay;
  }
}

export default ApiService;
