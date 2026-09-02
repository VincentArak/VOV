import type { ExportableData } from './exportFormat'
import { serializeAppData } from './exportFormat'

const LOCAL_BACKUP_ENDPOINT = '/__vov/backup'

export async function syncLocalFileBackup(data: ExportableData): Promise<void> {
  if (!import.meta.env.DEV) return

  try {
    const json = await serializeAppData(data)
    const res = await fetch(LOCAL_BACKUP_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: json,
    })

    if (!res.ok) {
      const err = await res.text()
      console.warn('[VOV] Local file backup failed:', err)
    }
  } catch (err) {
    console.warn('[VOV] Local file backup unavailable (dev server only):', err)
  }
}
