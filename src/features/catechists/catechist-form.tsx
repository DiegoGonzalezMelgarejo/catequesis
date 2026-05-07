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
import type { SelectOption } from '@/types/models'
import { cn } from '@/utils/cn'
import { saveCatechist } from '@/services/user-service'

const createSchema = (isEditing: boolean) =>
  z.object({
    fullName: z.string().min(3, 'Ingresa el nombre completo.'),
    username: z.string().min(3, 'Ingresa un usuario valido.'),
    password: isEditing
      ? z.string().optional()
      : z.string().min(6, 'La contrasena debe tener minimo 6 caracteres.'),
    phone: z.string().optional(),
    email: z.string().email('Correo invalido.').optional().or(z.literal('')),
    groupIds: z.array(z.string()),
  })

type CatechistFormValues = z.infer<ReturnType<typeof createSchema>>

export type EditableCatechist = {
  id: string
  fullName: string
  username: string
  phone?: string
  email?: string
  groupIds: string[]
}

type CatechistFormProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  catechist?: EditableCatechist | null
  groups: SelectOption[]
}

export function CatechistForm({ open, onOpenChange, catechist, groups }: CatechistFormProps) {
  const isEditing = Boolean(catechist)
  const form = useForm<CatechistFormValues>({
    resolver: zodResolver(createSchema(isEditing)),
    defaultValues: {
      fullName: '',
      username: '',
      password: '',
      phone: '',
      email: '',
      groupIds: [],
    },
  })

  useEffect(() => {
    form.reset({
      fullName: catechist?.fullName ?? '',
      username: catechist?.username ?? '',
      password: '',
      phone: catechist?.phone ?? '',
      email: catechist?.email ?? '',
      groupIds: catechist?.groupIds ?? [],
    })
  }, [catechist, form, open])

  const selectedGroupIds = form.watch('groupIds')

  async function onSubmit(values: CatechistFormValues) {
    try {
      await saveCatechist({
        id: catechist?.id,
        fullName: values.fullName,
        username: values.username,
        password: values.password,
        phone: values.phone,
        email: values.email,
        groupIds: values.groupIds,
      })

      toast.success(isEditing ? 'Catequista actualizado.' : 'Catequista creado.')
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No fue posible guardar el catequista.')
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? 'Editar catequista' : 'Nuevo catequista'}
      description="Crea credenciales locales y asigna grupos visibles para el catequista."
      footer={
        <>
          <SecondaryButton type="button" onClick={() => onOpenChange(false)}>
            Cancelar
          </SecondaryButton>
          <PrimaryButton type="submit" form="catechist-form" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : null}
            Guardar
          </PrimaryButton>
        </>
      }
    >
      <form id="catechist-form" className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid gap-4 sm:grid-cols-2">
          <AppInput label="Nombre completo" error={form.formState.errors.fullName?.message} {...form.register('fullName')} />
          <AppInput label="Usuario" error={form.formState.errors.username?.message} {...form.register('username')} />
          <AppInput
            label={isEditing ? 'Nueva contrasena (opcional)' : 'Contrasena'}
            type="password"
            error={form.formState.errors.password?.message}
            {...form.register('password')}
          />
          <AppInput label="Telefono" {...form.register('phone')} />
          <div className="sm:col-span-2">
            <AppInput label="Correo" type="email" error={form.formState.errors.email?.message} {...form.register('email')} />
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium">Grupos asignados</p>
            <p className="text-sm text-muted-foreground">Solo estos grupos apareceran en su panel.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {groups.map((group) => {
              const selected = selectedGroupIds.includes(group.value)

              return (
                <Button
                  key={group.value}
                  type="button"
                  variant={selected ? 'default' : 'outline'}
                  className={cn('justify-start rounded-2xl', !selected && 'bg-white')}
                  onClick={() => {
                    const nextValue = selected
                      ? selectedGroupIds.filter((groupId) => groupId !== group.value)
                      : [...selectedGroupIds, group.value]
                    form.setValue('groupIds', nextValue, { shouldDirty: true })
                  }}
                >
                  {group.label}
                </Button>
              )
            })}
          </div>
        </div>
      </form>
    </Modal>
  )
}
