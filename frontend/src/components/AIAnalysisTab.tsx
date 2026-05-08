import { useCompanies } from '../hooks/useApi';
import { Brain, AlertTriangle, Lightbulb, Target, Zap } from 'lucide-react';

function parseTextToList(text: string | null): string[] {
  if (!text) return [];
  return text
    .split(/[\n,;•\-]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);
}

interface GapCardProps {
  companyName: string;
  aiScore: number;
  gaps: string[];
  recommendations: string[];
  services: string[];
  reasoning: string | null;
}

function GapCard({ companyName, aiScore, gaps, recommendations, services, reasoning }: GapCardProps) {
  const scoreColor =
    aiScore >= 70 ? 'text-emerald-600 bg-emerald-50 border-emerald-200' :
    aiScore >= 40 ? 'text-amber-600 bg-amber-50 border-amber-200' :
    'text-red-500 bg-red-50 border-red-200';

  return (
    <div className="bg-white rounded-xl border border-border p-5 hover:shadow-elevated transition-shadow animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
            <Brain className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h3 className="font-bold text-text-primary text-base">{companyName}</h3>
            <p className="text-[11px] text-text-muted">AI Gap Analysis</p>
          </div>
        </div>
        <div className={`px-3 py-1.5 rounded-lg border text-sm font-bold ${scoreColor}`}>
          {aiScore}/100
        </div>
      </div>

      {/* Score Reasoning */}
      {reasoning && (
        <div className="mb-4 p-3 rounded-lg bg-surface-alt border border-border-light">
          <p className="text-xs text-text-secondary leading-relaxed line-clamp-3">{reasoning}</p>
        </div>
      )}

      {/* Sections */}
      <div className="space-y-3">
        {/* Gaps / Pain Points */}
        {gaps.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Pain Points & Gaps</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {gaps.slice(0, 6).map((g, i) => (
                <span
                  key={i}
                  className="text-[11px] px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-100 font-medium"
                >
                  {g}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations / Opportunities */}
        {recommendations.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Lightbulb className="w-3.5 h-3.5 text-primary-500" />
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Opportunities</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {recommendations.slice(0, 6).map((r, i) => (
                <span
                  key={i}
                  className="text-[11px] px-2.5 py-1 rounded-md bg-primary-50 text-primary-700 border border-primary-100 font-medium"
                >
                  {r}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Services */}
        {services.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Target className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
                Personalization Hooks
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {services.slice(0, 5).map((s, i) => (
                <span
                  key={i}
                  className="text-[11px] px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 font-medium"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AIAnalysisTab() {
  const { data: companies, isLoading } = useCompanies();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-in">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton h-48 w-full" />
        ))}
      </div>
    );
  }

  const analyzedCompanies = (companies || []).filter(
    (c: any) => c.ai_score > 0 || c.ai_gaps_detected || c.ai_recommendations
  );

  if (!analyzedCompanies.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-text-muted animate-fade-in">
        <Zap className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-lg font-semibold">No AI Analysis Yet</p>
        <p className="text-sm mt-1">Analysis results appear after the AI Gap Analysis step</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-in">
      {analyzedCompanies.map((c: any) => (
        <GapCard
          key={c.id}
          companyName={c.company_name}
          aiScore={c.ai_score}
          gaps={parseTextToList(c.ai_gaps_detected)}
          recommendations={parseTextToList(c.ai_recommendations)}
          services={parseTextToList(c.services_offered)}
          reasoning={c.ai_score_reasoning}
        />
      ))}
    </div>
  );
}
