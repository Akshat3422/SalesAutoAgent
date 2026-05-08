import { useState } from 'react';
import { Search, Zap, Sparkles } from 'lucide-react';
import { useCampaignStore } from '../store/campaignStore';
import { useTriggerPipeline, usePipelineStatus } from '../hooks/useApi';

const SUGGESTIONS = [
  'edtech AI services',
  'voice assistants for NBFCs',
  'AI chatbots for healthcare',
  'marketing automation SaaS',
  'fintech payment solutions India',
];

export default function Header() {
  const { keyword, setKeyword, isRunning } = useCampaignStore();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const triggerMutation = useTriggerPipeline();
  usePipelineStatus();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim() || isRunning) return;
    triggerMutation.mutate(keyword.trim());
    setShowSuggestions(false);
  };

  return (
    <header className="bg-white border-b border-border sticky top-0 z-50 shadow-card">
      <div className="flex items-center justify-between px-6 py-3">
        {/* Logo */}
        <div className="flex items-center gap-3 min-w-[200px]">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-600 to-accent-500 flex items-center justify-center shadow-elevated">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-text-primary leading-tight tracking-tight">
              SalesAuto<span className="text-primary-600">AI</span>
            </h1>
            <p className="text-[10px] text-text-muted font-medium uppercase tracking-widest">Agentic Outreach</p>
          </div>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSubmit} className="flex-1 max-w-2xl mx-8 relative">
          <div className="relative flex items-center">
            <Search className="absolute left-4 w-4.5 h-4.5 text-text-muted" />
            <input
              id="campaign-search-input"
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="Enter campaign keyword — e.g. edtech AI services"
              className="w-full h-11 pl-11 pr-4 rounded-xl border border-border bg-surface-alt text-sm
                         placeholder:text-text-muted focus:outline-none focus:border-primary-400
                         focus:ring-2 focus:ring-primary-100 transition-all"
              disabled={isRunning}
            />
            <button
              id="run-campaign-btn"
              type="submit"
              disabled={isRunning || !keyword.trim()}
              className="absolute right-1.5 h-8 px-5 rounded-lg bg-gradient-to-r from-primary-600 to-primary-700
                         text-white text-sm font-semibold flex items-center gap-2
                         hover:from-primary-700 hover:to-primary-800 disabled:opacity-50
                         disabled:cursor-not-allowed transition-all shadow-sm cursor-pointer"
            >
              {isRunning ? (
                <>
                  <div className="spinner !w-3.5 !h-3.5 !border-white/30 !border-t-white" />
                  Running
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Run Campaign
                </>
              )}
            </button>
          </div>

          {/* Suggestions Dropdown */}
          {showSuggestions && !isRunning && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-border
                            shadow-modal p-2 z-50 animate-fade-in">
              <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider px-3 py-1.5">
                Try these campaigns
              </p>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onMouseDown={() => {
                    setKeyword(s);
                    setShowSuggestions(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-text-secondary
                             hover:bg-primary-50 hover:text-primary-700 transition-colors cursor-pointer"
                >
                  <Search className="inline w-3.5 h-3.5 mr-2 opacity-40" />
                  {s}
                </button>
              ))}
            </div>
          )}
        </form>

        {/* Status Badge */}
        <div className="min-w-[140px] flex justify-end">
          {isRunning ? (
            <div className="badge badge-running">
              <span className="pulse-dot running" />
              Pipeline Active
            </div>
          ) : (
            <div className="badge badge-completed">
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              Ready
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
