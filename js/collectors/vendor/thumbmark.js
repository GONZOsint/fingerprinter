import { safeCall } from '../../utils/safe.js';

export async function thumbmark() {
  if (!window.ThumbmarkJS?.getFingerprintData) {
    return { error: 'ThumbmarkJS not loaded' };
  }
  try {
    window.ThumbmarkJS.setOption?.('exclude', ['system.browser.version']);
  } catch {
    /* ignore */
  }
  const data = await safeCall(() => window.ThumbmarkJS.getFingerprintData(), 'ThumbmarkJS.data');
  const fp = await safeCall(() => window.ThumbmarkJS.getFingerprint(), 'ThumbmarkJS.fp');
  return {
    ...(data.success ? data.data : { error: data.error }),
    fingerprint: fp.success ? fp.data : null,
  };
}
