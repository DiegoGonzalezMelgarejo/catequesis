import { zodResolver } from '@hookform/resolvers/zod'
import { HeartHandshake, ShieldCheck, Sparkles } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'

import { AppCard } from '@/components/app/app-card'
import { AppInput } from '@/components/app/app-input'
import { Badge } from '@/components/app/badge'
import { PrimaryButton } from '@/components/app/primary-button'
import { StatsCard } from '@/components/app/stats-card'
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
      toast.error('Credenciales invalidas o usuario inactivo.')
      return
    }

    toast.success('Sesion iniciada correctamente.')
    navigate('/app/dashboard', { replace: true })
  }

  return (
    <div className="min-h-svh px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto grid min-h-[calc(100svh-2rem)] max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <section className="space-y-6">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>Bienvenido</Badge>
              <Badge variant="outline">Gestion pastoral</Badge>
            </div>
            <div className="space-y-3">
              <h1 className="max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">
                Una experiencia clara y confiable para organizar la catequesis.
              </h1>
              <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
                Accede a grupos, alumnos, asistencia y seguimiento desde una interfaz simple, cercana y profesional.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <StatsCard title="Acompanamiento" value="Grupos" icon={HeartHandshake} helper="Seguimiento cercano" />
            <StatsCard title="Proteccion" value="Acceso" icon={ShieldCheck} helper="Usuarios autorizados" tone="success" />
            <StatsCard title="Experiencia" value="Agil" icon={Sparkles} helper="Rapida y ordenada" tone="warning" />
          </div>
        </section>

        <AppCard title="Iniciar sesion" description="Ingresa con tu cuenta para acceder al panel de trabajo.">
          <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
            <AppInput label="Usuario" error={form.formState.errors.username?.message} {...form.register('username')} />
            <AppInput
              label="Contrasena"
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
