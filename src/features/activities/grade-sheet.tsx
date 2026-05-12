import { LoaderCircle, MessageSquareMore } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { AppCard } from '@/components/app/app-card'
import { Badge } from '@/components/app/badge'
import { EmptyState } from '@/components/app/empty-state'
import { Modal } from '@/components/app/modal'
import { PaginationControls } from '@/components/app/pagination-controls'
import { PrimaryButton } from '@/components/app/primary-button'
import { SecondaryButton } from '@/components/app/secondary-button'
import { SearchInput } from '@/components/app/search-input'
import { Input } from '@/components/ui/input'
import { useAsyncData } from '@/hooks/use-async-data'
import { getActivityGradeSheet, saveActivityGrades } from '@/services/activity-service'
import type { User } from '@/types/models'

type GradeSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  activityId?: string | null
  user: User
}

type GradeState = Record<string, { grade: string; observations: string }>

export function GradeSheet({ open, onOpenChange, activityId, user }: GradeSheetProps) {
  const [gradeState, setGradeState] = useState<GradeState>({})
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [expandedObservationStudentId, setExpandedObservationStudentId] = useState<string | null>(null)

  const { data: sheet } = useAsyncData(
    () => (activityId ? getActivityGradeSheet(user, activityId) : Promise.resolve(null)),
    [activityId, user.id],
  )

  useEffect(() => {
    if (!sheet) {
      setGradeState({})
      return
    }

    const initialState = Object.fromEntries(
      sheet.students.map((student) => {
        const grade = sheet.grades.get(student.id)
        return [student.id, { grade: grade ? String(grade.grade) : '', observations: grade?.observations ?? '' }]
      }),
    )
    setGradeState(initialState)
  }, [sheet])

  useEffect(() => {
    setPage(1)
    setExpandedObservationStudentId(null)
  }, [search, activityId])

  const filteredStudents = useMemo(() => {
    if (!sheet) {
      return []
    }

    return sheet.students.filter((student) =>
      `${student.firstName} ${student.lastName}`.toLowerCase().includes(search.toLowerCase()),
    )
  }, [search, sheet])

  const pagedStudents = useMemo(
    () => filteredStudents.slice((page - 1) * 20, page * 20),
    [filteredStudents, page],
  )

  async function handleSave() {
    if (!activityId || !sheet) {
      return
    }

    try {
      setSaving(true)
      await saveActivityGrades(
        activityId,
        sheet.students.map((student) => ({
          studentId: student.id,
          grade: gradeState[student.id]?.grade ? Number(gradeState[student.id].grade) : undefined,
          observations: gradeState[student.id]?.observations,
        })),
      )
      toast.success('Notas actualizadas.')
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No fue posible guardar las notas.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      variant="full-screen"
      title="Registrar notas"
      description={sheet ? `${sheet.activity.title} • Nota maxima ${sheet.activity.maxGrade}` : 'Cargando actividad'}
      footer={
        <>
          <SecondaryButton type="button" onClick={() => onOpenChange(false)}>
            Cerrar
          </SecondaryButton>
          <PrimaryButton type="button" onClick={handleSave} disabled={!sheet || saving}>
            {saving ? <LoaderCircle className="size-4 animate-spin" /> : null}
            Guardar notas
          </PrimaryButton>
        </>
      }
    >
      {!sheet ? (
        <div className="py-10 text-center text-sm text-muted-foreground">Cargando informacion...</div>
      ) : sheet.students.length === 0 ? (
        <EmptyState title="Sin alumnos activos" description="No hay alumnos activos en este grupo." icon={LoaderCircle} />
      ) : (
        <div className="mx-auto max-w-5xl space-y-4 lg:space-y-5">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar alumno" />
          <AppCard
            title="Carga rápida de notas"
            description="Vista compacta para grupos numerosos. Registra primero la nota y abre observación solo cuando haga falta."
          >
            <div className="space-y-2">
              {pagedStudents.map((student) => {
                const observationExpanded = expandedObservationStudentId === student.id
                const hasObservation = Boolean(gradeState[student.id]?.observations)

                return (
                  <div key={student.id} className="rounded-[1.25rem] border border-white/70 bg-secondary/25 p-3">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{student.firstName} {student.lastName}</p>
                        <p className="text-xs text-muted-foreground">Máximo {sheet.activity.maxGrade}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.1"
                          max={sheet.activity.maxGrade}
                          value={gradeState[student.id]?.grade ?? ''}
                          onChange={(event) =>
                            setGradeState((current) => ({
                              ...current,
                              [student.id]: {
                                grade: event.target.value,
                                observations: current[student.id]?.observations ?? '',
                              },
                            }))
                          }
                          className="h-10 w-24 text-center"
                          placeholder="Nota"
                        />
                        <Badge variant="secondary">/ {sheet.activity.maxGrade}</Badge>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <SecondaryButton
                        type="button"
                        size="sm"
                        onClick={() =>
                          setExpandedObservationStudentId((current) =>
                            current === student.id ? null : student.id,
                          )
                        }
                      >
                        <MessageSquareMore className="size-4" />
                        {observationExpanded ? 'Ocultar observación' : 'Observación'}
                      </SecondaryButton>
                      <span className="text-xs text-muted-foreground">
                        {hasObservation ? 'Con observación' : 'Sin observación'}
                      </span>
                    </div>

                    {observationExpanded ? (
                      <Input
                        className="mt-3 h-10"
                        placeholder="Escribe una observación para esta nota"
                        value={gradeState[student.id]?.observations ?? ''}
                        onChange={(event) =>
                          setGradeState((current) => ({
                            ...current,
                            [student.id]: {
                              grade: current[student.id]?.grade ?? '',
                              observations: event.target.value,
                            },
                          }))
                        }
                      />
                    ) : null}
                  </div>
                )
              })}
            </div>

            <div className="mt-4">
              <PaginationControls
                page={page}
                pageSize={20}
                hasNext={page * 20 < filteredStudents.length}
                hasPrevious={page > 1}
                label="Alumnos para notas"
                onNext={() => setPage((current) => current + 1)}
                onPrevious={() => setPage((current) => Math.max(1, current - 1))}
              />
            </div>
          </AppCard>
        </div>
      )}
    </Modal>
  )
}
