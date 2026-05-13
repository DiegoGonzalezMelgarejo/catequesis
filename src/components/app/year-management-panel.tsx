import { useState } from 'react'
import { toast } from 'sonner'

import { AppInput } from '@/components/app/app-input'
import { Badge } from '@/components/app/badge'
import { PrimaryButton } from '@/components/app/primary-button'
import { SecondaryButton } from '@/components/app/secondary-button'
import { Label } from '@/components/ui/label'
import { cn } from '@/utils/cn'
import { formatYearLabel, getCurrentYear } from '@/utils/year'

type YearManagementPanelProps = {
  activeYear: number | null
  availableYears: number[]
  loading?: boolean
  onSelectYear: (year: number) => void
  onCreateYear: (input: { year: number; observations?: string }) => Promise<void>
  onDone?: () => void
  requireCreation?: boolean
  canCreate?: boolean
  requiredYear?: number
}

export function YearManagementPanel({ activeYear, availableYears, loading = false, onSelectYear, onCreateYear, onDone, requireCreation = false, canCreate = true, requiredYear }: YearManagementPanelProps) {
  const fallbackYear = requiredYear ?? getCurrentYear()
  const missingRequiredYear = requiredYear != null && !availableYears.includes(requiredYear)
  const requiresCreationGate = requireCreation && (availableYears.length === 0 || missingRequiredYear)
  const mustCreateFirst = requiresCreationGate && canCreate
  const blockedWithoutYears = requiresCreationGate && !canCreate
  const [showCreateForm, setShowCreateForm] = useState(availableYears.length === 0 || missingRequiredYear)
  const [customYear, setCustomYear] = useState(fallbackYear.toString())
  const [observations, setObservations] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleCreateYear() {
    const parsedYear = Number(customYear)

    if (requiredYear != null && parsedYear !== requiredYear) {
      toast.error(`Debes crear el corte anual de ${requiredYear} para continuar.`)
      return
    }

    if (!Number.isFinite(parsedYear) || parsedYear < 2020 || parsedYear > 2100) {
      toast.error('Ingresa un año válido.')
      return
    }

    if (availableYears.includes(parsedYear)) {
      toast.error('Ya existe un corte anual para ese año.')
      return
    }

    setSubmitting(true)

    try {
      await onCreateYear({ year: parsedYear, observations })
      setObservations('')
      setShowCreateForm(false)
      onDone?.()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo crear el corte anual.'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-foreground">Cortes disponibles</p>
          {blockedWithoutYears ? (
            <Badge variant="warning">Solo un administrador puede crearlo</Badge>
          ) : mustCreateFirst ? (
            <Badge variant="warning">Debes crear uno para continuar</Badge>
          ) : canCreate ? (
            <SecondaryButton type="button" onClick={() => setShowCreateForm((current) => !current)}>
              {showCreateForm ? 'Ocultar formulario' : 'Crear corte anual'}
            </SecondaryButton>
          ) : null}
        </div>

        {blockedWithoutYears ? (
          <p className="text-sm text-muted-foreground">
            {requiredYear != null
              ? `Necesitas que un administrador cree el corte anual en curso (${formatYearLabel(requiredYear)}) para poder continuar.`
              : 'No hay cortes anuales creados. Necesitas que un administrador cree uno para poder continuar.'}
          </p>
        ) : requiredYear != null && missingRequiredYear ? (
          <p className="text-sm text-muted-foreground">Para continuar debe existir el corte anual en curso: {formatYearLabel(requiredYear)}.</p>
        ) : null}

        {loading ? (
          <p className="text-sm text-muted-foreground">Consultando los periodos creados para esta parroquia...</p>
        ) : availableYears.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {availableYears.map((year) => (
              <SecondaryButton
                key={year}
                type="button"
                variant={year === activeYear ? 'default' : 'secondary'}
                disabled={submitting}
                onClick={() => {
                  onSelectYear(year)
                  onDone?.()
                }}
              >
                {formatYearLabel(year)}
              </SecondaryButton>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Todavía no hay cortes anuales creados.</p>
        )}
      </div>

      {canCreate && (showCreateForm || mustCreateFirst) ? (
        <div className="rounded-[1rem] bg-secondary/35 p-4">
          <div className="mb-3 flex items-center gap-2">
            <p className="font-medium text-foreground">Nuevo corte anual</p>
            <Badge variant="outline">Manual</Badge>
          </div>

          <div className="space-y-3">
            <AppInput
              label="Año"
              type="number"
              min="2020"
              max="2100"
              value={customYear}
              disabled={requiredYear != null}
              onChange={(event) => setCustomYear(event.target.value)}
            />

            <label className="flex flex-col gap-2">
              <Label htmlFor="annual-period-observations">Observaciones</Label>
              <textarea
                id="annual-period-observations"
                className={cn(
                  'min-h-28 w-full rounded-[0.875rem] border border-input bg-white px-4 py-3 text-sm outline-none transition placeholder:text-muted-foreground focus-visible:border-primary/30 focus-visible:ring-2 focus-visible:ring-ring',
                )}
                placeholder="Opcional. Describe el contexto o notas del nuevo corte anual."
                value={observations}
                onChange={(event) => setObservations(event.target.value)}
              />
            </label>

            <PrimaryButton className="w-full" type="button" disabled={submitting} onClick={() => void handleCreateYear()}>
              {submitting ? 'Creando corte...' : 'Crear corte anual'}
            </PrimaryButton>
          </div>
        </div>
      ) : null}
    </div>
  )
}
