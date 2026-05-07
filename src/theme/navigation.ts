import {
  Activity,
  Bell,
  BookUser,
  ChartColumn,
  ClipboardCheck,
  LayoutDashboard,
  Layers3,
  Users,
} from 'lucide-react'

import type { Role } from '@/types/models'

export type NavigationItem = {
  to: string
  label: string
  icon: typeof LayoutDashboard
}

export const navigationByRole: Record<Role, NavigationItem[]> = {
  ADMIN: [
    { to: '/app/dashboard', label: 'Inicio', icon: LayoutDashboard },
    { to: '/app/catechists', label: 'Catequistas', icon: Users },
    { to: '/app/groups', label: 'Grupos', icon: Layers3 },
    { to: '/app/students', label: 'Alumnos', icon: BookUser },
    { to: '/app/reports', label: 'Reportes', icon: ChartColumn },
  ],
  CATECHIST: [
    { to: '/app/dashboard', label: 'Inicio', icon: LayoutDashboard },
    { to: '/app/groups', label: 'Grupos', icon: Layers3 },
    { to: '/app/activities', label: 'Actividades', icon: Activity },
    { to: '/app/reports', label: 'Reportes', icon: ChartColumn },
    { to: '/app/alerts', label: 'Alertas', icon: Bell },
  ],
}

export const quickFabByRole: Record<Role, NavigationItem> = {
  ADMIN: { to: '/app/attendance', label: 'Asistencia', icon: ClipboardCheck },
  CATECHIST: { to: '/app/attendance', label: 'Asistencia', icon: ClipboardCheck },
}

export const pageMetadata: Array<{
  match: RegExp
  title: string
  description: string
}> = [
  {
    match: /\/app\/dashboard/,
    title: 'Panel principal',
    description: 'Resumen rapido para la jornada de catequesis.',
  },
  {
    match: /\/app\/catechists/,
    title: 'Catequistas',
    description: 'Crea, edita y asigna grupos a tu equipo.',
  },
  {
    match: /\/app\/groups\/.+/,
    title: 'Detalle del grupo',
    description: 'Consulta alumnos, asistencias y seguimiento del grupo.',
  },
  {
    match: /\/app\/groups/,
    title: 'Grupos',
    description: 'Gestiona grupos, asignaciones y estado operativo.',
  },
  {
    match: /\/app\/students\/.+/,
    title: 'Historial del alumno',
    description: 'Detalle academico, pastoral y de asistencia.',
  },
  {
    match: /\/app\/students/,
    title: 'Alumnos',
    description: 'Registro, acudientes, sacramentos y observaciones.',
  },
  {
    match: /\/app\/attendance\/session/,
    title: 'Toma de asistencia',
    description: 'Selecciona la fecha y registra o edita la asistencia del grupo.',
  },
  {
    match: /\/app\/attendance/,
    title: 'Asistencia',
    description: 'Consulta el histórico y administra las asistencias por fecha.',
  },
  {
    match: /\/app\/activities/,
    title: 'Actividades y notas',
    description: 'Planea actividades y registra calificaciones.',
  },
  {
    match: /\/app\/reports/,
    title: 'Reportes',
    description: 'Indicadores, exportacion CSV y seguimiento general.',
  },
  {
    match: /\/app\/alerts/,
    title: 'Alertas',
    description: 'Riesgos y pendientes que requieren atencion.',
  },
]
