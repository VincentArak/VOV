import { useState } from 'react'
import {
  Check,
  Copy,
  ExternalLink,
  GitBranch,
  Loader2,
  Plus,
  RefreshCw,
  Ticket,
  Unlink,
} from 'lucide-react'
import type { LinkedItem, Task } from '../types'
import { useAppStore } from '../store'
import {
  createGithubIssue,
  getGithubIssueStatus,
  parseGithubIssueUrl,
} from '../services/github'
import {
  buildJiraBrowseLink,
  buildJiraCreateLink,
  copyToClipboard,
  extractJiraKey,
  formatQuestSummaryForClipboard,
  isJiraUrl,
} from '../services/jira'
import { Button } from './ui/Button'
import { Input } from './ui/Input'

interface LinkedItemsSectionProps {
  task: Task
  onUpdate: (patch: Partial<Task>) => Promise<void>
}

type Provider = 'github' | 'jira'

export function LinkedItemsSection({ task, onUpdate }: LinkedItemsSectionProps) {
  const settings = useAppStore((state) => state.settings)
  const [adding, setAdding] = useState<Provider | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [githubUrlInput, setGithubUrlInput] = useState('')
  const [jiraKeyInput, setJiraKeyInput] = useState('')
  const [copied, setCopied] = useState(false)
  const [refreshingId, setRefreshingId] = useState<string | null>(null)

  const addLinkedItem = async (item: LinkedItem) => {
    await onUpdate({ linkedItems: [...task.linkedItems, item] })
    setAdding(null)
    setGithubUrlInput('')
    setJiraKeyInput('')
    setError(null)
  }

  const removeLinkedItem = async (id: string) => {
    await onUpdate({ linkedItems: task.linkedItems.filter((l) => l.id !== id) })
  }

  const createIssue = async () => {
    if (!settings?.githubToken || !settings?.githubRepo) return
    setBusy(true)
    setError(null)
    try {
      const result = await createGithubIssue(
        settings.githubToken,
        settings.githubRepo,
        task.title,
        task.description,
      )
      await addLinkedItem({
        id: crypto.randomUUID(),
        provider: 'github',
        externalId: `${settings.githubRepo}#${result.number}`,
        title: result.title,
        url: result.url,
        status: result.state,
        lastSyncedAt: new Date().toISOString(),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create issue')
    } finally {
      setBusy(false)
    }
  }

  const linkExistingGithub = async () => {
    const parsed = parseGithubIssueUrl(githubUrlInput)
    if (!parsed) {
      setError('Paste a full URL like https://github.com/owner/repo/issues/123')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const repo = `${parsed.owner}/${parsed.repo}`
      if (settings?.githubToken) {
        const result = await getGithubIssueStatus(settings.githubToken, repo, parsed.number)
        await addLinkedItem({
          id: crypto.randomUUID(),
          provider: 'github',
          externalId: `${repo}#${parsed.number}`,
          title: result.title,
          url: result.url,
          status: result.state,
          lastSyncedAt: new Date().toISOString(),
        })
      } else {
        await addLinkedItem({
          id: crypto.randomUUID(),
          provider: 'github',
          externalId: `${repo}#${parsed.number}`,
          title: `${repo}#${parsed.number}`,
          url: githubUrlInput.trim(),
          status: null,
          lastSyncedAt: null,
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to look up issue')
    } finally {
      setBusy(false)
    }
  }

  const refreshGithub = async (item: LinkedItem) => {
    if (!settings?.githubToken) return
    const match = item.externalId.match(/^(.+)#(\d+)$/)
    if (!match) return
    setRefreshingId(item.id)
    try {
      const result = await getGithubIssueStatus(settings.githubToken, match[1], Number(match[2]))
      await onUpdate({
        linkedItems: task.linkedItems.map((l) =>
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
      })
    } catch {
      // Silent: user can retry, avoids a persistent error state on the row
    } finally {
      setRefreshingId(null)
    }
  }

  const linkJira = async () => {
    if (!jiraKeyInput.trim()) return
    const key = extractJiraKey(jiraKeyInput)
    const url = isJiraUrl(jiraKeyInput)
      ? jiraKeyInput.trim()
      : settings?.jiraSiteUrl
        ? buildJiraBrowseLink(settings.jiraSiteUrl, key)
        : jiraKeyInput.trim()
    await addLinkedItem({
      id: crypto.randomUUID(),
      provider: 'jira',
      externalId: key,
      title: key,
      url,
      status: null,
      lastSyncedAt: null,
    })
  }

  const copySummary = async () => {
    await copyToClipboard(formatQuestSummaryForClipboard(task.title, task.description))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-fancy text-xs uppercase tracking-[0.15em] text-ot-header">
          Bindings
        </h3>
        {!adding && (
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => setAdding('github')}>
              <Plus size={14} />
              GitHub
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setAdding('jira')}>
              <Plus size={14} />
              Jira
            </Button>
          </div>
        )}
      </div>

      {task.linkedItems.length === 0 && !adding && (
        <p className="text-sm text-text-dim">Not bound to a pull request or ticket yet</p>
      )}

      <div className="space-y-2 mb-3">
        {task.linkedItems.map((item) => (
          <div
            key={item.id}
            className="wow-hilight flex items-center gap-2 rounded-sm border border-frame-dark bg-surface-raised px-3 py-2 text-sm shadow-[0_0_0_1px_rgba(107,74,24,0.4)]"
          >
            {item.provider === 'github' ? (
              <GitBranch size={14} className="text-text-muted shrink-0" />
            ) : (
              <Ticket size={14} className="text-text-muted shrink-0" />
            )}
            <span className="flex-1 truncate">
              {item.externalId}
              {item.title && item.title !== item.externalId ? ` — ${item.title}` : ''}
            </span>
            {item.status && <StateChip state={item.status} />}
            {item.provider === 'github' && settings?.githubToken && (
              <button
                className="text-text-muted hover:text-accent cursor-pointer disabled:opacity-50"
                onClick={() => refreshGithub(item)}
                disabled={refreshingId === item.id}
                aria-label="Refresh status"
              >
                {refreshingId === item.id ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <RefreshCw size={14} />
                )}
              </button>
            )}
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="text-text-muted hover:text-accent cursor-pointer"
              aria-label="Open in new tab"
            >
              <ExternalLink size={14} />
            </a>
            <button
              className="text-text-muted hover:text-danger cursor-pointer"
              onClick={() => removeLinkedItem(item.id)}
              aria-label="Unlink"
            >
              <Unlink size={14} />
            </button>
          </div>
        ))}
      </div>

      {adding === 'github' && (
        <div className="space-y-3 rounded-sm border border-gold-lo/60 bg-surface-sunken/60 p-3 shadow-[inset_0_0_14px_rgba(0,0,0,0.6)]">
          {!settings?.githubToken || !settings?.githubRepo ? (
            <p className="text-xs text-text-muted">
              Configure a token and repository under Settings → Integrations first.
            </p>
          ) : (
            <Button variant="secondary" size="sm" disabled={busy} onClick={createIssue}>
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Create issue in {settings.githubRepo}
            </Button>
          )}
          <div className="flex gap-2">
            <Input
              placeholder="Paste an existing issue/PR URL"
              value={githubUrlInput}
              onChange={(e) => setGithubUrlInput(e.target.value)}
              className="flex-1"
            />
            <Button variant="secondary" size="sm" disabled={busy} onClick={linkExistingGithub}>
              Link
            </Button>
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
          <button
            className="text-xs text-text-muted hover:text-text cursor-pointer"
            onClick={() => {
              setAdding(null)
              setError(null)
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {adding === 'jira' && (
        <div className="space-y-3 rounded-sm border border-gold-lo/60 bg-surface-sunken/60 p-3 shadow-[inset_0_0_14px_rgba(0,0,0,0.6)]">
          <p className="text-xs text-text-muted">
            No real Jira API access from the browser — open the create screen, paste the
            summary, then paste the resulting ticket key/URL back here to link it.
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={!settings?.jiraSiteUrl}
              onClick={() =>
                settings?.jiraSiteUrl &&
                window.open(buildJiraCreateLink(settings.jiraSiteUrl), '_blank')
              }
            >
              <ExternalLink size={14} />
              Open Jira
            </Button>
            <Button variant="ghost" size="sm" onClick={copySummary}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy summary'}
            </Button>
          </div>
          {!settings?.jiraSiteUrl && (
            <p className="text-xs text-text-muted">
              Set a Jira site URL under Settings → Integrations to enable the link.
            </p>
          )}
          <div className="flex gap-2">
            <Input
              placeholder="Paste ticket key (PROJ-123) or URL"
              value={jiraKeyInput}
              onChange={(e) => setJiraKeyInput(e.target.value)}
              className="flex-1"
            />
            <Button variant="secondary" size="sm" onClick={linkJira}>
              Link
            </Button>
          </div>
          <button
            className="text-xs text-text-muted hover:text-text cursor-pointer"
            onClick={() => setAdding(null)}
          >
            Cancel
          </button>
        </div>
      )}
    </section>
  )
}

/**
 * Merged is shown apart from closed on purpose: GitHub reports a merged pull
 * request as `state: "closed"`, which would make shipped work and abandoned
 * work look the same on a quest.
 */
function StateChip({ state }: { state: string }) {
  const tone =
    state === 'merged'
      ? 'bg-q-epic/20 text-q-epic'
      : state === 'open'
        ? 'bg-success/15 text-success'
        : state === 'draft'
          ? 'bg-surface-overlay text-text-muted'
          : 'bg-surface-overlay text-text-dim'

  return (
    <span className={`tabular rounded-sm px-1.5 py-0.5 text-[10px] uppercase ${tone}`}>
      {state}
    </span>
  )
}
