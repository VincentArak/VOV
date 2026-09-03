import { Check, Loader2, Shield } from 'lucide-react'
import { useAppStore } from '../store'
import { cn } from '../utils'

export function SaveIndicator() {
  const saveState = useAppStore((s) => s.saveState)
  const lastSavedAt = useAppStore((s) => s.lastSavedAt)

  const label =
    saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : 'Auto-save on'

  const timeLabel = lastSavedAt
    ? new Date(lastSavedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-sm border border-frame-dark px-2.5 py-1.5 text-[11px]',
        'shadow-[0_0_0_1px_rgba(107,74,24,0.5),inset_0_0_8px_rgba(0,0,0,0.6)]',
        saveState === 'saving' && 'bg-surface-overlay text-info',
        saveState === 'saved' && 'bg-surface-overlay text-success',
        saveState === 'idle' && 'bg-surface-overlay text-text-muted',
      )}
      title="4 copies kept: live data + on-save backup + 2 daily backups"
    >
      {saveState === 'saving' ? (
        <Loader2 size={13} className="animate-spin" aria-hidden="true" />
      ) : saveState === 'saved' ? (
        <Check size={13} aria-hidden="true" />
      ) : (
        <Shield size={13} aria-hidden="true" />
      )}
      <div className="leading-tight">
        <div>{label}</div>
        {timeLabel && saveState === 'saved' && (
          <div className="tabular text-[9px] text-text-dim">{timeLabel} · 4 copies</div>
        )}
      </div>
    </div>
  )
}
