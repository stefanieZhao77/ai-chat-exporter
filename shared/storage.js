import { DEFAULT_SETTINGS, DIRECTORY_DB, STORAGE_KEYS } from './constants.js';

function isContextInvalidatedError(error) {
  return String(error?.message || error || '').includes('Extension context invalidated');
}

async function safeStorageGet(keys, fallback = {}) {
  try {
    return await chrome.storage.local.get(keys);
  } catch (error) {
    if (isContextInvalidatedError(error)) return fallback;
    throw error;
  }
}

async function safeStorageSet(payload) {
  try {
    await chrome.storage.local.set(payload);
  } catch (error) {
    if (isContextInvalidatedError(error)) return;
    throw error;
  }
}

function openDb() {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB is not available in this context'));
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DIRECTORY_DB.name, DIRECTORY_DB.version);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DIRECTORY_DB.store)) {
        db.createObjectStore(DIRECTORY_DB.store);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
  });
}

async function withStore(mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DIRECTORY_DB.store, mode);
    const store = tx.objectStore(DIRECTORY_DB.store);

    const done = (value) => {
      resolve(value);
      db.close();
    };

    const fail = (err) => {
      reject(err);
      db.close();
    };

    fn(store, done, fail);
  });
}

export async function saveRootDirectoryHandle(handle) {
  if (!handle) {
    throw new Error('Missing directory handle');
  }
  return withStore('readwrite', (store, done, fail) => {
    const request = store.put(handle, DIRECTORY_DB.key);
    request.onsuccess = () => done(true);
    request.onerror = () => fail(request.error);
  });
}

export async function getRootDirectoryHandle() {
  return withStore('readonly', (store, done, fail) => {
    const request = store.get(DIRECTORY_DB.key);
    request.onsuccess = () => done(request.result || null);
    request.onerror = () => fail(request.error);
  });
}

export async function clearRootDirectoryHandle() {
  return withStore('readwrite', (store, done, fail) => {
    const request = store.delete(DIRECTORY_DB.key);
    request.onsuccess = () => done(true);
    request.onerror = () => fail(request.error);
  });
}

export async function getSettings() {
  const result = await safeStorageGet(STORAGE_KEYS.settings);
  return {
    ...DEFAULT_SETTINGS,
    ...(result[STORAGE_KEYS.settings] || {}),
  };
}

export async function saveSettings(settings) {
  const merged = {
    ...DEFAULT_SETTINGS,
    ...settings,
  };
  await safeStorageSet({
    [STORAGE_KEYS.settings]: merged,
  });
  return merged;
}

export async function getFabPosition() {
  const result = await safeStorageGet(STORAGE_KEYS.fabPosition);
  return result[STORAGE_KEYS.fabPosition] || { x: 20, y: 120 };
}

export async function saveFabPosition(position) {
  await safeStorageSet({
    [STORAGE_KEYS.fabPosition]: position,
  });
  return position;
}
