import { useContacts } from '../hooks/useApi';
import { useCampaignStore } from '../store/campaignStore';
import { Users, Link2, Mail, ShieldCheck, ExternalLink } from 'lucide-react';

export default function ContactsTab() {
  const { activeCampaignId } = useCampaignStore();
  const { data: contacts, isLoading } = useContacts(activeCampaignId || undefined);

  if (isLoading) {
    return (
      <div className="space-y-3 animate-fade-in">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="skeleton h-14 w-full" />
        ))}
      </div>
    );
  }

  if (!contacts?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-text-muted animate-fade-in">
        <Users className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-lg font-semibold">No Contacts Discovered</p>
        <p className="text-sm mt-1">Contacts will appear after the discovery and enrichment steps</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="overflow-x-auto rounded-xl border border-border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-alt border-b border-border">
              <th className="text-left px-4 py-3 text-[11px] font-bold text-text-muted uppercase tracking-wider">Name</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold text-text-muted uppercase tracking-wider">Role</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold text-text-muted uppercase tracking-wider">Email</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold text-text-muted uppercase tracking-wider">LinkedIn</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold text-text-muted uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {contacts.map((c: any) => (
              <tr key={c.id} className="hover:bg-surface-alt/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-accent-50 flex items-center justify-center text-accent-600 font-bold text-xs">
                      {(c.contact_name || '?')[0].toUpperCase()}
                    </div>
                    <span className="font-semibold text-text-primary">{c.contact_name || 'Unknown'}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs font-medium text-text-secondary bg-surface-alt px-2 py-1 rounded-md">
                    {c.contact_role || '—'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {c.contact_email ? (
                    <a
                      href={`mailto:${c.contact_email}`}
                      className="text-accent-600 hover:text-accent-700 inline-flex items-center gap-1 text-xs font-medium"
                    >
                      <Mail className="w-3 h-3" />
                      {c.contact_email}
                    </a>
                  ) : (
                    <span className="text-text-muted text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {c.linkedin_url ? (
                    <a
                      href={c.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 text-xs font-medium"
                    >
                      <Link2 className="w-3 h-3" />
                      Profile
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-text-muted text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`badge ${c.contact_email ? 'badge-completed' : 'badge-pending'}`}>
                    <ShieldCheck className="w-3 h-3" />
                    {c.contact_email ? 'Verified' : 'Pending'}
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
