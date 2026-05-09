import { useCampaignStore } from '../store/campaignStore';
import { ScrollText, Info, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

const TYPE_STYLES = {
  info: { icon: <Info className="w-3.5 h-3.5" />, color: 'text-accent-600', bg: 'bg-accent-50', border: 'border-accent-100' },
  success: { icon: <CheckCircle className="w-3.5 h-3.5" />, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  warning: { icon: <AlertTriangle className="w-3.5 h-3.5" />, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
  error: { icon: <XCircle className="w-3.5 h-3.5" />, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
};

export default function LogsTab() {
  const { logs, clearLogs } = useCampaignStore();

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ScrollText className="w-4 h-4 text-text-muted" />
          <h3 className="text-sm font-bold text-text-primary">Activity Log</h3>
          <span className="text-[10px] bg-surface-alt text-text-muted px-2 py-0.5 rounded-full font-medium">
            {logs.length} entries
          </span>
        </div>
        {logs.length > 0 && (
          <button
            onClick={clearLogs}
            className="text-xs text-text-muted hover:text-red-500 transition-colors cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-muted">
          <ScrollText className="w-10 h-10 mb-3 opacity-30" />
          <p className="font-semibold">No Activity Yet</p>
          <p className="text-sm mt-1">Logs will appear as the pipeline runs</p>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
          {logs.map((log) => {
            const style = TYPE_STYLES[log.type];
            return (
              <div
                key={log.id}
                className={`flex items-start gap-3 px-4 py-2.5 rounded-lg border ${style.bg} ${style.border} animate-fade-in`}
              >
                <div className={`mt-0.5 flex-shrink-0 ${style.color}`}>
                  {style.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-text-primary leading-relaxed">{log.message}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-text-muted font-medium">
                      {log.timestamp.toLocaleTimeString()}
                    </span>
                    <span className="text-[10px] bg-white/60 text-text-muted px-1.5 py-0.5 rounded font-medium">
                      {log.step.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
