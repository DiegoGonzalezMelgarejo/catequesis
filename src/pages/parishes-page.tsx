import { zodResolver } from '@hookform/resolvers/zod'
import { Building2, Copy, Eye, EyeOff, RefreshCw, ShieldPlus } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'

import { AppCard } from '@/components/app/app-card'
import { AppInput } from '@/components/app/app-input'
import { Badge } from '@/components/app/badge'
import { EmptyState } from '@/components/app/empty-state'
import { Modal } from '@/components/app/modal'
import { PageSkeleton } from '@/components/app/page-skeleton'
import { PrimaryButton } from '@/components/app/primary-button'
import { SecondaryButton } from '@/components/app/secondary-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAsyncData } from '@/hooks/use-async-data'
import { useAuth } from '@/hooks/use-auth'
import { createParishWithAdmin, getParishOverviews } from '@/services/parish-service'
import { generateTemporaryPassword } from '@/utils/password'

const schema = z.object({
  name: z.string().min(3, 'Ingresa el nombre de la parroquia.'),
  city: z.string().optional(),
  adminFullName: z.string().min(3, 'Ingresa el nombre del administrador.'),
  adminUsername: z.string().min(3, 'Ingresa el usuario del administrador.'),
  adminPassword: z.string().min(6, 'Ingresa una clave de al menos 6 caracteres.'),
  confirmAdminPassword: z.string().min(6, 'Confirma la clave del administrador.'),
}).refine((values) => values.adminPassword === values.confirmAdminPassword, {
  message: 'Las claves no coinciden.',
  path: ['confirmAdminPassword'],
})

type FormValues = z.infer<typeof schema>

