import { loadScript } from '../utils/safe.js';

/**
 * All vendor libs load from static/ only (CSP script-src 'self').
 * Optional packages without a local copy stay unavailable — no CDN attempts.
 */
const LOCAL_SCRIPTS = [
  { src: 'static/imprint.min.js', name: 'ImprintJS', ready: () => typeof imprint !== 'undefined' },
  { src: 'static/client.min.js', name: 'ClientJS', ready: () => typeof ClientJS !== 'undefined' },
  // opfs.min.js skipped — Function()/eval + font probes; collector uses opfs-local.js
  { src: 'static/canvasprint.js', name: 'Canvasprint', ready: () => typeof Canvasprint === 'function' },
  { src: 'static/ghostip.js', name: 'GhostIP', ready: () => typeof ghostip !== 'undefined' },
  { src: 'static/ghostdevice.js', name: 'GhostDevice', ready: () => typeof ghostDeviceInfo !== 'undefined' },
  {
    // Prefer neutral filename — some blockers match "detectIncognito" in the URL
    src: 'static/incognito-detect.min.js',
    name: 'DetectIncognito',
    ready: () => typeof window.detectIncognito === 'function' || typeof detectIncognito === 'function',
    optional: true,
    altSrc: 'static/detectIncognito.min.js',
  },
  {
    src: 'static/Thumbmark.js',
    name: 'ThumbmarkJS',
    ready: () => Boolean(window.ThumbmarkJS?.getFingerprintData),
  },
];

async function tryLoad(src) {
  try {
    await loadScript(src, { timeoutMs: 12000 });
    return true;
  } catch {
    return false;
  }
}

export async function loadLibraries({ onStatus } = {}) {
  const status = {};

  for (const item of LOCAL_SCRIPTS) {
    let ok = await tryLoad(item.src);
    if (!ok && item.altSrc) ok = await tryLoad(item.altSrc);
    let ready = ok && (!item.ready || item.ready());
    if (item.name === 'DetectIncognito' && ready && typeof detectIncognito === 'function') {
      window.detectIncognito = detectIncognito;
    }
    status[item.name] = ready ? 'ok' : item.optional ? 'fallback' : 'error';
    onStatus?.(item.name, status[item.name]);
  }

  status.OPFS = 'local';
  onStatus?.('OPFS', status.OPFS);

  // Optional packages use local fallbacks in collectors when UMD is absent.
  status.BrowserSignature =
    typeof window.browserSignature === 'function' || typeof globalThis.browserSignature === 'function'
      ? 'ok'
      : 'fallback';
  status.getBrowserFingerprint =
    typeof window.getBrowserFingerprint === 'function' ? 'ok' : 'fallback';
  status.browserFingerprintPkg =
    typeof window.browserFingerprintPkg === 'function' ? 'ok' : 'fallback';

  onStatus?.('BrowserSignature', status.BrowserSignature);
  onStatus?.('getBrowserFingerprint', status.getBrowserFingerprint);
  onStatus?.('browserFingerprintPkg', status.browserFingerprintPkg);

  return status;
}
