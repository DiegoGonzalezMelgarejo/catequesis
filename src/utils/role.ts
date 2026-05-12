import type { Role } from '@/types/models'

export function formatRoleLabel(role: Role) {
  if (role === 'SUPER_ADMIN') {
    return 'SUPER ADMIN'
  }

  if (role === 'ADMIN') {
    return 'ADMIN'
  }

  return 'CATEQUISTA'
}
