import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Suspense, useState } from 'react'
import {
  Building2,
  CalendarRange,
  GitBranch,
  LayoutDashboard,
  Map,
  Menu,
  Network,
  Scroll,
  Settings,
  Target,
  TreeDeciduous,
  X,
} from 'lucide-react'
import { SaveIndicator } from './SaveIndicator'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { cn } from '../utils'
import { preloadRoute } from '../routeModules'

const ICONS = {
  LayoutDashboard,
  Scroll,
  CalendarRange,
  Target,
  Map,
  TreeDeciduous,
  Building2,
  Network,
  GitBranch,
  Settings,
}

/**
 * Navigation is grouped the way the game's menus are: the things you
 * act on every session first, the world you act inside them second,
 * and configuration last.
 *
 * Two labels are deliberately re-framed rather than renamed in the data
 * model — Departments reads as "Repositories" and the relationship
 * graph reads as "The World" — because in this project a department is
 * where code lives and the graph is the shared map everyone appears on.
 * The routes and the underlying entities are unchanged.
 */
const NAV_GROUPS: {
  heading: string
  items: { path: string; label: string; icon: keyof typeof ICONS; hint?: string }[]
}[] = [
  {
    heading: 'Adventure',
    items: [
      { path: '/', label: 'Character', icon: 'LayoutDashboard', hint: 'Overview' },
      { path: '/quests', label: 'Quest Log', icon: 'Scroll', hint: 'Tasks' },
      { path: '/missions', label: 'Campaigns', icon: 'Target', hint: 'Missions' },
      { path: '/timeline', label: 'Chronicle', icon: 'CalendarRange', hint: 'Timeline' },
    ],
  },
  {
    heading: 'World',
    items: [
      { path: '/maps', label: 'World Map', icon: 'Map', hint: 'Maps' },
      { path: '/world-tree', label: 'World Tree', icon: 'TreeDeciduous', hint: 'Git atlas' },
      { path: '/departments', label: 'Repositories', icon: 'Building2', hint: 'Departments' },
      { path: '/network', label: 'The Realm', icon: 'Network', hint: 'Network' },
    ],
  },
  {
    heading: 'Bindings',
    items: [{ path: '/integrations', label: 'Portals', icon: 'GitBranch', hint: 'GitHub & Jira' }],
  },
  {
    heading: 'System',
    items: [{ path: '/settings', label: 'Interface', icon: 'Settings', hint: 'Settings' }],
  },
]

export function Layout() {
  useKeyboardShortcuts()
  const { pathname } = useLocation()
  const [pinned, setPinned] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem('vov:sidebar-pinned') === 'true'
  })
  const [pinAnimating, setPinAnimating] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches,
  )
  const isDashboard = pathname === '/' || pathname === '/dashboard'
  const isWorldTree = pathname === '/world-tree'
  const isWorldMap = pathname === '/maps'

  const closeAfterNavigate = () => {
    if (typeof window === 'undefined' || window.innerWidth < 1024 || !pinned) {
      setMobileOpen(false)
    }
  }

  const togglePinned = () => {
    const next = !pinned
    setPinned(next)
    setPinAnimating(true)
    window.localStorage.setItem('vov:sidebar-pinned', String(next))
    if (next) setMobileOpen(true)
    window.setTimeout(() => setPinAnimating(false), 560)
  }

  const nav = (
    <>
      <div className="medieval-brand">
        <NavLink
          to="/"
          className="block text-center"
          onClick={closeAfterNavigate}
          aria-label="VOV — go to Character"
        >
          <img
            src="/vov-emblem-v3.webp"
            alt="VOV"
            className="medieval-logo-img"
            decoding="async"
          />
          <p className="medieval-tagline">
            Quest Manager
          </p>
        </NavLink>
        <button
          type="button"
          className={cn(
            'nav-pin-button',
            pinned && 'nav-pin-button-pinned',
            pinAnimating && 'nav-pin-button-animating',
          )}
          aria-pressed={pinned}
          aria-label={pinned ? 'Unpin navigation sidebar' : 'Pin navigation sidebar'}
          title={pinned ? 'Unpin sidebar' : 'Keep sidebar open between pages'}
          onClick={togglePinned}
        >
          <img src="/sidebar-pin-v3.webp" alt="" aria-hidden="true" decoding="async" />
          <span>{pinned ? 'Pinned' : 'Pin sidebar'}</span>
        </button>
      </div>

      <nav className="medieval-nav flex-1 overflow-y-auto">
        {NAV_GROUPS.map((group) => (
          <div className="medieval-nav-group" key={group.heading}>
            <div className="medieval-nav-heading">
              <span>
                {group.heading}
              </span>
            </div>
            <div>
              {group.items.map(({ path, label, icon, hint }) => {
                const Icon = ICONS[icon]
                return (
                  <NavLink
                    key={path}
                    to={path}
                    end={path === '/'}
                    onClick={closeAfterNavigate}
                    onPointerEnter={() => preloadRoute(path)}
                    onFocus={() => preloadRoute(path)}
                    title={hint}
                    className={({ isActive }) =>
                      cn(
                        'medieval-nav-item group',
                        isActive
                          ? 'medieval-nav-item-active'
                          : 'medieval-nav-item-idle',
                      )
                    }
                  >
                    <Icon size={21} strokeWidth={1.65} aria-hidden="true" className="shrink-0" />
                    <span className="flex-1">{label}</span>
                  </NavLink>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="medieval-save-wrap">
        <SaveIndicator />
      </div>
    </>
  )

  return (
    <div
      className="app-shell flex min-h-screen"
      data-nav-open={mobileOpen || undefined}
      data-nav-pinned={pinned || undefined}
    >
      {/* Mobile trigger — the sidebar was previously a fixed 224px rail
          with no collapse, which made every page unusable under ~640px. */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation"
        className={cn('mobile-menu-trigger atlas-menu-trigger fixed left-3 top-3 z-40 p-2', mobileOpen && 'invisible')}
      >
        <Menu size={18} aria-hidden="true" />
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          'medieval-sidebar z-50 flex shrink-0 flex-col',
          'atlas-sidebar',
          mobileOpen ? 'atlas-sidebar-open' : 'atlas-sidebar-closed',
        )}
      >
        {mobileOpen && (
          <button
            onClick={() => {
              setMobileOpen(false)
              if (pinned) {
                setPinned(false)
                window.localStorage.setItem('vov:sidebar-pinned', 'false')
              }
            }}
            aria-label="Close navigation"
            className="nav-close-trigger absolute right-2 top-2 rounded p-2 text-text-muted"
          >
            <X size={18} aria-hidden="true" />
          </button>
        )}
        {nav}
      </aside>

      <main
        className={cn(
          'app-main min-w-0 flex-1 overflow-auto max-lg:pt-14',
          isDashboard
            ? 'dashboard-main'
            : isWorldTree
              ? 'world-tree-main'
              : isWorldMap
                ? 'world-map-main'
                : 'archive-main',
        )}
      >
        <Suspense fallback={<RouteLoading />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  )
}

function RouteLoading() {
  return (
    <div className="route-loading" role="status" aria-live="polite">
      <span className="route-loading-rune" aria-hidden="true" />
      <span>Opening the chronicle…</span>
    </div>
  )
}
