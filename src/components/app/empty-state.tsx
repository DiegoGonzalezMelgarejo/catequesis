import type { LucideIcon } from 'lucide-react'

import { AppCard } from '@/components/app/app-card'

type EmptyStateProps = {
  title: string
  description: string
  icon: LucideIcon
  action?: React.ReactNode
}

export function EmptyState({ title, description, icon: Icon, action }: EmptyStateProps) {
  return (
    <AppCard>
      <div className="flex flex-col items-center gap-4 py-6 text-center sm:py-8">
        <div className="rounded-3xl bg-secondary p-4 text-muted-foreground shadow-sm">
          <Icon className="size-6" />
        </div>
        <div className="max-w-md space-y-1">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        {action ? <div className="pt-1">{action}</div> : null}
      </div>
    </AppCard>
  )
}
