import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/utils/cn'

type ModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  contentClassName?: string
  variant?: 'default' | 'full-screen'
}

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  contentClassName,
  variant = 'default',
}: ModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'overflow-hidden border border-border/70 bg-white p-0',
          variant === 'default' && 'max-h-[92svh]',
          variant === 'full-screen' && 'inset-0 h-[100svh] max-h-[100svh] w-screen max-w-none rounded-none border-0 sm:inset-0 sm:h-[100svh] sm:w-screen sm:max-w-none sm:translate-x-0 sm:translate-y-0 sm:rounded-none',
          contentClassName,
        )}
      >
        {variant === 'default' ? <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-border sm:hidden" /> : null}
        <DialogHeader className={cn('shrink-0 border-b border-border/60 px-4 pb-4 pt-2 sm:px-6 sm:pt-6', variant === 'full-screen' && 'px-4 py-4 sm:px-8 sm:py-6')}>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <div className={cn('min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6', variant === 'full-screen' && 'px-4 py-4 sm:px-8 sm:py-6')}>
          {children}
        </div>
        {footer ? (
          <DialogFooter className={cn('safe-bottom shrink-0 border-t border-border/70 bg-white/98 px-4 py-4 backdrop-blur sm:px-6', variant === 'full-screen' && 'px-4 py-4 sm:px-8')}>
            {footer}
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
