import { hashObject } from '../../utils/hash.js';

/**
 * Educational extension / tamper probes (CreepJS-inspired, non-exhaustive).
 * - Chromium: fetch known web_accessible_resources under chrome-extension://
 * - Light JS tamper: iframe pristine toString, proxy-ish Math
 * - DOM/CSS markers some privacy tools leave
 * Does not enumerate private extension IDs beyond public WAR probes.
 */

/** Popular extensions with documented web_accessible_resources (Chromium). */
const CHROME_WAR_PROBES = [
  {
    id: 'cjpalhdlnbpafiamejdnhcphjbkeiagm',
    name: 'uBlock Origin',
    file: 'web_accessible_resources/noop.js',
  },
  {
    id: 'gighmmpiobklfepjocnamgkkbiglidom',
    name: 'AdBlock',
    file: 'button/help-bubble.css',
  },
  {
    id: 'bhlhnicpbhegnhibgkhkafaioakklbfh',
    name: 'ColorZilla',
    file: 'css/content-script.css',
  },
  {
    id: 'kbfnbcaeplbcioakkpcpgfkobkghlhen',
    name: 'Grammarly',
    file: 'src/css/Grammarly.styles.css',
  },
  {
    id: 'nkbihfbeogaeaoehlefnkodbefgpgknn',
    name: 'MetaMask',
    file: 'scripts/inpage.js',
  },
  {
    id: 'bfnaelmomeimhlpmgjnjophhpkkoljpa',
    name: 'Phantom',
    file: 'phantom.js',
  },
  {
    id: 'hdokiejnpimakedhajhdlcegeplioahd',
    name: 'LastPass',
    file: 'images/icon_128.png',
  },
];

function probeViaImage(url, timeoutMs = 1200) {
  return new Promise((resolve) => {
    const img = new Image();
    let done = false;
    const finish = (present, method) => {
      if (done) return;
      done = true;
      clearTimeout(t);
      resolve({ present, method });
    };
    const t = setTimeout(() => finish(false, 'img-timeout'), timeoutMs);
    img.onload = () => finish(true, 'img-load');
    img.onerror = () => finish(false, 'img-error');
    try {
      img.src = url;
    } catch {
      finish(false, 'img-throw');
    }
  });
}

async function probeChromeExtension(ext) {
  const url = `chrome-extension://${ext.id}/${ext.file}`;
  // Method 1: fetch (may be blocked by CSP / extension CORS)
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 1200);
    const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
    clearTimeout(t);
    if (res.type === 'opaque' || res.ok || res.status === 200) {
      return {
        id: ext.id,
        name: ext.name,
        present: true,
        status: res.status,
        type: res.type,
        method: 'fetch',
      };
    }
  } catch {
    /* try image fallback */
  }

  // Method 2: Image element (works for some WAR assets when fetch is blocked)
  const img = await probeViaImage(url);
  if (img.present) {
    return { id: ext.id, name: ext.name, present: true, method: img.method };
  }

  return { id: ext.id, name: ext.name, present: false, method: 'none' };
}

function detectChromeRuntime() {
  const runtime =
    typeof chrome !== 'undefined' && chrome?.runtime
      ? { id: chrome.runtime.id || null, available: true }
      : { available: false };
  return runtime;
}

function detectDomMarkers() {
  const markers = [];
  // Grammarly / password managers / adblock cosmetic classes sometimes appear
  const selectors = [
    ['grammarly-extension', '[data-grammarly-shadow-root], grammarly-extension'],
    ['lastpass', '[data-lastpass-icon-root], #__lpform_*'],
    ['1password', '[data-1p-ignore], [data-com-onepassword-filled]'],
    ['bitwarden', '[data-bwautofilled]'],
    ['darkreader', '.darkreader, style.darkreader'],
    ['stylus', 'style.stylus'],
  ];
  for (const [name, sel] of selectors) {
    try {
      // skip invalid * in query — use simple checks
      if (name === 'lastpass') {
        if (document.querySelector('[data-lastpass-icon-root]')) markers.push(name);
        continue;
      }
      if (document.querySelector(sel)) markers.push(name);
    } catch {
      /* ignore invalid selectors */
    }
  }
  return markers;
}

