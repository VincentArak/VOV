import { useCallback, useEffect, useState } from 'react'
import {
  AlertCircle,
  CircleDot,
  ExternalLink,
  GitBranch,
  GitMerge,
  GitPullRequest,
  Loader2,
  Lock,
  RefreshCw,
} from 'lucide-react'
import { useAppStore } from '../store'
import {
  listBranches,
  listIssues,
  listPullRequests,
  type GithubBranch,
  type GithubPull,
  type GithubRepoIssue,
} from '../services/github'
import { Button } from './ui/Button'
import { cn } from '../utils'

type Tab = 'pulls' | 'branches' | 'issues'

/**
 * Live state of the repository a department is bound to.
 *
 * A quest shows the one PR it is bound to; this answers the wider question
 * — what else is in flight in this codebase that nobody has turned into a
 * quest yet. All three lists come straight from api.github.com in the
 * browser, so nothing is cached server-side and nothing is stale beyond the
 * last refresh.
 */
export function RepoGitPanel({ repo }: { repo: string }) {
  const { settings } = useAppStore()
  const token = settings?.githubToken ?? null

  const [tab, setTab] = useState<Tab>('pulls')
  const [pulls, setPulls] = useState<GithubPull[] | null>(null)
  const [branches, setBranches] = useState<GithubBranch[] | null>(null)
  const [issues, setIssues] = useState<GithubRepoIssue[] | null>(null)
  // Starts true when a token exists, because the effect below fetches on
  // mount — initialising it here rather than setting it from inside the
  // effect avoids a render purely to flip a flag.
  const [loading, setLoading] = useState(Boolean(token))
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)

  const refresh = useCallback(() => {
    setLoading(true)
    setNonce((n) => n + 1)
  }, [])

  useEffect(() => {
    if (!token) return
    // Three independent calls, and the panel can be unmounted mid-flight by
    // selecting a different repository in the tree. Without this the late
    // responses would write into a component that no longer exists and, worse,
    // a slow response for the previous repo could overwrite the new one.
    const cancelled = { current: false }

    void (async () => {
      try {
        const [p, b, i] = await Promise.all([
          listPullRequests(token, repo),
          listBranches(token, repo),
          listIssues(token, repo),
        ])
        if (cancelled.current) return
        setPulls(p)
        setBranches(b)
        setIssues(i)
        setError(null)
      } catch (err) {
        if (cancelled.current) return
        setError(err instanceof Error ? err.message : 'Could not reach GitHub')
      } finally {
        if (!cancelled.current) setLoading(false)
      }
    })()

    return () => {
      cancelled.current = true
    }
  }, [token, repo, nonce])

  if (!token) {
    return (
      <p className="text-xs text-text-dim">
        Add a GitHub token under Portals to see branches, pull requests and issues for{' '}
        <code className="text-accent-dim">{repo}</code>.
      </p>
    )
  }

  const openPulls = pulls?.filter((p) => p.state === 'open' || p.state === 'draft').length ?? 0
  const openIssues = issues?.filter((i) => i.state === 'open').length ?? 0

  const tabs: { id: Tab; label: string; count: number | null }[] = [
    { id: 'pulls', label: 'Pull Requests', count: openPulls },
    { id: 'branches', label: 'Branches', count: branches?.length ?? null },
    { id: 'issues', label: 'Issues', count: openIssues },
  ]

  return (
    <div>
      <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            aria-pressed={tab === t.id}
            className={cn(
              'wow-hilight cursor-pointer rounded-sm border px-2.5 py-1 text-[11px] transition-colors',
              tab === t.id
                ? 'border-gold-mid bg-gradient-to-b from-gold to-gold-mid font-semibold text-frame-dark'
                : 'border-frame-dark bg-surface-overlay text-text-muted hover:text-text',
            )}
          >
            {t.label}
            {t.count !== null && <span className="tabular ml-1.5 opacity-75">{t.count}</span>}
          </button>
        ))}
        <div className="flex-1" />
        <Button variant="ghost" size="sm" disabled={loading} onClick={refresh}>
          {loading ? (
            <Loader2 size={12} className="animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw size={12} aria-hidden="true" />
          )}
          Refresh
        </Button>
      </div>

      {error && (
        <p className="mb-2 inline-flex items-center gap-1.5 text-[11px] text-danger">
          <AlertCircle size={12} aria-hidden="true" />
          {error}
        </p>
      )}

      <div className="max-h-80 space-y-1 overflow-y-auto rounded-sm border border-frame-dark bg-surface-sunken/50 p-2 shadow-[inset_0_0_14px_rgba(0,0,0,0.5)]">
        {loading && !pulls && (
          <p className="p-2 text-[11px] text-text-dim" role="status">
            Reading {repo}…
          </p>
        )}

        {tab === 'pulls' &&
          (pulls?.length === 0 ? (
            <Empty>No pull requests</Empty>
          ) : (
            pulls?.map((p) => <PullRow key={p.number} pull={p} />)
          ))}

        {tab === 'branches' &&
          (branches?.length === 0 ? (
            <Empty>No branches</Empty>
          ) : (
            branches?.map((b) => <BranchRow key={b.name} branch={b} />)
          ))}

        {tab === 'issues' &&
          (issues?.length === 0 ? (
            <Empty>No issues</Empty>
          ) : (
            issues?.map((i) => <IssueRow key={i.number} issue={i} />)
          ))}
      </div>
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="p-2 text-[11px] text-text-dim">{children}</p>
}

