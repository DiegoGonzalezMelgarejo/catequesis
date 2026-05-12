import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { AppInput } from '@/components/app/app-input'
import { Modal } from '@/components/app/modal'
import { PrimaryButton } from '@/components/app/primary-button'
import { SecondaryButton } from '@/components/app/secondary-button'
import { useActiveYear } from '@/hooks/use-active-year'
import { saveActivity } from '@/services/activity-service'
import { ACTIVITY_TYPES, type SelectOption } from '@/types/models'

const schema = z.object({
  groupId: z.string().min(1, 'Selecciona el grupo.'),
  title: z.string().min(3, 'Ingresa el titulo.'),
  description: z.string().optional(),
  date: z.string().min(1, 'Selecciona una fecha.'),
  maxGrade: z.number().min(0, 'La nota maxima no puede ser negativa.'),
  type: z.enum(ACTIVITY_TYPES),
})

type ActivityFormValues = z.infer<typeof schema>

export type EditableActivity = {
  id: string
  groupId: string
  title: string
  description?: string
  date: string
  maxGrade: number
  type: (typeof ACTIVITY_TYPES)[number]
}

type ActivityFormProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  activity?: EditableActivity | null
  groupOptions: SelectOption[]
  currentUserId: string
}

export function ActivityForm({
  open,
  onOpenChange,
  activity,
  groupOptions,
  currentUserId,
}: ActivityFormProps) {
  const { activeYear } = useActiveYear()
  const form = useForm<ActivityFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      groupId: '',
      title: '',
      description: '',
      date: '',
      maxGrade: 5,
      type: 'tarea',
    },
  })

  useEffect(() => {
    form.reset({
      groupId: activity?.groupId ?? '',
      title: activity?.title ?? '',
      description: activity?.description ?? '',
      date: activity?.date ?? '',
      maxGrade: activity?.maxGrade ?? 5,
      type: activity?.type ?? 'tarea',
    })
  }, [activity, form, open])

  async function onSubmit(values: ActivityFormValues) {
    try {
      await saveActivity({
        id: activity?.id,
        groupId: values.groupId,
        activeYear: activeYear ?? undefined,
        title: values.title,
        description: values.description,
        date: values.date,
        maxGrade: values.maxGrade,
        type: values.type,
        createdBy: currentUserId,
      })

      toast.success(activity ? 'Actividad actualizada.' : 'Actividad creada.')
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No fue posible guardar la actividad.')
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      variant="full-screen"
      title={activity ? 'Editar actividad' : 'Nueva actividad'}
      description="Registra tareas, talleres, evaluaciones y actividades de clase."
      footer={
        <>
          <SecondaryButton type="button" onClick={() => onOpenChange(false)}>
            Cancelar
          </SecondaryButton>
          <PrimaryButton type="submit" form="activity-form" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : null}
            Guardar
          </PrimaryButton>
        </>
      }
    >
      <form id="activity-form" className="mx-auto max-w-4xl space-y-5 lg:space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="rounded-[1rem] bg-secondary/35 p-4 sm:p-5 lg:p-6">
          <div className="mb-4 lg:mb-5">
            <p className="font-medium">Información de la actividad</p>
            <p className="text-sm text-muted-foreground">Define el grupo, el tipo, la fecha y la escala de evaluación.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="flex flex-col gap-2 md:col-span-2 xl:col-span-3">
              <span className="text-sm font-medium">Grupo</span>
              <select className="h-11 rounded-xl border border-input bg-white px-4 text-sm" {...form.register('groupId')}>
                <option value="">Selecciona un grupo</option>
                {groupOptions.map((group) => (
                  <option key={group.value} value={group.value}>
                    {group.label}
                  </option>
                ))}
              </select>
              {form.formState.errors.groupId?.message ? (
                <span className="text-xs text-destructive">{form.formState.errors.groupId.message}</span>
              ) : null}
            </label>

            <AppInput label="Titulo" error={form.formState.errors.title?.message} {...form.register('title')} />
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">Tipo</span>
              <select className="h-11 rounded-xl border border-input bg-white px-4 text-sm" {...form.register('type')}>
                {ACTIVITY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <AppInput label="Fecha" type="date" error={form.formState.errors.date?.message} {...form.register('date')} />
            <AppInput
              label="Nota maxima"
              type="number"
              step="0.1"
              error={form.formState.errors.maxGrade?.message}
              {...form.register('maxGrade', { valueAsNumber: true })}
            />
            <div className="md:col-span-2 xl:col-span-3">
              <AppInput label="Descripción" {...form.register('description')} />
            </div>
          </div>
        </div>
      </form>
    </Modal>
  )
}
