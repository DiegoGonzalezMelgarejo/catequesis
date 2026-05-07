import type { LucideIcon } from 'lucide-react'

import { Badge } from '@/components/app/badge'
import { AppCard } from '@/components/app/app-card'

type StatsCardProps = {
  title: string
  value: string | number
  icon: LucideIcon
  tone?: 'default' | 'success' | 'warning'
  helper?: string
}

export function StatsCard({ title, value, icon: Icon, tone = 'default', helper }: StatsCardProps) {
  const badgeVariant = tone === 'success' ? 'success' : tone === 'warning' ? 'warning' : 'default'

  return (
    <AppCard className="h-full">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
          {helper ? <p className="mt-2 text-sm text-muted-foreground">{helper}</p> : null}
        </div>
        <Badge variant={badgeVariant} className="gap-2 rounded-2xl px-3 py-2 text-sm shadow-sm">
          <Icon className="size-4" />
          Activo
        </Badge>
      </div>
    </AppCard>
  )
}
