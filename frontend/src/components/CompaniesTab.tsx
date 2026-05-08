import { useCompanies } from '../hooks/useApi';
import { Globe, ExternalLink, TrendingUp } from 'lucide-react';

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 70 ? 'bg-emerald-500' :
    score >= 40 ? 'bg-amber-500' :
    'bg-red-400';

  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-text-secondary">{score}</span>
    </div>
  );
}

export default function CompaniesTab() {
  const { data: companies, isLoading } = useCompanies();

  if (isLoading) {
    return (
      <div className="space-y-3 animate-fade-in">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="skeleton h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!companies?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-text-muted animate-fade-in">
        <Globe className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-lg font-semibold">No Companies Yet</p>
        <p className="text-sm mt-1">Run a campaign to discover target companies</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="overflow-x-auto rounded-xl border border-border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-alt border-b border-border">
              <th className="text-left px-4 py-3 text-[11px] font-bold text-text-muted uppercase tracking-wider">Company</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold text-text-muted uppercase tracking-wider">Website</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold text-text-muted uppercase tracking-wider">Industry</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold text-text-muted uppercase tracking-wider">Crawl Status</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold text-text-muted uppercase tracking-wider">AI Score</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold text-text-muted uppercase tracking-wider">Contacts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {companies.map((c: any) => (
              <tr key={c.id} className="hover:bg-surface-alt/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600 font-bold text-xs">
                      {(c.company_name || '?')[0].toUpperCase()}
                    </div>
                    <span className="font-semibold text-text-primary">{c.company_name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <a
                    href={`https://${c.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent-600 hover:text-accent-700 inline-flex items-center gap-1 text-xs font-medium"
                  >
                    {c.domain}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </td>
                <td className="px-4 py-3 text-text-secondary text-xs">{c.industry || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`badge badge-${c.crawl_status === 'done' ? 'completed' : c.crawl_status === 'crawling' ? 'running' : c.crawl_status}`}>
                    {c.crawl_status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <ScoreBar score={c.ai_score} />
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-text-secondary">
                    <TrendingUp className="w-3 h-3" />
                    {c.contacts?.length || 0}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
