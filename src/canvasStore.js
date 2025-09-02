import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'

export const useCanvasStore = create(
  persist(
    subscribeWithSelector((set, get) => ({
      // state
      snap: true,
      grid: [16, 16],
      lineType: 'smoothstep',       // 'smoothstep' | 'straight'
      showMiniMap: true,
      showControls: true,
      theme: 'light',

      // actions
      setSnap: (v) => set({ snap: v }),
      toggleSnap: () => set((s) => ({ snap: !s.snap })),
      setGrid: (g) => set({ grid: g }),
      setLineType: (t) => set({ lineType: t }),
      toggleMiniMap: () => set((s) => ({ showMiniMap: !s.showMiniMap })),
      toggleControls: () => set((s) => ({ showControls: !s.showControls })),
      setTheme: (t) => set({ theme: t }),
    })),
    {
      name: 'rf-canvas-prefs',
      // сохраняем только настройки канваса
      partialize: (s) => ({
        snap: s.snap,
        grid: s.grid,
        lineType: s.lineType,
        showMiniMap: s.showMiniMap,
        showControls: s.showControls,
        theme: s.theme,
      }),
    }
  )
)
