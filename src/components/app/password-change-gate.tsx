import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { AppInput } from '@/components/app/app-input'
import { Modal } from '@/components/app/modal'
import { PrimaryButton } from '@/components/app/primary-button'
import { useAuth } from '@/hooks/use-auth'

const schema = z.object({
  password: z.string().min(8, 'La contraseña debe tener mínimo 8 caracteres.'),
  confirmPassword: z.string().min(8, 'Confirma la nueva contraseña.'),
}).refine((values) => values.password === values.confirmPassword, {
  message: 'Las contraseñas no coinciden.',
  path: ['confirmPassword'],
})

type PasswordChangeFormValues = z.infer<typeof schema>

export function PasswordChangeGate() {
  const { user, changePassword } = useAuth()
  const form = useForm<PasswordChangeFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  })

  if (!user?.mustChangePassword) {
    return null
  }

  return (
    <Modal
      open
      onOpenChange={() => undefined}
      title="Actualiza tu contraseña"
      description="Antes de continuar debes cambiar la contraseña temporal asignada a tu cuenta."
      footer={null}
    >
      <form
        className="space-y-4"
        onSubmit={form.handleSubmit(async (values) => {
          try {
            await changePassword(values.password)
            form.reset()
            toast.success('Contraseña actualizada. Ya puedes continuar.')
          } catch (error) {
            toast.error(error instanceof Error ? error.message : 'No fue posible cambiar la contraseña.')
          }
        })}
      >
        <AppInput label="Nueva contraseña" type="password" error={form.formState.errors.password?.message} {...form.register('password')} />
        <AppInput label="Confirmar contraseña" type="password" error={form.formState.errors.confirmPassword?.message} {...form.register('confirmPassword')} />
        <PrimaryButton className="w-full" type="submit" disabled={form.formState.isSubmitting}>
          Guardar nueva contraseña
        </PrimaryButton>
      </form>
    </Modal>
  )
}
