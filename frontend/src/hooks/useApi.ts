import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/client';
import { useCampaignStore, STEP_ORDER } from '../store/campaignStore';
import type { WorkflowStep } from '../types';
import { useEffect, useRef } from 'react';

/* ── Dashboard Stats ── */
export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboardStats'],
    queryFn: api.getDashboardStats,
    refetchInterval: 5000,
  });
}

/* ── Pipeline Status (with workflow step inference) ── */
export function usePipelineStatus() {
  const { setIsRunning, addLog, advanceWorkflow, setStepStatus, resetWorkflow } =
    useCampaignStore();
  const prevRunning = useRef(false);
  const prevCompanyCount = useRef(0);
  const prevContactCount = useRef(0);

  const query = useQuery({
    queryKey: ['pipelineStatus'],
    queryFn: api.getPipelineStatus,
    refetchInterval: 3000,
  });

  const statsQuery = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: api.getDashboardStats,
    refetchInterval: 4000,
  });

  // Infer workflow progression from dashboard stats changes
  useEffect(() => {
    if (!query.data) return;
    const { is_running, last_error } = query.data;

    setIsRunning(is_running);

    if (is_running && !prevRunning.current) {
      // Pipeline just started
      resetWorkflow();
      setStepStatus('research', 'running');
      addLog({ step: 'research', message: 'Pipeline started — researching targets...', type: 'info' });
    }

    if (!is_running && prevRunning.current) {
      // Pipeline just finished
      if (last_error) {
        addLog({ step: 'research', message: `Pipeline failed: ${last_error}`, type: 'error' });
      } else {
        // Mark all steps completed
        STEP_ORDER.forEach((s) => setStepStatus(s, 'completed'));
        addLog({ step: 'completed', message: 'Campaign pipeline completed successfully!', type: 'success' });
      }
    }

    // Infer step transitions from stats
    if (is_running && statsQuery.data) {
      const stats = statsQuery.data;

      if (stats.leads_discovered > 0 && prevCompanyCount.current === 0) {
        advanceWorkflow('research');
        addLog({ step: 'discover_buyer_contacts', message: `${stats.leads_discovered} companies identified, discovering buyer contacts...`, type: 'info' });
      }

      if (stats.sites_crawled > prevCompanyCount.current && stats.sites_crawled > 0) {
        if (prevCompanyCount.current === 0) {
          advanceWorkflow('discover_buyer_contacts');
          addLog({ step: 'scrape', message: 'Scraping company intelligence...', type: 'info' });
        }
      }

      if (stats.emails_drafted > 0 && prevContactCount.current === 0) {
        setStepStatus('scrape', 'completed');
        setStepStatus('hunter_enrich_contacts', 'completed');
        setStepStatus('ai_gap_analysis', 'completed');
        setStepStatus('outreach', 'running');
        addLog({ step: 'outreach', message: `${stats.emails_drafted} emails drafted`, type: 'info' });
      }

      prevCompanyCount.current = stats.leads_discovered;
      prevContactCount.current = stats.emails_drafted;
    }

    prevRunning.current = is_running;
  }, [query.data, statsQuery.data]);

  return query;
}

/* ── Companies ── */
export function useCompanies() {
  return useQuery({
    queryKey: ['companies'],
    queryFn: api.getCompanies,
    refetchInterval: 8000,
  });
}

/* ── Contacts ── */
export function useContacts() {
  return useQuery({
    queryKey: ['contacts'],
    queryFn: api.getContacts,
    refetchInterval: 8000,
  });
}

/* ── Outreach ── */
export function useOutreach() {
  return useQuery({
    queryKey: ['outreach'],
    queryFn: api.getOutreach,
    refetchInterval: 6000,
  });
}

/* ── Approvals ── */
export function useApprovals() {
  return useQuery({
    queryKey: ['approvals'],
    queryFn: async () => {
      const data = await api.getApprovals();
      return data.data || [];
    },
    refetchInterval: 6000,
  });
}

export function useGroupedOutreach() {
  return useQuery({
    queryKey: ['groupedOutreach'],
    queryFn: async () => {
      const data = await api.getGroupedCompanyOutreach();
      return data.data || [];
    },
    refetchInterval: 6000,
  });
}

/* ── Mutations ── */
export function useTriggerPipeline() {
  const queryClient = useQueryClient();
  const { addLog, resetWorkflow, setStepStatus, setIsRunning } = useCampaignStore();

  return useMutation({
    mutationFn: (keyword: string) => api.triggerPipeline(keyword),
    onSuccess: (_, keyword) => {
      resetWorkflow();
      setIsRunning(true);
      setStepStatus('research', 'running');
      addLog({ step: 'research', message: `Campaign started for "${keyword}"`, type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['pipelineStatus'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
    onError: (error) => {
      addLog({ step: 'research', message: `Failed to start: ${error.message}`, type: 'error' });
    },
  });
}

export function useApproveOutreach() {
  const queryClient = useQueryClient();
  const { addLog } = useCampaignStore();

  return useMutation({
    mutationFn: ({ id, edits }: { id: number; edits?: { edited_subject?: string; edited_body?: string } }) =>
      api.approveOutreach(id, edits),
    onSuccess: (data) => {
      addLog({ step: 'outreach', message: `Email approved → ${data.email_to}`, type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['outreach'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
}

export function useSkipOutreach() {
  const queryClient = useQueryClient();
  const { addLog } = useCampaignStore();

  return useMutation({
    mutationFn: (id: number) => api.skipOutreach(id),
    onSuccess: () => {
      addLog({ step: 'outreach', message: 'Email skipped', type: 'warning' });
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['outreach'] });
    },
  });
}

export function useBulkApproveCompany() {
  const queryClient = useQueryClient();
  const { addLog } = useCampaignStore();

  return useMutation({
    mutationFn: (companyId: number) => api.bulkApproveCompany(companyId),
    onSuccess: (data) => {
      addLog({
        step: 'outreach',
        message: `Bulk send initiated for ${data.company_name}`,
        type: 'success',
      });
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['groupedOutreach'] });
      queryClient.invalidateQueries({ queryKey: ['outreach'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
}
