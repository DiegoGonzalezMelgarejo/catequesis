import { initializeApp } from 'firebase/app'
import {
  initializeFirestore,
  memoryLocalCache,
} from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyBlNH_ciFhJu1I8YeEZOS5jIw0YbL54Euw',
  authDomain: 'catequesis-db349.firebaseapp.com',
  projectId: 'catequesis-db349',
  storageBucket: 'catequesis-db349.firebasestorage.app',
  messagingSenderId: '254979740774',
  appId: '1:254979740774:web:d7fccf31c22e70847a09a7',
}

export const firebaseApp = initializeApp(firebaseConfig)

export const firestore = initializeFirestore(firebaseApp, {
  localCache: memoryLocalCache(),
})

export const firestoreCollections = {
  parishes: 'parishes',
  users: 'users',
  annualPeriods: 'annual_periods',
  groups: 'groups',
  userGroups: 'user_groups',
  students: 'students',
  sacraments: 'sacraments',
  studentSacraments: 'student_sacraments',
  sacramentChecklists: 'sacrament_checklists',
  checklistCatalog: 'checklist_catalog',
  documentRequirements: 'document_requirements',
  studentDocumentProgress: 'student_document_progress',
  studentChecklistProgress: 'student_checklist_progress',
  guardians: 'guardians',
  attendanceSessions: 'attendance_sessions',
  attendanceRecords: 'attendance_records',
  activities: 'activities',
  activityGrades: 'activity_grades',
  settings: 'settings',
} as const

export type FirestoreCollectionKey = keyof typeof firestoreCollections
