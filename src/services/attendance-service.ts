import {
  deleteDocuments,
  getDocumentsByField,
  getDocumentsByFieldIn,
  listDocuments,
  putDocument,
  putDocuments,
} from '@/database/firestore-repository'
import { notifyDataChanged } from '@/store/data-store'
import type { AttendanceRecord, AttendanceStatus } from '@/types/models'
import { createId, createLocalMeta } from '@/utils/entity'

export type AttendanceInputRecord = {
  studentId: string
  status: AttendanceStatus
  observations?: string
}

export type AttendanceHistoryItem = {
  id: string
  date: string
  notes?: string
  counts: {
    presentes: number
    ausentes: number
    justificados: number
  }
  records: Array<{
    studentId: string
    studentName: string
    status: AttendanceStatus
    observations?: string
  }>
}

export async function getStudentsByGroup(groupId: string) {
  const students = await getDocumentsByField<{
    id: string
    firstName: string
    lastName: string
    active: boolean
    groupId: string
  }>('students', 'groupId', groupId)

  return students
    .sort((left, right) => left.lastName.localeCompare(right.lastName, 'es'))
}

export async function getAttendanceSessionDetail(groupId: string, date: string) {
  const sessions = await getDocumentsByField<{
    id: string
    groupId: string
    date: string
    notes?: string
    createdBy: string
    createdAt: string
    updatedAt: string
    parishId: string
    syncStatus: 'synced' | 'local' | 'pending'
  }>('attendanceSessions', 'groupId', groupId)
  const session = sessions.find((entry) => entry.groupId === groupId && entry.date === date)

  if (!session) {
    return {
      session: null,
      records: new Map<string, AttendanceRecord>(),
    }
  }

  const records = (await listDocuments<AttendanceRecord>('attendanceRecords')).filter(
    (record) => record.sessionId === session.id,
  )

  return {
    session,
    records: new Map(records.map((record) => [record.studentId, record])),
  }
}

export async function getAttendanceHistoryByGroup(groupId: string) {
  const sessions = (await getDocumentsByField<{
    id: string
    groupId: string
    date: string
    notes?: string
  }>('attendanceSessions', 'groupId', groupId))
    .sort((left, right) => right.date.localeCompare(left.date))

  if (sessions.length === 0) {
    return [] as AttendanceHistoryItem[]
  }

  const sessionIds = sessions.map((session) => session.id)
  const records = await getDocumentsByFieldIn<AttendanceRecord>('attendanceRecords', 'sessionId', sessionIds)
  const studentIds = [...new Set(records.map((record) => record.studentId))]
  const students = await getDocumentsByFieldIn<{
    id: string
    firstName: string
    lastName: string
  }>('students', '__name__', studentIds)
  const studentMap = new Map(
    students.map((student) => [student.id, `${student.firstName} ${student.lastName}`]),
  )

  return sessions.map((session) => {
    const sessionRecords = records
      .filter((record) => record.sessionId === session.id)
      .map((record) => ({
        studentId: record.studentId,
        studentName: studentMap.get(record.studentId) ?? 'Alumno',
        status: record.status,
        observations: record.observations,
      }))
      .sort((left, right) => left.studentName.localeCompare(right.studentName, 'es'))

    return {
      id: session.id,
      date: session.date,
      notes: session.notes,
      counts: {
        presentes: sessionRecords.filter((record) => record.status === 'PRESENTE').length,
        ausentes: sessionRecords.filter((record) => record.status === 'AUSENTE').length,
        justificados: sessionRecords.filter((record) => record.status === 'JUSTIFICADO').length,
      },
      records: sessionRecords,
    } satisfies AttendanceHistoryItem
  })
}

export async function saveAttendanceSession(payload: {
  groupId: string
  date: string
  notes?: string
  createdBy: string
  records: AttendanceInputRecord[]
}) {
  const [sessions, allRecords] = await Promise.all([
    listDocuments<{
      id: string
      groupId: string
      date: string
      notes?: string
      createdBy: string
      createdAt: string
      updatedAt: string
      parishId: string
      syncStatus: 'synced' | 'local' | 'pending'
    }>('attendanceSessions'),
    listDocuments<AttendanceRecord>('attendanceRecords'),
  ])
  const existingSession = sessions.find(
    (session) => session.groupId === payload.groupId && session.date === payload.date,
  )

  const sessionId = existingSession?.id ?? createId()
  const existingRecordIds = allRecords
    .filter((record) => record.sessionId === sessionId)
    .map((record) => record.id)

  await putDocument('attendanceSessions', {
    id: sessionId,
    groupId: payload.groupId,
    date: payload.date,
    notes: payload.notes?.trim(),
    createdBy: payload.createdBy,
    ...createLocalMeta(existingSession?.createdAt, 'synced'),
  })

  await deleteDocuments('attendanceRecords', existingRecordIds)

  if (payload.records.length > 0) {
    await putDocuments(
      'attendanceRecords',
      payload.records.map((record) => ({
        id: createId(),
        sessionId,
        studentId: record.studentId,
        status: record.status,
        observations: record.observations?.trim(),
        ...createLocalMeta(undefined, 'synced'),
      })),
    )
  }

  notifyDataChanged()
}
