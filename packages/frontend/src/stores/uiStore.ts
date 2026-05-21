import { create } from 'zustand'

interface UIState {
  sidebarCollapsed: boolean
  mobileSidebarOpen: boolean
  drawerIssueId: string | null
  searchOpen: boolean
  quickCreateOpen: boolean
  toggleSidebar: () => void
  setMobileSidebar: (open: boolean) => void
  openIssueDrawer: (issueId: string) => void
  closeIssueDrawer: () => void
  openSearch: () => void
  closeSearch: () => void
  openQuickCreate: () => void
  closeQuickCreate: () => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  mobileSidebarOpen: false,
  drawerIssueId: null,
  searchOpen: false,
  quickCreateOpen: false,

  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setMobileSidebar: (open) => set({ mobileSidebarOpen: open }),
  openIssueDrawer: (issueId) => set({ drawerIssueId: issueId, mobileSidebarOpen: false }),
  closeIssueDrawer: () => set({ drawerIssueId: null }),
  openSearch: () => set({ searchOpen: true, mobileSidebarOpen: false }),
  closeSearch: () => set({ searchOpen: false }),
  openQuickCreate: () => set({ quickCreateOpen: true, mobileSidebarOpen: false }),
  closeQuickCreate: () => set({ quickCreateOpen: false }),
}))
