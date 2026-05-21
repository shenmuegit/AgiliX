import { useEffect } from 'react'
import { useUIStore } from '@/stores/uiStore'

export function useKeyboardShortcuts() {
  const openSearch = useUIStore((s) => s.openSearch)
  const openQuickCreate = useUIStore((s) => s.openQuickCreate)

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable

      if (e.key === '/' && !isInput) {
        e.preventDefault()
        openSearch()
        return
      }

      if ((e.key === 'n' || e.key === 'N') && !isInput && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        openQuickCreate()
        return
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        openSearch()
        return
      }

      if (e.key === 'Escape') {
        useUIStore.getState().closeSearch()
        useUIStore.getState().closeQuickCreate()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [openSearch, openQuickCreate])
}
