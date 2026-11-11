/** FingerprintJS open-source collector — local ESM only (CSP script-src 'self'). */
export async function fingerprintjs() {
  try {
    const FingerprintJS = await import('../../../static/fingerprintjsv4.js');
    const fp = await FingerprintJS.load();
    const result = await fp.get();
    return {
      visitorId: result.visitorId,
      fingerprint: result.visitorId,
      components: result.components,
    };
  } catch (error) {
    return {
      error: `FingerprintJS failed: ${error.message || error}`,
    };
  }
}
