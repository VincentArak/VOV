import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckCircle,
  ExternalLink,
  GitBranch,
  Loader2,
  RefreshCw,
  Ticket,
  XCircle,
} from 'lucide-react'
import { db } from '../db'
import { useAppStore } from '../store'
import type { LinkedItem, Task } from '../types'
import { getGithubIssueStatus, testGithubConnection } from '../services/github'
import { Button } from '../components/ui/Button'
import { Card, CardTitle } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { Input } from '../components/ui/Input'
import { cn } from '../utils'

type TestState =
  | { state: 'idle' }
  | { state: 'testing' }
  | { state: 'success'; login: string }
  | { state: 'error'; message: string }

/**
 * Every quest↔tracker link in one place.
 *
 * The per-quest "Linked Items" section can only answer "what is this one
 * quest connected to". The question you actually have at standup is the
 * inverse — "which of my quests are blocked on an open PR" — and that
 * needs an aggregate view, plus a way to refresh every GitHub row at
 * once instead of opening 20 quests to press refresh 20 times.
 */
export function IntegrationsPage() {
  const { settings, updateSettings } = useAppStore()
  const tasks = useLiveQuery(() => db.tasks.toArray()) ?? []
  const [githubTest, setGithubTest] = useState<TestState>({ state: 'idle' })
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)

  const linked = tasks.flatMap((task) =>
    task.linkedItems.map((item) => ({ task, item })),
  )
  const githubLinks = linked.filter((l) => l.item.provider === 'github')
  const jiraLinks = linked.filter((l) => l.item.provider === 'jira')

  const githubReady = Boolean(settings?.githubToken && settings?.githubRepo)
  const jiraReady = Boolean(settings?.jiraSiteUrl)

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

  /** Refresh every GitHub-linked row in one pass. */
  const syncAll = async () => {
    if (!settings?.githubToken || githubLinks.length === 0) return
    setSyncing(true)
    setSyncResult(null)
    let ok = 0
    let failed = 0

    for (const { task, item } of githubLinks) {
      const match = item.externalId.match(/^(.+)#(\d+)$/)
      if (!match) {
        failed++
        continue
      }
      try {
        const result = await getGithubIssueStatus(
          settings.githubToken,
          match[1],
          Number(match[2]),
        )
        const fresh = await db.tasks.get(task.id)
        if (!fresh) {
          failed++
          continue
        }
        await db.tasks.put({
          ...fresh,
          linkedItems: fresh.linkedItems.map((l) =>
            l.id === item.id
              ? {
                  ...l,
                  title: result.title,
                  status: result.state,
                  url: result.url,
                  lastSyncedAt: new Date().toISOString(),
                }
              : l,
          ),
          updatedAt: new Date().toISOString(),
        })
        ok++
      } catch {
        failed++
      }
    }

    setSyncing(false)
    setSyncResult(failed === 0 ? `Refreshed ${ok} links` : `Refreshed ${ok}, ${failed} failed`)
  }

  return (
    <div className="max-w-4xl p-6">
      <div className="mb-5">
        <h1 className="font-fancy text-3xl text-accent [text-shadow:0_0_14px_rgba(255,209,0,0.25),1px_1px_0_#000]">
          Portals
        </h1>
        <p className="mt-1 text-xs text-text-muted">
          Bindings to other realms. Quests linked here keep their tracker state without
          leaving the log.
        </p>
      </div>

      {/* Attunement status — two portals, lit or dark */}
      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <PortalStone
          icon={<GitBranch size={18} aria-hidden="true" />}
          name="GitHub"
          attuned={githubReady}
          detail={githubReady ? settings?.githubRepo ?? '' : 'No token or repository set'}
          count={githubLinks.length}
        />
        <PortalStone
          icon={<Ticket size={18} aria-hidden="true" />}
          name="Jira"
          attuned={jiraReady}
          detail={jiraReady ? settings?.jiraSiteUrl ?? '' : 'No site URL set'}
          count={jiraLinks.length}
          // Jira can't be reached from a browser, so the stone is lit at
          // half power at best — say so rather than implying parity.
          partial
        />
      </div>

      <Card className="mb-4 p-5">
        <CardTitle>GitHub Attunement</CardTitle>
        <p className="mb-3 text-xs text-text-muted">
          Calls go straight from this browser to api.github.com — no server in between.
          Create a{' '}
          <a
            href="https://github.com/settings/personal-access-tokens/new"
            target="_blank"
            rel="noreferrer"
            className="text-accent hover:underline"
          >
            fine-grained token
          </a>{' '}
          with Issues read/write on the repository below.
        </p>
        <div className="mb-3 grid gap-3 sm:grid-cols-2">
          <Input
            label="Personal access token"
            type="password"
            placeholder="github_pat_…"
            value={settings?.githubToken ?? ''}
            onChange={(e) => {
              setGithubTest({ state: 'idle' })
              updateSettings({ githubToken: e.target.value || null })
            }}
          />
          <Input
            label="Repository"
            placeholder="owner/repo"
            value={settings?.githubRepo ?? ''}
            onChange={(e) => updateSettings({ githubRepo: e.target.value || null })}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
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
              <CheckCircle size={13} aria-hidden="true" /> Attuned as {githubTest.login}
            </span>
          )}
          {githubTest.state === 'error' && (
            <span className="inline-flex items-center gap-1 text-xs text-danger">
              <XCircle size={13} aria-hidden="true" /> {githubTest.message}
            </span>
          )}
        </div>
        <p className="mt-3 rounded-sm border border-warning/30 bg-warning/5 px-3 py-2 text-[11px] text-warning">
          The token is stored unencrypted in this browser (this app has no crypto
          library). It is stripped from every JSON export and from the dev-mode file
          backup, but anyone with access to this browser profile can read it in devtools.
        </p>
      </Card>

      <Card className="mb-4 p-5">
        <CardTitle>Jira Attunement</CardTitle>
        <p className="mb-3 text-xs text-text-muted">
          Jira Cloud refuses cross-origin calls from a browser, and this app has no
          backend to relay them. So this portal only opens the door: it launches Jira's
          create screen and copies the quest text for you to paste. Nothing syncs back
          automatically — a linked Jira ticket shows no live status.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Jira site URL"
            placeholder="https://yourteam.atlassian.net"
            value={settings?.jiraSiteUrl ?? ''}
            onChange={(e) => updateSettings({ jiraSiteUrl: e.target.value || null })}
          />
          <Input
            label="Project key"
            placeholder="PROJ"
            value={settings?.jiraProjectKey ?? ''}
            onChange={(e) =>
              updateSettings({ jiraProjectKey: e.target.value.toUpperCase() || null })
            }
          />
        </div>
      </Card>

      <Card className="p-5">
        <CardTitle
          action={
            githubLinks.length > 0 && settings?.githubToken ? (
              <Button variant="secondary" size="sm" disabled={syncing} onClick={syncAll}>
                {syncing ? (
                  <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                ) : (
                  <RefreshCw size={13} aria-hidden="true" />
                )}
                Refresh all
              </Button>
            ) : undefined
          }
        >
          Bound Quests ({linked.length})
        </CardTitle>

        {syncResult && <p className="mb-2 text-xs text-text-muted">{syncResult}</p>}

        {linked.length === 0 ? (
          <EmptyState
            title="Nothing bound yet"
            description="Open a quest and use its Linked Items section to bind it to an issue or ticket."
          />
        ) : (
          <div className="space-y-1.5">
            {linked.map(({ task, item }) => (
              <LinkedRow key={item.id} task={task} item={item} />
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function PortalStone({
  icon,
  name,
  attuned,
  detail,
  count,
  partial = false,
}: {
  icon: React.ReactNode
  name: string
  attuned: boolean
  detail: string
  count: number
  partial?: boolean
}) {
  return (
    <Card
      className={cn(
        'flex items-center gap-3 p-4',
        attuned && !partial && 'shadow-[0_0_0_2px_var(--color-gold-mid),0_0_20px_rgba(255,209,0,0.12),inset_0_0_18px_rgba(0,0,0,0.7)]',
      )}
    >
      <div
        className={cn(
          'wow-slot flex h-11 w-11 shrink-0 items-center justify-center rounded',
          attuned ? 'text-accent' : 'text-text-dim',
          attuned && !partial && 'wow-slot-active',
        )}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-fancy text-sm text-text">{name}</span>
          <span
            className={cn(
              'tabular text-[10px] uppercase tracking-wider',
              attuned ? (partial ? 'text-warning' : 'text-success') : 'text-text-dim',
            )}
          >
            {attuned ? (partial ? 'One-way' : 'Attuned') : 'Dormant'}
          </span>
        </div>
        <p className="truncate text-[11px] text-text-dim">{detail}</p>
      </div>
      <span className="tabular shrink-0 text-lg text-accent">{count}</span>
    </Card>
  )
}

function LinkedRow({ task, item }: { task: Task; item: LinkedItem }) {
  const closed = item.status === 'closed'
  return (
    <div className="wow-hilight flex items-center gap-2 rounded-sm border border-frame-dark bg-surface-raised px-3 py-2 text-sm shadow-[0_0_0_1px_rgba(107,74,24,0.4)]">
      {item.provider === 'github' ? (
        <GitBranch size={13} className="shrink-0 text-text-dim" aria-hidden="true" />
      ) : (
        <Ticket size={13} className="shrink-0 text-text-dim" aria-hidden="true" />
      )}
      <Link
        to={`/quests/${task.id}`}
        className="min-w-0 flex-1 truncate text-ot-normal hover:text-accent"
      >
        {task.title}
      </Link>
      <span className="tabular hidden shrink-0 text-[11px] text-text-dim sm:inline">
        {item.externalId}
      </span>
      {item.status && (
        <span
          className={cn(
            'tabular shrink-0 rounded-sm px-1.5 py-0.5 text-[10px] uppercase',
            closed ? 'bg-success/15 text-success' : 'bg-surface-overlay text-text-muted',
          )}
        >
          {item.status}
        </span>
      )}
      <a
        href={item.url}
        target="_blank"
        rel="noreferrer"
        className="shrink-0 text-text-dim hover:text-accent"
        aria-label={`Open ${item.externalId} in a new tab`}
      >
        <ExternalLink size={13} aria-hidden="true" />
      </a>
    </div>
  )
}
