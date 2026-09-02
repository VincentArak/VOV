import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App'
import { initBackupSystem, executeBackupCycle, initRelationshipTypes } from './db'
import { useAppStore } from './store'

function Root() {
  const loadSettings = useAppStore((s) => s.loadSettings)

  useEffect(() => {
    loadSettings().then(() => initRelationshipTypes()).then(() => initBackupSystem())
  }, [loadSettings])

  useEffect(() => {
    const forceSave = () => executeBackupCycle()
    document.addEventListener('vov:force-save', forceSave)
    return () => document.removeEventListener('vov:force-save', forceSave)
  }, [])

  return <App />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
