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
  delayMs: () => 500 // begin adding 500ms of delay per request above 50
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

// Wait for database initialization
db.initDatabase().then(() => {
  console.log('✅ Database initialized successfully');
}).catch((error) => {
  console.error('❌ Database initialization failed:', error);
  process.exit(1);
});

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
app.get('/api/candidates', authenticateToken, async (req, res) => {
  try {
    const candidates = await db.getAllCandidates();
    res.json(candidates);
  } catch (error) {
    console.error('Error fetching candidates:', error);
    res.status(500).json({ message: 'Error fetching candidates' });
  }
});

app.get('/api/candidates/:id', authenticateToken, async (req, res) => {
  try {
    const candidate = await db.getCandidateById(parseInt(req.params.id));
    if (candidate) {
      res.json(candidate);
    } else {
      res.status(404).json({ message: 'Candidate not found' });
    }
  } catch (error) {
    console.error('Error fetching candidate:', error);
    res.status(500).json({ message: 'Error fetching candidate' });
  }
});

app.post('/api/candidates', authenticateToken, async (req, res) => {
  try {
    const newCandidate = await db.createCandidate(req.body);
    res.status(201).json(newCandidate);
  } catch (error) {
    console.error('Error creating candidate:', error);
    res.status(500).json({ message: 'Error creating candidate' });
  }
});

app.put('/api/candidates/:id', authenticateToken, async (req, res) => {
  try {
    const updatedCandidate = await db.updateCandidate(parseInt(req.params.id), req.body);
    if (updatedCandidate) {
      res.json(updatedCandidate);
    } else {
      res.status(404).json({ message: 'Candidate not found' });
    }
  } catch (error) {
    console.error('Error updating candidate:', error);
    res.status(500).json({ message: 'Error updating candidate' });
  }
});

app.delete('/api/candidates/:id', authenticateToken, async (req, res) => {
  try {
    const success = await db.deleteCandidate(parseInt(req.params.id));
    if (success) {
      res.json({ message: 'Candidate deleted successfully' });
    } else {
      res.status(404).json({ message: 'Candidate not found' });
    }
  } catch (error) {
    console.error('Error deleting candidate:', error);
    res.status(500).json({ message: 'Error deleting candidate' });
  }
});

app.get('/api/candidates/search', authenticateToken, async (req, res) => {
  try {
    const query = req.query.q;
    const candidates = await db.getAllCandidates();
    const filtered = candidates.filter(candidate => 
      candidate.firstName.toLowerCase().includes(query.toLowerCase()) ||
      candidate.lastName.toLowerCase().includes(query.toLowerCase()) ||
      candidate.email.toLowerCase().includes(query.toLowerCase())
    );
    res.json(filtered);
  } catch (error) {
    console.error('Error searching candidates:', error);
    res.status(500).json({ message: 'Error searching candidates' });
  }
});

// Formations API
app.get('/api/formations', authenticateToken, async (req, res) => {
  try {
    const formations = await db.getAllFormations();
    res.json(formations);
  } catch (error) {
    console.error('Error fetching formations:', error);
    res.status(500).json({ message: 'Error fetching formations' });
  }
});

app.get('/api/formations/:id', authenticateToken, async (req, res) => {
  try {
    const formation = await db.getFormationById(parseInt(req.params.id));
    if (formation) {
      res.json(formation);
    } else {
      res.status(404).json({ message: 'Formation not found' });
    }
  } catch (error) {
    console.error('Error fetching formation:', error);
    res.status(500).json({ message: 'Error fetching formation' });
  }
});

app.post('/api/formations', authenticateToken, async (req, res) => {
  try {
    const newFormation = await db.createFormation(req.body);
    res.status(201).json(newFormation);
  } catch (error) {
    console.error('Error creating formation:', error);
    res.status(500).json({ message: 'Error creating formation' });
  }
});

app.put('/api/formations/:id', authenticateToken, async (req, res) => {
  try {
    const updatedFormation = await db.updateFormation(parseInt(req.params.id), req.body);
    if (updatedFormation) {
      res.json(updatedFormation);
    } else {
      res.status(404).json({ message: 'Formation not found' });
    }
  } catch (error) {
    console.error('Error updating formation:', error);
    res.status(500).json({ message: 'Error updating formation' });
  }
});

