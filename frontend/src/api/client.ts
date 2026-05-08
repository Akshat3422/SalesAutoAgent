const API_BASE = '/api';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`API Error ${res.status}: ${errorBody}`);
  }
  return res.json();
}

/* ── Agent / Pipeline ── */

export async function triggerPipeline(keyword: string) {
  const res = await fetch(`${API_BASE}/agent/trigger/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keyword }),
  });
  return handleResponse<{ message: string; keyword: string }>(res);
}

export async function getPipelineStatus() {
  const res = await fetch(`${API_BASE}/agent/status/`);
  return handleResponse<{
    is_running: boolean;
    current_keyword: string | null;
    started_at: string | null;
    finished_at: string | null;
    last_error: string | null;
  }>(res);
}

/* ── Dashboard ── */

export async function getDashboardStats() {
  const res = await fetch(`${API_BASE}/dashboard/stats/`);
  return handleResponse<{
    leads_discovered: number;
    sites_crawled: number;
    emails_drafted: number;
    emails_approved: number;
    emails_dispatched: number;
    replies_detected: number;
  }>(res);
}

/* ── Companies ── */

export async function getCompanies() {
  const res = await fetch(`${API_BASE}/companies/`);
  return handleResponse<any[]>(res);
}

/* ── Contacts ── */

export async function getContacts() {
  const res = await fetch(`${API_BASE}/contacts/`);
  return handleResponse<any[]>(res);
}

/* ── Outreach ── */

export async function getOutreach() {
  const res = await fetch(`${API_BASE}/outreach/`);
  return handleResponse<any[]>(res);
}

/* ── Approvals ── */

export async function getApprovals() {
  const res = await fetch(`${API_BASE}/agent/approvals/`);
  return handleResponse<{ status: string; data: any[] }>(res);
}

export async function getGroupedCompanyOutreach() {
  const res = await fetch(`${API_BASE}/agent/approvals/grouped-company/`);
  return handleResponse<{ status: string; data: any[] }>(res);
}

export async function approveOutreach(
  outreachId: number,
  edits?: { edited_subject?: string; edited_body?: string }
) {
  const res = await fetch(`${API_BASE}/agent/approvals/${outreachId}/approve/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(edits || {}),
  });
  return handleResponse<{ status: string; message: string; email_to: string }>(res);
}

export async function skipOutreach(outreachId: number) {
  const res = await fetch(`${API_BASE}/agent/approvals/${outreachId}/skip/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return handleResponse<{ status: string; message: string }>(res);
}

export async function sendApprovedOutreach() {
  const res = await fetch(`${API_BASE}/agent/approvals/send-approved/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return handleResponse<{ status: string; sent: number; failed: number }>(res);
}

export async function sendGroupedCompanyOutreach() {
  const res = await fetch(`${API_BASE}/agent/approvals/send-grouped-company/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return handleResponse<any>(res);
}

export async function bulkApproveCompany(companyId: number) {
  const res = await fetch(`${API_BASE}/agent/companies/${companyId}/bulk-send/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return handleResponse<any>(res);
}
