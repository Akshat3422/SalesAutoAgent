import { useState } from 'react';
import { useApprovals, useOutreach, useApproveOutreach, useSkipOutreach, useBulkApproveCompany, useGroupedOutreach } from '../hooks/useApi';
import { Send, X, Mail, Eye, Check, Users, ChevronDown, ChevronUp, Building2 } from 'lucide-react';

/* ── Email Preview Modal ── */
function EmailPreviewModal({
  item,
  onClose,
  onApprove,
  onSkip,
  isApproving,
}: {
  item: any;
  onClose: () => void;
  onApprove: () => void;
  onSkip: () => void;
  isApproving: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-modal w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h3 className="font-bold text-text-primary text-lg">Email Preview</h3>
            <p className="text-xs text-text-muted mt-0.5">
              To: {item.contact_name} ({item.contact_email})
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-surface-alt flex items-center justify-center text-text-muted cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="mb-4">
            <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Subject</label>
            <p className="text-sm font-semibold text-text-primary mt-1 p-3 bg-surface-alt rounded-lg border border-border-light">
              {item.subject}
            </p>
          </div>
          <div>
            <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Body</label>
            <div className="mt-1 p-4 bg-surface-alt rounded-lg border border-border-light text-sm text-text-secondary leading-relaxed whitespace-pre-wrap max-h-[300px] overflow-y-auto">
              {item.body}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="p-3 bg-primary-50 rounded-lg border border-primary-100">
              <p className="text-[10px] font-bold text-primary-600 uppercase">Company</p>
              <p className="text-sm font-semibold text-primary-800 mt-0.5">{item.company_name}</p>
            </div>
            <div className="p-3 bg-accent-50 rounded-lg border border-accent-100">
              <p className="text-[10px] font-bold text-accent-600 uppercase">Role</p>
              <p className="text-sm font-semibold text-accent-800 mt-0.5">{item.contact_role || '—'}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
          <button
            onClick={onSkip}
            className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-text-secondary
                       hover:bg-surface-alt transition-colors cursor-pointer"
          >
            <X className="inline w-3.5 h-3.5 mr-1.5" />
            Skip
          </button>
          <button
            onClick={onApprove}
            disabled={isApproving}
            className="px-5 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm
                       font-semibold hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50
                       transition-all shadow-sm cursor-pointer"
          >
            {isApproving ? (
              <div className="spinner !w-3.5 !h-3.5 !border-white/30 !border-t-white inline-block mr-1.5" />
            ) : (
              <Check className="inline w-3.5 h-3.5 mr-1.5" />
            )}
            Approve & Send
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Outreach Tab ── */
export default function OutreachTab() {
  const { data: approvals, isLoading: approvalsLoading } = useApprovals();
  const { data: allOutreach, isLoading: outreachLoading } = useOutreach();
  const { data: groupedOutreach } = useGroupedOutreach();
  const approveMut = useApproveOutreach();
  const skipMut = useSkipOutreach();
  const bulkApproveMut = useBulkApproveCompany();
  const [previewItem, setPreviewItem] = useState<any>(null);
  const [expandedCompany, setExpandedCompany] = useState<number | null>(null);
  const [subTab, setSubTab] = useState<'approvals' | 'sent' | 'bulk'>('approvals');

  const sentEmails = (allOutreach || []).filter((o: any) => o.status === 'sent');
  const draftedApprovals = approvals || [];

  return (
    <div className="animate-fade-in">
      {/* Sub-tabs */}
      <div className="flex items-center gap-1 mb-5 bg-surface-alt p-1 rounded-xl w-fit">
        {[
          { key: 'approvals', label: 'Pending Approvals', count: draftedApprovals.length },
          { key: 'bulk', label: 'Bulk Outreach', count: groupedOutreach?.length || 0 },
          { key: 'sent', label: 'Sent Emails', count: sentEmails.length },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key as any)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer
              ${subTab === t.key
                ? 'bg-white text-primary-700 shadow-card'
                : 'text-text-muted hover:text-text-secondary'}`}
          >
            {t.label}
            {t.count > 0 && (
              <span className="ml-1.5 bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Approvals List */}
      {subTab === 'approvals' && (
        <>
          {approvalsLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-20 w-full" />)}
            </div>
          ) : draftedApprovals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-text-muted">
              <Mail className="w-10 h-10 mb-3 opacity-30" />
              <p className="font-semibold">No Pending Approvals</p>
              <p className="text-sm mt-1">All emails have been processed</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {draftedApprovals.map((item: any) => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl border border-border p-4 flex items-center justify-between
                             hover:shadow-card transition-shadow"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 font-bold text-sm">
                      {(item.contact_name || '?')[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-text-primary text-sm truncate">
                        {item.contact_name}
                        <span className="text-text-muted font-normal"> — {item.company_name}</span>
                      </p>
                      <p className="text-xs text-text-muted truncate">{item.subject}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                    <button
                      onClick={() => setPreviewItem(item)}
                      className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium
                                 text-text-secondary hover:bg-surface-alt transition-colors cursor-pointer"
                    >
                      <Eye className="inline w-3 h-3 mr-1" />
                      Preview
                    </button>
                    <button
                      onClick={() => skipMut.mutate(item.id)}
                      className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium
                                 text-text-secondary hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors cursor-pointer"
                    >
                      <X className="inline w-3 h-3 mr-1" />
                      Skip
                    </button>
                    <button
                      onClick={() => approveMut.mutate({ id: item.id })}
                      disabled={approveMut.isPending}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-semibold
                                 hover:bg-emerald-600 disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      <Check className="inline w-3 h-3 mr-1" />
                      Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Bulk Outreach */}
      {subTab === 'bulk' && (
        <>
          {!groupedOutreach?.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-text-muted">
              <Building2 className="w-10 h-10 mb-3 opacity-30" />
              <p className="font-semibold">No Company Groups</p>
              <p className="text-sm mt-1">Approved outreach will be grouped by company</p>
            </div>
          ) : (
            <div className="space-y-3">
              {groupedOutreach.map((group: any) => (
                <div key={group.company_id} className="bg-white rounded-xl border border-border overflow-hidden">
                  <button
                    onClick={() => setExpandedCompany(expandedCompany === group.company_id ? null : group.company_id)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-alt/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-accent-50 flex items-center justify-center text-accent-600 font-bold text-sm">
                        {group.company_name[0]}
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-text-primary text-sm">{group.company_name}</p>
                        <p className="text-xs text-text-muted">
                          {group.draft_count} drafts · {group.contact_count} contacts
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          bulkApproveMut.mutate(group.company_id);
                        }}
                        disabled={bulkApproveMut.isPending}
                        className="px-3 py-1.5 rounded-lg bg-primary-600 text-white text-xs font-semibold
                                   hover:bg-primary-700 disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        <Send className="inline w-3 h-3 mr-1" />
                        Bulk Send
                      </button>
                      {expandedCompany === group.company_id ? (
                        <ChevronUp className="w-4 h-4 text-text-muted" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-text-muted" />
                      )}
                    </div>
                  </button>
                  {expandedCompany === group.company_id && (
                    <div className="border-t border-border-light px-5 py-3 bg-surface-alt/30">
                      {group.drafts.map((d: any) => (
                        <div key={d.id} className="flex items-center justify-between py-2 border-b border-border-light last:border-0">
                          <div>
                            <p className="text-sm font-medium text-text-primary">{d.contact_name}</p>
                            <p className="text-xs text-text-muted truncate max-w-md">{d.subject}</p>
                          </div>
                          <span className={`badge badge-${d.status}`}>{d.status}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Sent Emails */}
      {subTab === 'sent' && (
        <>
          {outreachLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-16 w-full" />)}
            </div>
          ) : sentEmails.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-text-muted">
              <Send className="w-10 h-10 mb-3 opacity-30" />
              <p className="font-semibold">No Emails Sent Yet</p>
              <p className="text-sm mt-1">Approve emails to see them here after sending</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-alt border-b border-border">
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-text-muted uppercase tracking-wider">Contact</th>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-text-muted uppercase tracking-wider">Company</th>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-text-muted uppercase tracking-wider">Subject</th>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-text-muted uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-text-muted uppercase tracking-wider">Sent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light">
                  {sentEmails.map((o: any) => (
                    <tr key={o.id} className="hover:bg-surface-alt/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-text-primary">{o.contact_name || '—'}</td>
                      <td className="px-4 py-3 text-text-secondary">{o.company_name || '—'}</td>
                      <td className="px-4 py-3 text-text-secondary truncate max-w-xs">{o.subject || o.email_subject || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="badge badge-sent">
                          <Check className="w-3 h-3" />
                          Sent
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-text-muted">
                        {o.sent_at ? new Date(o.sent_at).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Preview Modal */}
      {previewItem && (
        <EmailPreviewModal
          item={previewItem}
          onClose={() => setPreviewItem(null)}
          onApprove={() => {
            approveMut.mutate({ id: previewItem.id });
            setPreviewItem(null);
          }}
          onSkip={() => {
            skipMut.mutate(previewItem.id);
            setPreviewItem(null);
          }}
          isApproving={approveMut.isPending}
        />
      )}
    </div>
  );
}
