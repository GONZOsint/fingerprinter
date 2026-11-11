import { hashObject } from '../../utils/hash.js';

/**
 * Local multi-signal fallbacks when optional CDN packages are unavailable (CSP).
 * Not identical to upstream packages — educational substitutes.
 */

export async function localHardwareFingerprint() {
  const parts = {
    cores: navigator.hardwareConcurrency ?? null,
    memory: navigator.deviceMemory ?? null,
    platform: navigator.platform || null,
    maxTouch: navigator.maxTouchPoints || 0,
    colorDepth: screen.colorDepth,
    dpr: window.devicePixelRatio || 1,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
    langs: [...(navigator.languages || [])].slice(0, 5),
  };
  const fingerprint = await hashObject(parts);
  return {
    fingerprint,
    source: 'local-fallback',
    parts,
  };
}

export async function localBrowserSignature() {
  const data = {
    ua: navigator.userAgent,
    language: navigator.language,
    cookieEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack,
    hardwareConcurrency: navigator.hardwareConcurrency ?? null,
    deviceMemory: navigator.deviceMemory ?? null,
    screen: `${screen.width}x${screen.height}x${screen.colorDepth}`,
    timezoneOffset: new Date().getTimezoneOffset(),
  };
  return {
    fingerprint: await hashObject(data),
    source: 'local-fallback',
    data,
  };
}
