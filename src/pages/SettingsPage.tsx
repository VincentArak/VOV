import { useLiveQuery } from 'dexie-react-hooks'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, GitBranch, RotateCcw, Upload, Volume2, VolumeX } from 'lucide-react'
import { exportAllData, getSnapshotInfo, importAllData, restoreFromSnapshot } from '../db'
import type { SnapshotId } from '../types'
import { useAppStore } from '../store'
import { RelationshipTypeManager } from '../components/RelationshipTypeManager'
import { Button } from '../components/ui/Button'
import { Card, CardTitle } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import { formatDate } from '../utils'

type Confirm = {
  title: string
  body: string
  confirmLabel: string
  onConfirm: () => void
  secondaryLabel?: string
  onSecondary?: () => void
}

export function SettingsPage() {
  const settings = useAppStore((state) => state.settings)
  const toggleSound = useAppStore((state) => state.toggleSound)
  const importRef = useRef<HTMLInputElement>(null)
  const snapshots = useLiveQuery(() => getSnapshotInfo()) ?? []
  const [confirm, setConfirm] = useState<Confirm | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const handleExport = async () => {
    const data = await exportAllData()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vov-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const runImport = async (text: string, mode: 'replace' | 'merge') => {
    try {
      await importAllData(text, mode)
      window.location.reload()
    } catch {
      setNotice('Import failed. Check that the file is a VOV backup.')
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    e.target.value = ''

    // Replaced a native confirm() that overloaded OK/Cancel to mean
    // replace/merge — two destructive-ish options hidden behind buttons
    // labelled with neither word.
    setConfirm({
      title: 'Import backup',
      body: 'Replace everything with this file, or merge it into your current data?',
      confirmLabel: 'Replace all',
      onConfirm: () => runImport(text, 'replace'),
      secondaryLabel: 'Merge',
      onSecondary: () => runImport(text, 'merge'),
    })
  }

  const handleRestore = (id: SnapshotId) => {
    const label = snapshots.find((s) => s.id === id)?.label ?? id
    setConfirm({
      title: 'Restore backup',
      body: `Restore from "${label}"? Your current live data will be replaced.`,
      confirmLabel: 'Restore',
      onConfirm: async () => {
        try {
          await restoreFromSnapshot(id)
          window.location.reload()
        } catch {
          setNotice('Restore failed.')
        }
      },
    })
  }

  return (
    <div className="max-w-2xl p-6">
      <h1 className="font-fancy mb-5 text-3xl text-accent [text-shadow:0_0_14px_rgba(255,209,0,0.25),1px_1px_0_#000]">
        Interface
      </h1>

      <div className="mb-4">
        <RelationshipTypeManager />
      </div>

      <Link to="/integrations" className="mb-4 block">
        <Card interactive className="flex items-center gap-3 p-4">
          <div className="wow-slot flex h-9 w-9 items-center justify-center rounded text-accent">
            <GitBranch size={16} aria-hidden="true" />
          </div>
          <div className="flex-1">
            <div className="font-fancy text-sm text-text">Portals</div>
            <div className="text-[11px] text-text-dim">
              GitHub and Jira bindings moved to their own page
            </div>
          </div>
          <span className="text-accent">→</span>
        </Card>
      </Link>

      <Card className="mb-4 p-5">
        <CardTitle>Auto-Save &amp; Local Backups</CardTitle>
        <p className="mb-3 text-xs text-text-muted">
          Four copies are kept in this browser: live data, an on-save backup, and two
          daily snapshots.
        </p>
        <div className="space-y-1.5">
          {snapshots.map((snap) => (
            <div
              key={snap.id}
              className="flex items-center justify-between rounded-sm border border-frame-dark bg-surface-raised/60 px-3 py-2 text-sm shadow-[0_0_0_1px_rgba(107,74,24,0.35)]"
            >
              <div>
                <div className="text-ot-normal">{snap.label}</div>
                <div className="tabular text-[10px] text-text-dim">
                  {snap.savedAt ? `Updated ${formatDate(snap.savedAt)}` : 'Not yet created'}
                </div>
              </div>
              {snap.id !== 'primary' && snap.savedAt && (
                <Button variant="ghost" size="sm" onClick={() => handleRestore(snap.id as SnapshotId)}>
                  <RotateCcw size={13} aria-hidden="true" />
                  Restore
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card className="mb-4 p-5">
        <CardTitle>Keybindings</CardTitle>
        <dl className="space-y-2 text-sm text-text-muted">
          {[
            ['New quest', 'N'],
            ['Focus search', '/'],
            ['Force backup', '⌘S'],
            ['Close dialog', 'Esc'],
          ].map(([action, key]) => (
            <div key={key} className="flex justify-between">
              <dt>{action}</dt>
              <dd>
                <kbd className="tabular rounded-sm border border-frame-dark bg-surface-overlay px-1.5 py-0.5 text-[11px] shadow-[0_0_0_1px_rgba(107,74,24,0.6)]">
                  {key}
                </kbd>
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card className="mb-4 p-5">
        <CardTitle>Sound</CardTitle>
        <p className="mb-3 text-xs text-text-muted">
          Play a sound when accepting or completing a quest.
        </p>
        <Button variant="secondary" onClick={toggleSound}>
          {settings?.soundEnabled ? (
            <>
              <Volume2 size={15} aria-hidden="true" />
              Sounds On
            </>
          ) : (
            <>
              <VolumeX size={15} aria-hidden="true" />
              Sounds Off
            </>
          )}
        </Button>
      </Card>

      <Card className="mb-4 p-5">
        <CardTitle>Export / Import</CardTitle>
        <p className="mb-3 text-xs text-text-muted">
          Export writes a JSON file you can keep or move to another browser. Your GitHub
          token is stripped from the file.
        </p>
        <div className="flex flex-wrap gap-2.5">
          <Button onClick={handleExport}>
            <Download size={15} aria-hidden="true" />
            Export
          </Button>
          <Button variant="secondary" onClick={() => importRef.current?.click()}>
            <Upload size={15} aria-hidden="true" />
            Import
          </Button>
          <input
            ref={importRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImport}
          />
        </div>
      </Card>

      <Card className="p-5">
        <CardTitle>About</CardTitle>
        <p className="text-sm text-text-muted">
          <strong className="text-accent">VOV</strong> — quest-style task manager
        </p>
        <p className="mt-2 text-[11px] text-text-dim">
          Version 1.1 · all data stored locally via IndexedDB
        </p>
        <p className="mt-2 text-[11px] text-text-dim">
          Data is tied to this address:{' '}
          <code className="text-accent-dim">{window.location.origin}</code>. Open the same
          URL in the same browser or your data will look missing.
        </p>
        {import.meta.env.DEV && (
          <p className="mt-2 text-[11px] text-text-dim">
            Dev mode also writes <code className="text-accent-dim">data/vov-backup.json</code>{' '}
            in the project folder on each save.
          </p>
        )}
      </Card>

      <Modal
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm?.title ?? ''}
        className="max-w-md"
      >
        <p className="mb-5 text-sm text-text-muted">{confirm?.body}</p>
        <div className="flex flex-wrap justify-end gap-2.5">
          <Button variant="ghost" onClick={() => setConfirm(null)}>
            Cancel
          </Button>
          {confirm?.secondaryLabel && (
            <Button
              variant="secondary"
              onClick={() => {
                confirm.onSecondary?.()
                setConfirm(null)
              }}
            >
              {confirm.secondaryLabel}
            </Button>
          )}
          <Button
            variant="danger"
            onClick={() => {
              confirm?.onConfirm()
              setConfirm(null)
            }}
          >
            {confirm?.confirmLabel}
          </Button>
        </div>
      </Modal>

      <Modal open={notice !== null} onClose={() => setNotice(null)} title="Something went wrong" className="max-w-md">
        <p className="mb-5 text-sm text-text-muted">{notice}</p>
        <div className="flex justify-end">
          <Button onClick={() => setNotice(null)}>Close</Button>
        </div>
      </Modal>
    </div>
  )
}
