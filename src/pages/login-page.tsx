import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'

import { AppCard } from '@/components/app/app-card'
import { AppInput } from '@/components/app/app-input'
import { PrimaryButton } from '@/components/app/primary-button'
import { useAuth } from '@/hooks/use-auth'

const schema = z.object({
  username: z.string().min(1, 'Ingresa tu usuario.'),
  password: z.string().min(1, 'Ingresa tu contrasena.'),
})

type LoginFormValues = z.infer<typeof schema>

export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      username: '',
      password: '',
    },
  })

  async function onSubmit(values: LoginFormValues) {
    const authenticated = await login(values.username, values.password)

    if (!authenticated) {
      toast.error('Credenciales inválidas o usuario inactivo.')
      return
    }

    toast.success('Sesión iniciada correctamente.')
    navigate('/app/dashboard', { replace: true })
  }

  return (
    <div className="flex min-h-svh items-center justify-center px-4 py-6 sm:px-6">
      <div className="w-full max-w-sm">
        <AppCard title="Iniciar sesión" description="Ingresa con tu cuenta para acceder al panel de trabajo.">
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <AppInput label="Usuario" error={form.formState.errors.username?.message} {...form.register('username')} />
            <AppInput
              label="Contraseña"
              type="password"
              error={form.formState.errors.password?.message}
              {...form.register('password')}
            />

            <div className="rounded-3xl bg-secondary/50 p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Acceso seguro</p>
              <p>Si no recuerdas tus datos de ingreso, solicita apoyo al responsable de la plataforma.</p>
            </div>

            <PrimaryButton className="w-full" size="lg" type="submit" disabled={form.formState.isSubmitting}>
              Entrar al panel
            </PrimaryButton>
          </form>
        </AppCard>
      </div>
    </div>
  )
}
