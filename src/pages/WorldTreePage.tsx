import { useCallback, useMemo, useState } from 'react'
import { ExternalLink, GitBranch, RefreshCw, Trees, Unplug } from 'lucide-react'
import { useWorldTree } from '../worldtree/useWorldTree'
import { GitWorldTree } from '../components/worldtree/GitWorldTree'
import { QuestScroll, type ScrollState } from '../components/worldtree/QuestScroll'
import { QuestList } from '../components/worldtree/QuestList'
import { STATUS_LABEL } from '../worldtree/theme'
import '../worldtree/worldtree.css'

const SUGGESTED = 'ShayChen817/VOV'

function RepoConnect({
  onLoad,
  loading,
  error,
  token,
  onToken,
  compact,
}: {
  onLoad: (value: string) => void
  loading: boolean
  error: string | null
  token: string
  onToken: (value: string) => void
  compact: boolean
}) {
  const [value, setValue] = useState(SUGGESTED)
  const [showToken, setShowToken] = useState(false)
  const [tokenDraft, setTokenDraft] = useState(token)

  return (
    <div className="wt-card">
      <h3>{compact ? 'Read another repository' : 'Plant a repository'}</h3>
      <form
        className="wt-field"
        onSubmit={(e) => {
          e.preventDefault()
          onLoad(value)
        }}
      >
        <input
          className="wt-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="owner/repo"
          aria-label="GitHub repository"
          spellCheck={false}
        />
        <button className="wt-btn" type="submit" disabled={loading}>
          {loading ? 'Growing…' : 'Grow'}
        </button>
      </form>

      {!compact && (
        <p className="wt-note">
          The tree is grown from the repository&rsquo;s real topology: branches, commits and pull
          requests are read from the GitHub API and cached in this browser.
        </p>
      )}

      <button
        type="button"
        className="wt-btn wt-btn-ghost"
        style={{ marginTop: 10 }}
        onClick={() => {
          setTokenDraft(token)
          setShowToken((s) => !s)
        }}
        aria-expanded={showToken}
      >
        {token ? 'Token saved' : 'Add access token'}
      </button>

      {showToken && (
        <form
          className="wt-field"
          style={{ marginTop: 8 }}
          onSubmit={(e) => {
            e.preventDefault()
            onToken(tokenDraft.trim())
            setShowToken(false)
          }}
        >
          <input
            className="wt-input"
            type="password"
            value={tokenDraft}
            onChange={(e) => setTokenDraft(e.target.value)}
            placeholder="ghp_…"
            aria-label="GitHub personal access token"
          />
          <button className="wt-btn" type="submit">
            Save
          </button>
        </form>
      )}

      {showToken && (
        <p className="wt-note">
          Optional. Stored only in this browser&rsquo;s local database; it lifts the anonymous rate
          limit and unlocks private repositories.
        </p>
      )}

      {error && <p className="wt-error">{error}</p>}
    </div>
  )
}

