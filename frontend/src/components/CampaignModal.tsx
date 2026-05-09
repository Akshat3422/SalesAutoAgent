import { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Target, FileText, Search, Loader2, AlertCircle } from 'lucide-react';
import { useCampaignStore } from '../store/campaignStore';
import { useTriggerPipeline } from '../hooks/useApi';

export default function CampaignModal() {
  const { isCampaignModalOpen, setCampaignModalOpen, keyword, setKeyword, isRunning } = useCampaignStore();
  const [campaignName, setCampaignName] = useState('');
  const [description, setDescription] = useState('');
  const [localKeyword, setLocalKeyword] = useState(keyword);
  const [error, setError] = useState('');
  const triggerMutation = useTriggerPipeline();
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Sync local keyword from store when opening
  useEffect(() => {
    if (isCampaignModalOpen) {
      setLocalKeyword(keyword);
      setError('');
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [isCampaignModalOpen, keyword]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignName.trim()) {
      setError('Campaign name is required');
      return;
    }
    if (!localKeyword.trim()) {
      setError('Search keyword is required');
      return;
    }
    if (isRunning) {
      setError('A campaign is already running');
      return;
    }

    setError('');
    setKeyword(localKeyword.trim());
    triggerMutation.mutate({
      keyword: localKeyword.trim(),
      campaign_name: campaignName.trim(),
    });
    setCampaignModalOpen(false);
    setCampaignName('');
    setDescription('');
  };

  const handleClose = () => {
    setCampaignModalOpen(false);
    setError('');
  };

  if (!isCampaignModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-modal animate-slide-up overflow-hidden">
        {/* Gradient header bar */}
        <div className="h-1.5 bg-gradient-to-r from-primary-500 via-primary-600 to-accent-500" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-accent-500 flex items-center justify-center shadow-elevated">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary leading-tight">Launch Campaign</h2>
              <p className="text-[11px] text-text-muted">Configure and start your agentic outreach</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:bg-surface-alt hover:text-text-secondary transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
          {/* Campaign Name */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
              Campaign Name <span className="text-error">*</span>
            </label>
            <div className="relative">
              <Target className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                ref={nameInputRef}
                id="campaign-name-input"
                type="text"
                value={campaignName}
                onChange={(e) => { setCampaignName(e.target.value); setError(''); }}
                placeholder="e.g., Q2 EdTech Outreach India"
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-surface-alt text-sm
                           placeholder:text-text-muted focus:outline-none focus:border-primary-400
                           focus:ring-2 focus:ring-primary-100 transition-all"
              />
            </div>
          </div>

          {/* Keyword */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
              Target Keyword <span className="text-error">*</span>
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                id="campaign-keyword-input"
                type="text"
                value={localKeyword}
                onChange={(e) => { setLocalKeyword(e.target.value); setError(''); }}
                placeholder="e.g., edtech AI services India"
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-surface-alt text-sm
                           placeholder:text-text-muted focus:outline-none focus:border-primary-400
                           focus:ring-2 focus:ring-primary-100 transition-all"
              />
            </div>
            <p className="text-[11px] text-text-muted mt-1.5">The AI will search for companies matching this keyword</p>
          </div>

          {/* Description (optional) */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
              Description <span className="text-text-muted font-normal normal-case">(optional)</span>
            </label>
            <div className="relative">
              <FileText className="absolute left-3.5 top-3.5 w-4 h-4 text-text-muted" />
              <textarea
                id="campaign-description-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this campaign's goals..."
                rows={2}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-surface-alt text-sm
                           placeholder:text-text-muted focus:outline-none focus:border-primary-400
                           focus:ring-2 focus:ring-primary-100 transition-all resize-none"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Info box */}
          <div className="bg-primary-50 border border-primary-100 rounded-xl px-4 py-3">
            <p className="text-xs text-primary-700 font-medium">🚀 What happens next?</p>
            <p className="text-[11px] text-primary-600 mt-1 leading-relaxed">
              The AI will research companies, discover buyer contacts, scrape intelligence, perform AI gap analysis, and draft personalized outreach emails — all automatically.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 h-11 rounded-xl border border-border text-sm font-semibold text-text-secondary
                         hover:bg-surface-alt transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="launch-campaign-btn"
              type="submit"
              disabled={isRunning || triggerMutation.isPending}
              className="flex-1 h-11 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white
                         text-sm font-semibold flex items-center justify-center gap-2
                         hover:from-primary-700 hover:to-primary-800 disabled:opacity-50
                         disabled:cursor-not-allowed transition-all shadow-elevated cursor-pointer"
            >
              {triggerMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Launching...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Launch Campaign
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
