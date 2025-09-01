const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Database setup
const DatabaseManager = require('./database');

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // allow 50 requests per 15 minutes, then...
  delayMs: 500 // begin adding 500ms of delay per request above 50
});

app.use('/api/', limiter);
app.use('/api/', speedLimiter);

// Logging
app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database initialization
const db = new DatabaseManager();

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API version endpoint
app.get('/api/version', (req, res) => {
  res.json({
    version: '1.0.0',
    name: 'Formation Center API',
    description: 'API for Formation Center Management System'
  });
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    // In a real app, you would verify JWT tokens here
    // For demo purposes, we'll use a simple token check
    if (token === 'demo-token') {
      req.user = { id: 1, email: 'demo@example.com', role: 'admin' };
      next();
    } else {
      return res.status(403).json({ message: 'Invalid token' });
    }
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token' });
  }
};

// Authentication routes
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  // Demo authentication - in real app, verify against database
  if (username === 'admin' && password === 'admin') {
    res.json({
      token: 'demo-token',
      refreshToken: 'demo-refresh-token',
      user: {
        id: 1,
        username: 'admin',
        firstName: 'Admin',
        lastName: 'User',
        centerName: 'Demo Center',
        role: 'admin'
      }
    });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

app.post('/api/auth/register', (req, res) => {
  const { email, password, firstName, lastName, centerName } = req.body;
  
  // Demo registration - in real app, save to database
  res.json({
    token: 'demo-token',
    refreshToken: 'demo-refresh-token',
    user: {
      id: 1,
      email,
      firstName,
      lastName,
      centerName,
      role: 'admin'
    }
  });
});

app.post('/api/auth/logout', authenticateToken, (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

app.get('/api/auth/profile', authenticateToken, (req, res) => {
  res.json({
    id: 1,
    email: 'admin@example.com',
    firstName: 'Admin',
    lastName: 'User',
    centerName: 'Demo Center',
    role: 'admin'
  });
});

// Candidates API
app.get('/api/candidates', authenticateToken, (req, res) => {
  try {
    const candidates = db.getAllCandidates();
    res.json(candidates);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching candidates' });
  }
});

app.get('/api/candidates/:id', authenticateToken, (req, res) => {
  try {
    const candidate = db.getCandidateById(parseInt(req.params.id));
    if (candidate) {
      res.json(candidate);
    } else {
      res.status(404).json({ message: 'Candidate not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error fetching candidate' });
  }
});

app.post('/api/candidates', authenticateToken, (req, res) => {
  try {
    const newCandidate = db.createCandidate(req.body);
    res.status(201).json(newCandidate);
  } catch (error) {
    res.status(500).json({ message: 'Error creating candidate' });
  }
});

app.put('/api/candidates/:id', authenticateToken, (req, res) => {
  try {
    const updatedCandidate = db.updateCandidate(parseInt(req.params.id), req.body);
    if (updatedCandidate) {
      res.json(updatedCandidate);
    } else {
      res.status(404).json({ message: 'Candidate not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error updating candidate' });
  }
});

app.delete('/api/candidates/:id', authenticateToken, (req, res) => {
  try {
    const success = db.deleteCandidate(parseInt(req.params.id));
    if (success) {
      res.json({ message: 'Candidate deleted successfully' });
    } else {
      res.status(404).json({ message: 'Candidate not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error deleting candidate' });
  }
});

app.get('/api/candidates/search', authenticateToken, (req, res) => {
  try {
    const query = req.query.q;
    const candidates = db.getAllCandidates();
    const filtered = candidates.filter(candidate => 
      candidate.firstName.toLowerCase().includes(query.toLowerCase()) ||
      candidate.lastName.toLowerCase().includes(query.toLowerCase()) ||
      candidate.email.toLowerCase().includes(query.toLowerCase())
    );
    res.json(filtered);
  } catch (error) {
    res.status(500).json({ message: 'Error searching candidates' });
  }
});

// Formations API
app.get('/api/formations', authenticateToken, (req, res) => {
  try {
    const formations = db.getAllFormations();
    res.json(formations);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching formations' });
  }
});

app.get('/api/formations/:id', authenticateToken, (req, res) => {
  try {
    const formation = db.getFormationById(parseInt(req.params.id));
    if (formation) {
      res.json(formation);
    } else {
      res.status(404).json({ message: 'Formation not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error fetching formation' });
  }
});

app.post('/api/formations', authenticateToken, (req, res) => {
  try {
    const newFormation = db.createFormation(req.body);
    res.status(201).json(newFormation);
  } catch (error) {
    res.status(500).json({ message: 'Error creating formation' });
  }
});

app.put('/api/formations/:id', authenticateToken, (req, res) => {
  try {
    const updatedFormation = db.updateFormation(parseInt(req.params.id), req.body);
    if (updatedFormation) {
      res.json(updatedFormation);
    } else {
      res.status(404).json({ message: 'Formation not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error updating formation' });
  }
});

app.delete('/api/formations/:id', authenticateToken, (req, res) => {
  try {
    const success = db.deleteFormation(parseInt(req.params.id));
    if (success) {
      res.json({ message: 'Formation deleted successfully' });
    } else {
      res.status(404).json({ message: 'Formation not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error deleting formation' });
  }
});

app.get('/api/formations/:id/stats', authenticateToken, (req, res) => {
  try {
    const formationId = parseInt(req.params.id);
    const candidates = db.getAllCandidates();
    const payments = db.getAllPayments();
    
    const formationCandidates = candidates.filter(c => c.formationId === formationId);
    const formationPayments = payments.filter(p => p.formationId === formationId);
    
    const stats = {
      totalCandidates: formationCandidates.length,
      totalRevenue: formationPayments.reduce((sum, p) => sum + p.amount, 0),
      averagePayment: formationPayments.length > 0 ? 
        formationPayments.reduce((sum, p) => sum + p.amount, 0) / formationPayments.length : 0
    };
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching formation stats' });
  }
});

// Check formation capacity endpoint
app.get('/api/formations/:id/capacity', authenticateToken, (req, res) => {
  try {
    const formationId = parseInt(req.params.id);
    const capacityInfo = db.checkFormationCapacity(formationId);
    
    res.json({
      formationId,
      ...capacityInfo,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ message: 'Error checking formation capacity' });
  }
});

// Payments API
app.get('/api/payments', authenticateToken, (req, res) => {
  try {
    const payments = db.getAllPayments();
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching payments' });
  }
});

app.get('/api/payments/:id', authenticateToken, (req, res) => {
  try {
    const payments = db.getAllPayments();
    const payment = payments.find(p => p.id === parseInt(req.params.id));
    if (payment) {
      res.json(payment);
    } else {
      res.status(404).json({ message: 'Payment not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error fetching payment' });
  }
});

app.post('/api/payments', authenticateToken, (req, res) => {
  try {
    const newPayment = db.createPayment(req.body);
    res.status(201).json(newPayment);
  } catch (error) {
    res.status(500).json({ message: 'Error creating payment' });
  }
});

app.put('/api/payments/:id', authenticateToken, (req, res) => {
  try {
    const payments = db.getAllPayments();
    const index = payments.findIndex(p => p.id === parseInt(req.params.id));
    if (index !== -1) {
      payments[index] = { ...payments[index], ...req.body };
      db.savePayments(payments);
      res.json(payments[index]);
    } else {
      res.status(404).json({ message: 'Payment not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error updating payment' });
  }
});

app.delete('/api/payments/:id', authenticateToken, (req, res) => {
  try {
    const payments = db.getAllPayments();
    const filtered = payments.filter(p => p.id !== parseInt(req.params.id));
    db.savePayments(filtered);
    res.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting payment' });
  }
});

app.get('/api/payments/:id/receipt', authenticateToken, (req, res) => {
  try {
    const payments = db.getAllPayments();
    const payment = payments.find(p => p.id === parseInt(req.params.id));
    if (payment) {
      // Generate receipt data
      const receipt = {
        receiptNumber: payment.receiptNumber,
        date: payment.paymentDate,
        amount: payment.amount,
        method: payment.paymentMethod,
        candidate: db.getCandidateById(payment.candidateId),
        formation: db.getFormationById(payment.formationId)
      };
      res.json(receipt);
    } else {
      res.status(404).json({ message: 'Payment not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error generating receipt' });
  }
});

// Certificates API
app.get('/api/certificates', authenticateToken, (req, res) => {
  try {
    const certificates = db.getAllCertificates();
    res.json(certificates);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching certificates' });
  }
});

app.get('/api/certificates/:id', authenticateToken, (req, res) => {
  try {
    const certificates = db.getAllCertificates();
    const certificate = certificates.find(c => c.id === parseInt(req.params.id));
    if (certificate) {
      res.json(certificate);
    } else {
      res.status(404).json({ message: 'Certificate not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error fetching certificate' });
  }
});

app.post('/api/certificates', authenticateToken, (req, res) => {
  try {
    const newCertificate = db.createCertificate(req.body);
    res.status(201).json(newCertificate);
  } catch (error) {
    res.status(500).json({ message: 'Error creating certificate' });
  }
});

app.put('/api/certificates/:id', authenticateToken, (req, res) => {
  try {
    const certificates = db.getAllCertificates();
    const index = certificates.findIndex(c => c.id === parseInt(req.params.id));
    if (index !== -1) {
      certificates[index] = { ...certificates[index], ...req.body };
      db.saveCertificates(certificates);
      res.json(certificates[index]);
    } else {
      res.status(404).json({ message: 'Certificate not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error updating certificate' });
  }
});

app.delete('/api/certificates/:id', authenticateToken, (req, res) => {
  try {
    const certificates = db.getAllCertificates();
    const filtered = certificates.filter(c => c.id !== parseInt(req.params.id));
    db.saveCertificates(filtered);
    res.json({ message: 'Certificate deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting certificate' });
  }
});

app.get('/api/certificates/:id/pdf', authenticateToken, (req, res) => {
  try {
    const certificates = db.getAllCertificates();
    const certificate = certificates.find(c => c.id === parseInt(req.params.id));
    if (certificate) {
      // In a real app, generate PDF here
      res.json({ 
        message: 'PDF generation endpoint',
        certificate: certificate
      });
    } else {
      res.status(404).json({ message: 'Certificate not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error generating PDF' });
  }
});

app.get('/api/certificates/verify/:number', (req, res) => {
  try {
    const certificates = db.getAllCertificates();
    const certificate = certificates.find(c => c.certificateNumber === req.params.number);
    if (certificate) {
      res.json({
        valid: true,
        certificate: certificate,
        candidate: db.getCandidateById(certificate.candidateId),
        formation: db.getFormationById(certificate.formationId)
      });
    } else {
      res.json({ valid: false, message: 'Certificate not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error verifying certificate' });
  }
});

// Notifications API
app.get('/api/notifications', authenticateToken, (req, res) => {
  try {
    const notifications = db.getAllNotifications();
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notifications' });
  }
});

app.get('/api/notifications/:id', authenticateToken, (req, res) => {
  try {
    const notifications = db.getAllNotifications();
    const notification = notifications.find(n => n.id === parseInt(req.params.id));
    if (notification) {
      res.json(notification);
    } else {
      res.status(404).json({ message: 'Notification not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notification' });
  }
});

app.post('/api/notifications', authenticateToken, (req, res) => {
  try {
    const newNotification = db.createNotification(req.body);
    res.status(201).json(newNotification);
  } catch (error) {
    res.status(500).json({ message: 'Error creating notification' });
  }
});

app.put('/api/notifications/:id', authenticateToken, (req, res) => {
  try {
    const notifications = db.getAllNotifications();
    const index = notifications.findIndex(n => n.id === parseInt(req.params.id));
    if (index !== -1) {
      notifications[index] = { ...notifications[index], ...req.body };
      db.saveNotifications(notifications);
      res.json(notifications[index]);
    } else {
      res.status(404).json({ message: 'Notification not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error updating notification' });
  }
});

app.delete('/api/notifications/:id', authenticateToken, (req, res) => {
  try {
    const notifications = db.getAllNotifications();
    const filtered = notifications.filter(n => n.id !== parseInt(req.params.id));
    db.saveNotifications(filtered);
    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting notification' });
  }
});

app.patch('/api/notifications/:id/read', authenticateToken, (req, res) => {
  try {
    const updatedNotification = db.markNotificationAsRead(parseInt(req.params.id));
    if (updatedNotification) {
      res.json(updatedNotification);
    } else {
      res.status(404).json({ message: 'Notification not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error marking notification as read' });
  }
});

app.patch('/api/notifications/read-all', authenticateToken, (req, res) => {
  try {
    const notifications = db.getAllNotifications();
    notifications.forEach(n => n.status = 'Lu');
    db.saveNotifications(notifications);
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Error marking notifications as read' });
  }
});

// Dashboard API
app.get('/api/dashboard/stats', authenticateToken, (req, res) => {
  try {
    const stats = db.getDashboardStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching dashboard stats' });
  }
});

app.get('/api/dashboard/charts', authenticateToken, (req, res) => {
  try {
    const timeRange = req.query.range || 'month';
    // In a real app, generate chart data based on time range
    const chartData = {
      revenue: [1200, 1900, 3000, 5000, 2000, 3000],
      candidates: [10, 15, 20, 25, 30, 35],
      formations: [2, 3, 4, 5, 6, 7],
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
    };
    res.json(chartData);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching chart data' });
  }
});

app.get('/api/dashboard/activity', authenticateToken, (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const candidates = db.getAllCandidates();
    const payments = db.getAllPayments();
    
    const activities = [
      ...candidates.map(c => ({
        type: 'candidate',
        action: 'registered',
        data: c,
        date: c.registrationDate
      })),
      ...payments.map(p => ({
        type: 'payment',
        action: 'received',
        data: p,
        date: p.paymentDate
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, limit);
    
    res.json(activities);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching activity data' });
  }
});

// Settings API
app.get('/api/settings', authenticateToken, (req, res) => {
  try {
    const settings = db.getDefaultSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching settings' });
  }
});

app.put('/api/settings', authenticateToken, (req, res) => {
  try {
    const updates = req.body;
    Object.keys(updates).forEach(key => {
      db.setSetting(key, updates[key]);
    });
    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating settings' });
  }
});

app.get('/api/settings/:key', authenticateToken, (req, res) => {
  try {
    const value = db.getSetting(req.params.key);
    res.json({ key: req.params.key, value });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching setting' });
  }
});

app.put('/api/settings/:key', authenticateToken, (req, res) => {
  try {
    const { value } = req.body;
    db.setSetting(req.params.key, value);
    res.json({ message: 'Setting updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating setting' });
  }
});

// Reports API
app.get('/api/reports/:type', authenticateToken, (req, res) => {
  try {
    const type = req.params.type;
    const params = req.query;
    
    let reportData = {};
    
    switch (type) {
      case 'financial':
        const payments = db.getAllPayments();
        reportData = {
          totalRevenue: payments.reduce((sum, p) => sum + p.amount, 0),
          totalPayments: payments.length,
          averagePayment: payments.length > 0 ? 
            payments.reduce((sum, p) => sum + p.amount, 0) / payments.length : 0
        };
        break;
      case 'candidates':
        const candidates = db.getAllCandidates();
        reportData = {
          totalCandidates: candidates.length,
          activeCandidates: candidates.filter(c => c.status === 'Actif').length,
          newThisMonth: candidates.filter(c => {
            const regDate = new Date(c.registrationDate);
            const now = new Date();
            return regDate.getMonth() === now.getMonth() && 
                   regDate.getFullYear() === now.getFullYear();
          }).length
        };
        break;
      default:
        return res.status(400).json({ message: 'Invalid report type' });
    }
    
    res.json(reportData);
  } catch (error) {
    res.status(500).json({ message: 'Error generating report' });
  }
});

app.get('/api/reports/:type/export', authenticateToken, (req, res) => {
  try {
    const type = req.params.type;
    const format = req.query.format || 'pdf';
    
    // In a real app, generate and return the file
    res.json({ 
      message: `${format.toUpperCase()} export endpoint for ${type} report`,
      downloadUrl: `/api/reports/${type}/download`
    });
  } catch (error) {
    res.status(500).json({ message: 'Error exporting report' });
  }
});

// File upload API
app.post('/api/upload', authenticateToken, (req, res) => {
  try {
    // In a real app, handle file upload with multer
    res.json({ 
      message: 'File upload endpoint',
      fileId: Date.now(),
      filename: 'demo-file.pdf'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error uploading file' });
  }
});

app.delete('/api/upload/:fileId', authenticateToken, (req, res) => {
  try {
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting file' });
  }
});

// Data sync API
app.post('/api/sync', authenticateToken, (req, res) => {
  try {
    res.json({ 
      message: 'Data sync completed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ message: 'Error syncing data' });
  }
});

// COMPLETE DATA CLEARING ENDPOINT
app.post('/api/clear-all-data', authenticateToken, (req, res) => {
  try {
    const success = db.clearAllDataCompletely();
    if (success) {
      res.json({ 
        message: 'All data cleared successfully',
        timestamp: new Date().toISOString(),
        status: 'cleared'
      });
    } else {
      res.status(500).json({ message: 'Error clearing data' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error clearing data' });
  }
});

// Data reset endpoint (resets to initial state)
app.post('/api/reset-data', authenticateToken, (req, res) => {
  try {
    const success = db.resetAllData();
    if (success) {
      res.json({ 
        message: 'Data reset to initial state successfully',
        timestamp: new Date().toISOString(),
        status: 'reset'
      });
    } else {
      res.status(500).json({ message: 'Error resetting data' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error resetting data' });
  }
});

app.get('/api/sync/status', authenticateToken, (req, res) => {
  try {
    res.json({ 
      status: 'synced',
      lastSync: new Date().toISOString(),
      nextSync: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    });
  } catch (error) {
    res.status(500).json({ message: 'Error getting sync status' });
  }
});

app.post('/api/backup', authenticateToken, (req, res) => {
  try {
    res.json({ 
      message: 'Backup created successfully',
      backupId: Date.now(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating backup' });
  }
});

app.post('/api/backup/:backupId/restore', authenticateToken, (req, res) => {
  try {
    res.json({ 
      message: 'Backup restored successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ message: 'Error restoring backup' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 API available at http://localhost:${PORT}/api`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
});
