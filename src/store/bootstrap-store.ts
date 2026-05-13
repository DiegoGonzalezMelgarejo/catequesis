import { create } from 'zustand'

const FIRST_PWA_BOOT_KEY = 'catequesis-pwa-first-boot-complete'

type BootstrapStage = 'session' | 'periods' | 'panel' | null

type BootstrapStoreState = {
  isPwaMobile: boolean
  isFirstPwaBoot: boolean
  stage: BootstrapStage
  initializeClient: () => void
  setStage: (stage: BootstrapStage) => void
  finish: () => void
  reset: () => void
}

function detectPwaMobile() {
  if (typeof window === 'undefined') {
    return false
  }

  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  const isMobile = /android|iphone|ipad|ipod|mobile/i.test(window.navigator.userAgent)

  return isStandalone && isMobile
}

export const useBootstrapStore = create<BootstrapStoreState>((set, get) => ({
  isPwaMobile: false,
  isFirstPwaBoot: false,
  stage: null,
  initializeClient: () => {
    if (typeof window === 'undefined') {
      return
    }

    const isPwaMobile = detectPwaMobile()
    const isFirstPwaBoot = isPwaMobile && !window.localStorage.getItem(FIRST_PWA_BOOT_KEY)

    set({ isPwaMobile, isFirstPwaBoot })
  },
  setStage: (stage) => {
    if (!get().isPwaMobile) {
      return
    }

    set({ stage })
  },
  finish: () => {
    if (!get().isPwaMobile) {
      return
    }

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(FIRST_PWA_BOOT_KEY, '1')
    }

    set({ stage: null, isFirstPwaBoot: false })
  },
  reset: () => set({ stage: null }),
}))

export function initializeBootstrapClient() {
  useBootstrapStore.getState().initializeClient()
}

export function setBootstrapStage(stage: BootstrapStage) {
  useBootstrapStore.getState().setStage(stage)
}

export function finishBootstrapStage() {
  useBootstrapStore.getState().finish()
}

export function resetBootstrapStage() {
  useBootstrapStore.getState().reset()
}
