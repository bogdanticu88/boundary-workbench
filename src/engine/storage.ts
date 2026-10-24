import { validateImportedAssessment } from './assessment'
import type { Assessment } from './types'

const databaseName = 'boundary-workbench'
const storeName = 'drafts'
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(storeName)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}
export async function saveDraft(assessment: Assessment) {
  const db = await openDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite')
      transaction.objectStore(storeName).put(assessment, 'current')
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error ?? new Error('Draft transaction failed.'))
      transaction.onabort = () => reject(transaction.error ?? new Error('Draft transaction was aborted.'))
    })
  } finally { db.close() }
}
export async function loadDraft(): Promise<Assessment | undefined> {
  const db = await openDatabase()
  try {
    const raw = await new Promise<unknown>((resolve, reject) => {
      const request = db.transaction(storeName).objectStore(storeName).get('current')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    return raw === undefined ? undefined : validateImportedAssessment(raw)
  } finally { db.close() }
}
