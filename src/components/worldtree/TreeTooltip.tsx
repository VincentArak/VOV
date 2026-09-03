import type { GitCommit } from '../../types/git'
import type { RenderLimb } from '../../worldtree/core/layout'
import { STATUS_LABEL } from '../../worldtree/theme'

export interface TooltipTarget {
  screenX: number
  screenY: number
  commit?: GitCommit
  limb?: RenderLimb
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const day = 86400000
  if (diff < day) return 'today'
  if (diff < day * 2) return 'yesterday'
  if (diff < day * 30) return `${Math.round(diff / day)} days ago`
  if (diff < day * 365) return `${Math.round(diff / (day * 30))} months ago`
  return `${Math.round(diff / (day * 365))} years ago`
}

/** Metadata is revealed on demand so the tree is never buried in text. */
export function TreeTooltip({ target }: { target: TooltipTarget | null }) {
  if (!target) return null
  const { commit, limb } = target

  return (
    <div
      className="wt-tooltip"
      style={{
        left: target.screenX,
        top: target.screenY,
      }}
      role="tooltip"
    >
      {commit && (
        <>
          <div className="wt-tooltip-title">{commit.message}</div>
          <div className="wt-tooltip-meta">
            <span className="wt-mono">{commit.shortSha}</span>
            <span>·</span>
            <span>{commit.author}</span>
            <span>·</span>
            <span>{timeAgo(commit.date)}</span>
          </div>
          {commit.parents.length > 1 && (
            <div className="wt-tooltip-note">Two histories met at this growth ring</div>
          )}
        </>
      )}
      {limb && !commit && (
        <>
          <div className="wt-tooltip-title">{limb.id}</div>
          <div className="wt-tooltip-meta">
            <span>{STATUS_LABEL[limb.status]}</span>
            <span>·</span>
            <span>
              {limb.skeleton.commits.length} commit
              {limb.skeleton.commits.length === 1 ? '' : 's'}
            </span>
          </div>
          {limb.skeleton.pullRequests.length > 0 && (
            <div className="wt-tooltip-note">
              {limb.skeleton.pullRequests
                .slice(0, 2)
                .map((p) => `#${p.number} ${p.title}`)
                .join(' · ')}
            </div>
          )}
          {limb.skeleton.approximateFork && (
            <div className="wt-tooltip-note">Fork point older than the fetched history</div>
          )}
        </>
      )}
    </div>
  )
}
