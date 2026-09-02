import { useLiveQuery } from 'dexie-react-hooks'
import { useRef, useState } from 'react'
import {
  CheckCircle,
  Download,
  GitBranch,
  RotateCcw,
  Ticket,
  Upload,
  Volume2,
  VolumeX,
  XCircle,
} from 'lucide-react'
import {
  exportAllData,
  getSnapshotInfo,
  importAllData,
  restoreFromSnapshot,
} from '../db'
import type { SnapshotId } from '../types'
import { useAppStore } from '../store'
import { testGithubConnection } from '../services/github'
import { RelationshipTypeManager } from '../components/RelationshipTypeManager'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { formatDate } from '../utils'

export function SettingsPage() {
  const { settings, toggleSound, updateSettings } = useAppStore()
  const importRef = useRef<HTMLInputElement>(null)
  const snapshots = useLiveQuery(() => getSnapshotInfo()) ?? []
  const [githubTest, setGithubTest] = useState<
    { state: 'idle' } | { state: 'testing' } | { state: 'success'; login: string } | { state: 'error'; message: string }
  >({ state: 'idle' })

  const handleTestGithub = async () => {
    if (!settings?.githubToken) return
    setGithubTest({ state: 'testing' })
    try {
      const { login } = await testGithubConnection(settings.githubToken)
      setGithubTest({ state: 'success', login })
    } catch (err) {
      setGithubTest({
        state: 'error',
        message: err instanceof Error ? err.message : 'Connection failed',
      })
    }
  }

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

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const text = await file.text()
    const mode = confirm(
      'Click OK to REPLACE all data, or Cancel to MERGE with existing data.',
    )
      ? 'replace'
      : 'merge'

    try {
      await importAllData(text, mode as 'replace' | 'merge')
      alert('Import successful! The page will reload.')
      window.location.reload()
    } catch {
      alert('Import failed. Please check the file format.')
    }
    e.target.value = ''
  }

  const handleRestore = async (id: SnapshotId) => {
    const label = snapshots.find((s) => s.id === id)?.label ?? id
    if (
      !confirm(
        `Restore from "${label}"? This will replace your current live data.`,
      )
    ) {
      return
    }
    try {
      await restoreFromSnapshot(id)
      alert('Restore successful! The page will reload.')
      window.location.reload()
    } catch {
      alert('Restore failed.')
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="mb-4">
        <RelationshipTypeManager />
      </div>

      <section className="rounded-xl border border-border bg-surface-raised p-5 mb-4">
        <h2 className="font-semibold mb-3">Auto-Save &amp; Local Backups</h2>
        <p className="text-sm text-text-muted mb-4">
          VOV keeps <strong className="text-text">4 copies</strong> of your data in the browser:
        </p>
        <ol className="text-sm text-text-muted space-y-1 mb-4 list-decimal list-inside">
          <li>Primary live data (your working copy)</li>
          <li>On-save backup (updated after every change)</li>
          <li>Daily primary backup (refreshed once per day)</li>
          <li>Daily save backup (refreshed once per day)</li>
        </ol>
        <div className="space-y-2">
          {snapshots.map((snap) => (
            <div
              key={snap.id}
              className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
            >
              <div>
                <div className="font-medium">{snap.label}</div>
                <div className="text-xs text-text-muted">
                  {snap.savedAt
                    ? `Last updated ${formatDate(snap.savedAt)}`
                    : 'Not yet created'}
                </div>
              </div>
              {snap.id !== 'primary' && snap.savedAt && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRestore(snap.id as SnapshotId)}
                >
                  <RotateCcw size={14} />
                  Restore
                </Button>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface-raised p-5 mb-4">
        <h2 className="font-semibold mb-3">Keyboard Shortcuts</h2>
        <dl className="text-sm space-y-2 text-text-muted">
          <div className="flex justify-between">
            <dt>New quest</dt>
            <dd><kbd className="px-1.5 py-0.5 rounded bg-surface-overlay text-xs">N</kbd></dd>
          </div>
          <div className="flex justify-between">
            <dt>Focus search</dt>
            <dd><kbd className="px-1.5 py-0.5 rounded bg-surface-overlay text-xs">/</kbd></dd>
          </div>
          <div className="flex justify-between">
            <dt>Force backup now</dt>
            <dd><kbd className="px-1.5 py-0.5 rounded bg-surface-overlay text-xs">⌘S</kbd></dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-border bg-surface-raised p-5 mb-4">
        <h2 className="font-semibold mb-3">Sound Effects</h2>
        <p className="text-sm text-text-muted mb-4">
          Play sounds when accepting or completing quests.
        </p>
        <Button variant="secondary" onClick={toggleSound}>
          {settings?.soundEnabled ? (
            <>
              <Volume2 size={16} />
              Sounds On
            </>
          ) : (
            <>
              <VolumeX size={16} />
              Sounds Off
            </>
          )}
        </Button>
      </section>

      <section className="rounded-xl border border-border bg-surface-raised p-5 mb-4">
        <h2 className="font-semibold mb-3">Integrations</h2>
        <p className="text-sm text-text-muted mb-4">
          Link quests to GitHub issues or Jira tickets from the quest detail page.
        </p>

        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <GitBranch size={16} className="text-text-muted" />
            <h3 className="text-sm font-medium">GitHub</h3>
          </div>
          <p className="text-xs text-text-muted mb-3">
            Uses the GitHub REST API directly from your browser — no server needed. Create
            a{' '}
            <a
              href="https://github.com/settings/personal-access-tokens/new"
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:underline"
            >
              fine-grained personal access token
            </a>{' '}
            scoped to just the "Issues" permission on the repo below.
          </p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <Input
              label="Personal access token"
              type="password"
              placeholder="github_pat_..."
              value={settings?.githubToken ?? ''}
              onChange={(e) => {
                setGithubTest({ state: 'idle' })
                updateSettings({ githubToken: e.target.value || null })
              }}
            />
            <Input
              label="Repository (owner/repo)"
              placeholder="VincentArak/VOV"
              value={settings?.githubRepo ?? ''}
              onChange={(e) => updateSettings({ githubRepo: e.target.value || null })}
            />
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              disabled={!settings?.githubToken || githubTest.state === 'testing'}
              onClick={handleTestGithub}
            >
              {githubTest.state === 'testing' ? 'Testing…' : 'Test connection'}
            </Button>
            {githubTest.state === 'success' && (
              <span className="inline-flex items-center gap-1 text-xs text-success">
                <CheckCircle size={14} /> Connected as {githubTest.login}
              </span>
            )}
            {githubTest.state === 'error' && (
              <span className="inline-flex items-center gap-1 text-xs text-danger">
                <XCircle size={14} /> {githubTest.message}
              </span>
            )}
          </div>
          <p className="text-xs text-warning mt-3">
            ⚠️ The token is stored unencrypted in this browser's IndexedDB (this app has no
            crypto library). It is automatically stripped from Export Data backups, but
            anyone with access to this browser profile can read it via devtools.
          </p>
        </div>

        <div className="pt-4 border-t border-border">
          <div className="flex items-center gap-2 mb-2">
            <Ticket size={16} className="text-text-muted" />
            <h3 className="text-sm font-medium">Jira</h3>
          </div>
          <p className="text-xs text-text-muted mb-3">
            Jira Cloud doesn't allow API calls directly from a browser (no backend here to
            proxy them), so this only opens Jira's "create issue" screen and copies the
            quest's title/description to your clipboard for pasting — no automatic sync or
            status. This is a best-effort convenience, not a real integration.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Jira site URL"
              placeholder="https://yourteam.atlassian.net"
              value={settings?.jiraSiteUrl ?? ''}
              onChange={(e) => updateSettings({ jiraSiteUrl: e.target.value || null })}
            />
            <Input
              label="Project key (for reference)"
              placeholder="PROJ"
              value={settings?.jiraProjectKey ?? ''}
              onChange={(e) =>
                updateSettings({ jiraProjectKey: e.target.value.toUpperCase() || null })
              }
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface-raised p-5 mb-4">
        <h2 className="font-semibold mb-3">Export / Import</h2>
        <p className="text-sm text-text-muted mb-4">
          Export all data to a JSON file for external backup, or import from a file.
        </p>
        <div className="flex gap-3">
          <Button onClick={handleExport}>
            <Download size={16} />
            Export Data
          </Button>
          <Button variant="secondary" onClick={() => importRef.current?.click()}>
            <Upload size={16} />
            Import Data
          </Button>
          <input
            ref={importRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImport}
          />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface-raised p-5">
        <h2 className="font-semibold mb-3">About</h2>
        <p className="text-sm text-text-muted">
          <strong className="text-text">VOV</strong> — Quest-style Task Manager
        </p>
        <p className="text-xs text-text-muted mt-2">
          Version 1.1 · All data stored locally via IndexedDB
        </p>
        <p className="text-xs text-text-muted mt-2">
          Data is tied to this address:{' '}
          <code className="text-accent">{window.location.origin}</code>
          . Always open the same URL and browser, or data will look missing.
        </p>
        {import.meta.env.DEV && (
          <p className="text-xs text-text-muted mt-2">
            Dev mode: each save also writes{' '}
            <code className="text-accent">data/vov-backup.json</code> in the project folder.
          </p>
        )}
      </section>
    </div>
  )
}
