import { Check, Cloud, Loader2 } from 'lucide-react'
import { useAppStore } from '../store'
import { cn } from '../utils'

export function SaveIndicator() {
  const saveState = useAppStore((s) => s.saveState)
  const lastSavedAt = useAppStore((s) => s.lastSavedAt)

  const label =
    saveState === 'saving'
      ? 'Saving…'
      : saveState === 'saved'
        ? 'All changes saved'
        : 'Auto-save enabled'

  const timeLabel = lastSavedAt
    ? new Date(lastSavedAt).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg px-3 py-2 text-xs border',
        saveState === 'saving' && 'border-info/30 bg-info/10 text-info',
        saveState === 'saved' && 'border-success/30 bg-success/10 text-success',
        saveState === 'idle' && 'border-border bg-surface-overlay text-text-muted',
      )}
      title="4 copies kept: live data + on-save backup + 2 daily backups"
    >
      {saveState === 'saving' ? (
        <Loader2 size={14} className="animate-spin" />
      ) : saveState === 'saved' ? (
        <Check size={14} />
      ) : (
        <Cloud size={14} />
      )}
      <div className="leading-tight">
        <div className="font-medium">{label}</div>
        {timeLabel && saveState === 'saved' && (
          <div className="text-[10px] opacity-70">Last backup {timeLabel}</div>
        )}
      </div>
    </div>
  )
}
