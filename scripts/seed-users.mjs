import { initializeApp } from 'firebase/app'
import { collection, doc, getDoc, getDocs, getFirestore, limit, query, setDoc, where } from 'firebase/firestore'
import { webcrypto } from 'node:crypto'

const firebaseConfig = {
  apiKey: 'AIzaSyBlNH_ciFhJu1I8YeEZOS5jIw0YbL54Euw',
  authDomain: 'catequesis-db349.firebaseapp.com',
  projectId: 'catequesis-db349',
  storageBucket: 'catequesis-db349.firebasestorage.app',
  messagingSenderId: '254979740774',
  appId: '1:254979740774:web:d7fccf31c22e70847a09a7',
}

const DEFAULT_PARISH_ID = 'parish-local-default'
const PLATFORM_PARISH_ID = 'platform-root'
const DEFAULT_SEED_VERSION = '1'

function toHex(buffer) {
  return [...new Uint8Array(buffer)].map((value) => value.toString(16).padStart(2, '0')).join('')
}

async function hashPassword(password, salt) {
  const payload = new TextEncoder().encode(`${salt}:${password}`)
  const digest = await webcrypto.subtle.digest('SHA-256', payload)
  return `sha256:${toHex(digest)}`
}

async function findUserByUsername(firestore, username) {
  const usersRef = collection(firestore, 'users')
  const snapshot = await getDocs(query(usersRef, where('username', '==', username), limit(1)))
  return snapshot.docs[0] ?? null
}

async function ensureParish(firestore) {
  const parishRef = doc(firestore, 'parishes', DEFAULT_PARISH_ID)
  const snapshot = await getDoc(parishRef)

  if (snapshot.exists()) {
    return false
  }

  const timestamp = new Date().toISOString()
  await setDoc(parishRef, {
    name: 'Parroquia Central',
    city: 'Local',
    active: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  })

  return true
}

async function ensureUser(firestore, definition) {
  const existingUser = await findUserByUsername(firestore, definition.username)

  if (existingUser) {
    return false
  }

  const timestamp = new Date().toISOString()
  await setDoc(doc(firestore, 'users', definition.id), {
    fullName: definition.fullName,
    username: definition.username,
    password: await hashPassword(definition.password, definition.id),
    role: definition.role,
    active: true,
    mustChangePassword: true,
    passwordUpdatedAt: timestamp,
    searchTokens: [definition.fullName.toLowerCase(), definition.username.toLowerCase()],
    parishId: definition.parishId,
    syncStatus: 'synced',
    createdAt: timestamp,
    updatedAt: timestamp,
  })

  return true
}

async function main() {
  const app = initializeApp(firebaseConfig)
  const firestore = getFirestore(app)

  const createdParish = await ensureParish(firestore)
  const createdSuperAdmin = await ensureUser(firestore, {
    id: 'seed-super-admin',
    fullName: 'Super administrador',
    username: 'superadmin',
    password: 'superadmin123',
    role: 'SUPER_ADMIN',
    parishId: PLATFORM_PARISH_ID,
  })

  const timestamp = new Date().toISOString()
  await setDoc(doc(firestore, 'settings', 'seed-version'), {
    value: DEFAULT_SEED_VERSION,
    createdAt: timestamp,
    updatedAt: timestamp,
  }, { merge: true })

  console.info('Seed completado', {
    createdParish,
    createdSuperAdmin,
  })
}

main().catch((error) => {
  console.error('No se pudo ejecutar el seed de usuarios.', error)
  process.exitCode = 1
})