app.delete('/api/formations/:id', authenticateToken, async (req, res) => {
  try {
    const success = await db.deleteFormation(parseInt(req.params.id));
    if (success) {
      res.json({ message: 'Formation deleted successfully' });
    } else {
      res.status(404).json({ message: 'Formation not found' });
    }
  } catch (error) {
    console.error('Error deleting formation:', error);
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
app.get('/api/payments', authenticateToken, async (req, res) => {
  try {
    const payments = await db.getAllPayments();
    res.json(payments);
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ message: 'Error fetching payments' });
  }
});

app.get('/api/payments/:id', authenticateToken, async (req, res) => {
  try {
    const payments = await db.getAllPayments();
    const payment = payments.find(p => p.id === parseInt(req.params.id));
    if (payment) {
      res.json(payment);
    } else {
      res.status(404).json({ message: 'Payment not found' });
    }
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ message: 'Error fetching payment' });
  }
});

app.post('/api/payments', authenticateToken, async (req, res) => {
  try {
    const newPayment = await db.createPayment(req.body);
    res.status(201).json(newPayment);
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ message: 'Error creating payment' });
  }
});

app.put('/api/payments/:id', authenticateToken, async (req, res) => {
  try {
    const paymentId = parseInt(req.params.id);
    const existingPayment = await db.getRow('SELECT * FROM payments WHERE id = ?', [paymentId]);
    
    if (!existingPayment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Update payment
    const fields = [];
    const values = [];
    
    Object.keys(req.body).forEach(key => {
      if (key !== 'id') {
        fields.push(`${key} = ?`);
        values.push(req.body[key]);
      }
    });
    
    if (fields.length === 0) {
      return res.json(existingPayment);
    }
    
    values.push(paymentId);
    const sql = `UPDATE payments SET ${fields.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`;
    
    await db.runQuery(sql, values);
    
    // Update candidate payment totals if amount changed
    if (req.body.amount !== undefined) {
      await db.updateCandidatePaymentTotals(existingPayment.candidateId);
    }
    
    const updatedPayment = await db.getRow('SELECT * FROM payments WHERE id = ?', [paymentId]);
    res.json(updatedPayment);
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({ message: 'Error updating payment' });
  }
});

app.delete('/api/payments/:id', authenticateToken, async (req, res) => {
  try {
    const paymentId = parseInt(req.params.id);
    const existingPayment = await db.getRow('SELECT * FROM payments WHERE id = ?', [paymentId]);
    
    if (!existingPayment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Delete the payment
    await db.runQuery('DELETE FROM payments WHERE id = ?', [paymentId]);
    
    // Update candidate payment totals
    await db.updateCandidatePaymentTotals(existingPayment.candidateId);
    
    res.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    console.error('Error deleting payment:', error);
    res.status(500).json({ message: 'Error deleting payment' });
  }
});

app.get('/api/payments/:id/receipt', authenticateToken, async (req, res) => {
  try {
    const paymentId = parseInt(req.params.id);
    const payment = await db.getRow('SELECT * FROM payments WHERE id = ?', [paymentId]);
    
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Get candidate and formation data
    const candidate = await db.getCandidateById(payment.candidateId);
    const formation = await db.getFormationById(payment.formationId);
    
    // Generate receipt data
    const receipt = {
      receiptNumber: payment.receiptNumber,
      date: payment.paymentDate,
      amount: payment.amount,
      method: payment.paymentMethod,
      candidate: candidate,
      formation: formation
    };
    res.json(receipt);
  } catch (error) {
    console.error('Error generating receipt:', error);
    res.status(500).json({ message: 'Error generating receipt' });
  }
});

// Certificates API
app.get('/api/certificates', authenticateToken, async (req, res) => {
  try {
    const certificates = await db.getAllCertificates();
    res.json(certificates);
  } catch (error) {
    console.error('Error fetching certificates:', error);
    res.status(500).json({ message: 'Error fetching certificates' });
  }
});

app.get('/api/certificates/:id', authenticateToken, async (req, res) => {
  try {
    const certificateId = parseInt(req.params.id);
    const certificate = await db.getRow('SELECT * FROM certificates WHERE id = ?', [certificateId]);
    
    if (certificate) {
      res.json(certificate);
    } else {
      res.status(404).json({ message: 'Certificate not found' });
    }
  } catch (error) {
    console.error('Error fetching certificate:', error);
    res.status(500).json({ message: 'Error fetching certificate' });
  }
});

app.post('/api/certificates', authenticateToken, async (req, res) => {
  try {
    const newCertificate = await db.createCertificate(req.body);
    res.status(201).json(newCertificate);
  } catch (error) {
    console.error('Error creating certificate:', error);
    res.status(500).json({ message: 'Error creating certificate' });
  }
});

app.put('/api/certificates/:id', authenticateToken, async (req, res) => {
  try {
    const certificateId = parseInt(req.params.id);
    const existingCertificate = await db.getRow('SELECT * FROM certificates WHERE id = ?', [certificateId]);
    
    if (!existingCertificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    // Update certificate
    const fields = [];
    const values = [];
    
    Object.keys(req.body).forEach(key => {
      if (key !== 'id') {
        fields.push(`${key} = ?`);
        values.push(req.body[key]);
      }
    });
    
    if (fields.length === 0) {
      return res.json(existingCertificate);
    }
    
    values.push(certificateId);
    const sql = `UPDATE certificates SET ${fields.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`;
    
    await db.runQuery(sql, values);
    const updatedCertificate = await db.getRow('SELECT * FROM certificates WHERE id = ?', [certificateId]);
    res.json(updatedCertificate);
  } catch (error) {
    console.error('Error updating certificate:', error);
    res.status(500).json({ message: 'Error updating certificate' });
  }
});

app.delete('/api/certificates/:id', authenticateToken, async (req, res) => {
  try {
    const certificateId = parseInt(req.params.id);
    const existingCertificate = await db.getRow('SELECT * FROM certificates WHERE id = ?', [certificateId]);
    
    if (!existingCertificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    await db.runQuery('DELETE FROM certificates WHERE id = ?', [certificateId]);
    res.json({ message: 'Certificate deleted successfully' });
  } catch (error) {
    console.error('Error deleting certificate:', error);
    res.status(500).json({ message: 'Error deleting certificate' });
  }
});

app.get('/api/certificates/:id/pdf', authenticateToken, async (req, res) => {
  try {
    const certificateId = parseInt(req.params.id);
    const certificate = await db.getRow('SELECT * FROM certificates WHERE id = ?', [certificateId]);
    
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
    console.error('Error generating PDF:', error);
    res.status(500).json({ message: 'Error generating PDF' });
  }
});

app.get('/api/certificates/verify/:number', async (req, res) => {
  try {
    const certificate = await db.getRow('SELECT * FROM certificates WHERE certificateNumber = ?', [req.params.number]);
    
    if (certificate) {
      const candidate = await db.getCandidateById(certificate.candidateId);
      const formation = await db.getFormationById(certificate.formationId);
      
      res.json({
        valid: true,
        certificate: certificate,
        candidate: candidate,
        formation: formation
      });
    } else {
      res.json({ valid: false, message: 'Certificate not found' });
    }
  } catch (error) {
    console.error('Error verifying certificate:', error);
    res.status(500).json({ message: 'Error verifying certificate' });
  }
});

// Notifications API
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const notifications = await db.getAllNotifications();
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Error fetching notifications' });
  }
});

app.get('/api/notifications/:id', authenticateToken, async (req, res) => {
  try {
    const notificationId = parseInt(req.params.id);
    const notification = await db.getRow('SELECT * FROM notifications WHERE id = ?', [notificationId]);
    
    if (notification) {
      res.json(notification);
    } else {
      res.status(404).json({ message: 'Notification not found' });
    }
  } catch (error) {
    console.error('Error fetching notification:', error);
    res.status(500).json({ message: 'Error fetching notification' });
  }
});

app.post('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const newNotification = await db.createNotification(req.body);
    res.status(201).json(newNotification);
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ message: 'Error creating notification' });
  }
});

