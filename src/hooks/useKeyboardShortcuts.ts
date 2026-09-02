import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store'

export function useKeyboardShortcuts() {
  const navigate = useNavigate()
  const saveState = useAppStore((s) => s.saveState)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isTyping =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable

      if (e.key === 'n' && !isTyping && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        navigate('/quests', { state: { createNew: true } })
      }

      if (e.key === '/' && !isTyping) {
        e.preventDefault()
        const search = document.querySelector<HTMLInputElement>('[data-search-input]')
        search?.focus()
      }

      if (e.key === 'Escape') {
        document.dispatchEvent(new CustomEvent('vov:escape'))
      }

      if (e.key === 's' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        if (saveState !== 'saving') {
          document.dispatchEvent(new CustomEvent('vov:force-save'))
        }
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [navigate, saveState])
}
