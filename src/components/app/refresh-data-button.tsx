import { Check, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { SecondaryButton } from '@/components/app/secondary-button'
import { clearReadCacheEntriesByPrefix } from '@/database/firestore-repository'
import { notifyDataChanged } from '@/store/data-store'

type RefreshDataButtonProps = {
  cachePrefixes: string[]
  label?: string
  className?: string
}

export function RefreshDataButton({ cachePrefixes, label = 'Refrescar datos', className }: RefreshDataButtonProps) {
  const [state, setState] = useState<'idle' | 'refreshing' | 'success'>('idle')

  useEffect(() => {
    if (state !== 'success') {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setState('idle')
    }, 1600)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [state])

  return (
    <SecondaryButton
      type="button"
      className={className}
      disabled={state === 'refreshing'}
      onClick={() => {
        setState('refreshing')
        cachePrefixes.forEach((prefix) => clearReadCacheEntriesByPrefix(prefix))
        notifyDataChanged()
        window.setTimeout(() => {
          setState('success')
        }, 500)
        toast.success('Datos actualizados.')
      }}
    >
      {state === 'success' ? (
        <Check className="size-4" />
      ) : (
        <RefreshCw className={state === 'refreshing' ? 'size-4 animate-spin' : 'size-4'} />
      )}
      {state === 'refreshing' ? 'Actualizando...' : state === 'success' ? 'Actualizado' : label}
    </SecondaryButton>
  )
}