app.put('/api/notifications/:id', authenticateToken, async (req, res) => {
  try {
    const notificationId = parseInt(req.params.id);
    const existingNotification = await db.getRow('SELECT * FROM notifications WHERE id = ?', [notificationId]);
    
    if (!existingNotification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    // Update notification
    const fields = [];
    const values = [];
    
    Object.keys(req.body).forEach(key => {
      if (key !== 'id') {
        fields.push(`${key} = ?`);
        values.push(req.body[key]);
      }
    });
    
    if (fields.length === 0) {
      return res.json(existingNotification);
    }
    
    values.push(notificationId);
    const sql = `UPDATE notifications SET ${fields.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`;
    
    await db.runQuery(sql, values);
    const updatedNotification = await db.getRow('SELECT * FROM notifications WHERE id = ?', [notificationId]);
    res.json(updatedNotification);
  } catch (error) {
    console.error('Error updating notification:', error);
    res.status(500).json({ message: 'Error updating notification' });
  }
});

app.delete('/api/notifications/:id', authenticateToken, async (req, res) => {
  try {
    const notificationId = parseInt(req.params.id);
    const existingNotification = await db.getRow('SELECT * FROM notifications WHERE id = ?', [notificationId]);
    
    if (!existingNotification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    await db.runQuery('DELETE FROM notifications WHERE id = ?', [notificationId]);
    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Error deleting notification' });
  }
});

app.patch('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const notificationId = parseInt(req.params.id);
    const updatedNotification = await db.markNotificationAsRead(notificationId);
    
    if (updatedNotification) {
      res.json(updatedNotification);
    } else {
      res.status(404).json({ message: 'Notification not found' });
    }
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Error marking notification as read' });
  }
});

