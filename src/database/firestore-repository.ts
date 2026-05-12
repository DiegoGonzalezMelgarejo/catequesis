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

export async function listDocuments<T extends DocumentData>(collectionKey: FirestoreCollectionKey) {
  const snapshot = await getQuerySnapshotServerFirst(query(getCollectionRef(collectionKey)))
  return sanitizeScopedDocuments(collectionKey, castDocuments<T>(snapshot.docs.map((entry) => ({
    id: entry.id,
    ...entry.data(),
  }))))
}

export async function getDocumentById<T extends DocumentData>(collectionKey: FirestoreCollectionKey, id: string) {
  const snapshot = await getDocumentSnapshotServerFirst(getDocRef(collectionKey, id))

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
) {
  const snapshot = await getQuerySnapshotServerFirst(
    query(getCollectionRef(collectionKey), where(field, '==', value)),
  )
  return sanitizeScopedDocuments(collectionKey, castDocuments<T>(snapshot.docs.map((entry) => ({
    id: entry.id,
    ...entry.data(),
  }))))
}

export async function getDocumentsByIds<T extends DocumentData>(collectionKey: FirestoreCollectionKey, ids: string[]) {
  if (ids.length === 0) {
    return [] as T[]
  }

  const results: T[] = []

  for (let index = 0; index < ids.length; index += 10) {
    const chunk = ids.slice(index, index + 10)
    const snapshot = await getQuerySnapshotServerFirst(
      query(getCollectionRef(collectionKey), where(documentId(), 'in', chunk)),
    )

    results.push(
      ...sanitizeScopedDocuments(collectionKey, castDocuments<T>(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })))),
    )
  }

  return results
}

export async function getDocumentsByFieldIn<T extends DocumentData>(
  collectionKey: FirestoreCollectionKey,
  field: string,
  values: string[],
) {
  if (values.length === 0) {
    return [] as T[]
  }

  const results: T[] = []

  for (let index = 0; index < values.length; index += 10) {
    const chunk = values.slice(index, index + 10)
    const fieldRef = field === '__name__' ? documentId() : field
    const snapshot = await getQuerySnapshotServerFirst(
      query(getCollectionRef(collectionKey), where(fieldRef, 'in', chunk)),
    )

    results.push(
      ...sanitizeScopedDocuments(collectionKey, castDocuments<T>(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })))),
    )
  }

  return results
}

export async function paginateDocuments<T extends DocumentData>(
  collectionKey: FirestoreCollectionKey,
  options: PaginatedQueryOptions,
) {
  const limitCount = options.limitCount ?? 20
  const snapshot = await getQuerySnapshotServerFirst(
    buildFirestoreQuery(collectionKey, {
      ...options,
      limitCount,
    }),
  )

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
