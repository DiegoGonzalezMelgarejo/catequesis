import {
  collection,
  deleteDoc,
  type DocumentReference,
  documentId,
  type DocumentData,
  doc,
  type DocumentSnapshot,
  getDocFromCache,
  getDocFromServer,
  getDocsFromCache,
  getDocsFromServer,
  limit,
  orderBy,
  type OrderByDirection,
  query,
  type Query,
  type QuerySnapshot,
  setDoc,
  startAfter,
  type QueryDocumentSnapshot,
  type WhereFilterOp,
  where,
  writeBatch,
} from 'firebase/firestore'

import { firestore, firestoreCollections, type FirestoreCollectionKey } from '@/database/firestore'
import { getSessionScope } from '@/services/session-service'
import type { Setting } from '@/types/models'

function sanitizeForFirestore<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function getCollectionRef(collectionKey: FirestoreCollectionKey) {
  return collection(firestore, firestoreCollections[collectionKey])
}

function getDocRef(collectionKey: FirestoreCollectionKey, id: string) {
  return doc(firestore, firestoreCollections[collectionKey], id)
}

function isParishScopedCollection(collectionKey: FirestoreCollectionKey) {
  return !['parishes', 'settings'].includes(collectionKey)
}

function canBypassParishScope() {
  const scope = getSessionScope()

  if (!scope) {
    return true
  }

  return scope.role === 'SUPER_ADMIN'
}

function isDocumentVisible(collectionKey: FirestoreCollectionKey, document: DocumentData) {
  if (!isParishScopedCollection(collectionKey) || canBypassParishScope()) {
    return true
  }

  const scope = getSessionScope()

  if (!scope) {
    return true
  }

  return document.parishId === scope.parishId
}

function sanitizeScopedDocuments<T extends DocumentData>(collectionKey: FirestoreCollectionKey, documents: T[]) {
  return documents.filter((document) => isDocumentVisible(collectionKey, document))
}

function castDocument<T extends DocumentData>(document: DocumentData) {
  return document as unknown as T
}

function castDocuments<T extends DocumentData>(documents: DocumentData[]) {
  return documents as unknown as T[]
}

type QueryFilter = {
  field: string
  operator: WhereFilterOp
  value: string | boolean | number | string[]
}

type PaginatedQueryOptions = {
  filters?: QueryFilter[]
  orderByField?: string
  orderByDirection?: OrderByDirection
  limitCount?: number
  cursor?: QueryDocumentSnapshot<DocumentData> | null
}

type ReadOptions = {
  source?: 'server-first' | 'cache-first'
  cacheKey?: string
  maxAgeMs?: number
}

const READ_CACHE_PREFIX = 'catequesis-read-cache:'

function getReadCacheTimestamp(cacheKey: string) {
  if (typeof localStorage === 'undefined') {
    return null
  }

  const rawValue = localStorage.getItem(`${READ_CACHE_PREFIX}${cacheKey}`)
  if (!rawValue) {
    return null
  }

  const timestamp = Number(rawValue)
  return Number.isFinite(timestamp) ? timestamp : null
}

function setReadCacheTimestamp(cacheKey: string) {
  if (typeof localStorage === 'undefined') {
    return
  }

  localStorage.setItem(`${READ_CACHE_PREFIX}${cacheKey}`, String(Date.now()))
}

function resolveReadSource(options?: ReadOptions) {
  if (options?.source) {
    return options.source
  }

  if (!options?.cacheKey || !options.maxAgeMs) {
    return 'server-first' as const
  }

  const timestamp = getReadCacheTimestamp(options.cacheKey)
  if (timestamp != null && Date.now() - timestamp <= options.maxAgeMs) {
    return 'cache-first' as const
  }

  return 'server-first' as const
}

function markReadCache(options?: ReadOptions) {
  if (!options?.cacheKey) {
    return
  }

  setReadCacheTimestamp(options.cacheKey)
}

export function clearReadCacheEntry(cacheKey: string) {
  if (typeof localStorage === 'undefined') {
    return
  }

  localStorage.removeItem(`${READ_CACHE_PREFIX}${cacheKey}`)
}

export function clearReadCacheEntriesByPrefix(prefix: string) {
  if (typeof localStorage === 'undefined') {
    return
  }

  const targetPrefix = `${READ_CACHE_PREFIX}${prefix}`
  const keysToRemove: string[] = []

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    if (key && key.startsWith(targetPrefix)) {
      keysToRemove.push(key)
    }
  }

  keysToRemove.forEach((key) => localStorage.removeItem(key))
}

