// ═══════════════════════════════════════════════════════════════════════
// SalesAuto Frontend - Main App Logic
// ═══════════════════════════════════════════════════════════════════════

// API Configuration
let apiConfig = {
  backend: 'http://localhost:8000',
  emailService: 'http://localhost:8001'
};

// State
let appState = {
  isPolling: false,
  pollCount: 0,
  pollInterval: null
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  loadConfig();
  checkBackendHealth();
  setupRefreshInterval();
});

// ─────────────────────────────────────────────────────────────────────
// CONFIGURATION & SETUP
// ─────────────────────────────────────────────────────────────────────

async function loadConfig() {
  try {
    const response = await fetch('/api/config');
    if (response.ok) {
      const config = await response.json();
      apiConfig = {
        backend: config.backend,
        emailService: config.emailService
      };
      console.log('✓ Config loaded:', apiConfig);
    }
  } catch (error) {
    console.warn('Using default config');
  }
}

async function checkBackendHealth() {
  try {
    const response = await fetch(`${apiConfig.backend}/`);
    if (response.ok) {
      setStatus('online');
      addLog('Backend connected successfully', 'success');
    } else {
      setStatus('disconnected');
      addLog('Backend returned error: ' + response.status, 'warning');
    }
  } catch (error) {
    setStatus('disconnected');
    addLog('Cannot connect to backend', 'error');
  }
}

function setupRefreshInterval() {
  setInterval(checkBackendHealth, 30000); // Check health every 30s
}

// ─────────────────────────────────────────────────────────────────────
// TAB NAVIGATION
// ─────────────────────────────────────────────────────────────────────

function setupTabs() {
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const tabName = link.dataset.tab;
      switchTab(tabName);
    });
  });
}

function switchTab(tabName) {
  // Hide all tabs
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });

  // Remove active from all nav links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
  });

  // Show selected tab
  const selectedTab = document.getElementById(tabName);
  if (selectedTab) {
    selectedTab.classList.add('active');
  }

  // Set active nav link
  const activeLink = document.querySelector(`[data-tab="${tabName}"]`);
  if (activeLink) {
    activeLink.classList.add('active');
  }

  // Fetch data for dashboard tab
  if (tabName === 'dashboard') {
    fetchStats();
    fetchCompanies();
  }

  // Fetch approvals
  if (tabName === 'approvals') {
    fetchApprovals();
  }
}

// ─────────────────────────────────────────────────────────────────────
// RESEARCH PIPELINE
// ─────────────────────────────────────────────────────────────────────

async function triggerPipeline() {
  const keyword = document.getElementById('keyword').value || 'EdTech India AI';
  const btn = document.getElementById('trigger-btn');
  
  if (appState.isPolling) {
    addLog('Pipeline already running', 'warning');
    return;
  }

  btn.disabled = true;
  const spinner = document.getElementById('spinner');
  spinner.classList.remove('hidden');
  addLog(`Triggering pipeline for: "${keyword}"`, 'info');

  const url = `${apiConfig.backend}/api/agent/trigger/`;
  console.log('🔍 DEBUG: Calling URL:', url);
  addLog(`🔍 Calling: ${url}`, 'info');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ keyword })
    });

    console.log('📡 Response status:', response.status, response.statusText);

    if (response.ok || response.status === 202) {
      addLog('✓ Pipeline triggered successfully', 'success');
      startPolling();
    } else {
      const errorText = await response.text();
      console.error('❌ Error response:', errorText);
      addLog(`❌ HTTP ${response.status}: ${errorText}`, 'error');
    }
  } catch (error) {
    console.error('🔴 Fetch error:', error);
    addLog(`🔴 Connection Error: ${error.message}`, 'error');
  } finally {
    btn.disabled = false;
    spinner.classList.add('hidden');
  }
}

async function startPolling() {
  appState.isPolling = true;
  appState.pollCount = 0;
  const maxPolls = 360; // 30 minutes
  const pollInterval = 5000; // 5 seconds

  document.getElementById('pipeline-status').classList.remove('hidden');

  appState.pollInterval = setInterval(async () => {
    appState.pollCount++;

    if (appState.pollCount > maxPolls) {
      clearInterval(appState.pollInterval);
      addLog('Polling timeout (30 min)', 'warning');
      appState.isPolling = false;
      return;
    }

    try {
      const response = await fetch(`${apiConfig.backend}/api/agent/status/`);
      if (response.ok) {
        const status = await response.json();

        // Update status display
        updateStatusDisplay(status);

        if (!status.is_running) {
          clearInterval(appState.pollInterval);
          addLog('Pipeline completed!', 'success');
          appState.isPolling = false;
          
          // Fetch all updated data
          fetchStats();
          fetchCompanies();
          fetchApprovals();
          switchTab('dashboard');
        } else if (appState.pollCount % 3 === 0) {
          addLog(`Pipeline running... (${appState.pollCount}s)`, 'info');
          fetchStats();
          fetchCompanies();
        }
      }
    } catch (error) {
      addLog(`Poll error: ${error.message}`, 'error');
    }
  }, pollInterval);
}

function updateStatusDisplay(status) {
  document.getElementById('status-state').textContent = status.is_running ? '⏳ Running' : '✓ Idle';
  document.getElementById('status-keyword').textContent = status.current_keyword || '-';
  document.getElementById('status-started').textContent = formatDateTime(status.started_at) || '-';
  document.getElementById('status-finished').textContent = formatDateTime(status.finished_at) || '-';

  if (status.last_error) {
    const errorBox = document.getElementById('status-error');
    errorBox.textContent = status.last_error;
    errorBox.classList.remove('hidden');
  }
}

// ─────────────────────────────────────────────────────────────────────
// DASHBOARD DATA FETCHING
// ─────────────────────────────────────────────────────────────────────

