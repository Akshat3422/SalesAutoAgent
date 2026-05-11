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
  const { setIsRunning, addLog, advanceWorkflow, setStepStatus, resetWorkflow, setActiveCampaignId, setActiveCampaignName } =
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
    queryKey: ['campaignStats', query.data?.campaign_id],
    queryFn: () => api.getCampaignStats(query.data!.campaign_id!),
    enabled: !!query.data?.campaign_id,
    refetchInterval: 4000,
  });

  // Infer workflow progression from dashboard stats changes
  useEffect(() => {
    if (!query.data) return;
    const { is_running, last_error, campaign_id, campaign_name } = query.data;

    setIsRunning(is_running);

    if (is_running && campaign_id) {
      setActiveCampaignId(campaign_id);
      setActiveCampaignName(campaign_name);
    }

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

      if (stats.total_companies > 0 && prevCompanyCount.current === 0) {
        advanceWorkflow('research');
        addLog({ step: 'discover_buyer_contacts', message: `${stats.total_companies} companies identified, discovering buyer contacts...`, type: 'info' });
      }

      if (stats.crawled_companies > prevCompanyCount.current && stats.crawled_companies > 0) {
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

      prevCompanyCount.current = stats.total_companies;
      prevContactCount.current = stats.emails_drafted;
    }

    prevRunning.current = is_running;
  }, [query.data, statsQuery.data]);

  return query;
}

/* ── Campaigns ── */
export function useCampaigns() {
  return useQuery({
    queryKey: ['campaigns'],
    queryFn: api.getCampaigns,
    refetchInterval: 5000,
  });
}

export function useCampaignStats(id: number | null) {
  return useQuery({
    queryKey: ['campaignStats', id],
    queryFn: () => api.getCampaignStats(id!),
    enabled: !!id,
    refetchInterval: 5000,
  });
}

/* ── Companies ── */
export function useCompanies(campaignId?: number) {
  return useQuery({
    queryKey: ['companies', campaignId],
    queryFn: () => api.getCompanies(campaignId),
    refetchInterval: 8000,
  });
}

/* ── Contacts ── */
export function useContacts(campaignId?: number) {
  return useQuery({
    queryKey: ['contacts', campaignId],
    queryFn: () => api.getContacts(campaignId),
    refetchInterval: 8000,
  });
}

/* ── Outreach ── */
export function useOutreach(campaignId?: number) {
  return useQuery({
    queryKey: ['outreach', campaignId],
    queryFn: () => api.getOutreach(campaignId),
    refetchInterval: 6000,
  });
}

/* ── Approvals ── */
export function useApprovals(campaignId?: number) {
  return useQuery({
    queryKey: ['approvals', campaignId],
    queryFn: async () => {
      const data = await api.getApprovals(campaignId);
      return data.data || [];
    },
    refetchInterval: 6000,
  });
}

export function useGroupedOutreach(campaignId?: number) {
  return useQuery({
    queryKey: ['groupedOutreach', campaignId],
    queryFn: async () => {
      const data = await api.getGroupedCompanyOutreach(campaignId);
      return data.data || [];
    },
    refetchInterval: 6000,
  });
}

export function useBulkQueue(campaignId?: number) {
  return useQuery({
    queryKey: ['bulkQueue', campaignId],
    queryFn: async () => {
      const data = await api.getBulkQueue(campaignId);
      return data.data || [];
    },
    enabled: !!campaignId,
  });
}

/* ── Mutations ── */
export function useTriggerPipeline() {
  const queryClient = useQueryClient();
  const { addLog, resetWorkflow, setStepStatus, setIsRunning, setActiveCampaignId, setActiveCampaignName } = useCampaignStore();

  return useMutation({
    mutationFn: ({ keyword, campaign_name, campaign_id }: { keyword: string; campaign_name?: string; campaign_id?: number }) =>
      api.triggerPipeline(keyword, { campaign_name, campaign_id }),
    onSuccess: (data, vars) => {
      resetWorkflow();
      setIsRunning(true);
      setStepStatus('research', 'running');
      addLog({ step: 'research', message: `Campaign started for "${vars.keyword}"`, type: 'success' });
      if (data.campaign_id) {
        setActiveCampaignId(data.campaign_id);
        setActiveCampaignName(data.campaign_name);
      }
      queryClient.invalidateQueries({ queryKey: ['pipelineStatus'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
    onError: (error) => {
      addLog({ step: 'research', message: `Failed to start: ${error.message}`, type: 'error' });
    },
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, description }: { name: string; description?: string }) =>
      api.createCampaign(name, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
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
      queryClient.invalidateQueries({ queryKey: ['groupedOutreach'] });
      queryClient.invalidateQueries({ queryKey: ['outreach'] });
      queryClient.invalidateQueries({ queryKey: ['bulkQueue'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
}

export function useEditOutreach() {
  const queryClient = useQueryClient();
  const { addLog } = useCampaignStore();

  return useMutation({
    mutationFn: ({ id, edits }: { id: number; edits: { edited_subject?: string; edited_body?: string } }) =>
      api.editOutreach(id, edits),
    onSuccess: () => {
      addLog({ step: 'outreach', message: 'Email draft saved successfully', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['bulkQueue'] });
      queryClient.invalidateQueries({ queryKey: ['groupedOutreach'] });
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
      queryClient.invalidateQueries({ queryKey: ['bulkQueue'] });
      queryClient.invalidateQueries({ queryKey: ['groupedOutreach'] });
    },
  });
}

export function useSendBulkOutreach() {
  const queryClient = useQueryClient();
  const { addLog } = useCampaignStore();

  return useMutation({
    mutationFn: (campaignId?: number) => api.sendBulkOutreach(campaignId),
    onSuccess: (data) => {
      addLog({ step: 'outreach', message: `Bulk dispatch initiated successfully`, type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['groupedOutreach'] });
      queryClient.invalidateQueries({ queryKey: ['bulkQueue'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['campaignStats'] });
    },
  });
}

// Deprecated
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
