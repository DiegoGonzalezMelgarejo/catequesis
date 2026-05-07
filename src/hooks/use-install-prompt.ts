import { useEffect, useMemo, useState } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export function useInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const isIos = useMemo(() => /iphone|ipad|ipod/i.test(window.navigator.userAgent), [])

  return {
    canInstall: Boolean(installPrompt),
    isIos,
    installApp: async () => {
      if (!installPrompt) {
        return false
      }

      await installPrompt.prompt()
      const choice = await installPrompt.userChoice
      setInstallPrompt(null)
      return choice.outcome === 'accepted'
    },
  }
}
