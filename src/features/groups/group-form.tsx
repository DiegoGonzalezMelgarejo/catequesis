import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { AppInput } from '@/components/app/app-input'
import { FormStepIndicator } from '@/components/app/form-step-indicator'
import { Modal } from '@/components/app/modal'
import { PrimaryButton } from '@/components/app/primary-button'
import { SecondaryButton } from '@/components/app/secondary-button'
import { useActiveYear } from '@/hooks/use-active-year'
import { Button } from '@/components/ui/button'
import { saveGroup } from '@/services/group-service'
import type { SelectOption } from '@/types/models'
import { cn } from '@/utils/cn'
import { getCurrentYear } from '@/utils/year'

const schema = z.object({
  name: z.string().min(3, 'Ingresa el nombre del grupo.'),
  year: z.number().int().min(2020, 'Ingresa un año válido.'),
  schedule: z.string().optional(),
  description: z.string().optional(),
  catechistIds: z.array(z.string()),
})

type GroupFormValues = z.infer<typeof schema>

export type EditableGroup = {
  id: string
  name: string
  year: number
  schedule?: string
  description?: string
  catechistIds: string[]
}

type GroupFormProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  group?: EditableGroup | null
  catechists: SelectOption[]
}

export function GroupForm({ open, onOpenChange, group, catechists }: GroupFormProps) {
  const { activeYear } = useActiveYear()
  const [currentStep, setCurrentStep] = useState(0)
  const form = useForm<GroupFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      year: activeYear ?? getCurrentYear(),
      schedule: '',
      description: '',
      catechistIds: [],
    },
  })

  useEffect(() => {
    setCurrentStep(0)
    form.reset({
      name: group?.name ?? '',
      year: group?.year ?? activeYear ?? getCurrentYear(),
      schedule: group?.schedule ?? '',
      description: group?.description ?? '',
      catechistIds: group?.catechistIds ?? [],
    })
  }, [activeYear, form, group, open])

  const selectedCatechists = form.watch('catechistIds')
  const steps = ['Datos', 'Catequistas']
  const submitForm = form.handleSubmit(onSubmit)

  async function goNextStep() {
    const valid = await form.trigger(['name', 'year'])
    if (!valid) {
      return
    }

    setCurrentStep(1)
  }

  async function onSubmit(values: GroupFormValues) {
    try {
      await saveGroup({
        id: group?.id,
        name: values.name,
        year: values.year,
        activeYear: activeYear ?? undefined,
        schedule: values.schedule,
        description: values.description,
        catechistIds: values.catechistIds,
      })

      toast.success(group ? 'Grupo actualizado.' : 'Grupo creado.')
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No fue posible guardar el grupo.')
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      variant="full-screen"
      title={group ? 'Editar grupo' : 'Nuevo grupo'}
      description="Configura el grupo y define uno o varios catequistas responsables."
      footer={
        <>
          <SecondaryButton type="button" onClick={() => onOpenChange(false)}>
            Cancelar
          </SecondaryButton>
          {currentStep > 0 ? (
            <SecondaryButton type="button" onClick={() => setCurrentStep(0)}>
              Anterior
            </SecondaryButton>
          ) : null}
          {currentStep === 0 ? (
            <PrimaryButton type="button" onClick={() => void goNextStep()}>
              Siguiente
            </PrimaryButton>
          ) : (
            <PrimaryButton type="button" onClick={() => void submitForm()} disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : null}
              Guardar
            </PrimaryButton>
          )}
        </>
      }
    >
      <form id="group-form" className="mx-auto max-w-5xl space-y-5 lg:space-y-6" onSubmit={submitForm}>
        <FormStepIndicator steps={steps} currentStep={currentStep} onStepChange={setCurrentStep} />

        {currentStep === 0 ? (
          <div className="rounded-[1rem] bg-secondary/35 p-4 sm:p-5 lg:p-6">
            <div className="mb-4 lg:mb-5">
              <p className="font-medium">Información del grupo</p>
              <p className="text-sm text-muted-foreground">Define el nombre, el año de corte, el horario y una referencia rapida para el equipo.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <AppInput label="Nombre del grupo" error={form.formState.errors.name?.message} {...form.register('name')} />
              <AppInput label="Año de corte" type="number" min="2020" max="2100" disabled value={String(activeYear ?? form.watch('year'))} error={form.formState.errors.year?.message} {...form.register('year', { valueAsNumber: true })} />
              <AppInput label="Horario" hint="Ej. Sábados 9:00 AM" {...form.register('schedule')} />
              <div className="md:col-span-2 xl:col-span-3">
                <AppInput label="Descripción" hint="Opcional. Úsala para recordar etapa, salón o enfoque del grupo." {...form.register('description')} />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 rounded-[1rem] bg-secondary/35 p-4 sm:p-5 lg:p-6">
            <div>
              <p className="text-sm font-medium">Catequistas asignados</p>
              <p className="text-sm text-muted-foreground">Puedes asociar uno o varios catequistas.</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {catechists.map((catechist) => {
                const selected = selectedCatechists.includes(catechist.value)

                return (
                  <Button
                    key={catechist.value}
                    type="button"
                    variant={selected ? 'default' : 'outline'}
                    className={cn('min-h-12 justify-start rounded-[0.9rem] text-left', !selected && 'bg-white')}
                    onClick={() => {
                      const nextValue = selected
                        ? selectedCatechists.filter((id) => id !== catechist.value)
                        : [...selectedCatechists, catechist.value]
                      form.setValue('catechistIds', nextValue, { shouldDirty: true })
                    }}
                  >
                    {catechist.label}
                  </Button>
                )
              })}
            </div>
          </div>
        )}
      </form>
    </Modal>
  )
}
