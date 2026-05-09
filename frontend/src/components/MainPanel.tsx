import { useCampaignStore } from '../store/campaignStore';
import CompaniesTab from './CompaniesTab';
import ContactsTab from './ContactsTab';
import AIAnalysisTab from './AIAnalysisTab';
import OutreachTab from './OutreachTab';
import LogsTab from './LogsTab';
import CampaignsTab from './CampaignsTab';
import {
  Building2,
  Users,
  Brain,
  Send,
  ScrollText,
  LayoutGrid,
} from 'lucide-react';

const TABS = [
  { key: 'campaigns', label: 'Campaigns', icon: <LayoutGrid className="w-4 h-4" /> },
  { key: 'companies', label: 'Companies', icon: <Building2 className="w-4 h-4" /> },
  { key: 'contacts', label: 'Contacts', icon: <Users className="w-4 h-4" /> },
  { key: 'analysis', label: 'AI Gap Analysis', icon: <Brain className="w-4 h-4" /> },
  { key: 'outreach', label: 'Outreach', icon: <Send className="w-4 h-4" /> },
  { key: 'logs', label: 'Logs', icon: <ScrollText className="w-4 h-4" /> },
];

export default function MainPanel() {
  const { activeTab, setActiveTab, activeCampaignId } = useCampaignStore();

  const renderTab = () => {
    switch (activeTab) {
      case 'campaigns':
        return <CampaignsTab />;
      case 'companies':
        return <CompaniesTab campaignId={activeCampaignId ?? undefined} />;
      case 'contacts':
        return <ContactsTab />;
      case 'analysis':
        return <AIAnalysisTab />;
      case 'outreach':
        return <OutreachTab />;
      case 'logs':
        return <LogsTab />;
      default:
        return <CampaignsTab />;
    }
  };

  return (
    <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* Tab Bar */}
      <div className="bg-white border-b border-border px-6">
        <nav className="flex items-center gap-1 -mb-px overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              id={`tab-${tab.key}`}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-semibold transition-all cursor-pointer whitespace-nowrap
                ${activeTab === tab.key
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-text-muted hover:text-text-secondary hover:border-gray-200'}`}
            >
              {tab.icon}
              {tab.label}
              {tab.key === 'companies' && activeCampaignId && (
                <span className="ml-1 w-1.5 h-1.5 rounded-full bg-primary-500" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {renderTab()}
      </div>
    </main>
  );
}
