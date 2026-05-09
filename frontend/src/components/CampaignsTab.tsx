import { useState } from 'react';
import { useCampaigns, useCampaignStats } from '../hooks/useApi';
import { useCampaignStore } from '../store/campaignStore';
import type { Campaign } from '../types';
import {
  LayoutGrid,
  Building2,
  Users,
  Mail,
  Send,
  Calendar,
  ChevronRight,
  Loader2,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function StatPill({ icon, value, label, color }: { icon: React.ReactNode; value: number; label: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`${color}`}>{icon}</span>
      <span className="font-semibold text-text-primary text-sm">{value}</span>
      <span className="text-[11px] text-text-muted">{label}</span>
    </div>
  );
}

function CampaignCard({ campaign, isActive, onClick }: { campaign: Campaign; isActive: boolean; onClick: () => void }) {
  const { data: stats, isLoading: statsLoading } = useCampaignStats(campaign.id);

  const successRate = stats && stats.emails_sent > 0
    ? Math.round((stats.replies / stats.emails_sent) * 100)
    : 0;

  return (
    <div
      onClick={onClick}
      id={`campaign-card-${campaign.id}`}
      className={`group relative bg-white rounded-2xl border-2 transition-all duration-200 cursor-pointer hover:shadow-elevated overflow-hidden
        ${isActive
          ? 'border-primary-400 shadow-elevated ring-2 ring-primary-100'
          : 'border-border hover:border-primary-200'
        }`}
    >
      {/* Top accent bar */}
      <div className={`h-1 w-full ${isActive ? 'bg-gradient-to-r from-primary-500 to-accent-500' : 'bg-gradient-to-r from-gray-200 to-gray-100 group-hover:from-primary-300 group-hover:to-accent-300'} transition-all`} />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${campaign.is_active ? 'bg-emerald-400' : 'bg-gray-300'}`} />
              <h3 className="font-bold text-text-primary truncate text-[15px]">{campaign.name}</h3>
            </div>
            {campaign.description && (
              <p className="text-xs text-text-muted line-clamp-1 ml-4">{campaign.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`badge text-[10px] ${campaign.is_active ? 'badge-running' : 'badge-completed'}`}>
              {campaign.is_active ? 'Active' : 'Complete'}
            </span>
            <ChevronRight className={`w-4 h-4 transition-colors ${isActive ? 'text-primary-500' : 'text-text-muted group-hover:text-primary-400'}`} />
          </div>
        </div>

        {/* Stats grid */}
        {statsLoading ? (
          <div className="mt-4 flex items-center gap-2 text-text-muted text-xs">
            <Loader2 className="w-3 h-3 animate-spin" />
            Loading stats...
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2.5">
            <StatPill
              icon={<Building2 className="w-3.5 h-3.5" />}
              value={stats?.total_companies ?? campaign.total_companies_found}
              label="companies"
              color="text-primary-500"
            />
            <StatPill
              icon={<Users className="w-3.5 h-3.5" />}
              value={stats?.total_contacts ?? campaign.email_extracted}
              label="contacts"
              color="text-accent-500"
            />
            <StatPill
              icon={<Mail className="w-3.5 h-3.5" />}
              value={stats?.emails_drafted ?? 0}
              label="drafted"
              color="text-purple-500"
            />
            <StatPill
              icon={<Send className="w-3.5 h-3.5" />}
              value={stats?.emails_sent ?? campaign.total_email_send}
              label="sent"
              color="text-emerald-500"
            />
          </div>
        )}

        {/* Progress bar */}
        {stats && stats.total_companies > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-text-muted font-medium uppercase tracking-wider">Crawl Progress</span>
              <span className="text-[10px] font-semibold text-text-secondary">
                {stats.crawled_companies}/{stats.total_companies}
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary-400 to-accent-400 rounded-full transition-all duration-700"
                style={{ width: `${Math.round((stats.crawled_companies / stats.total_companies) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-border-light flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
            <Calendar className="w-3 h-3" />
            {formatDate(campaign.created_at)}
          </div>
          {stats && stats.emails_sent > 0 && (
            <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
              <TrendingUp className="w-3 h-3" />
              {successRate}% reply rate
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyCampaigns() {
  const { setCampaignModalOpen } = useCampaignStore();
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-50 to-accent-50 border border-border flex items-center justify-center mb-5">
        <LayoutGrid className="w-9 h-9 text-primary-400" />
      </div>
      <h3 className="text-xl font-bold text-text-primary mb-2">No Campaigns Yet</h3>
      <p className="text-sm text-text-muted max-w-xs leading-relaxed">
        Launch your first AI-powered campaign to start discovering companies and generating outreach.
      </p>
      <button
        onClick={() => setCampaignModalOpen(true)}
        className="mt-6 px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white text-sm font-semibold
                   hover:from-primary-700 hover:to-primary-800 transition-all shadow-elevated cursor-pointer flex items-center gap-2"
      >
        <LayoutGrid className="w-4 h-4" />
        Launch First Campaign
      </button>
    </div>
  );
}

function SummaryBar({ campaigns }: { campaigns: Campaign[] }) {
  const total = campaigns.length;
  const active = campaigns.filter(c => c.is_active).length;
  const totalCompanies = campaigns.reduce((s, c) => s + c.total_companies_found, 0);
  const totalSent = campaigns.reduce((s, c) => s + c.total_email_send, 0);

  return (
    <div className="grid grid-cols-4 gap-3 mb-6">
      {[
        { icon: <LayoutGrid className="w-4 h-4" />, value: total, label: 'Total Campaigns', color: 'text-primary-600', bg: 'bg-primary-50' },
        { icon: <CheckCircle2 className="w-4 h-4" />, value: active, label: 'Active', color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { icon: <Building2 className="w-4 h-4" />, value: totalCompanies, label: 'Companies Found', color: 'text-accent-600', bg: 'bg-accent-50' },
        { icon: <Send className="w-4 h-4" />, value: totalSent, label: 'Emails Sent', color: 'text-purple-600', bg: 'bg-purple-50' },
      ].map((item) => (
        <div key={item.label} className="bg-white rounded-xl border border-border p-3.5 flex items-center gap-3 hover:shadow-card transition-shadow">
          <div className={`w-9 h-9 rounded-lg ${item.bg} flex items-center justify-center flex-shrink-0`}>
            <span className={item.color}>{item.icon}</span>
          </div>
          <div>
            <p className="text-xl font-bold text-text-primary leading-tight">{item.value}</p>
            <p className="text-[10px] text-text-muted font-medium uppercase tracking-wider">{item.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CampaignsTab() {
  const { data: campaigns, isLoading } = useCampaigns();
  const { activeCampaignId, setActiveCampaignId, setActiveCampaignName, setActiveTab } = useCampaignStore();

  const handleCampaignClick = (campaign: Campaign) => {
    setActiveCampaignId(campaign.id === activeCampaignId ? null : campaign.id);
    setActiveCampaignName(campaign.id === activeCampaignId ? null : campaign.name);
  };

  const handleViewCompanies = () => {
    setActiveTab('companies');
  };

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-56 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!campaigns?.length) {
    return <EmptyCampaigns />;
  }

  const selectedCampaign = campaigns.find((c: Campaign) => c.id === activeCampaignId);

  return (
    <div className="animate-fade-in">
      <SummaryBar campaigns={campaigns} />

      {/* Selection banner */}
      {activeCampaignId && selectedCampaign && (
        <div className="mb-5 flex items-center justify-between bg-primary-50 border border-primary-100 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-primary-600 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
            </div>
            <p className="text-sm font-semibold text-primary-700">
              Viewing: <span className="font-bold">{selectedCampaign.name}</span>
            </p>
            <span className="text-[11px] text-primary-500">— Companies and Contacts tabs are now filtered by this campaign</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleViewCompanies}
              className="px-3 py-1.5 rounded-lg bg-primary-600 text-white text-xs font-semibold
                         hover:bg-primary-700 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Building2 className="w-3 h-3" />
              View Companies
            </button>
            <button
              onClick={() => { setActiveCampaignId(null); setActiveCampaignName(null); }}
              className="px-3 py-1.5 rounded-lg border border-primary-200 text-primary-700 text-xs font-semibold
                         hover:bg-primary-100 transition-colors cursor-pointer"
            >
              Clear Filter
            </button>
          </div>
        </div>
      )}

      {/* Campaign cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {campaigns.map((campaign: Campaign) => (
          <CampaignCard
            key={campaign.id}
            campaign={campaign}
            isActive={campaign.id === activeCampaignId}
            onClick={() => handleCampaignClick(campaign)}
          />
        ))}
      </div>
    </div>
  );
}
