import { hashObject } from '../../utils/hash.js';

/** Storage / persistence / OPFS / buckets capability signals. */
export async function collectStorage() {
  const out = {
    available: true,
    localStorage: (() => {
      try {
        localStorage.setItem('__fp', '1');
        localStorage.removeItem('__fp');
        return true;
      } catch {
        return false;
      }
    })(),
    sessionStorage: (() => {
      try {
        sessionStorage.setItem('__fp', '1');
        sessionStorage.removeItem('__fp');
        return true;
      } catch {
        return false;
      }
    })(),
    indexedDB: typeof indexedDB !== 'undefined',
    openDatabase: typeof openDatabase === 'function',
    caches: typeof caches !== 'undefined',
    cookieEnabled: navigator.cookieEnabled,
    estimate: null,
    persisted: null,
    opfs: null,
    storageBuckets: typeof navigator.storageBuckets !== 'undefined',
    note: 'quota is shown as metadata only — excluded from fingerprint (changes often).',
  };

  try {
    if (navigator.storage?.estimate) out.estimate = await navigator.storage.estimate();
    if (navigator.storage?.persisted) out.persisted = await navigator.storage.persisted();
  } catch (error) {
    out.storageError = error.message || String(error);
  }

  try {
    if (navigator.storage?.getDirectory) {
      await navigator.storage.getDirectory();
      out.opfs = { available: true };
    } else {
      out.opfs = { available: false };
    }
  } catch (error) {
    const msg = error.message || String(error);
    // Firefox RFP / private modes often deny getDirectory — not a hard collector failure
    out.opfs = {
      available: false,
      denied: true,
      note: msg,
    };
    out.status = 'partial';
  }

  return {
    ...out,
    fingerprint: await hashObject({
      localStorage: out.localStorage,
      sessionStorage: out.sessionStorage,
      indexedDB: out.indexedDB,
      cookieEnabled: out.cookieEnabled,
      caches: out.caches,
      persisted: out.persisted,
      opfs: out.opfs?.available ?? false,
      storageBuckets: out.storageBuckets,
    }),
  };
}
