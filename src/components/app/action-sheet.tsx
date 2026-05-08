import * as DialogPrimitive from '@radix-ui/react-dialog'
import type { LucideIcon } from 'lucide-react'
import { X } from 'lucide-react'

import { cn } from '@/utils/cn'

type ActionSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
}

type ActionSheetItemProps = {
  label: string
  icon?: LucideIcon
  onClick?: () => void
  tone?: 'default' | 'destructive'
}

export function ActionSheet({ open, onOpenChange, title, description, children }: ActionSheetProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm" />
        <DialogPrimitive.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-3xl rounded-t-[1.75rem] border border-white/70 bg-white p-4 shadow-soft outline-none sm:bottom-4 sm:w-[min(92vw,32rem)] sm:rounded-[1.75rem]">
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-border sm:hidden" />
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogPrimitive.Title className="text-base font-semibold">{title}</DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">
                  {description}
                </DialogPrimitive.Description>
              ) : null}
            </div>
            <DialogPrimitive.Close className="rounded-full p-2 text-muted-foreground hover:bg-secondary">
              <X className="size-4" />
            </DialogPrimitive.Close>
          </div>
          <div className="mt-4 space-y-2">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export function ActionSheetItem({ label, icon: Icon, onClick, tone = 'default' }: ActionSheetItemProps) {
  return (
    <button
      type="button"
      className={cn(
        'flex w-full items-center gap-3 rounded-[1.25rem] px-4 py-3 text-left text-sm font-medium transition hover:bg-secondary/70',
        tone === 'destructive' && 'text-destructive',
      )}
      onClick={onClick}
    >
      {Icon ? <Icon className="size-4" /> : null}
      <span>{label}</span>
    </button>
  )
}
