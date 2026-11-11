import { hashObject } from '../../utils/hash.js';

/**
 * CSP-safe OPFS / storage persistence probe (no eval / Function).
 * Replaces opfs.min.js when it is blocked by script-src.
 */
export async function collectOpfsLocal() {
  const out = {
    available: typeof navigator.storage?.getDirectory === 'function',
    source: 'local-fallback',
  };

  try {
    if (navigator.storage?.persisted) out.persisted = await navigator.storage.persisted();
    if (navigator.storage?.estimate) {
      const est = await navigator.storage.estimate();
      out.quota = est.quota ?? null;
      out.usage = est.usage ?? null;
    }
  } catch (error) {
    out.storageError = error.message || String(error);
  }

  try {
    if (out.available) {
      const root = await navigator.storage.getDirectory();
      const name = `__fp_probe_${Date.now()}`;
      const handle = await root.getFileHandle(name, { create: true });
      const writable = await handle.createWritable();
      await writable.write(new Blob([`fp-${navigator.userAgent.slice(0, 24)}`]));
      await writable.close();
      const file = await handle.getFile();
      out.wroteBytes = file.size;
      await root.removeEntry(name);
      out.opfsOk = true;
    } else {
      out.opfsOk = false;
    }
  } catch (error) {
    out.opfsOk = false;
    out.opfsError = error.message || String(error);
  }

  out.fingerprint = await hashObject({
    available: out.available,
    opfsOk: out.opfsOk,
    persisted: out.persisted ?? null,
    // quota intentionally omitted (volatile)
  });

  return out;
}
