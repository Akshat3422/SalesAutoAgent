import { useDashboardStats } from '../hooks/useApi';
import {
  Building2,
  Users,
  MailCheck,
  Send,
  Clock,
  TrendingUp,
} from 'lucide-react';

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
  bgColor: string;
}

function MetricCard({ icon, label, value, color, bgColor }: MetricCardProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-border-light hover:shadow-card transition-shadow">
      <div className={`w-9 h-9 rounded-lg ${bgColor} flex items-center justify-center flex-shrink-0`}>
        <span className={color}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold text-text-primary leading-tight">{value}</p>
        <p className="text-[10px] text-text-muted font-medium uppercase tracking-wider truncate">{label}</p>
      </div>
    </div>
  );
}

export default function MetricsPanel() {
  const { data, isLoading } = useDashboardStats();

  const metrics = [
    {
      icon: <Building2 className="w-4 h-4" />,
      label: 'Companies Found',
      value: data?.leads_discovered ?? 0,
      color: 'text-primary-600',
      bgColor: 'bg-primary-50',
    },
    {
      icon: <Users className="w-4 h-4" />,
      label: 'Contacts',
      value: data?.sites_crawled ?? 0,
      color: 'text-accent-600',
      bgColor: 'bg-accent-50',
    },
    {
      icon: <MailCheck className="w-4 h-4" />,
      label: 'Emails Drafted',
      value: data?.emails_drafted ?? 0,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      icon: <Clock className="w-4 h-4" />,
      label: 'Approved',
      value: data?.emails_approved ?? 0,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      icon: <Send className="w-4 h-4" />,
      label: 'Emails Sent',
      value: data?.emails_dispatched ?? 0,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      icon: <TrendingUp className="w-4 h-4" />,
      label: 'Success Rate',
      value: data && data.emails_dispatched > 0
        ? `${Math.round((data.replies_detected / data.emails_dispatched) * 100)}%`
        : '—',
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
    },
  ];

  if (isLoading) {
    return (
      <aside className="w-[240px] bg-white border-l border-border p-4">
        <div className="skeleton h-4 w-24 mb-4" />
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton h-16 w-full" />
          ))}
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-[240px] bg-white border-l border-border flex flex-col">
      <div className="px-4 py-4 border-b border-border">
        <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">Metrics</h2>
        <p className="text-[11px] text-text-muted mt-0.5">Campaign performance</p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {metrics.map((m) => (
          <MetricCard key={m.label} {...m} />
        ))}
      </div>
    </aside>
  );
}