async function fetchStats() {
  try {
    const response = await fetch(`${apiConfig.backend}/api/dashboard/stats/`);
    if (response.ok) {
      const data = await response.json();
      document.getElementById('metric-leads').textContent = data.leads_discovered || 0;
      document.getElementById('metric-crawled').textContent = data.sites_crawled || 0;
      document.getElementById('metric-sent').textContent = data.emails_dispatched || 0;
      document.getElementById('metric-replies').textContent = data.replies_detected || 0;
    }
  } catch (error) {
    console.error('Error fetching stats:', error);
  }
}

async function fetchCompanies() {
  try {
    const response = await fetch(`${apiConfig.backend}/api/companies/`);
    if (response.ok) {
      const companies = await response.json();
      renderCompaniesTable(companies);
    }
  } catch (error) {
    console.error('Error fetching companies:', error);
  }
}

function renderCompaniesTable(companies) {
  const tbody = document.getElementById('companies-table');
  
  if (!companies || companies.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No companies yet</td></tr>';
    return;
  }

  tbody.innerHTML = companies.slice(0, 5).map(company => `
    <tr>
      <td><strong>${company.company_name || 'N/A'}</strong></td>
      <td><code>${company.domain || 'N/A'}</code></td>
      <td>${company.ai_score || '-'}</td>
      <td><span class="pill">${company.crawl_status || 'pending'}</span></td>
    </tr>
  `).join('');
}

// ─────────────────────────────────────────────────────────────────────
// APPROVALS
// ─────────────────────────────────────────────────────────────────────

async function fetchApprovals() {
  try {
    const response = await fetch(`${apiConfig.backend}/api/agent/approvals/`);
    if (response.ok) {
      const data = await response.json();
      renderApprovals(data.data || []);
    }
  } catch (error) {
    console.error('Error fetching approvals:', error);
  }
}

function renderApprovals(approvals) {
  const container = document.getElementById('approvals-list');
  
  if (!approvals || approvals.length === 0) {
    container.innerHTML = '<p class="text-muted">No pending approvals</p>';
    return;
  }

  container.innerHTML = approvals.map(approval => `
    <div class="approval-card">
      <div class="approval-header">
        <div>
          <h4>${approval.company_name}</h4>
          <p class="text-muted">${approval.contact_name} • ${approval.contact_email}</p>
        </div>
        <div class="approval-actions">
          <button class="btn btn-primary" onclick="approveEmail(${approval.id})">Approve</button>
          <button class="btn btn-secondary" onclick="skipEmail(${approval.id})">Skip</button>
        </div>
      </div>
      <div style="background: var(--bg-tertiary); padding: 12px; border-radius: 4px; font-size: 13px;">
        <strong>Subject:</strong> ${approval.subject || '-'}<br>
        <strong>Body:</strong> ${(approval.body || '-').substring(0, 100)}...
      </div>
    </div>
  `).join('');
}

async function approveEmail(id) {
  try {
    const response = await fetch(`${apiConfig.backend}/api/agent/approvals/${id}/approve/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    if (response.ok) {
      addLog(`Approved email ${id}`, 'success');
      fetchApprovals();
    } else {
      addLog('Failed to approve', 'error');
    }
  } catch (error) {
    addLog(`Error: ${error.message}`, 'error');
  }
}

async function skipEmail(id) {
  try {
    const response = await fetch(`${apiConfig.backend}/api/agent/approvals/${id}/skip/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    if (response.ok) {
      addLog(`Skipped email ${id}`, 'info');
      fetchApprovals();
    }
  } catch (error) {
    addLog(`Error: ${error.message}`, 'error');
  }
}

// ─────────────────────────────────────────────────────────────────────
// EMAIL SENDING
// ─────────────────────────────────────────────────────────────────────

async function sendTestEmail() {
  const toEmail = document.getElementById('email-to').value;
  const subject = document.getElementById('email-subject').value;
  const body = document.getElementById('email-body').value;

  if (!toEmail || !subject || !body) {
    addLog('Please fill all email fields', 'warning');
    return;
  }

  addLog(`Sending email to ${toEmail}...`, 'info');

  try {
    const response = await fetch(`${apiConfig.emailService}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to_email: toEmail,
        subject: subject,
        body: body
      })
    });

    const responseBox = document.getElementById('email-response');
    if (response.ok) {
      const data = await response.json();
      responseBox.textContent = '✓ Email sent successfully!';
      responseBox.classList.remove('error', 'hidden');
      addLog('Email sent successfully', 'success');
      // Clear form
      document.getElementById('email-form').reset();
    } else {
      responseBox.textContent = '✗ Failed to send email';
      responseBox.classList.add('error');
      responseBox.classList.remove('hidden');
      addLog('Failed to send email', 'error');
    }
  } catch (error) {
    const responseBox = document.getElementById('email-response');
    responseBox.textContent = `✗ Error: ${error.message}`;
    responseBox.classList.add('error');
    responseBox.classList.remove('hidden');
    addLog(`Error: ${error.message}`, 'error');
  }
}

// ─────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────

function addLog(message, type = 'info') {
  const logsList = document.getElementById('logs');
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  const time = new Date().toLocaleTimeString();
  entry.textContent = `[${time}] ${message}`;
  logsList.insertBefore(entry, logsList.firstChild);
  
  // Keep only last 50 logs
  while (logsList.children.length > 50) {
    logsList.removeChild(logsList.lastChild);
  }
}

function setStatus(status) {
  const indicator = document.getElementById('connection-status');
  indicator.className = `status-indicator ${status}`;
  indicator.textContent = status === 'online' ? '🟢 Online' : '🔴 Offline';
}

function formatDateTime(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleString();
}

// Error handling
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

console.log('✓ SalesAuto Frontend loaded');
