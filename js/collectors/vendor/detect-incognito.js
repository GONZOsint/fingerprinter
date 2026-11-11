/**
 * CSP-safe incognito heuristics (no eval / Function).
 * Inspired by detectIncognitoJS — Firefox / Chromium / Safari branches.
 */
export async function detectIncognitoLocal() {
  const ua = navigator.userAgent || '';
  const vendor = navigator.vendor || '';

  // Firefox / Tor / Mullvad
  if (typeof document.documentElement?.style?.MozAppearance !== 'undefined' || /Firefox|Tor|Mullvad/i.test(ua)) {
    let browserName = 'Firefox';
    if (/Tor/i.test(ua)) browserName = 'Tor Browser';
    else if (/Mullvad/i.test(ua)) browserName = 'Mullvad Browser';
    // In private mode serviceWorker is typically undefined in Firefox
    const isPrivate = typeof navigator.serviceWorker === 'undefined';
    return { isPrivate, browserName, source: 'local-fallback' };
  }

  // Safari
  if (vendor.indexOf('Apple') === 0) {
    const isPrivate = await safariPrivate();
    return { isPrivate, browserName: 'Safari', source: 'local-fallback' };
  }

  // Chromium family
  if (vendor.indexOf('Google') === 0 || /Chrome|Chromium|Edg|OPR|Brave/i.test(ua)) {
    let browserName = 'Chrome';
    if (navigator.brave) browserName = 'Brave';
    else if (/Edg\//.test(ua)) browserName = 'Edge';
    else if (/OPR\//.test(ua)) browserName = 'Opera';

    try {
      if (navigator.storage?.estimate && performance?.memory?.jsHeapSizeLimit) {
        const { quota } = await navigator.storage.estimate();
        const heapMb = Math.round(performance.memory.jsHeapSizeLimit / 1048576);
        const quotaMb = Math.round((quota || 0) / 1048576);
        // Incognito often has a much smaller quota vs heap limit
        if (quotaMb > 0 && quotaMb < heapMb * 2) {
          return { isPrivate: true, browserName, source: 'local-fallback', via: 'quota' };
        }
      }
    } catch {
      /* fall through */
    }

    try {
      if (navigator.webkitTemporaryStorage?.queryUsageAndQuota) {
        const quota = await new Promise((resolve, reject) => {
          navigator.webkitTemporaryStorage.queryUsageAndQuota(
            (_used, q) => resolve(q),
            reject
          );
        });
        const heap =
          performance?.memory?.jsHeapSizeLimit != null
            ? performance.memory.jsHeapSizeLimit
            : 1073741824;
        const isPrivate = Math.round(quota / 1048576) < 2 * Math.round(heap / 1048576);
        return { isPrivate, browserName, source: 'local-fallback', via: 'webkitTemporaryStorage' };
      }
    } catch {
      /* fall through */
    }

    // FileSystem API probe (older Chromium)
    if (typeof window.webkitRequestFileSystem === 'function') {
      const isPrivate = await new Promise((resolve) => {
        try {
          window.webkitRequestFileSystem(
            0,
            1,
            () => resolve(false),
            () => resolve(true)
          );
        } catch {
          resolve(false);
        }
      });
      return { isPrivate, browserName, source: 'local-fallback', via: 'webkitRequestFileSystem' };
    }

    return { isPrivate: false, browserName, source: 'local-fallback', via: 'default' };
  }

  return {
    isPrivate: null,
    browserName: 'Unknown',
    source: 'local-fallback',
    error: 'Cannot determine browser for incognito probe',
  };
}

async function safariPrivate() {
  try {
    const name = `fp_idb_${Math.random()}`;
    await new Promise((resolve, reject) => {
      const req = indexedDB.open(name, 1);
      req.onerror = () => reject(req.error);
      req.onupgradeneeded = (ev) => {
        const db = ev.target.result;
        try {
          db.createObjectStore('t').put(new Blob(['x']));
          resolve(false);
        } catch (e) {
          const msg = e?.message || String(e);
          resolve(/BlobURLs are not yet supported/i.test(msg));
        } finally {
          try {
            db.close();
          } catch {
            /* ignore */
          }
          indexedDB.deleteDatabase(name);
        }
      };
      req.onsuccess = () => {
        try {
          req.result.close();
        } catch {
          /* ignore */
        }
        indexedDB.deleteDatabase(name);
        resolve(false);
      };
    });
  } catch {
    return false;
  }
  return false;
}
