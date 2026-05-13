import { Modal } from '@/components/app/modal'
import { YearManagementPanel } from '@/components/app/year-management-panel'
import { useActiveYear } from '@/hooks/use-active-year'
import { useAuth } from '@/hooks/use-auth'

export function ActiveYearGate() {
  const { user } = useAuth()
  const { activeYear, availableYears, loading, setActiveYear, createYearPeriod } = useActiveYear()
  const canCreate = user?.role === 'ADMIN'

  if (user?.role === 'SUPER_ADMIN' || activeYear != null) {
    return null
  }

  return (
    <Modal
      open
      onOpenChange={() => undefined}
      title="Selecciona el año de trabajo"
      description="Antes de entrar al panel, define el corte anual con el que vas a trabajar en esta sesion."
      footer={null}
    >
      <YearManagementPanel activeYear={activeYear} availableYears={availableYears} loading={loading} onSelectYear={setActiveYear} onCreateYear={createYearPeriod} requireCreation canCreate={canCreate} />
    </Modal>
  )
}