app.patch('/api/notifications/read-all', authenticateToken, async (req, res) => {
  try {
    await db.runQuery('UPDATE notifications SET status = ?, updatedAt = CURRENT_TIMESTAMP', ['Lu']);
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({ message: 'Error marking notifications as read' });
  }
});

// Dashboard API
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await db.getDashboardStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
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

app.get('/api/dashboard/activity', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const candidates = await db.getAllCandidates();
    const payments = await db.getAllPayments();
    
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
    console.error('Error fetching activity data:', error);
    res.status(500).json({ message: 'Error fetching activity data' });
  }
});

// Settings API
app.get('/api/settings', authenticateToken, async (req, res) => {
  try {
    const settings = await db.getDefaultSettingsAsync();
    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ message: 'Error fetching settings' });
  }
});

app.put('/api/settings', authenticateToken, async (req, res) => {
  try {
    const updates = req.body;
    for (const [key, value] of Object.entries(updates)) {
      await db.setSetting(key, value);
    }
    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ message: 'Error updating settings' });
  }
});

app.get('/api/settings/:key', authenticateToken, async (req, res) => {
  try {
    const value = await db.getSetting(req.params.key);
    res.json({ key: req.params.key, value });
  } catch (error) {
    console.error('Error fetching setting:', error);
    res.status(500).json({ message: 'Error fetching setting' });
  }
});

app.put('/api/settings/:key', authenticateToken, async (req, res) => {
  try {
    const { value } = req.body;
    await db.setSetting(req.params.key, value);
    res.json({ message: 'Setting updated successfully' });
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({ message: 'Error updating setting' });
  }
});

// Reports API
app.get('/api/reports/:type', authenticateToken, async (req, res) => {
  try {
    const type = req.params.type;
    const params = req.query;
    
    let reportData = {};
    
    switch (type) {
      case 'financial':
        const payments = await db.getAllPayments();
        reportData = {
          totalRevenue: payments.reduce((sum, p) => sum + p.amount, 0),
          totalPayments: payments.length,
          averagePayment: payments.length > 0 ? 
            payments.reduce((sum, p) => sum + p.amount, 0) / payments.length : 0
        };
        break;
      case 'candidates':
        const candidates = await db.getAllCandidates();
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
    console.error('Error generating report:', error);
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
app.post('/api/clear-all-data', authenticateToken, async (req, res) => {
  try {
    const success = await db.clearAllDataCompletely();
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
    console.error('Error clearing data:', error);
    res.status(500).json({ message: 'Error clearing data' });
  }
});

// Data reset endpoint (resets to initial state)
app.post('/api/reset-data', authenticateToken, async (req, res) => {
  try {
    const success = await db.resetAllData();
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
    console.error('Error resetting data:', error);
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
