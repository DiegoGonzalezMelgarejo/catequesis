import type { ReactNode } from 'react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/utils/cn'

type AppCardProps = {
  title?: string
  description?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
  interactive?: boolean
}

export function AppCard({
  title,
  description,
  actions,
  children,
  className,
  interactive = false,
}: AppCardProps) {
  return (
      <Card
        className={cn(
          'overflow-hidden border-border/80 bg-white/96 motion-safe:animate-in motion-safe:fade-in-50 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500',
          interactive && 'transition duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-soft',
          className,
        )}
      >
      {(title || description || actions) && (
        <CardHeader className="flex flex-row items-start justify-between gap-3 border-b border-border/60 pb-4">
          <div className="space-y-1">
            {title ? <CardTitle>{title}</CardTitle> : null}
            {description ? <CardDescription>{description}</CardDescription> : null}
            </div>
          {actions}
        </CardHeader>
      )}
      <CardContent className={cn(title || description || actions ? 'pt-4' : '', 'relative')}>{children}</CardContent>
    </Card>
  )
}
