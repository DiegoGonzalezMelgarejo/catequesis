export const DEFAULT_PARISH_ID = 'parish-local-default'
export const DEFAULT_SEED_VERSION = '1'

export const ROLES = ['ADMIN', 'CATECHIST'] as const
export type Role = (typeof ROLES)[number]

export const ATTENDANCE_STATUSES = ['PRESENTE', 'AUSENTE', 'JUSTIFICADO'] as const
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number]

export const ACTIVITY_TYPES = [
  'tarea',
  'taller',
  'oracion',
  'evaluacion',
  'participacion',
  'actividad-clase',
] as const
export type ActivityType = (typeof ACTIVITY_TYPES)[number]

export const SACRAMENT_NAMES = [
  'Bautismo',
  'Primera Comunion',
  'Confirmacion',
  'Reconciliacion',
] as const
export type SacramentName = (typeof SACRAMENT_NAMES)[number]

export type SyncStatus = 'local' | 'synced' | 'pending'
export type AlertSeverity = 'high' | 'medium' | 'low'

export interface SyncMeta {
  parishId: string
  syncStatus: SyncStatus
  externalId?: string | null
}

export interface TimestampedEntity {
  createdAt: string
  updatedAt: string
}

export interface User extends SyncMeta, TimestampedEntity {
  id: string
  fullName: string
  username: string
  password: string
  role: Role
  phone?: string
  email?: string
  active: boolean
  searchTokens?: string[]
}

export interface Group extends SyncMeta, TimestampedEntity {
  id: string
  name: string
  description?: string
  schedule?: string
  active: boolean
  searchTokens?: string[]
}

export interface UserGroup extends SyncMeta, TimestampedEntity {
  id: string
  userId: string
  groupId: string
}

export interface Student extends SyncMeta, TimestampedEntity {
  id: string
  firstName: string
  lastName: string
  birthDate: string
  observations?: string
  active: boolean
  groupId: string
  searchTokens?: string[]
}

export interface Sacrament extends SyncMeta, TimestampedEntity {
  id: string
  name: SacramentName
  active: boolean
}

export interface StudentSacrament extends SyncMeta, TimestampedEntity {
  id: string
  studentId: string
  sacramentId: string
}

export interface Guardian extends SyncMeta, TimestampedEntity {
  id: string
  studentId: string
  name: string
  relationship: string
  phone?: string
  whatsapp?: string
  email?: string
  isPrimary: boolean
}

export interface AttendanceSession extends SyncMeta, TimestampedEntity {
  id: string
  groupId: string
  date: string
  notes?: string
  createdBy: string
}

export interface AttendanceRecord extends SyncMeta, TimestampedEntity {
  id: string
  sessionId: string
  studentId: string
  status: AttendanceStatus
  observations?: string
}

export interface Activity extends SyncMeta, TimestampedEntity {
  id: string
  groupId: string
  title: string
  description?: string
  date: string
  maxGrade: number
  type: ActivityType
  active: boolean
  createdBy: string
}

export interface ActivityGrade extends SyncMeta, TimestampedEntity {
  id: string
  activityId: string
  studentId: string
  grade: number
  observations?: string
}

export interface Setting extends TimestampedEntity {
  key: string
  value: string
}

export interface SelectOption {
  label: string
  value: string
  description?: string
}

export interface AlertItem {
  id: string
  title: string
  description: string
  severity: AlertSeverity
  groupId?: string
  studentId?: string
  groupName?: string
  studentName?: string
}
