import { cn } from '@/utils/cn'

type FormStepIndicatorProps = {
  steps: string[]
  currentStep: number
  onStepChange?: (step: number) => void
}

export function FormStepIndicator({ steps, currentStep, onStepChange }: FormStepIndicatorProps) {
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
      {steps.map((step, index) => {
        const active = index === currentStep
        const completed = index < currentStep

        return (
          <button
            key={step}
            type="button"
            onClick={() => onStepChange?.(index)}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition sm:text-sm',
              active && 'border-primary/20 bg-primary/10 text-primary shadow-sm',
              completed && 'border-success/20 bg-success/10 text-success',
              !active && !completed && 'border-white/70 bg-white text-muted-foreground',
            )}
          >
            <span
              className={cn(
                'flex size-5 items-center justify-center rounded-full text-[11px] font-semibold',
                active && 'bg-primary text-primary-foreground',
                completed && 'bg-success text-success-foreground',
                !active && !completed && 'bg-secondary text-foreground',
              )}
            >
              {index + 1}
            </span>
            <span>{step}</span>
          </button>
        )
      })}
    </div>
  )
}
