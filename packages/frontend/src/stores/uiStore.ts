import { create } from 'zustand'

interface UIState {
  sidebarCollapsed: boolean
  drawerIssueId: string | null
  toggleSidebar: () => void
  openIssueDrawer: (issueId: string) => void
  closeIssueDrawer: () => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  drawerIssueId: null,

  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  openIssueDrawer: (issueId) => set({ drawerIssueId: issueId }),
  closeIssueDrawer: () => set({ drawerIssueId: null }),
}))
