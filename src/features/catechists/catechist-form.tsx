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

const schema = z.object({
  fullName: z.string().min(3, 'Ingresa el nombre completo.'),
  username: z.string().min(3, 'Ingresa un usuario valido.'),
  phone: z.string().optional(),
  email: z.string().email('Correo invalido.').optional().or(z.literal('')),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
})

type CatechistFormValues = z.infer<typeof schema>

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
    resolver: zodResolver(schema),
      defaultValues: {
        fullName: '',
        username: '',
        phone: '',
        email: '',
        password: '',
        confirmPassword: '',
      },
  })

  useEffect(() => {
    form.reset({
      fullName: catechist?.fullName ?? '',
      username: catechist?.username ?? '',
      phone: catechist?.phone ?? '',
      email: catechist?.email ?? '',
      password: '',
      confirmPassword: '',
    })
  }, [catechist, form, open])

  const submitForm = form.handleSubmit(onSubmit)

  async function onSubmit(values: CatechistFormValues) {
    try {
      if (!isEditing) {
        if (!values.password || values.password.length < 6) {
          form.setError('password', { message: 'Ingresa una clave de al menos 6 caracteres.' })
          return
        }

        if (values.password !== values.confirmPassword) {
          form.setError('confirmPassword', { message: 'Las claves no coinciden.' })
          return
        }
      }

      const result = await saveCatechist({
        id: catechist?.id,
        fullName: values.fullName,
        username: values.username,
        phone: values.phone,
        email: values.email,
        password: values.password,
      })

      toast.success(
        isEditing
          ? 'Catequista actualizado.'
          : result.temporaryPassword
            ? `Catequista creado. Contraseña temporal: ${result.temporaryPassword}`
            : 'Catequista creado con la clave asignada.',
      )
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No fue posible guardar el catequista.')
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      variant="full-screen"
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
      <form id="catechist-form" className="mx-auto max-w-4xl space-y-5 lg:space-y-6" onSubmit={submitForm}>
        <div className="rounded-[1rem] bg-secondary/35 p-4 sm:p-5 lg:p-6">
          <div className="mb-4">
            <p className="font-medium">Datos del catequista</p>
            <p className="text-sm text-muted-foreground">Registra identidad, acceso y canales de contacto del responsable.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <AppInput label="Nombre completo" error={form.formState.errors.fullName?.message} {...form.register('fullName')} />
            <AppInput label="Usuario" hint="Se usa para iniciar sesión." error={form.formState.errors.username?.message} {...form.register('username')} />
            <AppInput label="Teléfono" {...form.register('phone')} />
            <div className="md:col-span-2 xl:col-span-3">
              <AppInput label="Correo" type="email" error={form.formState.errors.email?.message} {...form.register('email')} />
            </div>
            {!isEditing ? (
              <>
                <AppInput
                  label="Clave inicial"
                  type="password"
                  hint="El catequista deberá cambiarla en su primer ingreso."
                  error={form.formState.errors.password?.message}
                  {...form.register('password')}
                />
                <AppInput
                  label="Confirmar clave"
                  type="password"
                  error={form.formState.errors.confirmPassword?.message}
                  {...form.register('confirmPassword')}
                />
              </>
            ) : null}
          </div>
          {!isEditing ? (
            <p className="mt-4 text-sm text-muted-foreground">El catequista tendrá que cambiar esta clave en su primer ingreso.</p>
          ) : null}
        </div>
      </form>
    </Modal>
  )
}
