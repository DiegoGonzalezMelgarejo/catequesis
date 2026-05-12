import { listDocuments, putDocument } from '@/database/firestore-repository'
import { getSessionScope } from '@/services/session-service'
import { notifyDataChanged } from '@/store/data-store'
import type { AnnualPeriod } from '@/types/models'
import { createLocalMeta } from '@/utils/entity'
import { sortYearsDescending } from '@/utils/year'

export const MIN_WORK_YEAR = 2020
export const MAX_WORK_YEAR = 2100

function normalizeYear(year: number) {
  if (!Number.isInteger(year) || year < MIN_WORK_YEAR || year > MAX_WORK_YEAR) {
    throw new Error('Ingresa un año válido.')
  }

  return year
}

export async function getAvailableWorkYears() {
  const periods = await listDocuments<AnnualPeriod>('annualPeriods')
  return sortYearsDescending(periods.map((period) => period.year))
}

export async function createAnnualPeriod(input: { year: number; observations?: string }) {
  const sessionScope = getSessionScope()

  if (sessionScope?.role !== 'ADMIN') {
    throw new Error('Solo un administrador puede crear el período anual.')
  }

  const year = normalizeYear(input.year)
  const periods = await listDocuments<AnnualPeriod>('annualPeriods')

  const alreadyExists = periods.some((period) => period.year === year)

  if (alreadyExists) {
    throw new Error('Ya existe un corte anual para ese año.')
  }

  const period: AnnualPeriod = {
    id: year.toString(),
    year,
    observations: input.observations?.trim() || undefined,
    ...createLocalMeta(undefined, 'synced'),
  }

  await putDocument('annualPeriods', period)
  notifyDataChanged()

  return period
}