function detectJsTamper() {
  const lies = [];

  // webdriver
  try {
    if (navigator.webdriver) lies.push('navigator.webdriver');
  } catch {
    lies.push('navigator.webdriver-throw');
  }

  // Function.prototype.toString native brand
  try {
    const src = Function.prototype.toString.call(Math.cos);
    if (!/\{\s*\[native code\]\s*\}/.test(src)) lies.push('Math.cos-toString');
  } catch {
    lies.push('Math.cos-toString-throw');
  }

  // Fresh iframe pristine reference — compare native brands via toString, not identity
  // (cross-realm functions are always different object identities).
  try {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:absolute;width:0;height:0;border:0;left:-9999px;';
    document.body.appendChild(iframe);
    const iw = iframe.contentWindow;
    const pristineToString = iw?.Function?.prototype?.toString;
    const pageToString = Function.prototype.toString;
    if (pristineToString && pageToString) {
      const pageBrand = pageToString.call(Math.sin);
      const iframeBrand = pristineToString.call(iw.Math.sin);
      const pageViaIframe = pristineToString.call(Math.sin);
      if (!/\{\s*\[native code\]\s*\}/.test(pageBrand)) lies.push('Math.sin-not-native');
      if (pageBrand !== iframeBrand && pageViaIframe !== iframeBrand) {
        lies.push('iframe-toString-mismatch');
      }
    }
    iframe.remove();
  } catch {
    lies.push('iframe-blocked');
  }

  // PluginArray length inconsistencies (privacy extensions often empty plugins)
  try {
    const pluginsLen = navigator.plugins?.length ?? null;
    const mimeLen = navigator.mimeTypes?.length ?? null;
    if (pluginsLen === 0 && mimeLen === 0) {
      lies.push('empty-plugins-mimeTypes');
    }
  } catch {
    lies.push('plugins-throw');
  }

  return lies;
}

function detectHeadlessHints() {
  const hints = [];
  const ua = navigator.userAgent || '';
  if (/HeadlessChrome/i.test(ua)) hints.push('ua-headless');
  if (navigator.webdriver) hints.push('webdriver');
  if (!window.chrome && /Chrome\//.test(ua) && !/Edg\//.test(ua) && !/Brave/i.test(ua)) {
    // Missing window.chrome on Chromium-looking UA can mean automation / unusual build
    hints.push('missing-window.chrome');
  }
  return hints;
}

export async function collectExtensions() {
  const isChromium = typeof chrome !== 'undefined' || /Chrome|Chromium|Edg|Brave/i.test(navigator.userAgent);

  let chromeProbes = [];
  if (isChromium) {
    chromeProbes = await Promise.all(CHROME_WAR_PROBES.map(probeChromeExtension));
  }

  const present = chromeProbes.filter((p) => p.present).map((p) => p.name);
  const runtime = detectChromeRuntime();
  const domMarkers = detectDomMarkers();
  const jsTamper = detectJsTamper();
  const headless = detectHeadlessHints();

  const payload = {
    available: true,
    isChromium: Boolean(isChromium),
    chromeRuntime: runtime,
    chromeExtensionsPresent: present,
    chromeProbeDetails: chromeProbes,
    domMarkers,
    jsTamper,
    headlessHints: headless,
    note:
      'WAR probes only catch Chromium extensions that expose web_accessible_resources. Absence ≠ no extensions. Educational — not a complete inventory.',
  };

  return {
    ...payload,
    fingerprint: await hashObject({
      present: present.slice().sort(),
      domMarkers: domMarkers.slice().sort(),
      jsTamper: jsTamper.slice().sort(),
      headless: headless.slice().sort(),
      runtime: runtime.available,
    }),
  };
}