export function ParishesPage() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [showAdminPassword, setShowAdminPassword] = useState(false)
  const [showConfirmAdminPassword, setShowConfirmAdminPassword] = useState(false)
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      city: '',
      adminFullName: '',
      adminUsername: '',
      adminPassword: '',
      confirmAdminPassword: '',
    },
  })
  const { data: parishes, loading } = useAsyncData(() => getParishOverviews(), [user?.id])

  async function copyPasswordToClipboard(password: string) {
    if (!navigator.clipboard) {
      return false
    }

    try {
      await navigator.clipboard.writeText(password)
      return true
    } catch {
      return false
    }
  }

  function handleGeneratePassword() {
    const generatedPassword = generateTemporaryPassword()

    form.setValue('adminPassword', generatedPassword, { shouldDirty: true, shouldValidate: true })
    form.setValue('confirmAdminPassword', generatedPassword, { shouldDirty: true, shouldValidate: true })
    setShowAdminPassword(true)
    setShowConfirmAdminPassword(true)
    toast.success('Clave generada y cargada en el formulario.')
  }

  if (!user) {
    return null
  }

  if (user.role !== 'SUPER_ADMIN') {
    return <Navigate to="/app/dashboard" replace />
  }

  if (loading || !parishes) {
    return <PageSkeleton variant="list" />
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Parroquias</h2>
          <p className="text-sm text-muted-foreground">Cada parroquia queda aislada con su propio administrador, períodos y recursos.</p>
        </div>
        <PrimaryButton type="button" onClick={() => setOpen(true)}>
          <ShieldPlus className="size-4" />
          Nueva parroquia
        </PrimaryButton>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <AppCard><p className="text-sm text-muted-foreground">Parroquias activas</p><p className="mt-1 text-2xl font-semibold">{parishes.filter((parish) => parish.active).length}</p></AppCard>
        <AppCard><p className="text-sm text-muted-foreground">Admins asignados</p><p className="mt-1 text-2xl font-semibold">{parishes.filter((parish) => parish.adminName).length}</p></AppCard>
        <AppCard><p className="text-sm text-muted-foreground">Sin admin</p><p className="mt-1 text-2xl font-semibold">{parishes.filter((parish) => !parish.adminName).length}</p></AppCard>
      </div>

      {parishes.length === 0 ? (
        <EmptyState title="Sin parroquias" description="Crea la primera parroquia para asignarle un administrador." icon={Building2} />
      ) : (
        <AppCard title="Listado" description="Cada parroquia tendrá sus usuarios y datos separados del resto.">
          <div className="divide-y divide-border/70">
            {parishes.map((parish) => (
              <div key={parish.id} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-foreground">{parish.name}</p>
                    <Badge variant={parish.active ? 'success' : 'outline'}>{parish.active ? 'Activa' : 'Inactiva'}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{parish.city || 'Ciudad no definida'}</p>
                  <p className="text-xs text-muted-foreground">Admin: {parish.adminName ? `${parish.adminName} (@${parish.adminUsername})` : 'Pendiente'}</p>
                </div>
              </div>
            ))}
          </div>
        </AppCard>
      )}

      <Modal
        open={open}
        onOpenChange={setOpen}
        variant="full-screen"
        title="Nueva parroquia"
        description="Se creará la parroquia y su administrador inicial con la clave que definas aquí."
        footer={null}
      >
        <form
          className="mx-auto max-w-4xl space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            try {
              await createParishWithAdmin({
                name: values.name,
                city: values.city,
                adminFullName: values.adminFullName,
                adminUsername: values.adminUsername,
                adminPassword: values.adminPassword,
              })
              const copied = await copyPasswordToClipboard(values.adminPassword)
              toast.success(copied
                ? 'Parroquia creada. La clave del administrador fue copiada al portapapeles.'
                : 'Parroquia creada con su administrador inicial.')
              form.reset()
              setShowAdminPassword(false)
              setShowConfirmAdminPassword(false)
              setOpen(false)
            } catch (error) {
              toast.error(error instanceof Error ? error.message : 'No fue posible crear la parroquia.')
            }
          })}
        >
          <AppInput label="Nombre de la parroquia" error={form.formState.errors.name?.message} {...form.register('name')} />
          <AppInput label="Ciudad" error={form.formState.errors.city?.message} {...form.register('city')} />
          <AppInput label="Nombre del administrador" error={form.formState.errors.adminFullName?.message} {...form.register('adminFullName')} />
          <AppInput label="Usuario del administrador" error={form.formState.errors.adminUsername?.message} {...form.register('adminUsername')} />
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="adminPassword">Clave del administrador</Label>
              <SecondaryButton type="button" size="sm" onClick={handleGeneratePassword}>
                <RefreshCw className="size-4" />
                Generar
              </SecondaryButton>
            </div>
            <div className="relative">
              <Input
                id="adminPassword"
                type={showAdminPassword ? 'text' : 'password'}
                className="pr-24"
                {...form.register('adminPassword')}
              />
              <div className="absolute inset-y-0 right-2 flex items-center gap-1">
                <SecondaryButton
                  type="button"
                  size="sm"
                  className="min-h-8 px-2"
                  onClick={() => setShowAdminPassword((current) => !current)}
                  aria-label={showAdminPassword ? 'Ocultar clave' : 'Mostrar clave'}
                >
                  {showAdminPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </SecondaryButton>
                <SecondaryButton
                  type="button"
                  size="sm"
                  className="min-h-8 px-2"
                  onClick={async () => {
                    const password = form.getValues('adminPassword')

                    if (!password) {
                      toast.error('Primero ingresa o genera una clave.')
                      return
                    }

                    const copied = await copyPasswordToClipboard(password)
                    if (copied) {
                      toast.success('Clave copiada al portapapeles.')
                      return
                    }

                    toast.error('No fue posible copiar la clave.')
                  }}
                  aria-label="Copiar clave"
                >
                  <Copy className="size-4" />
                </SecondaryButton>
              </div>
            </div>
            {form.formState.errors.adminPassword?.message ? <span className="text-[11px] text-destructive">{form.formState.errors.adminPassword.message}</span> : <span className="text-[11px] text-muted-foreground">Usa una clave segura o genera una automáticamente.</span>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmAdminPassword">Confirmar clave</Label>
            <div className="relative">
              <Input
                id="confirmAdminPassword"
                type={showConfirmAdminPassword ? 'text' : 'password'}
                className="pr-14"
                {...form.register('confirmAdminPassword')}
              />
              <div className="absolute inset-y-0 right-2 flex items-center">
                <SecondaryButton
                  type="button"
                  size="sm"
                  className="min-h-8 px-2"
                  onClick={() => setShowConfirmAdminPassword((current) => !current)}
                  aria-label={showConfirmAdminPassword ? 'Ocultar confirmacion de clave' : 'Mostrar confirmacion de clave'}
                >
                  {showConfirmAdminPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </SecondaryButton>
              </div>
            </div>
            {form.formState.errors.confirmAdminPassword?.message ? <span className="text-[11px] text-destructive">{form.formState.errors.confirmAdminPassword.message}</span> : null}
          </div>
          <div className="flex justify-end gap-2">
            <SecondaryButton type="button" onClick={() => setOpen(false)}>Cancelar</SecondaryButton>
            <PrimaryButton type="submit" disabled={form.formState.isSubmitting}>Crear parroquia</PrimaryButton>
          </div>
        </form>
      </Modal>
    </div>
  )
}
