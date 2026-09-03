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
        'medieval-save flex items-center gap-3',
        saveState === 'saving' && 'medieval-save-saving',
        saveState === 'saved' && 'medieval-save-saved',
        saveState === 'idle' && 'medieval-save-idle',
      )}
      title="4 copies kept: live data + on-save backup + 2 daily backups"
    >
      {saveState === 'saving' ? (
        <Loader2 size={16} className="animate-spin" aria-hidden="true" />
      ) : saveState === 'saved' ? (
        <Check size={16} aria-hidden="true" />
      ) : (
        <Shield size={16} aria-hidden="true" />
      )}
      <div className="leading-tight">
        <div>{label}</div>
        {timeLabel && saveState === 'saved' && (
          <div className="tabular medieval-save-time">{timeLabel} · 4 copies</div>
        )}
      </div>
    </div>
  )
}
