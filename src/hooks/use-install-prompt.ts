import { useEffect, useMemo, useState } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export function useInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const isIos = useMemo(() => /iphone|ipad|ipod/i.test(window.navigator.userAgent), [])
  const isMobileDevice = useMemo(() => {
    const userAgent = window.navigator.userAgent
    return /android|iphone|ipad|ipod|mobile/i.test(userAgent)
  }, [])

  useEffect(() => {
    if (!isMobileDevice) {
      return
    }

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [isMobileDevice])

  return {
    canInstall: isMobileDevice && Boolean(installPrompt),
    isIos,
    isMobileDevice,
    installApp: async () => {
      if (!isMobileDevice || !installPrompt) {
        return false
      }

      await installPrompt.prompt()
      const choice = await installPrompt.userChoice
      setInstallPrompt(null)
      return choice.outcome === 'accepted'
    },
  }
}
