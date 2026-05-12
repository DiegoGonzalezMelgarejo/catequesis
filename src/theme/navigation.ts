import {
  Activity,
  Bell,
  BookUser,
  ClipboardCheck,
  FileCheck,
  Landmark,
  LayoutDashboard,
  Layers3,
  LibraryBig,
  Menu,
  ShieldCheck,
  Users,
} from 'lucide-react'

import type { Role } from '@/types/models'

export type NavigationItem = {
  to: string
  label: string
  icon: typeof LayoutDashboard
  highlight?: boolean
}

export const navigationByRole: Record<Role, NavigationItem[]> = {
  SUPER_ADMIN: [
    { to: '/app/dashboard', label: 'Inicio', icon: LayoutDashboard },
    { to: '/app/parishes', label: 'Parroquias', icon: Landmark, highlight: true },
    { to: '/app/more', label: 'Mas', icon: Menu },
  ],
  ADMIN: [
    { to: '/app/dashboard', label: 'Inicio', icon: LayoutDashboard },
    { to: '/app/catechists', label: 'Catequistas', icon: Users },
    { to: '/app/groups', label: 'Grupos', icon: Layers3 },
    { to: '/app/students', label: 'Alumnos', icon: BookUser },
    { to: '/app/attendance', label: 'Asistencia', icon: ClipboardCheck, highlight: true },
    { to: '/app/more', label: 'Mas', icon: Menu },
  ],
  CATECHIST: [
    { to: '/app/dashboard', label: 'Inicio', icon: LayoutDashboard },
    { to: '/app/groups', label: 'Grupos', icon: Layers3 },
    { to: '/app/attendance', label: 'Asistencia', icon: ClipboardCheck, highlight: true },
    { to: '/app/activities', label: 'Actividades', icon: Activity },
    { to: '/app/more', label: 'Mas', icon: Menu },
  ],
}

export const secondaryNavigationByRole: Record<Role, NavigationItem[]> = {
  SUPER_ADMIN: [
    { to: '/app/parishes', label: 'Parroquias', icon: Landmark },
  ],
  ADMIN: [
    { to: '/app/alerts', label: 'Alertas', icon: Bell },
    { to: '/app/reports', label: 'Reportes', icon: LibraryBig },
    { to: '/app/checklists', label: 'Checklist', icon: ShieldCheck },
    { to: '/app/documents', label: 'Documentos', icon: FileCheck },
  ],
  CATECHIST: [
    { to: '/app/alerts', label: 'Alertas', icon: Bell },
    { to: '/app/reports', label: 'Reportes', icon: LibraryBig },
  ],
}

export const quickFabByRole: Record<Role, NavigationItem> = {
  SUPER_ADMIN: { to: '/app/parishes', label: 'Parroquias', icon: Landmark },
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
    match: /\/app\/parishes/,
    title: 'Parroquias',
    description: 'Crea parroquias y asigna el administrador inicial de cada una.',
  },
  {
    match: /\/app\/catechists\/.+/,
    title: 'Detalle del catequista',
    description: 'Consulta sus grupos asignados y los alumnos vinculados.',
  },
  {
    match: /\/app\/catechists/,
    title: 'Catequistas',
    description: 'Crea, edita y administra catequistas y sus accesos.',
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
    description: 'Marca la asistencia del grupo y guarda los cambios del encuentro.',
  },
  {
    match: /\/app\/attendance/,
    title: 'Asistencia',
    description: 'Busca una fecha y abre la asistencia que necesitas revisar.',
  },
  {
    match: /\/app\/activities/,
    title: 'Actividades y notas',
    description: 'Planea actividades y registra calificaciones.',
  },
  {
    match: /\/app\/more/,
    title: 'Mas herramientas',
    description: 'Accede a modulos secundarios y tareas de administracion.',
  },
  {
    match: /\/app\/checklists/,
    title: 'Checklist doctrinal',
    description: 'Define qué deben saber los alumnos para cada sacramento.',
  },
  {
    match: /\/app\/documents/,
    title: 'Documentos requisito',
    description: 'Define qué documentos debe entregar el alumno para cada sacramento.',
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
