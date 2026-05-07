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
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <div className="rounded-3xl bg-secondary p-4 text-muted-foreground">
          <Icon className="size-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {action}
      </div>
    </AppCard>
  )
}
