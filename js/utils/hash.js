/** Stable hashing helpers for fingerprint IDs. */

export async function sha256Hex(input) {
  const encoded = new TextEncoder().encode(
    typeof input === 'string' ? input : stableStringify(input)
  );
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function normalize(value) {
  if (value == null) return value;
  if (typeof value !== 'object') return value;
  if (ArrayBuffer.isView(value)) return Array.from(value);
  if (value instanceof ArrayBuffer) return Array.from(new Uint8Array(value));
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Set) return [...value].map(normalize).sort();
  if (value instanceof Map) {
    return [...value.entries()]
      .map(([k, v]) => [normalize(k), normalize(v)])
      .sort((a, b) => stableStringify(a[0]).localeCompare(stableStringify(b[0])));
  }
  if (Array.isArray(value)) return value.map(normalize);
  const out = {};
  for (const key of Object.keys(value).sort()) out[key] = normalize(value[key]);
  return out;
}

/** Deterministic stringify: sorted keys, typed-array safe. */
export function stableStringify(value) {
  const v = normalize(value);
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`;
  const keys = Object.keys(v).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(v[k])}`).join(',')}}`;
}

export async function hashObject(obj) {
  return sha256Hex(stableStringify(obj));
}
