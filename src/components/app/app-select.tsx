import { Label } from '@/components/ui/label'
import type { SelectOption } from '@/types/models'

type AppSelectProps = {
  label?: string
  value?: string
  placeholder?: string
  options: SelectOption[]
  onValueChange: (value: string) => void
}

export function AppSelect({
  label,
  value,
  placeholder = 'Selecciona una opcion',
  options,
  onValueChange,
}: AppSelectProps) {
  const selectId = label ? `app-select-${label.toLowerCase().replaceAll(' ', '-')}` : undefined

  return (
    <div className="flex flex-col gap-2">
      {label ? <Label htmlFor={selectId}>{label}</Label> : null}
      <select
        id={selectId}
        value={value ?? ''}
        onChange={(event) => onValueChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-input bg-white px-4 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
