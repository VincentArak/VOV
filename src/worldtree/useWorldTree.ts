import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { GitRepoRecord, GitTopology } from '../types/git'
import { GitHubError, fetchTopology, parseRepoInput } from '../services/gitTopology'
import { buildSkeleton, type TreeSkeleton } from './core/skeleton'
import { buildLayout, type WorldTreeLayout } from './core/layout'

export interface WorldTreeState {
  topology: GitTopology | null
  skeleton: TreeSkeleton | null
  layout: WorldTreeLayout | null
  loading: boolean
  progress: string
  error: string | null
  fetchedAt: string | null
  token: string
  setToken: (token: string) => Promise<void>
  load: (input: string) => Promise<void>
  refresh: () => Promise<void>
  disconnect: () => Promise<void>
}

/**
 * Owns the DATA half of the pipeline and hands the pure layout functions their
 * input. The layout is memoized on the topology, so a repository refresh
 * regrows the whole tree — the anatomy is never authored by hand.
 */
export function useWorldTree(): WorldTreeState {
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState<string | null>(null)

  const config = useLiveQuery(() => db.gitConfig.get('default'))
  const record = useLiveQuery(
    async (): Promise<GitRepoRecord | undefined> => {
      const cfg = await db.gitConfig.get('default')
      if (!cfg?.lastRepoId) return undefined
      return db.gitRepos.get(cfg.lastRepoId)
    },
    [config?.lastRepoId],
  )

  useEffect(() => {
    db.gitConfig.get('default').then((existing) => {
      if (!existing) db.gitConfig.put({ id: 'default', token: '', lastRepoId: null })
    })
  }, [])

  const topology = record?.topology ?? null

  const skeleton = useMemo(() => (topology ? buildSkeleton(topology) : null), [topology])
  const layout = useMemo(
    () => (skeleton && topology ? buildLayout(skeleton, topology.repo.fullName) : null),
    [skeleton, topology],
  )

  const load = useCallback(async (input: string) => {
    const parsed = parseRepoInput(input)
    if (!parsed) {
      setError('Use owner/repo, or paste a GitHub URL.')
      return
    }
    setLoading(true)
    setError(null)
    setProgress('Reaching for the repository…')
    try {
      const cfg = await db.gitConfig.get('default')
      const next = await fetchTopology(parsed.owner, parsed.name, cfg?.token ?? '', setProgress)
      const id = `${parsed.owner}/${parsed.name}`.toLowerCase()
      await db.gitRepos.put({
        id,
        owner: next.repo.owner,
        name: next.repo.name,
        topology: next,
        fetchedAt: next.fetchedAt,
      })
      await db.gitConfig.put({
        id: 'default',
        token: cfg?.token ?? '',
        lastRepoId: id,
      })
    } catch (err) {
      setError(
        err instanceof GitHubError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not read that repository.',
      )
    } finally {
      setLoading(false)
      setProgress('')
    }
  }, [])

  const refresh = useCallback(async () => {
    if (!record) return
    await load(`${record.owner}/${record.name}`)
  }, [record, load])

  const setToken = useCallback(async (token: string) => {
    const cfg = await db.gitConfig.get('default')
    await db.gitConfig.put({
      id: 'default',
      token,
      lastRepoId: cfg?.lastRepoId ?? null,
    })
  }, [])

  const disconnect = useCallback(async () => {
    const cfg = await db.gitConfig.get('default')
    await db.gitConfig.put({ id: 'default', token: cfg?.token ?? '', lastRepoId: null })
  }, [])

  return {
    topology,
    skeleton,
    layout,
    loading,
    progress,
    error,
    fetchedAt: record?.fetchedAt ?? null,
    token: config?.token ?? '',
    setToken,
    load,
    refresh,
    disconnect,
  }
}
