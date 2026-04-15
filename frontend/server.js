const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.FRONTEND_PORT || 3000;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
const EMAIL_SERVICE_URL = process.env.EMAIL_SERVICE_URL || 'http://localhost:8001';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Info endpoint
app.get('/api/info', (req, res) => {
  res.json({
    frontend_url: `http://localhost:${PORT}`,
    backend_url: BACKEND_URL,
    email_service_url: EMAIL_SERVICE_URL
  });
});

// Config endpoint
app.get('/api/config', (req, res) => {
  res.json({
    backend: BACKEND_URL,
    emailService: EMAIL_SERVICE_URL,
    polling: {
      interval: 5000,
      maxAttempts: 360
    }
  });
});

// Diagnostic endpoint
app.get('/api/diagnostic', async (req, res) => {
  const results = {
    frontend: 'ok',
    backend: 'unknown',
    emailService: 'unknown',
    urls: {
      backend: BACKEND_URL,
      emailService: EMAIL_SERVICE_URL
    }
  };

  // Test backend
  try {
    const backendRes = await fetch(`${BACKEND_URL}/`);
    results.backend = backendRes.ok ? 'ok' : `error (${backendRes.status})`;
  } catch (e) {
    results.backend = `error: ${e.message}`;
  }

  // Test email service
  try {
    const emailRes = await fetch(`${EMAIL_SERVICE_URL}/api/health`);
    results.emailService = emailRes.ok ? 'ok' : `error (${emailRes.status})`;
  } catch (e) {
    results.emailService = `error: ${e.message}`;
  }

  res.json(results);
});

// Serve index.html for all routes (SPA)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🎨 SalesAuto Frontend Server');
  console.log('='.repeat(60));
  console.log(`\n✅ Frontend running at: http://localhost:${PORT}`);
  console.log(`\n📡 Backend API: ${BACKEND_URL}`);
  console.log(`📧 Email Service: ${EMAIL_SERVICE_URL}`);
  console.log('\n🔍 Diagnostics: http://localhost:${PORT}/api/diagnostic');
  console.log('\n' + '='.repeat(60) + '\n');
});
