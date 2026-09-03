import { lazy } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { DashboardPage } from './pages/DashboardPage'
import { routeModules } from './routeModules'

const QuestsPage = lazy(() =>
  routeModules.quests().then((module) => ({ default: module.QuestsPage })),
)
const QuestDetailPage = lazy(() =>
  routeModules.questDetail().then((module) => ({ default: module.QuestDetailPage })),
)
const TimelinePage = lazy(() =>
  routeModules.timeline().then((module) => ({ default: module.TimelinePage })),
)
const MissionsPage = lazy(() =>
  routeModules.missions().then((module) => ({ default: module.MissionsPage })),
)
const MapsPage = lazy(() =>
  routeModules.maps().then((module) => ({ default: module.MapsPage })),
)
const MapDetailPage = lazy(() =>
  routeModules.mapDetail().then((module) => ({ default: module.MapDetailPage })),
)
const WorldTreePage = lazy(() =>
  routeModules.worldTree().then((module) => ({ default: module.WorldTreePage })),
)
const DepartmentsPage = lazy(() =>
  routeModules.departments().then((module) => ({ default: module.DepartmentsPage })),
)
const PersonDetailPage = lazy(() =>
  routeModules.personDetail().then((module) => ({ default: module.PersonDetailPage })),
)
const NetworkPage = lazy(() =>
  routeModules.network().then((module) => ({ default: module.NetworkPage })),
)
const IntegrationsPage = lazy(() =>
  routeModules.integrations().then((module) => ({ default: module.IntegrationsPage })),
)
const SettingsPage = lazy(() =>
  routeModules.settings().then((module) => ({ default: module.SettingsPage })),
)

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/quests" element={<QuestsPage />} />
          <Route path="/quests/:id" element={<QuestDetailPage />} />
          <Route path="/timeline" element={<TimelinePage />} />
          <Route path="/missions" element={<MissionsPage />} />
          <Route path="/maps" element={<MapsPage />} />
          <Route path="/maps/:id" element={<MapDetailPage />} />
          <Route path="/world-tree" element={<WorldTreePage />} />
          <Route path="/departments" element={<DepartmentsPage />} />
          <Route path="/people/:id" element={<PersonDetailPage />} />
          <Route path="/network" element={<NetworkPage />} />
          <Route path="/integrations" element={<IntegrationsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
