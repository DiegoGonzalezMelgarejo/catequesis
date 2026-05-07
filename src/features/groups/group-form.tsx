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
import { Button } from '@/components/ui/button'
import { saveGroup } from '@/services/group-service'
import type { SelectOption } from '@/types/models'
import { cn } from '@/utils/cn'

const schema = z.object({
  name: z.string().min(3, 'Ingresa el nombre del grupo.'),
  schedule: z.string().optional(),
  description: z.string().optional(),
  catechistIds: z.array(z.string()),
})

type GroupFormValues = z.infer<typeof schema>

export type EditableGroup = {
  id: string
  name: string
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
  const form = useForm<GroupFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      schedule: '',
      description: '',
      catechistIds: [],
    },
  })

  useEffect(() => {
    form.reset({
      name: group?.name ?? '',
      schedule: group?.schedule ?? '',
      description: group?.description ?? '',
      catechistIds: group?.catechistIds ?? [],
    })
  }, [form, group, open])

  const selectedCatechists = form.watch('catechistIds')

  async function onSubmit(values: GroupFormValues) {
    try {
      await saveGroup({
        id: group?.id,
        name: values.name,
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
      title={group ? 'Editar grupo' : 'Nuevo grupo'}
      description="Configura el grupo y define uno o varios catequistas responsables."
      footer={
        <>
          <SecondaryButton type="button" onClick={() => onOpenChange(false)}>
            Cancelar
          </SecondaryButton>
          <PrimaryButton type="submit" form="group-form" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : null}
            Guardar
          </PrimaryButton>
        </>
      }
    >
      <form id="group-form" className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid gap-4 sm:grid-cols-2">
          <AppInput label="Nombre del grupo" error={form.formState.errors.name?.message} {...form.register('name')} />
          <AppInput label="Horario" hint="Ej. Sabados 9:00 AM" {...form.register('schedule')} />
          <div className="sm:col-span-2">
            <AppInput label="Descripción" {...form.register('description')} />
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium">Catequistas asignados</p>
            <p className="text-sm text-muted-foreground">Puedes asociar uno o varios catequistas.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {catechists.map((catechist) => {
              const selected = selectedCatechists.includes(catechist.value)

              return (
                <Button
                  key={catechist.value}
                  type="button"
                  variant={selected ? 'default' : 'outline'}
                  className={cn('justify-start rounded-2xl', !selected && 'bg-white')}
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
      </form>
    </Modal>
  )
}
