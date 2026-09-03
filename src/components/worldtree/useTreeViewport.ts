import { useCallback, useEffect, useRef, useState } from 'react'

export interface Viewport {
  scale: number
  tx: number
  ty: number
}

const MIN = 0.45
const MAX = 6
/** How long after the last gesture the committed scale catches up, for LOD. */
const SETTLE_MS = 140

/**
 * viewBox-relative pan/zoom, driven imperatively.
 *
 * The base viewBox already fits the whole tree, so `scale: 1, tx: 0, ty: 0` is
 * "fit to page" and zooming is purely additive.
 *
 * The transform is written straight onto the pan group's `transform`
 * attribute rather than held in React state. Holding it in state meant every
 * pointermove re-rendered the entire tree — hundreds of paths, several of them
 * behind SVG filters — to move one group, which is what made dragging and
 * zooming feel heavy on a large repository. Now a drag touches exactly one
 * attribute per frame.
 *
 * `scale` is still published as state, but only after the gesture settles, and
 * only because level-of-detail genuinely needs a re-render to drop or restore
 * markers. One re-render at the end of a gesture is cheap; sixty a second is
 * not.
 */
export function useTreeViewport(
  svgRef: React.RefObject<SVGSVGElement | null>,
  groupRef: React.RefObject<SVGGElement | null>,
) {
  const view = useRef<Viewport>({ scale: 1, tx: 0, ty: 0 })
  const drag = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null)
  const frame = useRef(0)
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** Committed scale. Drives level of detail, nothing else. */
  const [scale, setScale] = useState(1)

  const paint = useCallback(() => {
    frame.current = 0
    const g = groupRef.current
    if (!g) return
    const v = view.current
    g.setAttribute('transform', `translate(${v.tx} ${v.ty}) scale(${v.scale})`)
  }, [groupRef])

  const schedule = useCallback(() => {
    if (frame.current) return
    frame.current = requestAnimationFrame(paint)
  }, [paint])

  /** Publish the scale once the hand has stopped moving. */
  const commit = useCallback(() => {
    if (settle.current) clearTimeout(settle.current)
    settle.current = setTimeout(() => {
      setScale((prev) => (Math.abs(prev - view.current.scale) < 0.001 ? prev : view.current.scale))
    }, SETTLE_MS)
  }, [])

  const toLocal = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current
      const ctm = svg?.getScreenCTM()
      if (!svg || !ctm) return { x: 0, y: 0 }
      const p = svg.createSVGPoint()
      p.x = clientX
      p.y = clientY
      return p.matrixTransform(ctm.inverse())
    },
    [svgRef],
  )

  const zoomAt = useCallback(
    (factor: number, clientX?: number, clientY?: number) => {
      const v = view.current
      const next = Math.min(MAX, Math.max(MIN, v.scale * factor))
      if (next === v.scale) return

      let px: number
      let py: number
      if (clientX !== undefined && clientY !== undefined) {
        const l = toLocal(clientX, clientY)
        px = l.x
        py = l.y
      } else {
        const box = svgRef.current?.viewBox.baseVal
        px = (box?.width ?? 0) / 2
        py = (box?.height ?? 0) / 2
      }

      // keep the point under the cursor fixed
      const k = next / v.scale
      view.current = { scale: next, tx: px - (px - v.tx) * k, ty: py - (py - v.ty) * k }
      schedule()
      commit()
    },
    [svgRef, toLocal, schedule, commit],
  )

  const reset = useCallback(() => {
    view.current = { scale: 1, tx: 0, ty: 0 }
    schedule()
    commit()
  }, [schedule, commit])

  const onWheel = useCallback(
    (e: WheelEvent) => {
      if (!e.ctrlKey && Math.abs(e.deltaY) < 2) return
      e.preventDefault()
      zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX, e.clientY)
    },
    [zoomAt],
  )

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [svgRef, onWheel])

  useEffect(
    () => () => {
      if (frame.current) cancelAnimationFrame(frame.current)
      if (settle.current) clearTimeout(settle.current)
    },
    [],
  )

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return
    if ((e.target as Element).closest('[data-interactive="true"]')) return
    const v = view.current
    drag.current = { x: e.clientX, y: e.clientY, tx: v.tx, ty: v.ty }
    const el = e.currentTarget as SVGElement
    el.setPointerCapture?.(e.pointerId)
    // The cursor is a class, not state: swapping it must not re-render a tree.
    el.classList.add('is-dragging')
  }, [])

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const d = drag.current
      if (!d) return
      const a = toLocal(d.x, d.y)
      const b = toLocal(e.clientX, e.clientY)
      view.current = { ...view.current, tx: d.tx + (b.x - a.x), ty: d.ty + (b.y - a.y) }
      schedule()
    },
    [toLocal, schedule],
  )

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    drag.current = null
    ;(e.currentTarget as SVGElement).classList.remove('is-dragging')
  }, [])

  return {
    scale,
    zoomIn: useCallback(() => zoomAt(1.3), [zoomAt]),
    zoomOut: useCallback(() => zoomAt(1 / 1.3), [zoomAt]),
    reset,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerLeave: onPointerUp },
  }
}
