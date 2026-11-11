import { hashObject } from '../utils/hash.js';

/**
 * Normalize GPU strings so Chrome ANGLE / Firefox / WebKit map to the same hardware tokens.
 * Cross-browser ID must NOT hash raw unmaskedRenderer (engine-prefixed).
 */
function normalizeGpuVendor(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const s = raw.toLowerCase();
  if (/nvidia|geforce|quadro|rtx|gtx/.test(s)) return 'nvidia';
  if (/amd|ati|radeon|rx |vega|firepro/.test(s)) return 'amd';
  if (/intel|iris|uhd|hd graphics/.test(s)) return 'intel';
  if (/apple|m1|m2|m3|m4|metal/.test(s)) return 'apple';
  if (/qualcomm|adreno/.test(s)) return 'qualcomm';
  if (/arm|mali|immortalis/.test(s)) return 'arm';
  if (/swiftshader|llvmpipe|microsoft basic|gdi generic|software/.test(s)) return 'software';
  const paren = raw.match(/\(([^)]+)\)/);
  if (paren) return normalizeGpuVendor(paren[1]) || 'other';
  return 'other';
}

function normalizeGpuModel(raw) {
  if (!raw || typeof raw !== 'string') return null;
  let s = raw
    .replace(/^ANGLE\s*\(/i, '')
    .replace(/\)\s*$/, '')
    .replace(/Direct3D[^,]*/gi, '')
    .replace(/OpenGL[^,]*/gi, '')
    .replace(/Vulkan[^,]*/gi, '')
    .replace(/,\s*D3D\d+[^,]*/gi, '')
    .replace(/vs_\d+_\d+/gi, '')
    .replace(/ps_\d+_\d+/gi, '')
    .replace(/\(0x[0-9a-f]+\)/gi, '')
    .replace(/Google Inc\.\s*\(/i, '')
    .replace(/NVIDIA Corporation\s*/i, '')
    .replace(/Advanced Micro Devices,?\s*Inc\.?\s*/i, '')
    .replace(/Intel\(R\)\s*/gi, '')
    .replace(/,\s*or similar$/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  const m =
    s.match(/(geforce\s+(rtx|gtx)\s+[\w\s]+?)(?:\s+gpu)?$/i) ||
    s.match(/(radeon\s+[\w\s-]+)/i) ||
    s.match(/(iris\s*xe|uhd\s*graphics\s*\d*|hd\s*graphics\s*\d*)/i) ||
    s.match(/(apple\s+m\d+(?:\s+pro|\s+max|\s+ultra)?)/i) ||
    s.match(/(adreno\s*\(?\d+)/i) ||
    s.match(/(mali-[\w-]+)/i);

  if (m) {
    return m[1]
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/\s+laptop\s+gpu$/i, '')
      .trim();
  }

  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .slice(0, 48) || null
  );
}

function bucketMemory(gb) {
  if (gb == null || Number.isNaN(Number(gb))) return null;
  const n = Number(gb);
  if (n <= 2) return 2;
  if (n <= 4) return 4;
  if (n <= 8) return 8;
  return 16;
}

function portableMath(values) {
  if (!values) return null;
  // Small-domain ops that tend to match across V8 / SpiderMonkey / JSC.
  const pick = (k) => {
    const v = values[k];
    if (typeof v !== 'number' || !Number.isFinite(v)) return null;
    return Number(v.toPrecision(12));
  };
  return {
    acos: pick('acos'),
    asin: pick('asin'),
    atan: pick('atan'),
    sin: pick('sin'),
    cos: pick('cos'),
    sqrt: pick('sqrt'),
    pi: pick('pi'),
    e: pick('e'),
  };
}

/** Firefox RFP / Brave GPU scrub / privacy builds — do not trust identity strings. */
function gpuLooksSpoofed(renderer, antifp, vendor) {
  if (renderer && typeof renderer === 'string') {
    if (/,\s*or similar$/i.test(renderer)) return true;
    // Brave 1.93+ replaces unmasked renderer/vendor with the literal "Brave"
    if (/^brave$/i.test(renderer.trim())) return true;
  }
  if (vendor && typeof vendor === 'string' && /^brave$/i.test(vendor.trim())) return true;
  const prot = antifp?.likelyProtections || [];
  if (prot.includes('resistFingerprinting-like') && /hd graphics/i.test(renderer || '')) return true;
  if (prot.includes('webgl-identity-spoof') && /^brave$/i.test(String(renderer || '').trim())) {
    return true;
  }
  return false;
}

function pickWebglLimits(sotaWebgl, webglStable) {
  if (!webglStable) return null;
  return {
    maxTextureSize: sotaWebgl.params?.maxTextureSize ?? null,
    maxRenderbufferSize: sotaWebgl.params?.maxRenderbufferSize ?? null,
    maxCubeMap: sotaWebgl.params?.maxCubeMap ?? null,
    maxVertexAttribs: sotaWebgl.params?.maxVertexAttribs ?? null,
  };
}

/**
 * Cross-browser ID from hardware-oriented signals that tend to be engine-agnostic.
 *
 * - fingerprint / compareId / portableFingerprint: math + WebGL limits + colorDepth + touch
 *   (canonical — Chrome↔Firefox RFP-safe)
 * - fullFingerprint: portable + GPU + cores when trusted (same-engine enrichment)
 */
function pickHardwareFeatures(data) {
  const device = data.ghostDeviceInfo || {};
  const sotaWebgl = data.sota_webgl || {};
  const sotaMath = data.sota_math || {};
  const sotaWebgpu = data.sota_webgpu || {};
  const antifp = data.sota_antifp || {};
  const webglStable = sotaWebgl.available !== false && !sotaWebgl?.stability?.noisy;

  const rawVendor =
    (webglStable && (sotaWebgl.params?.unmaskedVendor || sotaWebgl.params?.vendor)) ||
    device.graphics?.vendor ||
    null;
  const rawRenderer =
    (webglStable && (sotaWebgl.params?.unmaskedRenderer || sotaWebgl.params?.renderer)) ||
    device.graphics?.renderer ||
    null;

  const spoofed = gpuLooksSpoofed(rawRenderer, antifp, rawVendor);
  const webgpuUsable =
    sotaWebgpu.available &&
    sotaWebgpu.vendor &&
    !sotaWebgpu.webgpuScrubbed &&
    !sotaWebgpu.identityMasked;
  const webgpuVendor = webgpuUsable ? normalizeGpuVendor(sotaWebgpu.vendor) : null;
  const webgpuArch =
    webgpuUsable && sotaWebgpu.architecture
      ? String(sotaWebgpu.architecture).toLowerCase()
      : null;

  // Prefer WebGPU when WebGL is RFP/Brave-spoofed; otherwise normalize WebGL ANGLE strings.
  let gpuVendor = 'untrusted';
  let gpuModel = 'untrusted';
  let gpuTrusted = false;
  if (!spoofed && webglStable) {
    gpuVendor = normalizeGpuVendor(rawVendor) || normalizeGpuVendor(rawRenderer) || 'other';
    gpuModel = normalizeGpuModel(rawRenderer) || 'other';
    // Reject generic placeholders (Brave scrub used to land as other/brave)
    gpuTrusted =
      gpuVendor !== 'other' &&
      gpuVendor !== 'untrusted' &&
      gpuModel !== 'other' &&
      gpuModel !== 'brave' &&
      Boolean(gpuModel);
  } else if (!spoofed && webgpuVendor) {
    gpuVendor = webgpuVendor;
    gpuModel = webgpuArch || webgpuVendor;
    gpuTrusted = true;
  }

  const coresRaw = device.cpu?.logicalCores ?? navigator.hardwareConcurrency ?? null;
  const coresBucket =
    coresRaw == null ? null : coresRaw <= 2 ? 2 : coresRaw <= 4 ? 4 : coresRaw <= 8 ? 8 : 16;
  // RFP buckets concurrency to ≤8 — do not trust cores for cross-engine compare
  const rfpLike =
    spoofed ||
    (antifp.likelyProtections || []).includes('resistFingerprinting-like') ||
    (antifp.likelyProtections || []).includes('coarse-timer');
  const coresTrusted = !rfpLike && coresBucket != null;

  const memRaw = device.memory?.deviceMemory ?? navigator.deviceMemory ?? null;
  const webglLimits = pickWebglLimits(sotaWebgl, webglStable);
  const math = portableMath(sotaMath.values);
  const colorDepth = device.display?.screen?.colorDepth || screen.colorDepth || null;
  const maxTouchPoints = navigator.maxTouchPoints || 0;

  const portable = {
    webglLimits,
    math,
    colorDepth,
    maxTouchPoints,
  };

  const full = {
    coresBucket: coresTrusted ? coresBucket : null,
    gpuVendor: gpuTrusted ? gpuVendor : null,
    gpuModel: gpuTrusted ? gpuModel : null,
    webglLimits,
    math,
    colorDepth,
    maxTouchPoints,
  };

  return {
    ...full,
    _meta: {
      memoryBucket: bucketMemory(memRaw),
      memoryNote: 'not hashed (Brave farbling / RFP)',
      gpuTrusted,
      coresTrusted,
      gpuSpoofed: spoofed,
      rfpLike,
      webgpuVendor,
      webgpuArch,
      portable,
    },
  };
}

function featuresForHash(features) {
  const { _meta, ...rest } = features;
  // Drop null placeholders so RFP vs non-RFP still can share portable hash separately
  const out = {};
  for (const [k, v] of Object.entries(rest)) {
    if (v != null) out[k] = v;
  }
  return out;
}

function coverage(features, meta) {
  if (meta?.rfpLike || meta?.gpuSpoofed) return 'portable';
  const keys = ['coresBucket', 'gpuVendor', 'gpuModel', 'webglLimits', 'math', 'colorDepth', 'maxTouchPoints'];
  const filled = keys.filter((k) => {
    const v = features[k];
    if (v == null || v === 'randomized' || v === 'untrusted') return false;
    if (typeof v === 'object' && !Array.isArray(v) && Object.values(v).every((x) => x == null)) {
      return false;
    }
    return true;
  });
  const ratio = filled.length / keys.length;
  if (ratio >= 0.7) return 'high';
  if (ratio >= 0.4) return 'medium';
  return 'low';
}

export async function calculateCrossBrowserId(data) {
  const features = pickHardwareFeatures(data);
  const meta = features._meta || {};
  const hashable = featuresForHash(features);
  const portable = meta.portable || {};
  const fullFingerprint = await hashObject(hashable);
  const portableFingerprint = await hashObject(portable);
  const fullTrusted = Boolean(meta.gpuTrusted && meta.coresTrusted);

  return {
    // Canonical compare ID is always portable (Chrome↔Firefox match)
    fingerprint: portableFingerprint,
    compareId: portableFingerprint,
    portableFingerprint,
    fullFingerprint,
    fullTrusted,
    gpuSpoofed: Boolean(meta.gpuSpoofed),
    rfpLike: Boolean(meta.rfpLike),
    features,
    coverage: coverage(hashable, meta),
    rawGpu: {
      vendor: data.sota_webgl?.params?.unmaskedVendor || data.sota_webgl?.params?.vendor || null,
      renderer: data.sota_webgl?.params?.unmaskedRenderer || data.sota_webgl?.params?.renderer || null,
    },
    note:
      'XB fingerprint = portable (math + WebGL limits + colorDepth + touch). ' +
      'fullFingerprint adds GPU + cores when trusted. deviceMemory never hashed.',
  };
}

/** Exported for unit-style smoke checks */
export const _test = {
  normalizeGpuVendor,
  normalizeGpuModel,
  portableMath,
  gpuLooksSpoofed,
};
