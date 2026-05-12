import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'

import { AppCard } from '@/components/app/app-card'
import { AppInput } from '@/components/app/app-input'
import { LoadingState } from '@/components/app/loading-state'
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
  const isStandaloneMode =
    window.matchMedia('(display-mode: standalone)').matches ||
    (typeof navigator !== 'undefined' && 'standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  const isMobileDevice = /android|iphone|ipad|ipod|mobile/i.test(window.navigator.userAgent)
  const showFullScreenLoginLoader = form.formState.isSubmitting && isStandaloneMode && isMobileDevice

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
    <>
      {showFullScreenLoginLoader ? (
        <div className="fixed inset-0 z-50 bg-[linear-gradient(180deg,#f8faff_0%,#eef2ff_100%)]">
          <LoadingState label="Iniciando sesión y preparando tu espacio de trabajo..." fullScreen />
        </div>
      ) : null}
      <div className="flex min-h-svh items-center justify-center px-4 py-6 sm:px-6">
        <div className="w-full max-w-sm">
        <AppCard title="Iniciar sesión" description="Ingresa con tu cuenta para acceder al panel de trabajo.">
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <AppInput label="Usuario" disabled={form.formState.isSubmitting} error={form.formState.errors.username?.message} {...form.register('username')} />
            <AppInput
              label="Contraseña"
              type="password"
              disabled={form.formState.isSubmitting}
              error={form.formState.errors.password?.message}
              {...form.register('password')}
            />

            <div className="rounded-[1rem] bg-secondary/45 p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Acceso seguro</p>
              <p>Si no recuerdas tus datos de ingreso, solicita apoyo al responsable de la plataforma.</p>
            </div>

            {form.formState.isSubmitting ? (
              <div className="rounded-[1rem] border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-3">
                  <LoaderCircle className="size-4 animate-spin text-primary" />
                  <div>
                    <p className="font-medium text-foreground">Iniciando sesión...</p>
                    <p>Estamos preparando tu acceso y cargando los datos básicos.</p>
                  </div>
                </div>
              </div>
            ) : null}

            <PrimaryButton className="w-full" size="lg" type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : null}
              {form.formState.isSubmitting ? 'Ingresando...' : 'Entrar al panel'}
            </PrimaryButton>
          </form>
        </AppCard>
        </div>
      </div>
    </>
  )
}
