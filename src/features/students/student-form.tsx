import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { AppInput } from '@/components/app/app-input'
import { Badge } from '@/components/app/badge'
import { FormStepIndicator } from '@/components/app/form-step-indicator'
import { Modal } from '@/components/app/modal'
import { PrimaryButton } from '@/components/app/primary-button'
import { SecondaryButton } from '@/components/app/secondary-button'
import { useActiveYear } from '@/hooks/use-active-year'
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
  birthDate: z.string().optional(),
  groupId: z.string().min(1, 'Selecciona el grupo.'),
  observations: z.string().optional(),
  sacramentIds: z.array(z.string()),
  guardians: z.array(guardianSchema),
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
  const { activeYear } = useActiveYear()
  const [currentStep, setCurrentStep] = useState(0)
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
    setCurrentStep(0)
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
  const selectedGroupId = form.watch('groupId')
  const steps = ['Datos', 'Sacramentos', 'Acudientes']
  const submitForm = form.handleSubmit(onSubmit)
  const selectedGroup = groups.find((group) => group.value === selectedGroupId)

  async function goNextStep() {
    if (currentStep === 0) {
        const valid = await form.trigger(['firstName', 'lastName', 'groupId'])
      if (!valid) {
        return
      }
    }

    setCurrentStep((step) => Math.min(step + 1, steps.length - 1))
  }

  async function onSubmit(values: StudentFormValues) {
    try {
      await saveStudent({
        id: student?.id,
        firstName: values.firstName,
        lastName: values.lastName,
        birthDate: values.birthDate,
        activeYear: activeYear ?? undefined,
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
      variant="full-screen"
      title={student ? 'Editar alumno' : 'Registrar alumno'}
      description="Centraliza datos personales, sacramentos y acudientes en un solo formulario."
      footer={
        <>
          <SecondaryButton type="button" onClick={() => onOpenChange(false)}>
            Cancelar
          </SecondaryButton>
          {currentStep > 0 ? (
            <SecondaryButton type="button" onClick={() => setCurrentStep((step) => Math.max(0, step - 1))}>
              Anterior
            </SecondaryButton>
          ) : null}
          {currentStep < steps.length - 1 ? (
            <PrimaryButton type="button" onClick={() => void goNextStep()}>
              Siguiente
            </PrimaryButton>
          ) : (
            <PrimaryButton type="button" onClick={() => void submitForm()} disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : null}
              Guardar
            </PrimaryButton>
          )}
        </>
      }
    >
      <form id="student-form" className="mx-auto max-w-5xl space-y-5 lg:space-y-6" onSubmit={submitForm}>
        <FormStepIndicator steps={steps} currentStep={currentStep} onStepChange={setCurrentStep} />

        {currentStep === 0 ? (
          <div className="space-y-5">
            <div className="rounded-[1rem] bg-secondary/35 p-4 sm:p-5 lg:p-6">
              <div className="mb-4">
                <p className="font-medium">Datos personales</p>
                <p className="text-sm text-muted-foreground">Registra identidad básica y el grupo al que pertenece el alumno.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <AppInput label="Nombres" error={form.formState.errors.firstName?.message} {...form.register('firstName')} />
                <AppInput label="Apellidos" error={form.formState.errors.lastName?.message} {...form.register('lastName')} />
                <AppInput label="Fecha de nacimiento" type="date" hint="Opcional." error={form.formState.errors.birthDate?.message} {...form.register('birthDate')} />
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium">Grupo</span>
                  <select
                    className="h-11 rounded-[0.875rem] border border-input bg-white px-4 text-sm"
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
                    <span className="text-[11px] text-destructive">{form.formState.errors.groupId.message}</span>
                  ) : null}
                </label>
                <div className="md:col-span-2 xl:col-span-3">
                  <AppInput label="Observaciones" hint="Opcional. Añade información pastoral, médica o de acompañamiento." {...form.register('observations')} />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {birthDate ? (
                <Badge variant="secondary">Edad calculada: {calculateAge(birthDate)} años</Badge>
              ) : null}
              {selectedGroup?.description ? (
                <Badge variant="outline">{selectedGroup.description}</Badge>
              ) : null}
            </div>
          </div>
        ) : null}

        {currentStep === 1 ? (
          <div className="space-y-4 rounded-[1rem] bg-secondary/35 p-4 sm:p-5 lg:p-6">
            <div className="space-y-1">
              <p className="text-sm font-medium">Sacramentos recibidos</p>
              <p className="text-sm text-muted-foreground">
                Marca los sacramentos ya registrados para este alumno.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {sacraments.map((sacrament) => {
                const selected = selectedSacraments.includes(sacrament.value)
                return (
                  <Button
                    key={sacrament.value}
                    type="button"
                    variant={selected ? 'default' : 'outline'}
                      className={cn('min-h-12 justify-start rounded-[0.9rem] text-left', !selected && 'bg-white')}
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
          </div>
        ) : null}

        {currentStep === 2 ? (
          <div className="space-y-4">
            {[0, 1].map((index) => (
              <div key={index} className="rounded-[1rem] bg-secondary/35 p-4 sm:p-5 lg:p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">Acudiente {index + 1}</p>
                     <p className="text-sm text-muted-foreground">Opcional. Puedes registrar uno o dos acudientes.</p>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" {...form.register(`guardians.${index}.isPrimary`)} />
                    Principal
                  </label>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <AppInput label="Nombre" {...form.register(`guardians.${index}.name`)} />
                  <AppInput label="Parentesco" {...form.register(`guardians.${index}.relationship`)} />
                  <AppInput label="Telefono" {...form.register(`guardians.${index}.phone`)} />
                  <AppInput label="WhatsApp" {...form.register(`guardians.${index}.whatsapp`)} />
                  <div className="md:col-span-2 xl:col-span-3">
                    <AppInput label="Correo" type="email" {...form.register(`guardians.${index}.email`)} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </form>
    </Modal>
  )
}
