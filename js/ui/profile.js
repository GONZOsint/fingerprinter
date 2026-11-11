import { el } from '../utils/dom.js';
import { chip } from './cards.js';
import { iconSvg } from './icons.js';
import { renderJsonView } from './json-view.js';

function guessBrowser(ua, hints, client) {
  const brands = hints?.lowEntropy?.brands || hints?.highEntropy?.brands;
  if (Array.isArray(brands) && brands.length) {
    const named = brands.find((b) => b.brand && !/Not.?A.?Brand/i.test(b.brand));
    if (named) return `${named.brand} ${named.version || ''}`.trim();
  }
  if (client?.browserName) {
    return `${client.browserName} ${client.browserVersion || ''}`.trim();
  }
  if (/Edg\//.test(ua)) return `Edge ${ua.match(/Edg\/([\d.]+)/)?.[1] || ''}`.trim();
  if (/Brave/i.test(ua)) return 'Brave';
  try {
    if (navigator.userAgentData?.brands?.some((b) => /Brave/i.test(b.brand))) return 'Brave';
  } catch {
    /* ignore */
  }
  if (/Firefox\//.test(ua)) return `Firefox ${ua.match(/Firefox\/([\d.]+)/)?.[1] || ''}`.trim();
  if (/Chrome\//.test(ua)) return `Chrome ${ua.match(/Chrome\/([\d.]+)/)?.[1] || ''}`.trim();
  if (/Safari\//.test(ua) && !/Chrome/.test(ua)) return 'Safari';
  return 'Unknown';
}

function shortHash(h) {
  if (!h || typeof h !== 'string') return '—';
  return h.length > 20 ? `${h.slice(0, 10)}…${h.slice(-6)}` : h;
}

function kv(dl, label, value, { title, muted } = {}) {
  const dt = el('dt', { text: label });
  const dd = el('dd', {
    text: value == null || value === '' ? '—' : String(value),
  });
  if (title) {
    dt.title = title;
    dd.title = title;
  }
  if (muted) dd.classList.add('is-muted');
  dl.appendChild(dt);
  dl.appendChild(dd);
}

function makeCopyBtn(label, value) {
  const btn = el('button', { type: 'button', className: 'btn btn--ghost btn--compact' });
  btn.appendChild(iconSvg('copy'));
  btn.appendChild(document.createTextNode(` ${label}`));
  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(value);
      btn.lastChild.textContent = ' Copied';
      setTimeout(() => {
        btn.lastChild.textContent = ` ${label}`;
      }, 1100);
    } catch {
      btn.lastChild.textContent = ' Failed';
    }
  });
  return btn;
}

function buildXbHero(xb, xbPrimary, fullTrusted) {
  const strip = el('section', { className: 'xb-hero', id: 'xb-compare' });

  const labelRow = el('div', { className: 'xb-hero__label-row' });
  labelRow.appendChild(el('h3', { className: 'xb-hero__label', text: 'XB compare' }));
  const chips = el('div', { className: 'xb-hero__chips' });
  if (xb.coverage) {
    const tone =
      xb.coverage === 'high'
        ? 'high'
        : xb.coverage === 'portable'
          ? 'portable'
          : xb.coverage === 'medium'
            ? 'medium'
            : 'low';
    chips.appendChild(chip(xb.coverage, tone));
  }
  if (xb.gpuSpoofed || xb.rfpLike) {
    chips.appendChild(chip(xb.rfpLike ? 'RFP-like' : 'GPU spoofed', 'rfp'));
  }
  labelRow.appendChild(chips);
  strip.appendChild(labelRow);

  const hashEl = el('code', {
    className: 'xb-hero__hash',
    text: xbPrimary || '—',
  });
  hashEl.title = 'Canonical cross-browser compare ID (portable)';
  strip.appendChild(hashEl);

  const hw = el('div', { className: 'xb-hero__hardware' });
  const hwHead = el('div', { className: 'xb-hero__hw-head' });
  hwHead.appendChild(el('span', { className: 'xb-hero__hw-label', text: 'XB hardware' }));
  if (!fullTrusted) {
    hwHead.appendChild(chip('untrusted', 'rfp'));
  }
  hw.appendChild(hwHead);
  if (fullTrusted && xb.fullFingerprint) {
    hw.appendChild(
      el('code', {
        className: 'xb-hero__hw-hash',
        text: xb.fullFingerprint,
        title: 'Trusted GPU + cores enrichment (same-engine)',
      })
    );
  } else {
    hw.appendChild(
      el('p', {
        className: 'xb-hero__hw-muted',
        text: 'Use XB compare across browsers — GPU/cores not trusted here.',
      })
    );
  }
  strip.appendChild(hw);

  if (xbPrimary) {
    const actions = el('div', { className: 'xb-hero__actions' });
    actions.appendChild(makeCopyBtn('Copy compare', xbPrimary));
    if (fullTrusted && xb.fullFingerprint) {
      actions.appendChild(makeCopyBtn('Copy hardware', xb.fullFingerprint));
    }
    strip.appendChild(actions);
  }

  return strip;
}

/**
 * Top-of-results profile: XB hero first, then browser/device/signals, then engine IDs.
 */
export function profilePanel(data, crossBrowser) {
  const ua = navigator.userAgent || '';
  const client = data.clientjs || {};
  const hints = data.sota_clientHints || {};
  const webgl = data.sota_webgl?.params || {};
  const device = data.ghostDeviceInfo || {};
  const antifp = data.sota_antifp || {};
  const intl = data.sota_intl || {};
  const ip = data.ghostIPData || {};
  const incog = data.detectincognitojs || {};
  const fonts = data.sota_fonts || {};
  const speech = data.sota_speech || {};
  const ext = data.sota_extensions || {};
  const xb = crossBrowser || {};
  const meta = xb.features?._meta || {};
  const fullTrusted = xb.fullTrusted ?? Boolean(meta.gpuTrusted && meta.coresTrusted);
  const gpuSpoofed = xb.gpuSpoofed ?? Boolean(meta.gpuSpoofed);
  const xbPrimary = xb.compareId || xb.portableFingerprint || xb.fingerprint;

  const browser = guessBrowser(ua, hints, client);
  const os = `${client.os || hints.highEntropy?.platform || navigator.platform || '—'} ${
    client.osVersion || hints.highEntropy?.platformVersion || ''
  }`.trim();

  const gpuVendorNorm = xb.features?.gpuVendor;
  const gpuModelNorm = xb.features?.gpuModel;
  const gpuLabel =
    fullTrusted && gpuVendorNorm
      ? `${gpuVendorNorm}${gpuModelNorm ? ` · ${gpuModelNorm}` : ''}`
      : gpuSpoofed
        ? 'untrusted (spoofed/RFP)'
        : gpuVendorNorm || webgl.unmaskedVendor || device.graphics?.vendor || '—';
  const rawRenderer =
    webgl.unmaskedRenderer || webgl.renderer || device.graphics?.renderer || '—';
  const rendererLabel = gpuSpoofed
    ? `${String(rawRenderer).slice(0, 48)}${String(rawRenderer).length > 48 ? '…' : ''} · spoofed`
    : rawRenderer.length > 64
      ? `${rawRenderer.slice(0, 64)}…`
      : rawRenderer;

  const cores = device.cpu?.logicalCores ?? navigator.hardwareConcurrency ?? '—';
  const memRaw = device.memory?.deviceMemory ?? navigator.deviceMemory;
  const mem = memRaw != null ? `${memRaw} GB` : '—';
  const screenStr = `${screen.width}×${screen.height} @${window.devicePixelRatio || 1}x · ${screen.colorDepth}-bit`;
  const tz = intl.timezone || client.timeZone || '—';
  const langs = (intl.languages || navigator.languages || []).slice(0, 4).join(', ') || '—';
  const protections = (antifp.likelyProtections || []).slice(0, 6).join(', ') || 'none detected';
  const score = antifp.privacyScore ?? '—';

  const wrap = el('section', { className: 'profile' });

  const head = el('div', { className: 'profile__head' });
  const title = el('h2', { className: 'profile__title' });
  title.appendChild(iconSvg('monitor'));
  title.appendChild(document.createTextNode(' Detected profile'));
  head.appendChild(title);
  const badges = el('div', { className: 'profile__badges' });
  badges.appendChild(chip(`score ${score}`, 'ok'));
  if (incog.isPrivate) badges.appendChild(chip('incognito', 'warn'));
  if (data.sota_canvas?.stability?.noisy) badges.appendChild(chip('canvas noise', 'warn'));
  if (data.sota_screen?.letterboxingLikely) badges.appendChild(chip('letterboxing', 'medium'));
  if (data.sota_timing?.clock?.minDelta >= 1) badges.appendChild(chip('coarse timer', 'rfp'));
  if (data.sota_webgpu?.identityMasked || data.sota_webgpu?.webgpuScrubbed) {
    badges.appendChild(chip('WebGPU scrubbed', 'medium'));
  }
  if (fonts.fontsCheckLied) badges.appendChild(chip('font overclaims', 'warn'));
  if (ext.chromeExtensionsPresent?.length) {
    badges.appendChild(chip(`${ext.chromeExtensionsPresent.length} ext`, 'medium'));
  }
  head.appendChild(badges);
  wrap.appendChild(head);

  wrap.appendChild(
    el('p', {
      className: 'profile__identity',
      text: `${browser} · ${os}`,
    })
  );

  // XB hero — primary compare surface
  wrap.appendChild(buildXbHero(xb, xbPrimary, fullTrusted));

  const grids = el('div', { className: 'profile__grids' });

  const browserDl = el('dl', { className: 'profile__dl' });
  browserDl.appendChild(el('div', { className: 'profile__dl-label', text: 'Browser' }));
  kv(browserDl, 'Name', browser);
  kv(browserDl, 'Engine UA', ua.length > 72 ? `${ua.slice(0, 72)}…` : ua);
  kv(
    browserDl,
    'Client Hints',
    hints.available === false
      ? 'unavailable'
      : hints.highEntropy?.platformVersion || hints.lowEntropy?.platform || 'yes'
  );
  kv(browserDl, 'Languages', langs);
  kv(browserDl, 'Timezone', tz);
  kv(browserDl, 'Incognito', incog.isPrivate ? 'Yes' : incog.error ? '—' : 'No');
  grids.appendChild(browserDl);

  const deviceDl = el('dl', { className: 'profile__dl' });
  deviceDl.appendChild(el('div', { className: 'profile__dl-label', text: 'Device' }));
  kv(deviceDl, 'OS', os);
  kv(deviceDl, 'CPU cores', cores);
  kv(deviceDl, 'Memory', mem);
  kv(deviceDl, 'GPU', gpuLabel);
  kv(deviceDl, 'Renderer', rendererLabel, { title: String(rawRenderer) });
  kv(deviceDl, 'Screen', screenStr);
  kv(deviceDl, 'Touch', String(navigator.maxTouchPoints || 0));
  grids.appendChild(deviceDl);

  const signalDl = el('dl', { className: 'profile__dl' });
  signalDl.appendChild(el('div', { className: 'profile__dl-label', text: 'Signals' }));
  kv(signalDl, 'Privacy score', String(score));
  kv(signalDl, 'Protections', protections);
  kv(
    signalDl,
    'Fonts detected',
    fonts.count != null
      ? `${fonts.count}${fonts.fontFaceOverclaimCount ? ` · ${fonts.fontFaceOverclaimCount} overclaims` : ''}`
      : '—'
  );
  kv(signalDl, 'Unicode scripts', String(data.sota_unicode?.scripts?.length ?? '—'));
  kv(signalDl, 'Speech voices', String(speech.count ?? '—'));
  kv(signalDl, 'Emoji patterns', String(data.sota_emoji?.emojiSetSize ?? '—'));
  kv(
    signalDl,
    'WebRTC codecs',
    data.sota_webrtc?.rtp
      ? `${(data.sota_webrtc.rtp.audioCodecs || []).length}a/${(data.sota_webrtc.rtp.videoCodecs || []).length}v${
          data.sota_webrtc.rtpSender ? ' +sender' : ''
        }`
      : '—'
  );
  kv(
    signalDl,
    'IP',
    ip.ip ? `${ip.ip}${ip.city ? ` · ${ip.city}` : ''}${ip.country ? `, ${ip.country}` : ''}` : 'N/A'
  );
  kv(
    signalDl,
    'Extensions (WAR)',
    ext.chromeExtensionsPresent?.length ? ext.chromeExtensionsPresent.join(', ') : 'none probed'
  );
  grids.appendChild(signalDl);

  wrap.appendChild(grids);

  const engDetails = el('details', { className: 'fp-inline-details profile__engine-ids' });
  engDetails.appendChild(el('summary', { text: 'Engine-specific IDs' }));
  const engGrid = el('dl', { className: 'profile__id-grid' });
  kv(engGrid, 'FingerprintJS', shortHash(data.fingerprintjs?.visitorId || data.fingerprintjs?.fingerprint), {
    title: data.fingerprintjs?.visitorId || data.fingerprintjs?.fingerprint || '',
  });
  kv(engGrid, 'Thumbmark', shortHash(data.thumbmarkjs?.fingerprint), {
    title: data.thumbmarkjs?.fingerprint || '',
  });
  kv(engGrid, 'Composite', shortHash(data.sota_composite?.fingerprint), {
    title: data.sota_composite?.fingerprint || '',
  });
  kv(engGrid, 'Canvas+', shortHash(data.sota_canvas?.fingerprint || data.sota_canvas?.hash), {
    title: data.sota_canvas?.fingerprint || data.sota_canvas?.hash || '',
  });
  kv(engGrid, 'Math', shortHash(data.sota_math?.fingerprint), {
    title: data.sota_math?.fingerprint || '',
  });
  kv(engGrid, 'WebGL+', shortHash(data.sota_webgl?.fingerprint), {
    title: data.sota_webgl?.fingerprint || '',
  });
  engDetails.appendChild(engGrid);
  wrap.appendChild(engDetails);

  if (xb.features || device?.cpu) {
    const more = el('details', { className: 'fp-inline-details' });
    more.appendChild(el('summary', { text: 'Normalized XB features & raw device' }));
    const box = el('div', { className: 'profile__more' });
    if (xb.features) box.appendChild(renderJsonView(xb.features, { showRaw: false }));
    if (xb.rawGpu) box.appendChild(renderJsonView({ rawGpu: xb.rawGpu }, { showRaw: false }));
    if (device && !device.error) box.appendChild(renderJsonView(device, { showRaw: false }));
    more.appendChild(box);
    wrap.appendChild(more);
  }

  return wrap;
}
