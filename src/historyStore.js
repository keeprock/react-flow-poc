import { create } from 'zustand'

const hashSnapshot = ({ nodes, edges }) => {
  const nh = nodes
    .map((n) => `${n.id}:${Math.round(n.position?.x || 0)}:${Math.round(n.position?.y || 0)}:${n.type || ''}:${n.data?.label || ''}`)
    .join('|')
  const eh = edges
    .map((e) => `${e.id}:${e.source}->${e.target}:${e.type || ''}`)
    .join('|')
  return nh + '//' + eh
}

export const useHistoryStore = create((set, get) => ({
  past: [],
  present: null,
  presentHash: '',
  future: [],
  canUndo: false,
  canRedo: false,

  init: (present) => {
    const h = hashSnapshot(present)
    set({ past: [], present, presentHash: h, future: [], canUndo: false, canRedo: false })
  },

  commit: (next) => {
    const h = hashSnapshot(next)
    const { present, presentHash, past } = get()
    if (present && h === presentHash) return
    let newPast = present ? [...past, present] : past
    if (newPast.length > 50) newPast = newPast.slice(newPast.length - 50)
    set({ past: newPast, present: next, presentHash: h, future: [], canUndo: newPast.length > 0, canRedo: false })
  },

  undo: () => {
    const { past, present, future } = get()
    if (!present || past.length === 0) return null
    const prev = past[past.length - 1]
    const newPast = past.slice(0, -1)
    const newFuture = [present, ...future]
    const h = hashSnapshot(prev)
    set({
      past: newPast,
      present: prev,
      presentHash: h,
      future: newFuture,
      canUndo: newPast.length > 0,
      canRedo: newFuture.length > 0,
    })
    return prev
  },

  redo: () => {
    const { past, present, future } = get()
    if (!present || future.length === 0) return null
    const next = future[0]
    const newFuture = future.slice(1)
    let newPast = [...past, present]
    if (newPast.length > 50) newPast = newPast.slice(newPast.length - 50)
    const h = hashSnapshot(next)
    set({
      past: newPast,
      present: next,
      presentHash: h,
      future: newFuture,
      canUndo: newPast.length > 0,
      canRedo: newFuture.length > 0,
    })
    return next
  },

  clear: () => set({ past: [], future: [], canUndo: false, canRedo: false }),
}))
