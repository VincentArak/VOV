// Stable loaders let Vite split by route and let navigation warm a chunk.
export const routeModules = {
  quests: () => import('./pages/QuestsPage'),
  questDetail: () => import('./pages/QuestDetailPage'),
  timeline: () => import('./pages/TimelinePage'),
  missions: () => import('./pages/MissionsPage'),
  maps: () => import('./pages/MapsPage'),
  mapDetail: () => import('./pages/MapDetailPage'),
  worldTree: () => import('./pages/WorldTreePage'),
  departments: () => import('./pages/DepartmentsPage'),
  personDetail: () => import('./pages/PersonDetailPage'),
  network: () => import('./pages/NetworkPage'),
  integrations: () => import('./pages/IntegrationsPage'),
  settings: () => import('./pages/SettingsPage'),
}

const navPreloaders: Record<string, () => Promise<unknown>> = {
  '/quests': routeModules.quests,
  '/timeline': routeModules.timeline,
  '/missions': routeModules.missions,
  '/maps': routeModules.maps,
  '/world-tree': routeModules.worldTree,
  '/departments': routeModules.departments,
  '/network': routeModules.network,
  '/integrations': routeModules.integrations,
  '/settings': routeModules.settings,
}

export function preloadRoute(path: string) {
  void navPreloaders[path]?.()
}
