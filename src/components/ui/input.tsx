import * as React from 'react'

import { cn } from '@/utils/cn'

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
        <input
          type={type}
          className={cn(
          'flex h-11 w-full rounded-[0.875rem] border border-input bg-white px-4 py-2 text-sm outline-none transition placeholder:text-muted-foreground focus-visible:border-primary/30 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'

export { Input }
