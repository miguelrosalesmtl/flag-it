import { create } from 'zustand'

/**
 * Client-only state: things that never came from the server and never go back.
 *
 * If you are tempted to put fetched data in here, don't — that belongs in
 * TanStack Query, which already handles caching, deduping, retries and
 * invalidation. This store is for UI state the server has no opinion about.
 */
interface UiState {
  theme: 'light' | 'dark'
  sidebarOpen: boolean
  toggleTheme: () => void
  setSidebarOpen: (open: boolean) => void
}

export const useUiStore = create<UiState>((set) => ({
  theme: 'dark',
  sidebarOpen: true,
  toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
}))
