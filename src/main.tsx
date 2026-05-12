import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'

import './index.css'
import App from './App.tsx'
import { AppProviders } from '@/app/providers'

if (import.meta.env.PROD) {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => {
      registerSW()
    })
  } else {
    setTimeout(() => {
      registerSW()
    }, 0)
  }
}

createRoot(document.getElementById('root')!).render(
  <AppProviders>
    <App />
  </AppProviders>,
)
