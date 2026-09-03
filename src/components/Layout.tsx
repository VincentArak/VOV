import { NavLink, Outlet } from 'react-router-dom'
import { useState } from 'react'
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
  const [mobileOpen, setMobileOpen] = useState(false)

  const nav = (
    <>
      <div className="border-b border-gold-lo/40 px-5 pb-4 pt-5">
        <NavLink
          to="/"
          className="block"
          onClick={() => setMobileOpen(false)}
          aria-label="VOV — go to Character"
        >
          <span className="wow-wordmark text-[2.1rem]" data-text="VOV" aria-hidden="true">
            VOV
          </span>
          <div className="wow-wordmark-rule mt-1.5" />
          <p className="tabular mt-1.5 text-[9px] uppercase tracking-[0.28em] text-accent-dim">
            Quest Manager
          </p>
        </NavLink>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto p-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.heading}>
            <div className="mb-1.5 px-2">
              <span className="font-fancy text-[10px] uppercase tracking-[0.18em] text-accent-dim">
                {group.heading}
              </span>
              <div className="wow-divider mt-1" />
            </div>
            <div className="space-y-0.5">
              {group.items.map(({ path, label, icon, hint }) => {
                const Icon = ICONS[icon]
                return (
                  <NavLink
                    key={path}
                    to={path}
                    end={path === '/'}
                    onClick={() => setMobileOpen(false)}
                    title={hint}
                    className={({ isActive }) =>
                      cn(
                        'wow-hilight group relative flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm transition-colors',
                        isActive
                          ? 'bg-gradient-to-r from-accent/20 to-transparent text-accent shadow-[inset_2px_0_0_var(--color-accent)]'
                          : 'text-text-muted hover:text-text',
                      )
                    }
                  >
                    <Icon size={17} aria-hidden="true" className="shrink-0" />
                    <span className="flex-1">{label}</span>
                    {hint && (
                      <span className="text-[9px] uppercase tracking-wider text-text-dim opacity-0 transition-opacity group-hover:opacity-100">
                        {hint}
                      </span>
                    )}
                  </NavLink>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-gold-lo/40 p-3">
        <SaveIndicator />
      </div>
    </>
  )

  return (
    <div className="flex min-h-screen">
      {/* Mobile trigger — the sidebar was previously a fixed 224px rail
          with no collapse, which made every page unusable under ~640px. */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation"
        className="wow-frame fixed left-3 top-3 z-40 rounded p-2 text-accent lg:hidden"
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
          'z-50 flex w-60 shrink-0 flex-col border-r border-frame-dark bg-surface-raised',
          'shadow-[inset_-1px_0_0_rgba(107,74,24,0.6),4px_0_20px_rgba(0,0,0,0.5)]',
          'max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:transition-transform',
          mobileOpen ? 'max-lg:translate-x-0' : 'max-lg:-translate-x-full',
        )}
      >
        {mobileOpen && (
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
            className="absolute right-2 top-2 rounded p-2 text-text-muted lg:hidden"
          >
            <X size={18} aria-hidden="true" />
          </button>
        )}
        {nav}
      </aside>

      <main className="flex-1 overflow-auto max-lg:pt-14">
        <Outlet />
      </main>
    </div>
  )
}
