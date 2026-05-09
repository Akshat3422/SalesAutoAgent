import { useAuthStore } from '../store/authStore';

const API_BASE = 'http://localhost:8000/api';
// const API_BASE = 'https://duplicate-gauze-explain.ngrok-free.dev/api';

const getHeaders = (customHeaders: Record<string, string> = {}) => {
  const token = useAuthStore.getState().token;
  const headers: Record<string, string> = { ...customHeaders };
  if (token) {
    headers['Authorization'] = `Token ${token}`;
  }
  return headers;
};

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`API Error ${res.status}: ${errorBody}`);
  }
  return res.json();
}

/* ── Auth ── */

export async function loginUser(username: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login/`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ username, password }),
  });
  return handleResponse<{ token: string; user: any }>(res);
}

export async function logoutUser() {
  const res = await fetch(`${API_BASE}/auth/logout/`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
  });
  return handleResponse<any>(res);
}

/* ── Agent / Pipeline ── */

export async function triggerPipeline(
  keyword: string,
  options?: { campaign_name?: string; campaign_id?: number }
) {
  const res = await fetch(`${API_BASE}/agent/trigger/`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ keyword, ...options }),
  });
  return handleResponse<{ message: string; keyword: string; campaign_id: number | null; campaign_name: string | null }>(res);
}

export async function getPipelineStatus() {
  const res = await fetch(`${API_BASE}/agent/status/`, { headers: getHeaders() });
  return handleResponse<{
    is_running: boolean;
    current_keyword: string | null;
    campaign_id: number | null;
    campaign_name: string | null;
    started_at: string | null;
    finished_at: string | null;
    last_error: string | null;
  }>(res);
}

/* ── Dashboard ── */

export async function getDashboardStats() {
  const res = await fetch(`${API_BASE}/dashboard/stats/`, { headers: getHeaders() });
  return handleResponse<{
    leads_discovered: number;
    sites_crawled: number;
    emails_drafted: number;
    emails_approved: number;
    emails_dispatched: number;
    replies_detected: number;
  }>(res);
}

/* ── Campaigns ── */

export async function getCampaigns() {
  const res = await fetch(`${API_BASE}/campaigns/`, { headers: getHeaders() });
  return handleResponse<any[]>(res);
}

export async function getCampaign(id: number) {
  const res = await fetch(`${API_BASE}/campaigns/${id}/`, { headers: getHeaders() });
  return handleResponse<any>(res);
}

export async function createCampaign(name: string, description?: string) {
  const res = await fetch(`${API_BASE}/campaigns/`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ name, description: description || '' }),
  });
  return handleResponse<any>(res);
}

export async function getCampaignStats(id: number) {
  const res = await fetch(`${API_BASE}/campaigns/${id}/stats/`, { headers: getHeaders() });
  return handleResponse<{
    campaign_id: number;
    campaign_name: string;
    total_companies: number;
    crawled_companies: number;
    failed_companies: number;
    total_contacts: number;
    emails_drafted: number;
    emails_approved: number;
    emails_sent: number;
    replies: number;
  }>(res);
}

/* ── Companies ── */

export async function getCompanies(campaignId?: number) {
  const url = campaignId
    ? `${API_BASE}/companies/?campaign=${campaignId}`
    : `${API_BASE}/companies/`;
  const res = await fetch(url, { headers: getHeaders() });
  return handleResponse<any[]>(res);
}

/* ── Contacts ── */

export async function getContacts() {
  const res = await fetch(`${API_BASE}/contacts/`, { headers: getHeaders() });
  return handleResponse<any[]>(res);
}

/* ── Outreach ── */

export async function getOutreach() {
  const res = await fetch(`${API_BASE}/outreach/`, { headers: getHeaders() });
  return handleResponse<any[]>(res);
}

/* ── Approvals ── */

export async function getApprovals() {
  const res = await fetch(`${API_BASE}/agent/approvals/`, { headers: getHeaders() });
  return handleResponse<{ status: string; data: any[] }>(res);
}

export async function getGroupedCompanyOutreach() {
  const res = await fetch(`${API_BASE}/agent/approvals/grouped-company/`, { headers: getHeaders() });
  return handleResponse<{ status: string; data: any[] }>(res);
}

export async function getBulkQueue(campaignId?: number) {
  const url = campaignId 
    ? `${API_BASE}/agent/bulk-queue/?campaign_id=${campaignId}`
    : `${API_BASE}/agent/bulk-queue/`;
  const res = await fetch(url, {
    headers: getHeaders(),
  });
  return handleResponse<{ data: any[] }>(res);
}

export async function approveOutreach(
  outreachId: number,
  edits?: { edited_subject?: string; edited_body?: string }
) {
  const res = await fetch(`${API_BASE}/agent/approvals/${outreachId}/approve/`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(edits || {}),
  });
  return handleResponse<{ status: string; message: string; email_to: string }>(res);
}

export async function editOutreach(
  outreachId: number,
  edits: { edited_subject?: string; edited_body?: string }
) {
  const res = await fetch(`${API_BASE}/agent/approvals/${outreachId}/edit/`, {
    method: 'PATCH',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(edits),
  });
  return handleResponse<{ status: string; message: string }>(res);
}

export async function skipOutreach(outreachId: number) {
  const res = await fetch(`${API_BASE}/agent/approvals/${outreachId}/skip/`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
  });
  return handleResponse<{ status: string; message: string }>(res);
}

export async function sendApprovedOutreach() {
  const res = await fetch(`${API_BASE}/agent/approvals/send-approved/`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
  });
  return handleResponse<{ status: string; sent: number; failed: number }>(res);
}

export async function sendBulkOutreach(campaignId?: number) {
  const res = await fetch(`${API_BASE}/agent/send-bulk/`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(campaignId ? { campaign_id: campaignId } : {}),
  });
  return handleResponse<{ status: string; message: string }>(res);
}

// Deprecated
export async function bulkApproveCompany(companyId: number) {
  const res = await fetch(`${API_BASE}/agent/companies/${companyId}/bulk-send/`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
  });
  return handleResponse<any>(res);
}
