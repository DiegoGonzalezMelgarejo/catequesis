import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { AppInput } from '@/components/app/app-input'
import { Badge } from '@/components/app/badge'
import { Modal } from '@/components/app/modal'
import { PrimaryButton } from '@/components/app/primary-button'
import { SecondaryButton } from '@/components/app/secondary-button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/app/tabs'
import { Button } from '@/components/ui/button'
import { saveStudent } from '@/services/student-service'
import type { SelectOption } from '@/types/models'
import { calculateAge } from '@/utils/date'
import { cn } from '@/utils/cn'

const guardianSchema = z.object({
  name: z.string(),
  relationship: z.string(),
  phone: z.string(),
  whatsapp: z.string(),
  email: z.string(),
  isPrimary: z.boolean(),
})

const schema = z.object({
  firstName: z.string().min(2, 'Ingresa los nombres.'),
  lastName: z.string().min(2, 'Ingresa los apellidos.'),
  birthDate: z.string().min(1, 'Selecciona la fecha de nacimiento.'),
  groupId: z.string().min(1, 'Selecciona el grupo.'),
  observations: z.string().optional(),
  sacramentIds: z.array(z.string()),
  guardians: z.array(guardianSchema).length(2),
})

type StudentFormValues = z.infer<typeof schema>

export type EditableStudent = {
  id: string
  firstName: string
  lastName: string
  birthDate: string
  groupId: string
  observations?: string
  sacramentIds: string[]
  guardians: Array<{
    name: string
    relationship: string
    phone?: string
    whatsapp?: string
    email?: string
    isPrimary: boolean
  }>
}

type StudentFormProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  student?: EditableStudent | null
  groups: SelectOption[]
  sacraments: SelectOption[]
}

function createEmptyGuardian(isPrimary = false) {
  return {
    name: '',
    relationship: '',
    phone: '',
    whatsapp: '',
    email: '',
    isPrimary,
  }
}

export function StudentForm({ open, onOpenChange, student, groups, sacraments }: StudentFormProps) {
  const form = useForm<StudentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: '',
      lastName: '',
      birthDate: '',
      groupId: '',
      observations: '',
      sacramentIds: [],
      guardians: [createEmptyGuardian(true), createEmptyGuardian(false)],
    },
  })

  useEffect(() => {
    form.reset({
      firstName: student?.firstName ?? '',
      lastName: student?.lastName ?? '',
      birthDate: student?.birthDate ?? '',
      groupId: student?.groupId ?? '',
      observations: student?.observations ?? '',
      sacramentIds: student?.sacramentIds ?? [],
      guardians: [
        student?.guardians[0] ?? createEmptyGuardian(true),
        student?.guardians[1] ?? createEmptyGuardian(false),
      ],
    })
  }, [form, open, student])

  const selectedSacraments = form.watch('sacramentIds')
  const birthDate = form.watch('birthDate')

  async function onSubmit(values: StudentFormValues) {
    try {
      await saveStudent({
        id: student?.id,
        firstName: values.firstName,
        lastName: values.lastName,
        birthDate: values.birthDate,
        groupId: values.groupId,
        observations: values.observations,
        sacramentIds: values.sacramentIds,
        guardians: values.guardians,
      })

      toast.success(student ? 'Alumno actualizado.' : 'Alumno registrado.')
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No fue posible guardar el alumno.')
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={student ? 'Editar alumno' : 'Registrar alumno'}
      description="Centraliza datos personales, sacramentos y acudientes en un solo formulario."
      footer={
        <>
          <SecondaryButton type="button" onClick={() => onOpenChange(false)}>
            Cancelar
          </SecondaryButton>
          <PrimaryButton type="submit" form="student-form" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : null}
            Guardar
          </PrimaryButton>
        </>
      }
    >
      <form id="student-form" onSubmit={form.handleSubmit(onSubmit)}>
        <Tabs defaultValue="data">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="data">Datos</TabsTrigger>
            <TabsTrigger value="sacraments">Sacramentos</TabsTrigger>
            <TabsTrigger value="guardians">Acudientes</TabsTrigger>
          </TabsList>

          <TabsContent value="data" className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <AppInput label="Nombres" error={form.formState.errors.firstName?.message} {...form.register('firstName')} />
              <AppInput label="Apellidos" error={form.formState.errors.lastName?.message} {...form.register('lastName')} />
              <AppInput label="Fecha de nacimiento" type="date" error={form.formState.errors.birthDate?.message} {...form.register('birthDate')} />
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">Grupo</span>
                <select
                  className="h-11 rounded-xl border border-input bg-white px-4 text-sm"
                  {...form.register('groupId')}
                >
                  <option value="">Selecciona un grupo</option>
                  {groups.map((group) => (
                    <option key={group.value} value={group.value}>
                      {group.label}
                    </option>
                  ))}
                </select>
                {form.formState.errors.groupId?.message ? (
                  <span className="text-xs text-destructive">{form.formState.errors.groupId.message}</span>
                ) : null}
              </label>
              <div className="sm:col-span-2">
                <AppInput label="Observaciones" {...form.register('observations')} />
              </div>
            </div>

            {birthDate ? (
              <Badge variant="secondary">Edad calculada: {calculateAge(birthDate)} años</Badge>
            ) : null}
          </TabsContent>

          <TabsContent value="sacraments" className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Sacramentos recibidos</p>
              <p className="text-sm text-muted-foreground">
                Marca los sacramentos ya registrados para este alumno.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {sacraments.map((sacrament) => {
                const selected = selectedSacraments.includes(sacrament.value)
                return (
                  <Button
                    key={sacrament.value}
                    type="button"
                    variant={selected ? 'default' : 'outline'}
                    className={cn('justify-start rounded-2xl', !selected && 'bg-white')}
                    onClick={() => {
                      const nextValue = selected
                        ? selectedSacraments.filter((id) => id !== sacrament.value)
                        : [...selectedSacraments, sacrament.value]
                      form.setValue('sacramentIds', nextValue, { shouldDirty: true })
                    }}
                  >
                    {sacrament.label}
                  </Button>
                )
              })}
            </div>
          </TabsContent>

          <TabsContent value="guardians" className="space-y-4">
            {[0, 1].map((index) => (
              <div key={index} className="rounded-3xl border bg-secondary/35 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">Acudiente {index + 1}</p>
                    <p className="text-sm text-muted-foreground">Puedes registrar uno o dos acudientes.</p>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" {...form.register(`guardians.${index}.isPrimary`)} />
                    Principal
                  </label>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <AppInput label="Nombre" {...form.register(`guardians.${index}.name`)} />
                  <AppInput label="Parentesco" {...form.register(`guardians.${index}.relationship`)} />
                  <AppInput label="Telefono" {...form.register(`guardians.${index}.phone`)} />
                  <AppInput label="WhatsApp" {...form.register(`guardians.${index}.whatsapp`)} />
                  <div className="sm:col-span-2">
                    <AppInput label="Correo" type="email" {...form.register(`guardians.${index}.email`)} />
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </form>
    </Modal>
  )
}
