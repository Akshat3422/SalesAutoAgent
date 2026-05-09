import { useCampaignStore, STEP_ORDER } from '../store/campaignStore';
import type { WorkflowStep } from '../types';
import {
  Search,
  Users,
  Globe,
  ShieldCheck,
  Brain,
  Send,
  CheckCircle2,
} from 'lucide-react';

const STEP_ICONS: Record<WorkflowStep, React.ReactNode> = {
  research: <Search className="w-4 h-4" />,
  discover_buyer_contacts: <Users className="w-4 h-4" />,
  scrape: <Globe className="w-4 h-4" />,
  hunter_enrich_contacts: <ShieldCheck className="w-4 h-4" />,
  ai_gap_analysis: <Brain className="w-4 h-4" />,
  outreach: <Send className="w-4 h-4" />,
  completed: <CheckCircle2 className="w-4 h-4" />,
};

const STATUS_COLORS = {
  pending: 'bg-gray-100 text-gray-400 border-gray-200',
  running: 'bg-primary-50 text-primary-600 border-primary-300 ring-2 ring-primary-100',
  completed: 'bg-emerald-50 text-emerald-600 border-emerald-300',
  failed: 'bg-red-50 text-red-500 border-red-300',
};

const CONNECTOR_COLORS = {
  pending: 'bg-gray-200',
  running: 'bg-primary-200',
  completed: 'bg-emerald-400',
  failed: 'bg-red-300',
};

export default function WorkflowSidebar() {
  const { workflowSteps } = useCampaignStore();

  return (
    <aside className="w-[250px] bg-white border-r border-border flex flex-col">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">
          Workflow
        </h2>
        <p className="text-[11px] text-text-muted mt-0.5">Campaign pipeline steps</p>
      </div>

      <nav className="flex-1 px-5 py-4 overflow-y-auto">
        <ol className="relative space-y-1">
          {STEP_ORDER.map((key, idx) => {
            const step = workflowSteps[key];
            const isLast = idx === STEP_ORDER.length - 1;

            return (
              <li key={key} className="relative">
                {/* Connector line */}
                {!isLast && (
                  <div
                    className={`absolute left-[17px] top-[40px] w-[2px] h-[24px] rounded-full transition-colors duration-500
                      ${CONNECTOR_COLORS[step.status]}`}
                  />
                )}

                <div
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300
                    ${step.status === 'running' ? 'bg-primary-50/70' : 'hover:bg-surface-alt'}`}
                >
                  {/* Icon circle */}
                  <div
                    className={`w-[34px] h-[34px] rounded-xl border-[1.5px] flex items-center justify-center
                      flex-shrink-0 transition-all duration-500 ${STATUS_COLORS[step.status]}`}
                  >
                    {step.status === 'running' ? (
                      <div className="spinner !w-3.5 !h-3.5" />
                    ) : (
                      STEP_ICONS[key]
                    )}
                  </div>

                  {/* Label & Description */}
                  <div className="min-w-0">
                    <p
                      className={`text-[13px] font-semibold leading-tight truncate
                        ${step.status === 'running' ? 'text-primary-700' :
                          step.status === 'completed' ? 'text-emerald-700' :
                          step.status === 'failed' ? 'text-red-600' :
                          'text-text-secondary'}`}
                    >
                      {step.label}
                    </p>
                    <p className="text-[10px] text-text-muted mt-0.5 truncate">
                      {step.description}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Legend */}
      <div className="px-5 py-3 border-t border-border">
        <div className="grid grid-cols-2 gap-1.5">
          {(['pending', 'running', 'completed', 'failed'] as const).map((s) => (
            <div key={s} className="flex items-center gap-1.5 text-[10px] text-text-muted">
              <span className={`pulse-dot ${s}`} />
              <span className="capitalize">{s}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
