const DATABASE_NAME = 'easycut-refinement';
const DATABASE_VERSION = 1;
const DRAFT_STORE_NAME = 'drafts';
const ACCESS_TICKET_PREFIX = 'easycut_refinement_offerwall_ticket_v1:';

export const REFINEMENT_DRAFT_MAX_AGE_MS = 60 * 60 * 1000;

export type RefinementDraft = {
  id: string;
  fileId: string;
  imageName: string;
  sourceBlob: Blob;
  transparentBlob: Blob;
  outputBlob: Blob;
  appliedRatio: string;
  appliedTemplate: string | null;
  processingMode: 'standard' | 'pro_high_precision' | 'ai_generate';
  createdAt: number;
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('このブラウザでは画像の一時保存を利用できません。'));
      return;
    }

    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(DRAFT_STORE_NAME)) {
        database.createObjectStore(DRAFT_STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('画像の一時保存を開始できませんでした。'));
  });
}

async function runDraftRequest<T>(
  mode: IDBTransactionMode,
  createRequest: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const database = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(DRAFT_STORE_NAME, mode);
      const request = createRequest(transaction.objectStore(DRAFT_STORE_NAME));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('画像の一時保存に失敗しました。'));
      transaction.onabort = () => reject(transaction.error ?? new Error('画像の一時保存が中断されました。'));
    });
  } finally {
    database.close();
  }
}

export async function saveRefinementDraft(draft: RefinementDraft): Promise<void> {
  await runDraftRequest('readwrite', store => store.put(draft));
}

export async function readRefinementDraft(id: string): Promise<RefinementDraft | null> {
  const draft = await runDraftRequest<RefinementDraft | undefined>('readonly', store => store.get(id));
  if (!draft) return null;
  if (Date.now() - draft.createdAt <= REFINEMENT_DRAFT_MAX_AGE_MS) return draft;
  await deleteRefinementDraft(id).catch(() => undefined);
  return null;
}

export async function deleteRefinementDraft(id: string): Promise<void> {
  await runDraftRequest('readwrite', store => store.delete(id));
}

export function grantOfferwallAccess(storage: Pick<Storage, 'setItem'> | null, draftId: string): boolean {
  if (!storage) return false;
  try {
    storage.setItem(`${ACCESS_TICKET_PREFIX}${draftId}`, String(Date.now()));
    return true;
  } catch {
    return false;
  }
}

export function hasOfferwallAccess(storage: Pick<Storage, 'getItem' | 'removeItem'> | null, draftId: string): boolean {
  if (!storage) return false;
  const key = `${ACCESS_TICKET_PREFIX}${draftId}`;
  try {
    const grantedAt = Number(storage.getItem(key));
    if (Number.isFinite(grantedAt) && Date.now() - grantedAt <= REFINEMENT_DRAFT_MAX_AGE_MS) return true;
    storage.removeItem(key);
    return false;
  } catch {
    return false;
  }
}

export function clearOfferwallAccess(storage: Pick<Storage, 'removeItem'> | null, draftId: string): void {
  try {
    storage?.removeItem(`${ACCESS_TICKET_PREFIX}${draftId}`);
  } catch {
    // sessionStorage may be unavailable in privacy-restricted browsers.
  }
}
