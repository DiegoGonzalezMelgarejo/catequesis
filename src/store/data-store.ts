import { create } from 'zustand'

type DataStoreState = {
  revision: number
  bumpRevision: () => void
}

export const useDataStore = create<DataStoreState>((set) => ({
  revision: 0,
  bumpRevision: () => set((state) => ({ revision: state.revision + 1 })),
}))

export function notifyDataChanged() {
  useDataStore.getState().bumpRevision()
}
