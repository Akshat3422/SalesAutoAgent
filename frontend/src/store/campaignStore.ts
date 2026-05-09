import { create } from 'zustand';
import type { WorkflowStep, StepStatus, LogEntry } from '../types';

interface WorkflowStepState {
  label: string;
  status: StepStatus;
  description: string;
}

interface CampaignStore {
  /* ── Campaign ── */
  keyword: string;
  setKeyword: (k: string) => void;
  isRunning: boolean;
  setIsRunning: (v: boolean) => void;

  /* ── Active Campaign ── */
  activeCampaignId: number | null;
  setActiveCampaignId: (id: number | null) => void;
  activeCampaignName: string | null;
  setActiveCampaignName: (name: string | null) => void;

  /* ── Campaign Modal ── */
  isCampaignModalOpen: boolean;
  setCampaignModalOpen: (v: boolean) => void;

  /* ── Active Tab ── */
  activeTab: string;
  setActiveTab: (t: string) => void;

  /* ── Workflow Steps ── */
  workflowSteps: Record<WorkflowStep, WorkflowStepState>;
  setStepStatus: (step: WorkflowStep, status: StepStatus) => void;
  resetWorkflow: () => void;
  advanceWorkflow: (completedStep: WorkflowStep) => void;

  /* ── Logs ── */
  logs: LogEntry[];
  addLog: (entry: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  clearLogs: () => void;
}

const DEFAULT_STEPS: Record<WorkflowStep, WorkflowStepState> = {
  research: { label: 'Research', status: 'pending', description: 'Identifying target companies' },
  discover_buyer_contacts: { label: 'Discover Contacts', status: 'pending', description: 'Finding decision-makers' },
  scrape: { label: 'Scrape Intelligence', status: 'pending', description: 'Crawling company websites' },
  hunter_enrich_contacts: { label: 'Enrich Contacts', status: 'pending', description: 'Verifying emails via Hunter' },
  ai_gap_analysis: { label: 'AI Gap Analysis', status: 'pending', description: 'Analyzing business opportunities' },
  outreach: { label: 'Outreach', status: 'pending', description: 'Generating personalized emails' },
  completed: { label: 'Completed', status: 'pending', description: 'Campaign finished' },
};

const STEP_ORDER: WorkflowStep[] = [
  'research',
  'discover_buyer_contacts',
  'scrape',
  'hunter_enrich_contacts',
  'ai_gap_analysis',
  'outreach',
  'completed',
];

export const useCampaignStore = create<CampaignStore>((set) => ({
  keyword: '',
  setKeyword: (k) => set({ keyword: k }),
  isRunning: false,
  setIsRunning: (v) => set({ isRunning: v }),

  activeCampaignId: null,
  setActiveCampaignId: (id) => set({ activeCampaignId: id }),
  activeCampaignName: null,
  setActiveCampaignName: (name) => set({ activeCampaignName: name }),

  isCampaignModalOpen: false,
  setCampaignModalOpen: (v) => set({ isCampaignModalOpen: v }),

  activeTab: 'campaigns',
  setActiveTab: (t) => set({ activeTab: t }),

  workflowSteps: { ...DEFAULT_STEPS },

  setStepStatus: (step, status) =>
    set((state) => ({
      workflowSteps: {
        ...state.workflowSteps,
        [step]: { ...state.workflowSteps[step], status },
      },
    })),

  resetWorkflow: () =>
    set(() => {
      const steps = { ...DEFAULT_STEPS };
      Object.keys(steps).forEach((k) => {
        steps[k as WorkflowStep] = { ...steps[k as WorkflowStep], status: 'pending' };
      });
      return { workflowSteps: steps };
    }),

  advanceWorkflow: (completedStep) =>
    set((state) => {
      const newSteps = { ...state.workflowSteps };
      newSteps[completedStep] = { ...newSteps[completedStep], status: 'completed' };

      const idx = STEP_ORDER.indexOf(completedStep);
      if (idx >= 0 && idx < STEP_ORDER.length - 1) {
        const nextStep = STEP_ORDER[idx + 1];
        newSteps[nextStep] = { ...newSteps[nextStep], status: 'running' };
      }
      return { workflowSteps: newSteps };
    }),

  logs: [],
  addLog: (entry) =>
    set((state) => ({
      logs: [
        {
          ...entry,
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          timestamp: new Date(),
        },
        ...state.logs,
      ].slice(0, 200),
    })),
  clearLogs: () => set({ logs: [] }),
}));

export { STEP_ORDER };
export type { WorkflowStepState };
