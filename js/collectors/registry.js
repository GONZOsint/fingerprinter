import { VENDOR_COLLECTORS } from './vendor/index.js';
import { SOTA_COLLECTORS, collectAllSota } from './sota/index.js';

export const ALL_COLLECTORS = [...VENDOR_COLLECTORS, ...SOTA_COLLECTORS];

export async function collectAllFingerprints({ onProgress } = {}) {
  const results = {};
  const total = VENDOR_COLLECTORS.length + 1;
  let done = 0;

  const report = (key, status) => {
    done += 1;
    onProgress?.({ done, total, key, status, percent: Math.round((done / total) * 100) });
  };

  // Vendors in parallel — each collector is self-contained
  await Promise.all(
    VENDOR_COLLECTORS.map(async (collector) => {
      try {
        results[collector.key] = await collector.collect();
        report(collector.key, results[collector.key]?.error ? 'error' : 'ok');
      } catch (error) {
        results[collector.key] = { error: error.message || String(error) };
        report(collector.key, 'error');
      }
    })
  );

  try {
    const sota = await collectAllSota();
    Object.assign(results, sota);
    report('sota', 'ok');
  } catch (error) {
    results.sota_error = { error: error.message || String(error) };
    report('sota', 'error');
  }

  results.meta = {
    collectedAt: new Date().toISOString(),
    userAgent: navigator.userAgent,
    collectorCount: Object.keys(results).length,
  };

  return results;
}

export function displayValueFor(key, data) {
  if (data == null) return 'N/A';
  if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
    return String(data);
  }
  if (data.error) return `Error: ${data.error}`;
  if (data.available === false && data.reason) {
    return data.reason.length > 80 ? `${data.reason.slice(0, 80)}…` : data.reason;
  }
  if (data.clientReadable === false && data.note) {
    return 'server-side only';
  }
  if (Array.isArray(data.chromeExtensionsPresent)) {
    const n = data.chromeExtensionsPresent.length;
    const tamp = data.jsTamper?.length || 0;
    return n || tamp
      ? `${n} ext WAR · ${tamp} tamper signal${tamp === 1 ? '' : 's'}`
      : 'none detected';
  }
  if (data.emojiSetSize != null) return `${data.emojiSetSize} emoji patterns`;
  if (data.count != null && (data.detected || data.fontsCheckUnreliable != null)) {
    const oc = data.fontFaceOverclaimCount;
    return oc
      ? `${data.count} fonts · ${oc} check≠metrics`
      : `${data.count} fonts`;
  }
  if (Array.isArray(data.scripts) && data.stacks != null) {
    return `${data.scripts.length} scripts · ${data.stacks} stacks`;
  }
  if (Array.isArray(data.rects)) return `${data.rects.length} rects`;
  if (data.supports && typeof data.supports === 'object') {
    const n = Object.values(data.supports).filter(Boolean).length;
    const gamut = data.prefs?.['(color-gamut: p3)']
      ? ' · P3'
      : data.prefs?.['(color-gamut: srgb)']
        ? ' · sRGB'
        : '';
    return `${n} CSS features${gamut}`;
  }
  if (data.letterboxingLikely != null && data.screen) {
    return `${data.screen.width}×${data.screen.height}${data.letterboxingLikely ? ' · LB' : ''}`;
  }
  if (data.ice?.types) {
    return `${data.ice.candidateCount || 0} ICE · ${(data.rtp?.videoCodecs || []).length} video codecs`;
  }
  if (data.clock?.minDelta != null) return `Δmin ${data.clock.minDelta}`;
  if (data.bbox) return `bbox ${data.bbox.w}×${data.bbox.h}`;
  if (data.opfs?.denied || data.status === 'partial' || data.source === 'partial-no-fonts') {
    const fp = data.fingerprint || data.visitorId || data.hash;
    if (fp != null && fp !== '') return String(fp);
  }
  if (data.source === 'local-fallback') {
    return data.fingerprint ? String(data.fingerprint) : '—';
  }
  if (data.note && data.fingerprint == null && !data.error) {
    return data.note.length > 72 ? `${data.note.slice(0, 72)}…` : data.note;
  }
  const fp = data.fingerprint || data.visitorId || data.hash;
  if (fp != null && fp !== '') return String(fp);
  if (data.ip) return `${data.ip}`;
  if (data.privacyScore != null) return `score ${data.privacyScore}`;
  if (data.count != null) return `${data.count} items`;
  if (data.available === true) return 'available';
  return '—';
}
