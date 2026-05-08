/* ── API Response Types (mirror Django models) ── */

export interface PipelineStatus {
  is_running: boolean;
  current_keyword: string | null;
  started_at: string | null;
  finished_at: string | null;
  last_error: string | null;
}

export interface Contact {
  id: number;
  company: number;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_role: string | null;
  linkedin_url: string | null;
  source_page: string | null;
  created_at: string;
}

export interface Company {
  id: number;
  domain: string;
  company_name: string;
  industry: string | null;
  ai_score: number;
  ai_score_reasoning: string | null;
  ai_gaps_detected: string | null;
  ai_recommendations: string | null;
  services_offered: string | null;
  crawl_status: 'pending' | 'crawling' | 'done' | 'failed';
  do_not_contact: boolean;
  created_at: string;
  updated_at: string;
  contacts: Contact[];
}

export interface Outreach {
  id: number;
  contact: number;
  company: number;
  status: 'drafted' | 'approved' | 'sent' | 'skipped' | 'replied' | 'failed';
  email_subject: string | null;
  email_body: string | null;
  edited_subject: string | null;
  edited_body: string | null;
  sent_at: string | null;
  replied: boolean;
  reply_content: string | null;
  follow_up_count: number;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  // serializer extras
  company_name?: string;
  company_domain?: string;
  contact_name?: string;
  contact_email?: string;
  contact_role?: string;
  subject?: string;
  body?: string;
}

export interface DashboardStats {
  leads_discovered: number;
  sites_crawled: number;
  emails_drafted: number;
  emails_approved: number;
  emails_dispatched: number;
  replies_detected: number;
}

export interface ApprovalItem {
  id: number;
  company_name: string;
  industry: string | null;
  ai_gaps: string | null;
  contact_name: string;
  contact_email: string;
  contact_role: string;
  subject: string;
  body: string;
  created_at: string | null;
}

export interface GroupedCompanyOutreach {
  company_id: number;
  company_name: string;
  company_domain: string;
  draft_count: number;
  contact_count: number;
  contacts: {
    id: number;
    contact_name: string;
    contact_email: string;
    contact_role: string;
  }[];
  drafts: {
    id: number;
    contact_id: number;
    contact_name: string;
    contact_email: string;
    subject: string;
    body: string;
    status: string;
  }[];
}

export type WorkflowStep =
  | 'research'
  | 'discover_buyer_contacts'
  | 'scrape'
  | 'hunter_enrich_contacts'
  | 'ai_gap_analysis'
  | 'outreach'
  | 'completed';

export type StepStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface LogEntry {
  id: string;
  timestamp: Date;
  step: WorkflowStep;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}
