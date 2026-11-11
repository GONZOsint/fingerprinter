import { safeCall } from '../../utils/safe.js';
import { localBrowserSignature, localHardwareFingerprint } from './fallbacks.js';
import { detectIncognitoLocal } from './detect-incognito.js';
import { collectOpfsLocal } from './opfs-local.js';

export async function imprintjs() {
  if (typeof imprint === 'undefined' || typeof imprint.test !== 'function') {
    return { error: 'ImprintJS not loaded' };
  }
  // Skip installedFonts under Firefox RFP — floods console with font visibility blocks
  const ua = navigator.userAgent || '';
  const firefoxFamily = /Firefox|Tor|Mullvad/i.test(ua);
  const tests = [
    'audio', 'availableScreenResolution', 'canvas', 'colorDepth', 'cookies', 'cpuClass',
    'deviceDpi', 'doNotTrack', 'indexedDb',
    ...(firefoxFamily ? [] : ['installedFonts']),
    'language', 'localStorage',
    'pixelRatio', 'platform', 'plugins', 'processorCores', 'screenResolution',
    'timezoneOffset', 'touchSupport', 'userAgent', 'webGl',
  ];
  const res = await safeCall(() => imprint.test(tests), 'ImprintJS');
  if (!res.success) return { error: res.error };
  // imprint.test usually returns a string hash; always wrap for card UI
  const fp =
    typeof res.data === 'string' || typeof res.data === 'number'
      ? String(res.data)
      : res.data?.fingerprint != null
        ? String(res.data.fingerprint)
        : null;
  if (firefoxFamily) {
    return {
      fingerprint: fp,
      source: 'partial-no-fonts',
      status: 'partial',
    };
  }
  return { fingerprint: fp, source: 'package', status: 'ok' };
}

export async function detectIncognito() {
  const ua = navigator.userAgent || '';
  // Package throws "cannot determine the browser" on recent Firefox — prefer local
  if (/Firefox|Tor|Mullvad/i.test(ua)) {
    try {
      return await detectIncognitoLocal();
    } catch (error) {
      return { error: error.message || String(error) };
    }
  }
  if (typeof window.detectIncognito === 'function') {
    try {
      const data = await window.detectIncognito();
      return { ...data, source: 'package' };
    } catch {
      /* fall through to local */
    }
  }
  try {
    return await detectIncognitoLocal();
  } catch (error) {
    return { error: error.message || String(error) };
  }
}

export async function getBrowserFingerprint() {
  if (typeof window.getBrowserFingerprint === 'function') {
    const res = await safeCall(
      () => window.getBrowserFingerprint({ hardwareOnly: true, debug: false }),
      'getBrowserFingerprint'
    );
    const data = res.success ? res.data : { error: res.error };
    if (typeof data === 'string' || typeof data === 'number') {
      return { fingerprint: String(data), value: data, source: 'package' };
    }
    return { ...data, source: 'package' };
  }
  return localHardwareFingerprint();
}

export async function opfs() {
  // opfs.min.js uses Function()/eval and font enumeration — blocked by our CSP
  // and floods Firefox RFP font-visibility warnings. Always use the local probe.
  return collectOpfsLocal();
}

export async function canvasprint() {
  if (typeof Canvasprint !== 'function') return { error: 'Canvasprint not loaded' };
  try {
    const value = new Canvasprint().get();
    return typeof value === 'object' ? value : { fingerprint: value };
  } catch (error) {
    return { error: error.message || String(error) };
  }
}

export async function collectBrowserSignature() {
  const fn =
    typeof window.browserSignature === 'function'
      ? window.browserSignature
      : typeof globalThis.browserSignature === 'function'
        ? globalThis.browserSignature
        : null;
  if (fn) {
    try {
      const signature = fn();
      const base = typeof signature === 'object' ? signature : { fingerprint: signature };
      return { ...base, source: 'package' };
    } catch (error) {
      return { error: error.message || String(error), ...(await localBrowserSignature()) };
    }
  }
  return localBrowserSignature();
}

/** npm package `browser-fingerprint` — fallback to local hardware hash. */
export async function browserFingerprintPkg() {
  if (typeof window.browserFingerprintPkg === 'function') {
    try {
      const value = window.browserFingerprintPkg();
      const base = typeof value === 'object' ? value : { fingerprint: value };
      return { ...base, source: 'package' };
    } catch (error) {
      return { error: error.message || String(error), ...(await localHardwareFingerprint()) };
    }
  }
  return localHardwareFingerprint();
}
