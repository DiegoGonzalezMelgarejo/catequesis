import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/utils/cn'

type PageSkeletonProps = {
  variant?: 'dashboard' | 'list' | 'detail'
  fullScreen?: boolean
}

export function PageSkeleton({ variant = 'list', fullScreen = false }: PageSkeletonProps) {
  return (
    <div className={cn('space-y-6', fullScreen && 'min-h-svh px-4 py-6')}>
      <div className="space-y-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>

      {variant === 'dashboard' ? <DashboardSkeleton /> : null}
      {variant === 'list' ? <ListSkeleton /> : null}
      {variant === 'detail' ? <DetailSkeleton /> : null}
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-[1rem]" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-56 rounded-[1rem]" />
        <Skeleton className="h-56 rounded-[1rem]" />
      </div>
    </>
  )
}

function ListSkeleton() {
  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-11 w-full sm:max-w-md" />
        <Skeleton className="h-11 w-40" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-24 rounded-[1rem]" />
        ))}
      </div>
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-36 rounded-[1rem]" />
        ))}
      </div>
    </>
  )
}

function DetailSkeleton() {
  return (
    <>
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-11 w-36" />
        <Skeleton className="h-11 w-36" />
        <Skeleton className="h-11 w-36" />
      </div>
      <Skeleton className="h-56 rounded-[1rem]" />
      <Skeleton className="h-12 w-72 rounded-[1rem]" />
      <div className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-48 rounded-[1rem]" />
        ))}
      </div>
    </>
  )
}
