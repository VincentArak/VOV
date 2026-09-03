import { useCallback, useEffect, useRef, useState } from 'react'

export interface Viewport {
  scale: number
  tx: number
  ty: number
}

const MIN = 0.45
const MAX = 6

/**
 * viewBox-relative pan/zoom. The base viewBox already fits the whole tree, so
 * `scale: 1, tx: 0, ty: 0` is "fit to page" and zooming is purely additive.
 */
export function useTreeViewport(svgRef: React.RefObject<SVGSVGElement | null>) {
  const [view, setView] = useState<Viewport>({ scale: 1, tx: 0, ty: 0 })
  const [dragging, setDragging] = useState(false)
  const drag = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null)

  const toLocal = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current
      if (!svg) return { x: 0, y: 0 }
      const ctm = svg.getScreenCTM()
      if (!ctm) return { x: 0, y: 0 }
      const p = svg.createSVGPoint()
      p.x = clientX
      p.y = clientY
      const local = p.matrixTransform(ctm.inverse())
      return { x: local.x, y: local.y }
    },
    [svgRef],
  )

  const zoomAt = useCallback(
    (factor: number, clientX?: number, clientY?: number) => {
      setView((v) => {
        const next = Math.min(MAX, Math.max(MIN, v.scale * factor))
        if (next === v.scale) return v
        const svg = svgRef.current
        let px = 0
        let py = 0
        if (svg && clientX !== undefined && clientY !== undefined) {
          const l = toLocal(clientX, clientY)
          px = l.x
          py = l.y
        } else if (svg) {
          const box = svg.viewBox.baseVal
          px = box.width / 2
          py = box.height / 2
        }
        // keep the point under the cursor fixed
        const k = next / v.scale
        return { scale: next, tx: px - (px - v.tx) * k, ty: py - (py - v.ty) * k }
      })
    },
    [svgRef, toLocal],
  )

  const reset = useCallback(() => setView({ scale: 1, tx: 0, ty: 0 }), [])

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

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return
      const target = e.target as Element
      if (target.closest('[data-interactive="true"]')) return
      drag.current = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty }
      setDragging(true)
      ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
    },
    [view.tx, view.ty],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const d = drag.current
      if (!d) return
      const a = toLocal(d.x, d.y)
      const b = toLocal(e.clientX, e.clientY)
      setView((v) => ({ ...v, tx: d.tx + (b.x - a.x), ty: d.ty + (b.y - a.y) }))
    },
    [toLocal],
  )

  const onPointerUp = useCallback(() => {
    drag.current = null
    setDragging(false)
  }, [])

  return {
    view,
    dragging,
    zoomIn: () => zoomAt(1.3),
    zoomOut: () => zoomAt(1 / 1.3),
    reset,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerLeave: onPointerUp },
  }
}