export function WorldTreePage() {
  const tree = useWorldTree()
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null)
  const [selectedSha, setSelectedSha] = useState<string | null>(null)
  const [scrollState, setScrollState] = useState<ScrollState>('partial')

  const { topology, layout, skeleton } = tree

  const limb = selectedBranch ? layout?.byId.get(selectedBranch) ?? null : null
  const commit = selectedSha && topology ? topology.commits[selectedSha] : null

  // Choosing a branch anywhere unfurls a rolled-up scroll, so the quest that
  // belongs to it is never hidden behind a closed panel.
  const selectBranch = useCallback((id: string | null) => {
    setSelectedBranch(id)
    if (id) setScrollState((s) => (s === 'closed' ? 'partial' : s))
  }, [])

  const stats = useMemo(() => {
    if (!skeleton || !topology) return []
    return [
      { value: skeleton.trunk.commits.length, label: 'Trunk rings' },
      { value: skeleton.limbs.length, label: 'Limbs' },
      { value: skeleton.stats.openPullRequests, label: 'Open quests' },
      { value: skeleton.stats.contributors, label: 'Hands' },
    ]
  }, [skeleton, topology])

  return (
    <div className="wt-page">
      <div className="wt-shell">
        <header className="wt-header">
          <div>
            <p className="wt-eyebrow">Repository Atlas</p>
            <h1 className="wt-title">
              {topology ? topology.repo.fullName : 'The World Tree'}
            </h1>
            <p className="wt-repo-line">
              {topology
                ? topology.repo.description ||
                  'An ancient tree grown from this repository’s own history.'
                : 'Every repository grows a tree: main is the trunk, each branch a living limb, each commit a ring carved into the wood.'}
            </p>
          </div>
          {stats.length > 0 && (
            <div className="wt-stats">
              {stats.map((s) => (
                <div className="wt-stat" key={s.label}>
                  <b>{s.value}</b>
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
          )}
        </header>

        <div className="wt-main">
          <div>
            {tree.loading && !layout ? (
              <div className="wt-loading">
                <div className="wt-seedling" />
                <p>{tree.progress || 'Growing the world tree…'}</p>
              </div>
            ) : layout && topology ? (
              <GitWorldTree
                layout={layout}
                topology={topology}
                selectedBranch={selectedBranch}
                selectedSha={selectedSha}
                onSelectBranch={selectBranch}
                onSelectCommit={setSelectedSha}
              />
            ) : (
              <div className="wt-loading">
                <Trees size={54} strokeWidth={1.1} opacity={0.45} />
                <p>No repository planted yet. Name one and the tree will grow.</p>
              </div>
            )}
          </div>

          <aside className="wt-rail">
            {topology && (
              <div className="wt-card">
                <h3>Selection</h3>
                {limb ? (
                  <>
                    <div className="wt-detail-row">
                      <span>Branch</span>
                      <span>{limb.id}</span>
                    </div>
                    <div className="wt-detail-row">
                      <span>State</span>
                      <span>{STATUS_LABEL[limb.status]}</span>
                    </div>
                    <div className="wt-detail-row">
                      <span>Commits on limb</span>
                      <span>{limb.skeleton.commits.length}</span>
                    </div>
                    {limb.skeleton.forkSha && (
                      <div className="wt-detail-row">
                        <span>Forked at</span>
                        <span className="wt-mono">{limb.skeleton.forkSha.slice(0, 7)}</span>
                      </div>
                    )}
                    {limb.skeleton.mergeSha && (
                      <div className="wt-detail-row">
                        <span>Merged at</span>
                        <span className="wt-mono">{limb.skeleton.mergeSha.slice(0, 7)}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="wt-note" style={{ marginTop: 0 }}>
                    Touch a limb or a growth rune to read its history.
                  </p>
                )}

                {commit && (
                  <>
                    <div
                      className="wt-detail-row"
                      style={{ marginTop: 8, borderTop: '1px solid #8a704740', paddingTop: 8 }}
                    >
                      <span>Commit</span>
                      <span className="wt-mono">{commit.shortSha}</span>
                    </div>
                    <p className="wt-note" style={{ marginTop: 4 }}>
                      {commit.message}
                    </p>
                    <a
                      className="wt-btn wt-btn-ghost"
                      style={{ display: 'inline-flex', gap: 6, marginTop: 8, textDecoration: 'none' }}
                      href={commit.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink size={13} /> Open on GitHub
                    </a>
                  </>
                )}
              </div>
            )}

            {topology && (
              <QuestScroll
                title="Quest Log"
                subtitle={`${topology.pullRequests.length} pull requests · ${topology.repo.fullName}`}
                state={scrollState}
                onStateChange={setScrollState}
                focused={Boolean(selectedBranch)}
                badge={
                  <span
                    className="qr-sigil"
                    data-state="open"
                    style={{ width: 22, height: 22, fontSize: 9 }}
                  >
                    {topology.pullRequests.filter((p) => p.state === 'open').length}
                  </span>
                }
                footer={
                  <>
                    <span>
                      Read {tree.fetchedAt ? new Date(tree.fetchedAt).toLocaleString() : '—'}
                    </span>
                    <span>
                      <GitBranch size={11} style={{ display: 'inline', marginRight: 4 }} />
                      {skeleton?.stats.branches ?? 0} branches
                      {skeleton?.stats.truncated ? ' · history clipped' : ''}
                    </span>
                  </>
                }
              >
                <QuestList
                  pullRequests={topology.pullRequests}
                  selectedBranch={selectedBranch}
                  onSelectBranch={selectBranch}
                />
              </QuestScroll>
            )}

            <RepoConnect
              onLoad={tree.load}
              loading={tree.loading}
              error={tree.error}
              token={tree.token}
              onToken={tree.setToken}
              compact={Boolean(topology)}
            />

            {topology && (
              <div className="wt-field">
                <button
                  className="wt-btn wt-btn-ghost"
                  type="button"
                  onClick={tree.refresh}
                  disabled={tree.loading}
                >
                  <RefreshCw size={12} style={{ display: 'inline', marginRight: 6 }} />
                  Refresh
                </button>
                <button
                  className="wt-btn wt-btn-ghost"
                  type="button"
                  onClick={() => {
                    selectBranch(null)
                    setSelectedSha(null)
                    tree.disconnect()
                  }}
                >
                  <Unplug size={12} style={{ display: 'inline', marginRight: 6 }} />
                  Clear
                </button>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}
