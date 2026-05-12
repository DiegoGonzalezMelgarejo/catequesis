import { BookCheck, Plus, Save, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { toast } from 'sonner'

import { AppCard } from '@/components/app/app-card'
import { AppInput } from '@/components/app/app-input'
import { Badge } from '@/components/app/badge'
import { EmptyState } from '@/components/app/empty-state'
import { PageSkeleton } from '@/components/app/page-skeleton'
import { PrimaryButton } from '@/components/app/primary-button'
import { SecondaryButton } from '@/components/app/secondary-button'
import { useAsyncData } from '@/hooks/use-async-data'
import { useAuth } from '@/hooks/use-auth'
import {
  createChecklistCatalogItem,
  getChecklistCatalog,
  saveChecklistCatalog,
  type ChecklistCatalogEntry,
} from '@/services/checklist-service'
import { cn } from '@/utils/cn'

export function ChecklistsPage() {
  const { user } = useAuth()
  const { data, loading } = useAsyncData(
    () => (user ? getChecklistCatalog() : Promise.resolve(null)),
    [user?.id],
  )
  const [items, setItems] = useState<ChecklistCatalogEntry[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!data) {
      return
    }

    setItems(data.items)
  }, [data])

  if (!user) {
    return null
  }

  if (user.role !== 'ADMIN') {
    return <Navigate to="/app/dashboard" replace />
  }

  if (loading || !data) {
    return <PageSkeleton variant="list" />
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <AppCard
        title="Checklist doctrinal"
        description="Crea cada punto una sola vez y asígnalo a uno o varios sacramentos."
        actions={
          <PrimaryButton
            type="button"
            onClick={async () => {
              try {
                setSaving(true)
                await saveChecklistCatalog(user, items)
                toast.success('Checklist doctrinal guardado.')
              } catch (error) {
                toast.error(error instanceof Error ? error.message : 'No fue posible guardar el checklist.')
              } finally {
                setSaving(false)
              }
            }}
            disabled={saving}
          >
            <Save className="size-4" />
            Guardar
          </PrimaryButton>
        }
      >
        <p className="text-sm text-muted-foreground">
          Los alumnos verán automáticamente estos puntos según los sacramentos que tengan asignados.
        </p>
      </AppCard>

      {data.sacraments.length === 0 ? (
        <EmptyState title="Sin sacramentos" description="No hay sacramentos disponibles para crear el checklist." icon={BookCheck} />
      ) : (
        <AppCard title="Puntos del checklist" description="Puedes asignar cada punto a uno o varios sacramentos.">
          <div className="space-y-4">
            {items.length === 0 ? (
              <EmptyState title="Sin puntos" description="Agrega el primer punto del checklist doctrinal." icon={BookCheck} />
            ) : (
              items.map((item, index) => (
                <div key={item.id} className="rounded-[1rem] bg-secondary/35 p-4">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <AppInput
                        label={`Punto ${index + 1}`}
                        value={item.label}
                        onChange={(event) => {
                          setItems((current) =>
                            current.map((entry) =>
                              entry.id === item.id ? { ...entry, label: event.target.value } : entry,
                            ),
                          )
                        }}
                        placeholder="Ej. Señal de la cruz"
                      />
                    </div>
                    <SecondaryButton
                      type="button"
                      size="icon"
                      className="mt-7"
                      onClick={() => {
                        setItems((current) => current.filter((entry) => entry.id !== item.id))
                      }}
                    >
                      <Trash2 className="size-4" />
                    </SecondaryButton>
                  </div>

                  <div className="mt-3 space-y-2">
                    <p className="text-sm font-medium">Aplica para</p>
                    <div className="flex flex-wrap gap-2">
                      {data.sacraments.map((sacrament) => {
                        const selected = item.sacramentIds.includes(sacrament.id)

                        return (
                          <button
                            key={sacrament.id}
                            type="button"
                            className={cn(
                              'rounded-full border px-3 py-2 text-sm font-medium transition',
                              selected
                                ? 'border-primary/20 bg-primary/10 text-primary'
                                : 'border-border/80 bg-white text-muted-foreground hover:bg-secondary/70',
                            )}
                            onClick={() => {
                              setItems((current) =>
                                current.map((entry) =>
                                  entry.id === item.id
                                    ? {
                                        ...entry,
                                        sacramentIds: selected
                                          ? entry.sacramentIds.filter((id) => id !== sacrament.id)
                                          : [...entry.sacramentIds, sacrament.id],
                                      }
                                    : entry,
                                ),
                              )
                            }}
                          >
                            {sacrament.name}
                          </button>
                        )
                      })}
                    </div>
                    {item.sacramentIds.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {item.sacramentIds.map((sacramentId) => {
                          const sacramentName = data.sacraments.find((entry) => entry.id === sacramentId)?.name
                          return sacramentName ? <Badge key={sacramentId} variant="secondary">{sacramentName}</Badge> : null
                        })}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))
            )}

            <SecondaryButton
              type="button"
              onClick={() => {
                setItems((current) => [...current, createChecklistCatalogItem()])
              }}
            >
              <Plus className="size-4" />
              Agregar punto
            </SecondaryButton>
          </div>
        </AppCard>
      )}
    </div>
  )
}
