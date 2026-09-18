import {
  REFINEMENT_WORKSPACE_MAX_AGE_MS,
  REFINEMENT_WORKSPACE_SCHEMA_VERSION,
  type RefinementAsset,
  type RefinementAssetPurpose,
  type RefinementAssetRef,
  type RefinementWorkspace,
  type RefinementWorkspaceBundle,
  type RefinementWorkspaceItem,
  type RefinementWorkspaceMode,
  type WorkspaceSaveItem,
} from './workspace';

const DATABASE_NAME = 'easycut-refinement';
const DATABASE_VERSION = 2;
const WORKSPACE_STORE = 'workspaces';
const ITEM_STORE = 'items';
const ASSET_STORE = 'assets';
const SAFE_STORAGE_RATIO = 0.8;

export class RefinementStorageError extends Error {
  constructor(
    message: string,
    public readonly code: 'unavailable' | 'quota' | 'write_failed' | 'not_found',
  ) {
    super(message);
    this.name = 'RefinementStorageError';
  }
}

function createId(prefix: string): string {
  const suffix = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${suffix}`;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new RefinementStorageError('このブラウザでは編集workspaceを保存できません。', 'unavailable'));
      return;
    }
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (database.objectStoreNames.contains('drafts')) database.deleteObjectStore('drafts');
      if (!database.objectStoreNames.contains(WORKSPACE_STORE)) {
        database.createObjectStore(WORKSPACE_STORE, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(ITEM_STORE)) {
        const store = database.createObjectStore(ITEM_STORE, { keyPath: 'id' });
        store.createIndex('workspaceId', 'workspaceId', { unique: false });
      }
      if (!database.objectStoreNames.contains(ASSET_STORE)) {
        const store = database.createObjectStore(ASSET_STORE, { keyPath: 'id' });
        store.createIndex('workspaceId', 'workspaceId', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new RefinementStorageError('編集workspaceを開けませんでした。', 'unavailable'));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new RefinementStorageError('編集workspaceの保存が中断されました。', 'write_failed'));
    transaction.onerror = () => reject(transaction.error ?? new RefinementStorageError('編集workspaceを保存できませんでした。', 'write_failed'));
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

export function isRemoteAsset(value: string): boolean {
  return /^https:\/\//i.test(value);
}

export function getRequiredBlobBytes(items: WorkspaceSaveItem[]): number {
  return items.reduce((total, item) => {
    const values = [item.source, item.transparent, item.background];
    return total + values.reduce<number>((subtotal, value) => subtotal + (value instanceof Blob ? value.size : 0), 0);
  }, 0);
}

export async function hasWorkspaceCapacity(requiredBytes: number): Promise<boolean> {
  if (!requiredBytes || typeof navigator === 'undefined' || !navigator.storage?.estimate) return true;
  const estimate = await navigator.storage.estimate();
  if (estimate.quota == null || estimate.usage == null) return true;
  const remaining = Math.max(0, estimate.quota - estimate.usage);
  return requiredBytes <= remaining * SAFE_STORAGE_RATIO;
}

function toAssetRef(
  value: string | Blob | null | undefined,
  workspaceId: string,
  purpose: RefinementAssetPurpose,
  assets: RefinementAsset[],
  dedupe: Map<Blob, string>,
): RefinementAssetRef | null {
  if (!value) return null;
  if (typeof value === 'string') return { kind: 'url', url: value };
  const existing = dedupe.get(value);
  if (existing) return { kind: 'asset', assetId: existing };
  const assetId = createId('asset');
  dedupe.set(value, assetId);
  assets.push({
    id: assetId,
    workspaceId,
    purpose,
    mimeType: value.type || 'application/octet-stream',
    size: value.size,
    blob: value,
  });
  return { kind: 'asset', assetId };
}

export async function createRefinementWorkspace({
  mode,
  items,
}: {
  mode: RefinementWorkspaceMode;
  items: WorkspaceSaveItem[];
}): Promise<RefinementWorkspace> {
  if (items.length === 0) throw new RefinementStorageError('編集できる画像がありません。', 'write_failed');
  await cleanupExpiredWorkspaces();
  if (!(await hasWorkspaceCapacity(getRequiredBlobBytes(items)))) {
    throw new RefinementStorageError('端末の空き容量が不足しています。', 'quota');
  }

  const database = await openDatabase();
  const workspaceId = createId('workspace');
  const now = Date.now();
  const workspace: RefinementWorkspace = {
    id: workspaceId,
    schemaVersion: REFINEMENT_WORKSPACE_SCHEMA_VERSION,
    status: 'writing',
    mode,
    trialItemId: null,
    batchUnlocked: mode !== 'trial',
    createdAt: now,
    updatedAt: now,
    itemOrder: items.map(item => item.id),
  };
  const assets: RefinementAsset[] = [];
  const dedupe = new Map<Blob, string>();
  const storedItems: RefinementWorkspaceItem[] = items.map(item => ({
    ...item,
    workspaceId,
    source: toAssetRef(item.source, workspaceId, 'source', assets, dedupe),
    transparent: toAssetRef(item.transparent, workspaceId, 'transparent', assets, dedupe),
    refined: null,
    background: toAssetRef(item.background, workspaceId, 'background', assets, dedupe),
    status: item.eligible ? 'unmodified' : 'ineligible',
    draftStrokes: [],
  }));

  try {
    const transaction = database.transaction([WORKSPACE_STORE, ITEM_STORE, ASSET_STORE], 'readwrite');
    const workspaces = transaction.objectStore(WORKSPACE_STORE);
    const itemStore = transaction.objectStore(ITEM_STORE);
    const assetStore = transaction.objectStore(ASSET_STORE);
    workspaces.put(workspace);
    storedItems.forEach(item => itemStore.put(item));
    assets.forEach(asset => assetStore.put(asset));
    workspaces.put({ ...workspace, status: 'ready' });
    await transactionDone(transaction);
    return { ...workspace, status: 'ready' };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      throw new RefinementStorageError('端末の空き容量が不足しています。', 'quota');
    }
    throw error instanceof RefinementStorageError
      ? error
      : new RefinementStorageError('編集workspaceを保存できませんでした。', 'write_failed');
  } finally {
    database.close();
  }
}

export async function readRefinementWorkspace(id: string): Promise<RefinementWorkspaceBundle | null> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction([WORKSPACE_STORE, ITEM_STORE], 'readonly');
    const workspacePromise = requestResult<RefinementWorkspace | undefined>(transaction.objectStore(WORKSPACE_STORE).get(id));
    const itemsPromise = requestResult<RefinementWorkspaceItem[]>(transaction.objectStore(ITEM_STORE).index('workspaceId').getAll(id));
    const [workspace, items] = await Promise.all([workspacePromise, itemsPromise, transactionDone(transaction).then(() => undefined)]).then(([nextWorkspace, nextItems]) => [nextWorkspace, nextItems] as const);
    if (!workspace) return null;
    if (Date.now() - workspace.updatedAt > REFINEMENT_WORKSPACE_MAX_AGE_MS) {
      await deleteRefinementWorkspace(id);
      return null;
    }
    const order = new Map(workspace.itemOrder.map((itemId, index) => [itemId, index]));
    items.sort((a, b) => (order.get(a.id) ?? a.order) - (order.get(b.id) ?? b.order));
    return { workspace, items };
  } finally {
    database.close();
  }
}

export async function readRefinementAsset(ref: RefinementAssetRef | null): Promise<Blob | string | null> {
  if (!ref) return null;
  if (ref.kind === 'url') return ref.url;
  const database = await openDatabase();
  try {
    const transaction = database.transaction(ASSET_STORE, 'readonly');
    const asset = await requestResult<RefinementAsset | undefined>(transaction.objectStore(ASSET_STORE).get(ref.assetId));
    await transactionDone(transaction);
    return asset?.blob ?? null;
  } finally {
    database.close();
  }
}

export async function updateRefinementWorkspace(
  workspaceId: string,
  update: Partial<Pick<RefinementWorkspace, 'status' | 'mode' | 'trialItemId' | 'batchUnlocked'>>,
): Promise<void> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(WORKSPACE_STORE, 'readwrite');
    const store = transaction.objectStore(WORKSPACE_STORE);
    const workspace = await requestResult<RefinementWorkspace | undefined>(store.get(workspaceId));
    if (!workspace) throw new RefinementStorageError('編集workspaceが見つかりません。', 'not_found');
    store.put({ ...workspace, ...update, updatedAt: Date.now() });
    await transactionDone(transaction);
  } finally {
    database.close();
  }
}

export async function updateRefinementItem(
  item: RefinementWorkspaceItem,
  refinedBlob?: Blob,
): Promise<RefinementWorkspaceItem> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction([WORKSPACE_STORE, ITEM_STORE, ASSET_STORE], 'readwrite');
    let refined = item.refined;
    if (refinedBlob) {
      const assetId = createId('asset');
      const assetStore = transaction.objectStore(ASSET_STORE);
      assetStore.put({
        id: assetId,
        workspaceId: item.workspaceId,
        purpose: 'refined',
        mimeType: refinedBlob.type || 'image/png',
        size: refinedBlob.size,
        blob: refinedBlob,
      } satisfies RefinementAsset);
      if (item.refined?.kind === 'asset') assetStore.delete(item.refined.assetId);
      refined = { kind: 'asset', assetId };
    }
    const nextItem = { ...item, refined };
    transaction.objectStore(ITEM_STORE).put(nextItem);
    const workspaceStore = transaction.objectStore(WORKSPACE_STORE);
    const workspace = await requestResult<RefinementWorkspace | undefined>(workspaceStore.get(item.workspaceId));
    if (workspace) workspaceStore.put({ ...workspace, updatedAt: Date.now(), status: 'editing' });
    await transactionDone(transaction);
    return nextItem;
  } finally {
    database.close();
  }
}

export async function deleteRefinementWorkspace(id: string): Promise<void> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction([WORKSPACE_STORE, ITEM_STORE, ASSET_STORE], 'readwrite');
    transaction.objectStore(WORKSPACE_STORE).delete(id);
    const deleteByIndex = async (storeName: string) => {
      const store = transaction.objectStore(storeName);
      const keys = await requestResult<IDBValidKey[]>(store.index('workspaceId').getAllKeys(id));
      keys.forEach(key => store.delete(key));
    };
    await Promise.all([deleteByIndex(ITEM_STORE), deleteByIndex(ASSET_STORE)]);
    await transactionDone(transaction);
  } finally {
    database.close();
  }
}

export async function cleanupExpiredWorkspaces(now = Date.now()): Promise<number> {
  let database: IDBDatabase;
  try {
    database = await openDatabase();
  } catch {
    return 0;
  }
  try {
    const transaction = database.transaction(WORKSPACE_STORE, 'readonly');
    const workspaces = await requestResult<RefinementWorkspace[]>(transaction.objectStore(WORKSPACE_STORE).getAll());
    await transactionDone(transaction);
    const expired = workspaces.filter(workspace => now - workspace.updatedAt > REFINEMENT_WORKSPACE_MAX_AGE_MS);
    await Promise.all(expired.map(workspace => deleteRefinementWorkspace(workspace.id)));
    return expired.length;
  } finally {
    database.close();
  }
}

export function assetValueToUrl(value: Blob | string): { url: string; revoke: boolean } {
  return typeof value === 'string'
    ? { url: value, revoke: false }
    : { url: URL.createObjectURL(value), revoke: true };
}
