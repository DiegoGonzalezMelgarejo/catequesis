import { forwardRef } from 'react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/utils/cn'

type AppInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  hint?: string
  error?: string
}

export const AppInput = forwardRef<HTMLInputElement, AppInputProps>(
  ({ className, label, hint, error, id, ...props }, ref) => {
    const inputId = id ?? props.name

    return (
      <label className="flex flex-col gap-2">
        {label ? <Label htmlFor={inputId}>{label}</Label> : null}
        <Input id={inputId} ref={ref} className={cn(error && 'border-destructive', className)} {...props} />
        {error ? <span className="text-xs text-destructive">{error}</span> : null}
        {!error && hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </label>
    )
  },
)

AppInput.displayName = 'AppInput'
