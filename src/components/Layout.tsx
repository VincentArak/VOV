import { NavLink, Outlet } from 'react-router-dom'
import { Building2, CalendarRange, LayoutDashboard, Map, Network, Scroll, Settings, Target, TreeDeciduous } from 'lucide-react'
import { SaveIndicator } from './SaveIndicator'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { cn } from '../utils'

const ICONS = { LayoutDashboard, Scroll, CalendarRange, Target, Map, TreeDeciduous, Building2, Network, Settings }

const NAV = [
  { path: '/', label: 'Dashboard', icon: 'LayoutDashboard' as const },
  { path: '/quests', label: 'Quests', icon: 'Scroll' as const },
  { path: '/timeline', label: 'Timeline', icon: 'CalendarRange' as const },
  { path: '/missions', label: 'Missions', icon: 'Target' as const },
  { path: '/maps', label: 'Maps', icon: 'Map' as const },
  { path: '/world-tree', label: 'World Tree', icon: 'TreeDeciduous' as const },
  { path: '/departments', label: 'Departments', icon: 'Building2' as const },
  { path: '/network', label: 'Network', icon: 'Network' as const },
  { path: '/settings', label: 'Settings', icon: 'Settings' as const },
]

export function Layout() {
  useKeyboardShortcuts()

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-border bg-surface-raised flex flex-col">
        <div className="px-5 py-5 border-b border-border">
          <NavLink to="/" className="block hover:opacity-90 transition-opacity">
            <h1 className="text-xl font-bold text-accent tracking-wide">VOV</h1>
            <p className="text-xs text-text-muted mt-0.5">Quest Task Manager</p>
          </NavLink>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(({ path, label, icon }) => {
            const Icon = ICONS[icon]
            return (
              <NavLink
                key={path}
                to={path}
                end={path === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-accent/15 text-accent'
                      : 'text-text-muted hover:text-text hover:bg-surface-overlay',
                  )
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            )
          })}
        </nav>
        <div className="p-3 border-t border-border">
          <SaveIndicator />
          <p className="text-[10px] text-text-muted mt-2 px-1 leading-relaxed">
            4 copies kept locally
          </p>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
