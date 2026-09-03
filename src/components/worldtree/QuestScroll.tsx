import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

export type ScrollState = 'closed' | 'partial' | 'open'
export type ScrollPhase = 'idle' | 'expanding' | 'collapsing'

const PARTIAL_HEIGHT = 300

const NEXT: Record<ScrollState, ScrollState> = {
  closed: 'partial',
  partial: 'open',
  open: 'closed',
}

const ACTION: Record<ScrollState, string> = {
  closed: 'Unfurl the scroll',
  partial: 'Unfurl fully',
  open: 'Roll the scroll up',
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return reduced
}

/**
 * A physically constructed scroll: two rods with cast finials, a parchment
 * sheet stretched between them, layered edges, and a clipped content viewport.
 *
 * The rods stay anchored and the parchment body unfurls between them: the
 * viewport height is measured from the real content and animated in px so the
 * motion is weighted rather than a max-height guess. Content is revealed only
 * once enough parchment is showing, and never spills outside the sheet.
 */
export function QuestScroll({
  title,
  subtitle,
  badge,
  state,
  onStateChange,
  children,
  footer,
  focused = false,
}: {
  title: string
  subtitle?: string
  badge?: ReactNode
  state: ScrollState
  onStateChange: (next: ScrollState) => void
  children: ReactNode
  footer?: ReactNode
  focused?: boolean
}) {
  const innerRef = useRef<HTMLDivElement | null>(null)
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const [contentHeight, setContentHeight] = useState(0)
  const [phase, setPhase] = useState<ScrollPhase>('idle')
  const reduced = usePrefersReducedMotion()

  // Measure the real content so the unfurl animates to a true height.
  useLayoutEffect(() => {
    const el = innerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setContentHeight(el.scrollHeight))
    ro.observe(el)
    setContentHeight(el.scrollHeight)
    return () => ro.disconnect()
  }, [children])

  const target =
    state === 'closed' ? 0 : state === 'partial' ? Math.min(PARTIAL_HEIGHT, contentHeight) : contentHeight

  const prev = useRef(target)
  useEffect(() => {
    if (target === prev.current) return
    setPhase(target > prev.current ? 'expanding' : 'collapsing')
    prev.current = target
  }, [target])

  const settle = useCallback((e: React.TransitionEvent) => {
    if (e.propertyName === 'height') setPhase('idle')
  }, [])

  // Content only becomes visible once the sheet is meaningfully open.
  const revealed = target > 60

  return (
    <section
      className="qs-shell"
      data-state={state}
      data-phase={phase}
      data-focused={focused || undefined}
      data-reduced={reduced || undefined}
    >
      <div className="qs-rod qs-rod-top">
        <span className="qs-finial qs-finial-start" aria-hidden />
        <button
          type="button"
          className="qs-handle"
          aria-expanded={state !== 'closed'}
          aria-controls="qs-viewport"
          onClick={() => onStateChange(NEXT[state])}
          title={ACTION[state]}
        >
          <span className="qs-handle-text">
            <span className="qs-title">{title}</span>
            {subtitle && <span className="qs-subtitle">{subtitle}</span>}
          </span>
          <span className="qs-handle-right">
            {badge}
            <ChevronDown className="qs-chevron" size={16} aria-hidden />
          </span>
        </button>
        <span className="qs-finial qs-finial-end" aria-hidden />
      </div>

      <div className="qs-parchment">
        <span className="qs-edge qs-edge-start" aria-hidden />
        <span className="qs-edge qs-edge-end" aria-hidden />
        <div
          className="qs-viewport"
          id="qs-viewport"
          ref={viewportRef}
          style={{ height: target }}
          onTransitionEnd={settle}
          aria-hidden={state === 'closed'}
        >
          <div className="qs-inner" ref={innerRef} data-revealed={revealed || undefined}>
            <div className="qs-body">{children}</div>
            {footer && <div className="qs-footer">{footer}</div>}
          </div>
        </div>
        <span className="qs-curl qs-curl-top" aria-hidden />
        <span className="qs-curl qs-curl-bottom" aria-hidden />
      </div>

      <div className="qs-rod qs-rod-bottom">
        <span className="qs-finial qs-finial-start" aria-hidden />
        <span className="qs-rod-body" aria-hidden />
        <span className="qs-finial qs-finial-end" aria-hidden />
      </div>
    </section>
  )
}
