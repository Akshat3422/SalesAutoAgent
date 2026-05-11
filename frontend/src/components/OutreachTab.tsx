import { useState, useEffect } from 'react';
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
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Body</label>
              {body.trim().startsWith("<div") && (
                <span className="text-[10px] font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded border border-primary-100">HTML Template</span>
              )}
            </div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              className="mt-1 w-full p-4 bg-surface-alt rounded-lg border border-border-light text-sm text-text-secondary leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
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

/* ── Bulk Full Preview Modal (Master-Detail View) ── */
function BulkFullPreviewModal({
  items,
  onClose,
  onSend
}: {
  items: any[],
  onClose: () => void,
  onSend: () => void
}) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const currentItem = items[selectedIdx] || null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-md animate-fade-in p-4 lg:p-8">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col animate-slide-up overflow-hidden border border-white/20">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-border bg-white z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary-600 flex items-center justify-center shadow-lg shadow-primary-200">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-text-primary text-xl tracking-tight">Campaign Dispatch Review</h3>
              <p className="text-sm text-text-muted mt-0.5">
                Reviewing <span className="text-primary-600 font-bold">{items.length}</span> personalized drafts
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-border text-sm font-bold text-text-secondary hover:bg-surface-alt transition-all"
            >
              Cancel
            </button>
            <button
              onClick={onSend}
              className="px-8 py-3 rounded-xl bg-primary-600 text-white text-sm font-bold hover:bg-primary-700 shadow-xl shadow-primary-200 hover:shadow-primary-300 transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-95"
            >
              <Send className="w-4 h-4" />
              Approve & Send All
            </button>
          </div>
        </div>

        {/* Main Content: Split View */}
        <div className="flex-1 flex overflow-hidden bg-surface-alt/30">
          {/* Sidebar: List of Companies */}
          <div className="w-80 border-r border-border bg-white flex flex-col">
            <div className="p-4 border-b border-border bg-surface-alt/20">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search companies..."
                  className="w-full bg-white border border-border rounded-xl py-2 px-9 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
                <div className="absolute left-3 top-2.5 text-text-muted">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {items.map((item, idx) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedIdx(idx)}
                  className={`w-full text-left p-4 rounded-2xl transition-all flex items-center gap-3 group
                    ${selectedIdx === idx
                      ? 'bg-primary-50 border-primary-100 shadow-sm'
                      : 'hover:bg-surface-alt border-transparent'}`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs transition-colors
                    ${selectedIdx === idx ? 'bg-primary-600 text-white' : 'bg-surface-alt text-text-muted group-hover:bg-white'}`}>
                    {item.company_name[0]}
                  </div>
                  <div className="min-w-0">
                    <p className={`font-bold text-sm truncate ${selectedIdx === idx ? 'text-primary-900' : 'text-text-primary'}`}>
                      {item.company_name}
                    </p>
                    <p className="text-[10px] text-text-muted truncate mt-0.5">{item.contact_name}</p>
                  </div>
                  {selectedIdx === idx && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-500 shadow-sm" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Right Pane: Full Email Content */}
          <div className="flex-1 overflow-y-auto bg-white p-8 lg:p-12">
            {currentItem ? (
              <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
                {/* Meta info */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-primary-600 uppercase tracking-[0.2em] bg-primary-50 px-2 py-1 rounded">Subject</span>
                    <h2 className="text-xl font-bold text-text-primary">
                      {currentItem.edited_subject || currentItem.subject}
                    </h2>
                  </div>
                  <div className="flex items-center gap-3 border-y border-border py-4">
                    <div className="w-10 h-10 rounded-full bg-surface-alt flex items-center justify-center text-text-muted">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-text-primary">{currentItem.contact_name}</p>
                      <p className="text-xs text-text-muted italic">{currentItem.contact_email}</p>
                    </div>
                  </div>
                </div>

                {/* Body Content */}
                <div className="bg-surface-alt/30 rounded-[2rem] p-4 border border-border-light relative min-h-[400px] overflow-hidden">
                  <div className="absolute top-6 right-8 text-[10px] font-bold text-text-muted uppercase tracking-widest opacity-30 z-10">
                    Draft {selectedIdx + 1} of {items.length}
                  </div>
                  <div className="h-full overflow-y-auto">
                    {(currentItem.edited_body || currentItem.body || "").trim().startsWith("<div") ? (
                      <div
                        className="animate-fade-in bg-white p-6 rounded-2xl shadow-inner shadow-black/5"
                        dangerouslySetInnerHTML={{ __html: currentItem.edited_body || currentItem.body }}
                      />
                    ) : (
                      <div className="text-base text-text-secondary leading-[1.8] whitespace-pre-line font-medium p-6">
                        {currentItem.edited_body || currentItem.body}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Tip */}
                <div className="flex items-center gap-3 p-4 bg-accent-50 rounded-2xl border border-accent-100">
                  <div className="w-8 h-8 rounded-full bg-accent-100 flex items-center justify-center text-accent-600">
                    <Eye className="w-4 h-4" />
                  </div>
                  <p className="text-xs text-accent-800 font-medium">
                    This email uses personalized insights about <span className="font-bold">{currentItem.company_name}</span>'s tech stack and AI gaps.
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-text-muted">
                <Mail className="w-16 h-16 opacity-10 mb-4" />
                <p>Select a company to preview the email</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OutreachTab() {
  const { activeCampaignId } = useCampaignStore();
  const { data: draftedApprovals = [], isLoading: approvalsLoading } = useApprovals(activeCampaignId || undefined);
  const { data: allOutreach, isLoading: outreachLoading } = useOutreach(activeCampaignId || undefined);
  const { data: groupedOutreach } = useGroupedOutreach(activeCampaignId || undefined);
  const { data: bulkQueueData = [] } = useBulkQueue(activeCampaignId || undefined);

  const approveMut = useApproveOutreach();
  const skipMut = useSkipOutreach();
  const editMut = useEditOutreach();
  const sendBulkMut = useSendBulkOutreach();
  const [previewItem, setPreviewItem] = useState<any>(null);
  const [showBulkPreview, setShowBulkPreview] = useState(false);
  const [selectedApprovalIdx, setSelectedApprovalIdx] = useState(0);
  const [expandedCompany, setExpandedCompany] = useState<number | null>(null);
  const [subTab, setSubTab] = useState<'approvals' | 'sent' | 'bulk'>('approvals');

  const sentEmails = (allOutreach || []).filter((o: any) => o.status === 'sent');
  const selectedApproval = draftedApprovals[selectedApprovalIdx] || null;

  // Local state for editing in the Split View
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");

  useEffect(() => {
    if (selectedApproval) {
      setEditSubject(selectedApproval.edited_subject || selectedApproval.subject || selectedApproval.email_subject || "");
      setEditBody(selectedApproval.edited_body || selectedApproval.body || selectedApproval.email_body || "");
    }
  }, [selectedApproval]);

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
      {/* Approvals Split View */}
      {subTab === 'approvals' && (
        <div className="h-[calc(100vh-280px)] min-h-[600px] flex overflow-hidden bg-white rounded-3xl border border-border shadow-elevated animate-fade-in">
          {approvalsLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="spinner !w-8 !h-8" />
            </div>
          ) : draftedApprovals.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-text-muted">
              <Mail className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-lg font-bold">No Pending Approvals</p>
              <p className="text-sm mt-1">Great job! All emails have been processed.</p>
            </div>
          ) : (
            <>
              {/* Sidebar: List of Approvals */}
              <div className="w-80 border-r border-border flex flex-col bg-surface-alt/10">
                <div className="p-4 border-b border-border bg-white flex items-center justify-between">
                  <h4 className="text-xs font-black text-text-muted uppercase tracking-widest">Drafts ({draftedApprovals.length})</h4>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
                  {draftedApprovals.map((item: any, idx: number) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedApprovalIdx(idx)}
                      className={`w-full text-left p-4 rounded-2xl transition-all flex items-start gap-3 group
                        ${selectedApprovalIdx === idx
                          ? 'bg-white border border-border shadow-md ring-2 ring-primary-500/10'
                          : 'hover:bg-white/50 border border-transparent'}`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm transition-colors
                        ${selectedApprovalIdx === idx ? 'bg-primary-600 text-white' : 'bg-surface-alt text-text-muted'}`}>
                        {(item.contact_name || '?')[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`font-bold text-sm truncate ${selectedApprovalIdx === idx ? 'text-primary-700' : 'text-text-primary'}`}>
                          {item.contact_name}
                        </p>
                        <p className="text-[10px] text-text-muted truncate mt-0.5 font-medium">{item.company_name}</p>
                        <p className="text-[10px] text-text-muted truncate mt-1 italic">{item.subject}</p>
                      </div>
                      {selectedApprovalIdx === idx && (
                        <div className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-2" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Detail Pane: Edit & Approve */}
              <div className="flex-1 flex flex-col bg-white overflow-hidden">
                {selectedApproval ? (
                  <div className="flex-1 flex flex-col h-full animate-fade-in">
                    {/* Header */}
                    <div className="px-8 py-6 border-b border-border flex items-center justify-between bg-surface-alt/5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center">
                          <Users className="w-6 h-6 text-primary-600" />
                        </div>
                        <div>
                          <h3 className="font-bold text-text-primary text-lg leading-tight">{selectedApproval.contact_name}</h3>
                          <p className="text-xs text-text-muted mt-1 font-medium">
                            {selectedApproval.contact_role} @ <span className="text-primary-600">{selectedApproval.company_name}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => skipMut.mutate(selectedApproval.id)}
                          className="px-4 py-2 rounded-xl border border-border text-sm font-bold text-text-secondary hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all cursor-pointer"
                        >
                          <X className="inline w-4 h-4 mr-2" />
                          Skip
                        </button>
                        <button
                          onClick={() => approveMut.mutate({ id: selectedApproval.id, edits: { edited_subject: editSubject, edited_body: editBody } })}
                          disabled={approveMut.isPending}
                          className="px-6 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-bold hover:bg-primary-700 shadow-xl shadow-primary-200 hover:shadow-primary-300 transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                          <Check className="inline w-4 h-4" />
                          {approveMut.isPending ? 'Sending...' : 'Approve & Send'}
                        </button>
                      </div>
                    </div>

                    {/* Content Editor */}
                    <div className="flex-1 overflow-y-auto p-8 lg:p-10 space-y-6 bg-white scrollbar-thin">
                      <div className="max-w-3xl mx-auto space-y-6">
                        <div>
                          <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Subject Line</label>
                          <input
                            type="text"
                            value={editSubject}
                            onChange={(e) => setEditSubject(e.target.value)}
                            className="w-full mt-2 p-4 bg-surface-alt/50 border border-border-light rounded-2xl text-base font-bold text-text-primary focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all"
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between ml-1 mb-2">
                            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Email Content</label>
                            {(editBody || "").trim().startsWith('<div') && (
                              <span className="px-2 py-0.5 rounded bg-primary-50 text-primary-600 text-[10px] font-bold border border-primary-100">HTML TEMPLATE</span>
                            )}
                          </div>
                          <textarea
                            value={editBody}
                            onChange={(e) => setEditBody(e.target.value)}
                            rows={15}
                            className={`w-full p-6 bg-surface-alt/50 border border-border-light rounded-2xl text-sm text-text-secondary leading-relaxed focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all resize-none
                              ${(editBody || "").trim().startsWith('<div') ? 'font-mono text-xs' : ''}`}
                          />
                        </div>

                        {/* Analysis Context (Fixed Height Card) */}
                        <div className="p-5 bg-accent-50 rounded-2xl border border-accent-100 flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl bg-accent-100 flex items-center justify-center flex-shrink-0">
                            <Eye className="w-5 h-5 text-accent-600" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-accent-900 uppercase tracking-tighter mb-1">Personalization Context</h4>
                            <p className="text-xs text-accent-800 leading-relaxed font-medium">
                              This draft is based on AI signals detected for {selectedApproval.company_name}.
                              It highlights specific operational gaps and matches them with HabileLabs solutions.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-text-muted grayscale opacity-50">
                    <Mail className="w-16 h-16 mb-4" />
                    <p className="font-bold">Select a draft to review</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
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
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowBulkPreview(true)}
                disabled={bulkQueueData.length === 0}
                className="px-4 py-2.5 rounded-lg border border-border text-sm font-semibold
                           text-text-secondary hover:bg-surface-alt disabled:opacity-50 transition-colors cursor-pointer flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                Preview All
              </button>
              <button
                onClick={() => sendBulkMut.mutate(activeCampaignId || undefined)}
                disabled={sendBulkMut.isPending || bulkQueueData.length === 0}
                className="px-5 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-semibold
                           hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
              >
                {sendBulkMut.isPending ? 'Sending...' : 'Send All Approved Bulk'}
              </button>
            </div>
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
            <div className="space-y-2.5">
              {bulkQueueData.map((item: any) => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl border border-border p-4 flex items-center justify-between
                             hover:shadow-card transition-shadow"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-accent-50 flex items-center justify-center text-accent-600 font-bold text-sm">
                      {(item.company_name || '?')[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-text-primary text-sm truncate">
                        {item.company_name}
                        <span className="text-text-muted font-normal text-xs ml-2"> — {item.contact_name}</span>
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
                      onClick={() => setPreviewItem(item)}
                      className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium
                                 text-text-secondary hover:bg-surface-alt transition-colors cursor-pointer"
                    >
                      <Pencil className="inline w-3 h-3 mr-1" />
                      Edit
                    </button>
                    <button
                      onClick={() => skipMut.mutate(item.id)}
                      className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium
                                 text-text-secondary hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors cursor-pointer"
                    >
                      <X className="inline w-3 h-3 mr-1" />
                      Skip
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

      {/* Full Bulk Preview Modal */}
      {showBulkPreview && (
        <BulkFullPreviewModal
          items={bulkQueueData}
          onClose={() => setShowBulkPreview(false)}
          onSend={() => {
            sendBulkMut.mutate(activeCampaignId || undefined);
            setShowBulkPreview(false);
          }}
        />
      )}
    </div>
  );
}
