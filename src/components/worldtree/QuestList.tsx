import { useMemo, useState } from 'react'
import type { GitPullRequest } from '../../types/git'

type Filter = 'open' | 'merged' | 'closed' | 'all'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'open', label: 'Active' },
  { id: 'merged', label: 'Fulfilled' },
  { id: 'closed', label: 'Abandoned' },
  { id: 'all', label: 'All' },
]

function age(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const day = 86400000
  if (diff < day) return 'today'
  if (diff < day * 30) return `${Math.max(1, Math.round(diff / day))}d`
  if (diff < day * 365) return `${Math.round(diff / (day * 30))}mo`
  return `${Math.round(diff / (day * 365))}y`
}

/** Quest entries living on the parchment: one row per pull request. */
export function QuestList({
  pullRequests,
  selectedBranch,
  onSelectBranch,
}: {
  pullRequests: GitPullRequest[]
  selectedBranch: string | null
  onSelectBranch: (ref: string | null) => void
}) {
  const [filter, setFilter] = useState<Filter>('open')

  const rows = useMemo(() => {
    const list = filter === 'all' ? pullRequests : pullRequests.filter((p) => p.state === filter)
    return [...list].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 40)
  }, [pullRequests, filter])

  return (
    <>
      <div className="qs-filters" role="tablist" aria-label="Quest state">
        {FILTERS.map((f) => {
          const count =
            f.id === 'all' ? pullRequests.length : pullRequests.filter((p) => p.state === f.id).length
          return (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              className="qs-filter"
              data-active={filter === f.id || undefined}
              onClick={() => setFilter(f.id)}
            >
              {f.label} {count > 0 && <span>({count})</span>}
            </button>
          )
        })}
      </div>

      {rows.length === 0 ? (
        <p className="qs-empty">No quests recorded under this seal.</p>
      ) : (
        rows.map((pr) => (
          <button
            key={pr.number}
            type="button"
            className="qr-row"
            data-selected={selectedBranch === pr.headRef || undefined}
            onClick={() => onSelectBranch(selectedBranch === pr.headRef ? null : pr.headRef)}
            title={`Highlight ${pr.headRef} on the tree`}
          >
            <span className="qr-sigil" data-state={pr.state}>
              {pr.number}
            </span>
            <span>
              <span className="qr-title">{pr.title}</span>
              <span className="qr-meta">
                <span className="qr-ref">{pr.headRef}</span>
                <span aria-hidden>→</span>
                <span className="qr-ref">{pr.baseRef}</span>
                <span>· {pr.author}</span>
                {pr.draft && <span>· draft</span>}
              </span>
            </span>
            <span className="qr-right">
              {pr.state}
              <br />
              {age(pr.mergedAt ?? pr.closedAt ?? pr.createdAt)}
            </span>
          </button>
        ))
      )}
    </>
  )
}
