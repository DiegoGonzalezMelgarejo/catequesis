import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { cn } from '@/utils/cn'

const Tabs = TabsPrimitive.Root

function setRefs<T>(value: T | null, refs: Array<React.ForwardedRef<T> | undefined>) {
  refs.forEach((ref) => {
    if (typeof ref === 'function') {
      ref(value)
      return
    }

    if (ref) {
      ref.current = value
    }
  })
}

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => {
  const localRef = React.useRef<React.ElementRef<typeof TabsPrimitive.List> | null>(null)
  const [canScrollLeft, setCanScrollLeft] = React.useState(false)
  const [canScrollRight, setCanScrollRight] = React.useState(false)

  const updateScrollState = React.useCallback(() => {
    const node = localRef.current

    if (!node) {
      return
    }

    setCanScrollLeft(node.scrollLeft > 4)
    setCanScrollRight(node.scrollLeft + node.clientWidth < node.scrollWidth - 4)
  }, [])

  React.useEffect(() => {
    updateScrollState()

    const node = localRef.current

    if (!node) {
      return
    }

    node.addEventListener('scroll', updateScrollState, { passive: true })
    window.addEventListener('resize', updateScrollState)

    return () => {
      node.removeEventListener('scroll', updateScrollState)
      window.removeEventListener('resize', updateScrollState)
    }
  }, [updateScrollState])

  return (
    <div className="relative">
      <TabsPrimitive.List
        ref={(value) => {
          localRef.current = value
          setRefs(value, [ref])
        }}
        className={cn(
          'no-scrollbar flex w-full items-center gap-1 overflow-x-auto rounded-[0.95rem] border border-border/70 bg-white p-1',
          className,
        )}
        {...props}
      />

      {canScrollLeft ? (
        <div className="pointer-events-none absolute inset-y-1 left-1 flex items-center rounded-l-[0.8rem] bg-gradient-to-r from-white via-white/95 to-transparent pl-1 pr-4 text-muted-foreground">
          <ChevronLeft className="size-4" />
        </div>
      ) : null}

      {canScrollRight ? (
        <div className="pointer-events-none absolute inset-y-1 right-1 flex items-center rounded-r-[0.8rem] bg-gradient-to-l from-white via-white/95 to-transparent pl-4 pr-1 text-muted-foreground">
          <ChevronRight className="size-4" />
        </div>
      ) : null}
    </div>
  )
})
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-[0.75rem] px-4 py-2 text-sm font-medium text-muted-foreground transition-all data-[state=active]:bg-secondary data-[state=active]:text-foreground',
      className,
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content ref={ref} className={cn('mt-4 outline-none', className)} {...props} />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsContent, TabsList, TabsTrigger }
