import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { DashboardPage } from './pages/DashboardPage'
import { QuestsPage } from './pages/QuestsPage'
import { QuestDetailPage } from './pages/QuestDetailPage'
import { TimelinePage } from './pages/TimelinePage'
import { MissionsPage } from './pages/MissionsPage'
import { MapsPage } from './pages/MapsPage'
import { MapDetailPage } from './pages/MapDetailPage'
import { WorldTreePage } from './pages/WorldTreePage'
import { DepartmentsPage } from './pages/DepartmentsPage'
import { PersonDetailPage } from './pages/PersonDetailPage'
import { NetworkPage } from './pages/NetworkPage'
import { IntegrationsPage } from './pages/IntegrationsPage'
import { SettingsPage } from './pages/SettingsPage'

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
