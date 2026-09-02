import { create } from 'zustand'
import { db, initSettings } from '../db'
import { onSaveStatusChange } from '../db/backup'
import type { AppSettings } from '../types'

interface AppStore {
  settings: AppSettings | null
  loaded: boolean
  saveState: 'idle' | 'saving' | 'saved'
  lastSavedAt: string | null
  loadSettings: () => Promise<void>
  toggleSound: () => Promise<void>
  toggleTrackTask: (taskId: string) => Promise<void>
  isTracked: (taskId: string) => boolean
}

export const useAppStore = create<AppStore>((set, get) => ({
  settings: null,
  loaded: false,
  saveState: 'idle',
  lastSavedAt: null,

  loadSettings: async () => {
    const settings = await initSettings()
    set({ settings, loaded: true })
  },

  toggleSound: async () => {
    const { settings } = get()
    if (!settings) return
    const updated = { ...settings, soundEnabled: !settings.soundEnabled }
    await db.settings.put(updated)
    set({ settings: updated })
  },

  toggleTrackTask: async (taskId: string) => {
    const { settings } = get()
    if (!settings) return
    const ids = settings.trackedTaskIds.includes(taskId)
      ? settings.trackedTaskIds.filter((id) => id !== taskId)
      : [...settings.trackedTaskIds, taskId]
    const updated = { ...settings, trackedTaskIds: ids }
    await db.settings.put(updated)
    set({ settings: updated })
  },

  isTracked: (taskId: string) => {
    const { settings } = get()
    return settings?.trackedTaskIds.includes(taskId) ?? false
  },
}))

onSaveStatusChange(({ state, lastSavedAt }) => {
  useAppStore.setState({
    saveState: state,
    lastSavedAt: lastSavedAt ?? useAppStore.getState().lastSavedAt,
  })
})