export type PaginatedDocumentsResult<T> = {
  items: T[]
  nextCursor: QueryDocumentSnapshot<DocumentData> | null
  hasMore: boolean
}

async function getQuerySnapshotServerFirst<T extends DocumentData>(
  queryRef: Query<T>,
): Promise<QuerySnapshot<T>> {
  try {
    return await getDocsFromServer(queryRef)
  } catch {
    // If the server is unavailable, fall back to local cache.
  }

  return getDocsFromCache(queryRef)
}

async function getQuerySnapshotCacheFirst<T extends DocumentData>(
  queryRef: Query<T>,
): Promise<QuerySnapshot<T>> {
  try {
    return await getDocsFromCache(queryRef)
  } catch {
    // If the cache is empty or unavailable, fall back to server.
  }

  return getDocsFromServer(queryRef)
}

async function getDocumentSnapshotServerFirst<T extends DocumentData>(
  docRef: DocumentReference<T>,
): Promise<DocumentSnapshot<T>> {
  try {
    return await getDocFromServer(docRef)
  } catch {
    // If the server is unavailable, fall back to local cache.
  }

  return getDocFromCache(docRef)
}

async function getDocumentSnapshotCacheFirst<T extends DocumentData>(
  docRef: DocumentReference<T>,
): Promise<DocumentSnapshot<T>> {
  try {
    return await getDocFromCache(docRef)
  } catch {
    // If the cache is empty or unavailable, fall back to server.
  }

  return getDocFromServer(docRef)
}

function getQuerySnapshotBySource<T extends DocumentData>(
  queryRef: Query<T>,
  source: ReadOptions['source'] = 'server-first',
) {
  return source === 'cache-first'
    ? getQuerySnapshotCacheFirst(queryRef)
    : getQuerySnapshotServerFirst(queryRef)
}

function getDocumentSnapshotBySource<T extends DocumentData>(
  docRef: DocumentReference<T>,
  source: ReadOptions['source'] = 'server-first',
) {
  return source === 'cache-first'
    ? getDocumentSnapshotCacheFirst(docRef)
    : getDocumentSnapshotServerFirst(docRef)
}

function buildFirestoreQuery(
  collectionKey: FirestoreCollectionKey,
  { filters = [], orderByField, orderByDirection = 'asc', limitCount, cursor }: PaginatedQueryOptions,
) {
  const constraints: Array<ReturnType<typeof where> | ReturnType<typeof orderBy> | ReturnType<typeof limit> | ReturnType<typeof startAfter>> = []

  filters.forEach((filter) => {
    if (filter.field === '__name__') {
      constraints.push(where(documentId(), filter.operator, filter.value))
      return
    }

    constraints.push(where(filter.field, filter.operator, filter.value))
  })

  if (orderByField) {
    if (orderByField === '__name__') {
      constraints.push(orderBy(documentId(), orderByDirection))
    } else {
      constraints.push(orderBy(orderByField, orderByDirection))
    }
  }

  if (cursor) {
    constraints.push(startAfter(cursor))
  }

  if (limitCount) {
    constraints.push(limit(limitCount))
  }

  return query(getCollectionRef(collectionKey), ...constraints)
}

export async function listDocuments<T extends DocumentData>(collectionKey: FirestoreCollectionKey, options?: ReadOptions) {
  const source = resolveReadSource(options)
  const snapshot = await getQuerySnapshotBySource(query(getCollectionRef(collectionKey)), source)
  if (source === 'server-first') {
    markReadCache(options)
  }
  return sanitizeScopedDocuments(collectionKey, castDocuments<T>(snapshot.docs.map((entry) => ({
    id: entry.id,
    ...entry.data(),
  }))))
}

export async function getDocumentById<T extends DocumentData>(collectionKey: FirestoreCollectionKey, id: string, options?: ReadOptions) {
  const source = resolveReadSource(options)
  const snapshot = await getDocumentSnapshotBySource(getDocRef(collectionKey, id), source)
  if (source === 'server-first') {
    markReadCache(options)
  }

  if (!snapshot.exists()) {
    return undefined
  }

  const document = castDocument<T>({
    id: snapshot.id,
    ...snapshot.data(),
  })

  if (!isDocumentVisible(collectionKey, document as DocumentData)) {
    return undefined
  }

  return document
}

