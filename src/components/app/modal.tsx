import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type ModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
}

export function Modal({ open, onOpenChange, title, description, children, footer }: ModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92svh] overflow-hidden p-0">
        <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-border sm:hidden" />
        <DialogHeader className="px-4 pb-0 pt-2 sm:px-6 sm:pt-6">
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <div className="overflow-y-auto px-4 pb-4 sm:px-6">{children}</div>
        {footer ? (
          <DialogFooter className="border-t border-white/70 bg-white/95 px-4 py-4 backdrop-blur sm:px-6">
            {footer}
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
