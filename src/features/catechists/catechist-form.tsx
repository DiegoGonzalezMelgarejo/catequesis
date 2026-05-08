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
  })

type CatechistFormValues = z.infer<ReturnType<typeof createSchema>>

export type EditableCatechist = {
  id: string
  fullName: string
  username: string
  phone?: string
  email?: string
}

type CatechistFormProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  catechist?: EditableCatechist | null
}

export function CatechistForm({ open, onOpenChange, catechist }: CatechistFormProps) {
  const isEditing = Boolean(catechist)
  const form = useForm<CatechistFormValues>({
    resolver: zodResolver(createSchema(isEditing)),
    defaultValues: {
      fullName: '',
      username: '',
      password: '',
      phone: '',
      email: '',
    },
  })

  useEffect(() => {
    form.reset({
      fullName: catechist?.fullName ?? '',
      username: catechist?.username ?? '',
      password: '',
      phone: catechist?.phone ?? '',
      email: catechist?.email ?? '',
    })
  }, [catechist, form, open])

  const submitForm = form.handleSubmit(onSubmit)

  async function onSubmit(values: CatechistFormValues) {
    try {
      await saveCatechist({
        id: catechist?.id,
        fullName: values.fullName,
        username: values.username,
        password: values.password,
        phone: values.phone,
        email: values.email,
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
      description="Crea las credenciales del catequista. La asignación de grupos se realiza desde el módulo de grupos."
      footer={
        <>
          <SecondaryButton type="button" onClick={() => onOpenChange(false)}>
            Cancelar
          </SecondaryButton>
          <PrimaryButton type="button" onClick={() => void submitForm()} disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : null}
            Guardar
          </PrimaryButton>
        </>
      }
    >
      <form id="catechist-form" className="space-y-5" onSubmit={submitForm}>
        <div className="rounded-[1rem] bg-secondary/35 p-4 sm:p-5">
          <div className="mb-4">
            <p className="font-medium">Datos del catequista</p>
            <p className="text-sm text-muted-foreground">Registra identidad, acceso y canales de contacto del responsable.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <AppInput label="Nombre completo" error={form.formState.errors.fullName?.message} {...form.register('fullName')} />
            <AppInput label="Usuario" hint="Se usa para iniciar sesión." error={form.formState.errors.username?.message} {...form.register('username')} />
            <AppInput
              label={isEditing ? 'Nueva contraseña (opcional)' : 'Contraseña'}
              type="password"
              hint={isEditing ? 'Déjala vacía si no deseas cambiarla.' : undefined}
              error={form.formState.errors.password?.message}
              {...form.register('password')}
            />
            <AppInput label="Teléfono" {...form.register('phone')} />
            <div className="sm:col-span-2">
              <AppInput label="Correo" type="email" error={form.formState.errors.email?.message} {...form.register('email')} />
            </div>
          </div>
        </div>
      </form>
    </Modal>
  )
}
