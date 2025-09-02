import { create } from 'zustand'

export const useSelectionStore = create((set) => ({
  selectedNodeIds: [],
  selectedEdgeIds: [],

  setFromRF: (nodes, edges) =>
    set({
      selectedNodeIds: (nodes || []).map((n) => n.id),
      selectedEdgeIds: (edges || []).map((e) => e.id),
    }),

  clearSelection: () => set({ selectedNodeIds: [], selectedEdgeIds: [] }),
}))
