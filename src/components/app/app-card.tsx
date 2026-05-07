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
        'relative overflow-hidden border-white/70 bg-white/88 backdrop-blur motion-safe:animate-in motion-safe:fade-in-50 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-20 before:bg-gradient-to-br before:from-primary/10 before:via-primary/5 before:to-transparent before:content-["\"]',
        interactive && 'transition duration-200 hover:-translate-y-1 hover:border-primary/25 hover:shadow-soft',
        className,
      )}
    >
      {(title || description || actions) && (
        <CardHeader className="relative flex flex-row items-start justify-between gap-3">
          <div className="space-y-1">
            {title ? <CardTitle>{title}</CardTitle> : null}
            {description ? <CardDescription>{description}</CardDescription> : null}
          </div>
          {actions}
        </CardHeader>
      )}
      <CardContent className="relative">{children}</CardContent>
    </Card>
  )
}