function Row({ children, url }: { children: React.ReactNode; url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="wow-hilight flex items-center gap-2 rounded-sm border border-frame-dark bg-surface-raised/60 px-2.5 py-1.5 text-[12px] shadow-[0_0_0_1px_rgba(107,74,24,0.3)]"
    >
      {children}
      <ExternalLink size={11} className="shrink-0 text-text-dim" aria-hidden="true" />
    </a>
  )
}

function PullRow({ pull }: { pull: GithubPull }) {
  const tone =
    pull.state === 'merged'
      ? 'text-q-epic'
      : pull.state === 'open'
        ? 'text-success'
        : pull.state === 'draft'
          ? 'text-text-muted'
          : 'text-text-dim'

  return (
    <Row url={pull.url}>
      <span className={cn('shrink-0', tone)}>
        {pull.state === 'merged' ? (
          <GitMerge size={12} aria-hidden="true" />
        ) : (
          <GitPullRequest size={12} aria-hidden="true" />
        )}
      </span>
      <span className="tabular shrink-0 text-text-dim">#{pull.number}</span>
      <span className="min-w-0 flex-1 truncate text-ot-normal">{pull.title}</span>
      <span className="tabular hidden shrink-0 text-[10px] text-text-dim sm:inline">
        {pull.head} → {pull.base}
      </span>
      <span className={cn('tabular shrink-0 text-[10px] uppercase', tone)}>{pull.state}</span>
    </Row>
  )
}

function BranchRow({ branch }: { branch: GithubBranch }) {
  return (
    <Row url="#">
      <GitBranch size={12} className="shrink-0 text-text-muted" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate text-ot-normal">{branch.name}</span>
      {branch.protected && (
        <span
          className="inline-flex shrink-0 items-center gap-1 text-[10px] text-accent-dim"
          title="Protected branch"
        >
          <Lock size={10} aria-hidden="true" />
          protected
        </span>
      )}
      <span className="tabular shrink-0 text-[10px] text-text-dim">{branch.sha}</span>
    </Row>
  )
}

function IssueRow({ issue }: { issue: GithubRepoIssue }) {
  return (
    <Row url={issue.url}>
      <CircleDot
        size={12}
        className={cn('shrink-0', issue.state === 'open' ? 'text-success' : 'text-q-epic')}
        aria-hidden="true"
      />
      <span className="tabular shrink-0 text-text-dim">#{issue.number}</span>
      <span className="min-w-0 flex-1 truncate text-ot-normal">{issue.title}</span>
      {issue.labels.slice(0, 2).map((l) => (
        <span
          key={l.name}
          className="hidden shrink-0 rounded-sm px-1.5 py-0.5 text-[9px] sm:inline"
          style={{ background: `#${l.color}33`, color: `#${l.color}` }}
        >
          {l.name}
        </span>
      ))}
    </Row>
  )
}