export async function getDocumentsByField<T extends DocumentData>(
  collectionKey: FirestoreCollectionKey,
  field: string,
  value: string | boolean | number,
  options?: ReadOptions,
) {
  const source = resolveReadSource(options)
  const snapshot = await getQuerySnapshotBySource(
    query(getCollectionRef(collectionKey), where(field, '==', value)),
    source,
  )
  if (source === 'server-first') {
    markReadCache(options)
  }
  return sanitizeScopedDocuments(collectionKey, castDocuments<T>(snapshot.docs.map((entry) => ({
    id: entry.id,
    ...entry.data(),
  }))))
}

export async function getDocumentsByIds<T extends DocumentData>(collectionKey: FirestoreCollectionKey, ids: string[], options?: ReadOptions) {
  if (ids.length === 0) {
    return [] as T[]
  }

  const results: T[] = []

  const source = resolveReadSource(options)
  for (let index = 0; index < ids.length; index += 10) {
    const chunk = ids.slice(index, index + 10)
    const snapshot = await getQuerySnapshotBySource(
      query(getCollectionRef(collectionKey), where(documentId(), 'in', chunk)),
      source,
    )

    results.push(
      ...sanitizeScopedDocuments(collectionKey, castDocuments<T>(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })))),
    )
  }

  if (source === 'server-first') {
    markReadCache(options)
  }

  return results
}

export async function getDocumentsByFieldIn<T extends DocumentData>(
  collectionKey: FirestoreCollectionKey,
  field: string,
  values: string[],
  options?: ReadOptions,
) {
  if (values.length === 0) {
    return [] as T[]
  }

  const results: T[] = []

  const source = resolveReadSource(options)
  for (let index = 0; index < values.length; index += 10) {
    const chunk = values.slice(index, index + 10)
    const fieldRef = field === '__name__' ? documentId() : field
    const snapshot = await getQuerySnapshotBySource(
      query(getCollectionRef(collectionKey), where(fieldRef, 'in', chunk)),
      source,
    )

    results.push(
      ...sanitizeScopedDocuments(collectionKey, castDocuments<T>(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })))),
    )
  }

  if (source === 'server-first') {
    markReadCache(options)
  }

  return results
}

export async function paginateDocuments<T extends DocumentData>(
  collectionKey: FirestoreCollectionKey,
  options: PaginatedQueryOptions,
  readOptions?: ReadOptions,
) {
  const limitCount = options.limitCount ?? 20
  const source = resolveReadSource(readOptions)
  const snapshot = await getQuerySnapshotBySource(
    buildFirestoreQuery(collectionKey, {
      ...options,
      limitCount,
    }),
    source,
  )
  if (source === 'server-first') {
    markReadCache(readOptions)
  }

  return {
    items: sanitizeScopedDocuments(collectionKey, castDocuments<T>(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })))),
    nextCursor: snapshot.docs.at(-1) ?? null,
    hasMore: snapshot.docs.length === limitCount,
  } satisfies PaginatedDocumentsResult<T>
}

export async function putDocument<T extends { id: string }>(
  collectionKey: FirestoreCollectionKey,
  entity: T,
) {
  const { id, ...rest } = entity
  await setDoc(getDocRef(collectionKey, id), sanitizeForFirestore(rest))
}

export async function putDocuments<T extends { id: string }>(
  collectionKey: FirestoreCollectionKey,
  entities: T[],
) {
  if (entities.length === 0) {
    return
  }

  for (let index = 0; index < entities.length; index += 400) {
    const batch = writeBatch(firestore)
    const chunk = entities.slice(index, index + 400)

    chunk.forEach((entity) => {
      const { id, ...rest } = entity
      batch.set(getDocRef(collectionKey, id), sanitizeForFirestore(rest))
    })

    await batch.commit()
  }
}

export async function deleteDocuments(collectionKey: FirestoreCollectionKey, ids: string[]) {
  if (ids.length === 0) {
    return
  }

  for (let index = 0; index < ids.length; index += 400) {
    const batch = writeBatch(firestore)
    const chunk = ids.slice(index, index + 400)

    chunk.forEach((id) => {
      batch.delete(getDocRef(collectionKey, id))
    })

    await batch.commit()
  }
}

export async function deleteDocumentById(collectionKey: FirestoreCollectionKey, id: string) {
  await deleteDoc(getDocRef(collectionKey, id))
}

export async function getSetting(key: string) {
  const snapshot = await getDocumentSnapshotServerFirst(getDocRef('settings', key))

  if (!snapshot.exists()) {
    return undefined
  }

  return {
    key,
    ...snapshot.data(),
  } as Setting
}

export async function setSetting(setting: Setting) {
  await setDoc(getDocRef('settings', setting.key), sanitizeForFirestore({
    value: setting.value,
    createdAt: setting.createdAt,
    updatedAt: setting.updatedAt,
  }))
}
