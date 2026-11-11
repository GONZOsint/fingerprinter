import { hashObject } from '../../utils/hash.js';

function normalizeList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function firefoxFamily() {
  return /Firefox|Tor|Mullvad/i.test(navigator.userAgent || '');
}

/** ClientJS without getFonts() / getFingerprint() — those enumerate RFP-blocked fonts. */
async function collectWithoutFonts(client) {
  const plugins = normalizeList(client.getPlugins());
  const partial = {
    browserName: client.getBrowser(),
    browserVersion: client.getBrowserVersion(),
    os: client.getOS(),
    osVersion: client.getOSVersion(),
    device: client.getDevice(),
    deviceType: client.getDeviceType(),
    cpu: client.getCPU(),
    isMobile: client.isMobile(),
    currentResolution: client.getCurrentResolution(),
    availableResolution: client.getAvailableResolution(),
    colorDepth: client.getColorDepth(),
    plugins,
    fonts: [],
    hasArial: null,
    fontCount: 0,
    isLocalStorage: client.isLocalStorage(),
    isSessionStorage: client.isSessionStorage(),
    isCookie: client.isCookie(),
    timeZone: client.getTimeZone(),
    language: client.getLanguage(),
    systemLanguage: client.getSystemLanguage(),
    isCanvas: client.isCanvas(),
    canvasPrint: typeof client.getCanvasPrint === 'function' ? client.getCanvasPrint() : null,
    source: 'partial-no-fonts',
    status: 'partial',
  };
  partial.fingerprint = await hashObject({
    browserName: partial.browserName,
    browserVersion: partial.browserVersion,
    os: partial.os,
    osVersion: partial.osVersion,
    cpu: partial.cpu,
    currentResolution: partial.currentResolution,
    colorDepth: partial.colorDepth,
    plugins: partial.plugins,
    timeZone: partial.timeZone,
    language: partial.language,
    isCanvas: partial.isCanvas,
    canvasPrint: typeof partial.canvasPrint === 'string' ? partial.canvasPrint.slice(0, 64) : null,
  });
  return partial;
}

export async function clientjs() {
  if (typeof ClientJS === 'undefined') return { error: 'ClientJS not loaded' };
  try {
    const client = new ClientJS();
    if (firefoxFamily()) return collectWithoutFonts(client);

    const fonts = normalizeList(client.getFonts());
    const plugins = normalizeList(client.getPlugins());
    return {
      fingerprint: client.getFingerprint(),
      browserName: client.getBrowser(),
      browserVersion: client.getBrowserVersion(),
      os: client.getOS(),
      osVersion: client.getOSVersion(),
      device: client.getDevice(),
      deviceType: client.getDeviceType(),
      cpu: client.getCPU(),
      isMobile: client.isMobile(),
      currentResolution: client.getCurrentResolution(),
      availableResolution: client.getAvailableResolution(),
      colorDepth: client.getColorDepth(),
      plugins,
      fonts,
      hasArial: typeof client.isFont === 'function' ? Boolean(client.isFont('Arial')) : null,
      fontCount: fonts.length,
      isLocalStorage: client.isLocalStorage(),
      isSessionStorage: client.isSessionStorage(),
      isCookie: client.isCookie(),
      timeZone: client.getTimeZone(),
      language: client.getLanguage(),
      systemLanguage: client.getSystemLanguage(),
      isCanvas: client.isCanvas(),
      canvasPrint: client.getCanvasPrint(),
      source: 'package',
      status: 'ok',
    };
  } catch (error) {
    return { error: error.message || String(error) };
  }
}
