import { useState } from 'react';
import { 
  useApprovals, 
  useOutreach, 
  useApproveOutreach, 
  useSkipOutreach, 
  useBulkApproveCompany, 
  useGroupedOutreach, 
  useEditOutreach, 
  useSendBulkOutreach,
  useBulkQueue
} from '../hooks/useApi';
import { useCampaignStore } from '../store/campaignStore';
import { Send, X, Mail, Eye, Check, Users, ChevronDown, ChevronUp, Building2, Pencil } from 'lucide-react';

/* ── Email Preview Modal ── */
function EmailPreviewModal({
  item,
  onClose,
  onApprove,
  onSkip,
  onSave,
  isApproving,
  isSaving,
}: {
  item: any;
  onClose: () => void;
  onApprove: (edits: any) => void;
  onSkip: () => void;
  onSave: (edits: any) => void;
  isApproving: boolean;
  isSaving: boolean;
}) {
  const [subject, setSubject] = useState(item.edited_subject || item.subject || item.email_subject);
  const [body, setBody] = useState(item.edited_body || item.body || item.email_body);

  const hasChanges = subject !== (item.edited_subject || item.subject || item.email_subject) || 
                     body !== (item.edited_body || item.body || item.email_body);
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
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-1 w-full p-3 bg-surface-alt rounded-lg border border-border-light text-sm font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              className="mt-1 w-full p-4 bg-surface-alt rounded-lg border border-border-light text-sm text-text-secondary leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
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
        <div className="flex items-center justify-between px-6 py-4 border-t border-border">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSave({ edited_subject: subject, edited_body: body })}
              disabled={!hasChanges || isSaving}
              className="px-4 py-2 rounded-lg bg-surface-alt text-sm font-medium text-text-primary
                         hover:bg-border-light disabled:opacity-50 transition-colors cursor-pointer"
            >
              {isSaving ? 'Saving...' : 'Save Draft'}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onSkip}
              className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-text-secondary
                         hover:bg-surface-alt transition-colors cursor-pointer"
            >
              <X className="inline w-3.5 h-3.5 mr-1.5" />
              Skip
            </button>
            <button
              onClick={() => onApprove({ edited_subject: subject, edited_body: body })}
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
    </div>
  );
}

export default function OutreachTab() {
  const { activeCampaignId } = useCampaignStore();
  const { data: draftedApprovals = [], isLoading: approvalsLoading } = useApprovals();
  const { data: allOutreach, isLoading: outreachLoading } = useOutreach();
  const { data: groupedOutreach } = useGroupedOutreach();
  const { data: bulkQueueData = [] } = useBulkQueue(activeCampaignId || undefined);

  const approveMut = useApproveOutreach();
  const skipMut = useSkipOutreach();
  const editMut = useEditOutreach();
  const sendBulkMut = useSendBulkOutreach();
  const [previewItem, setPreviewItem] = useState<any>(null);
  const [expandedCompany, setExpandedCompany] = useState<number | null>(null);
  const [subTab, setSubTab] = useState<'approvals' | 'sent' | 'bulk'>('approvals');

  const sentEmails = (allOutreach || []).filter((o: any) => o.status === 'sent');

  return (
    <div className="animate-fade-in">
      {/* Sub-tabs */}
      <div className="flex items-center gap-1 mb-5 bg-surface-alt p-1 rounded-xl w-fit">
        {[
          { key: 'approvals', label: 'Pending Approvals', count: draftedApprovals.length },
          { key: 'bulk', label: 'Bulk Outreach', count: bulkQueueData.length },
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
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white rounded-xl p-4 border border-border shadow-sm">
            <div>
              <h3 className="font-bold text-text-primary">Bulk Sending</h3>
              <p className="text-sm text-text-muted mt-0.5">
                Review and send generalized emails to companies in this campaign.
              </p>
            </div>
            <button
              onClick={() => sendBulkMut.mutate(activeCampaignId || undefined)}
              disabled={sendBulkMut.isPending || bulkQueueData.length === 0}
              className="px-5 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-semibold
                         hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
            >
              {sendBulkMut.isPending ? 'Sending...' : 'Send All Approved Bulk'}
            </button>
          </div>

          {!activeCampaignId ? (
            <div className="flex flex-col items-center justify-center py-16 text-text-muted">
              <Building2 className="w-10 h-10 mb-3 opacity-30" />
              <p className="font-semibold">No Campaign Selected</p>
              <p className="text-sm mt-1">Select or run a campaign to see bulk emails</p>
            </div>
          ) : !bulkQueueData?.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-text-muted">
              <Mail className="w-10 h-10 mb-3 opacity-30" />
              <p className="font-semibold">No Bulk Emails Pending</p>
              <p className="text-sm mt-1">All bulk emails have been sent or none are drafted</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bulkQueueData.map((item: any) => (
                <div key={item.id} className="bg-white rounded-xl border border-border p-5 flex items-start justify-between
                           hover:shadow-card transition-shadow">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 mt-1 rounded-xl bg-accent-50 flex items-center justify-center text-accent-600 font-bold text-base flex-shrink-0">
                      {item.company_name[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold text-text-primary text-base">
                          {item.company_name}
                        </p>
                        <p className="text-xs text-text-muted bg-surface-alt px-2 py-1 rounded-md border border-border-light">
                          To: {item.contact_name}
                        </p>
                      </div>
                      <p className="text-sm font-medium text-text-secondary mt-2">
                        Subject: <span className="text-text-primary font-normal">{item.edited_subject || item.subject}</span>
                      </p>
                      <div className="mt-2 text-xs text-text-muted bg-surface-alt/50 p-3 rounded-lg border border-border-light max-h-24 overflow-hidden relative">
                        <p className="whitespace-pre-line">{item.edited_body || item.body}</p>
                        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-surface-alt/80 to-transparent"></div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0 ml-6">
                    <button
                      onClick={() => setPreviewItem(item)}
                      className="px-4 py-2 rounded-lg border border-border text-xs font-medium
                                 text-text-secondary hover:bg-primary-50 hover:text-primary-600 hover:border-primary-200 transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Edit Mail
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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
          onApprove={(edits) => {
            approveMut.mutate({ id: previewItem.id, edits });
            setPreviewItem(null);
          }}
          onSave={(edits) => {
            editMut.mutate({ id: previewItem.id, edits });
          }}
          onSkip={() => {
            skipMut.mutate(previewItem.id);
            setPreviewItem(null);
          }}
          isApproving={approveMut.isPending}
          isSaving={editMut.isPending}
        />
      )}
    </div>
  );
}
