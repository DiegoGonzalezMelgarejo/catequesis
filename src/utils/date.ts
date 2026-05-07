import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export function formatDate(value?: string, pattern = 'dd MMM yyyy') {
  if (!value) {
    return 'Sin fecha'
  }

  return format(parseISO(value), pattern, { locale: es })
}

export function formatRelativeDate(value?: string) {
  if (!value) {
    return 'Sin registro'
  }

  return formatDistanceToNow(parseISO(value), { addSuffix: true, locale: es })
}

export function getTodayInputValue() {
  return format(new Date(), 'yyyy-MM-dd')
}

export function calculateAge(birthDate: string) {
  const birth = new Date(birthDate)
  const today = new Date()

  let age = today.getFullYear() - birth.getFullYear()
  const monthDifference = today.getMonth() - birth.getMonth()

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < birth.getDate())
  ) {
    age -= 1
  }

  return age
}

export function formatDateTime(value?: string) {
  if (!value) {
    return 'Sin registro'
  }

  return format(parseISO(value), 'dd MMM yyyy, p', { locale: es })
}
