/**
 * Analyze already-collected SOTA results for anti-fingerprinting / farbling.
 * Does NOT re-run expensive collectors (avoids duplicate work & inconsistent hashes).
 *
 * Limitations:
 * - Brave farbling is often stable within a single page session, so dual-run
 *   canvas/audio checks can miss it. Same-load equality ≠ unprotected.
 * - Canvas randomization defenses can still be attacked (WWW 2025 "Breaking the Shield").
 * - Score is educational, not a security grade.
 */
export function analyzeAntiFingerprint(results = {}) {
  const canvas = results.sota_canvas || {};
  const audio = results.sota_audio || {};
  const webgl = results.sota_webgl || {};
  const hints = results.sota_clientHints || {};
  const webgpu = results.sota_webgpu || {};
  const caps = results.sota_capabilities || {};

  const chromeWidthGap = Math.abs((window.outerWidth || 0) - (window.innerWidth || 0));
  const chromeHeightGap = Math.abs((window.outerHeight || 0) - (window.innerHeight || 0));
  const ua = navigator.userAgent || '';
  const firefoxFamily = /Firefox|Tor|Mullvad/i.test(ua);
  const iw = window.innerWidth || 0;
  const ih = window.innerHeight || 0;
  const roundedViewport = (iw > 0 && iw % 100 === 0) || (ih > 0 && ih % 100 === 0);
  const letterboxingLikely =
    firefoxFamily &&
    chromeWidthGap >= 100 &&
    chromeHeightGap >= 100 &&
    roundedViewport &&
    iw / Math.max(screen.width, 1) < 0.95;

  const webglRenderer =
    webgl.params?.unmaskedRenderer || webgl.params?.renderer || '';
  const webglVendor = webgl.params?.unmaskedVendor || webgl.params?.vendor || '';
  const webglIdentitySpoofed =
    webgl.identityTrusted === false ||
    /,\s*or similar$/i.test(webglRenderer) ||
    /^brave$/i.test(String(webglRenderer).trim()) ||
    /^brave$/i.test(String(webglVendor).trim());

  const signals = {
    canvasNoisy: Boolean(canvas.stability?.noisy),
    audioNoisy: Boolean(audio.stability?.noisy),
    webglNoisy: Boolean(webgl.stability?.noisy),
    webglIdentitySpoofed,
    canvasSameReadStable: canvas.stability?.sameReadStable ?? null,
    canvasAvailable: canvas.available !== false,
    audioAvailable: audio.available !== false,
    webglAvailable: webgl.available !== false && !webgl.renderError,
    webgpuPresent: Boolean(webgpu.available),
    // Null vendor on a live adapter = scrub (features/limits may still exist)
    webgpuScrubbed:
      webgpu.available === true &&
      (webgpu.webgpuScrubbed === true ||
        webgpu.identityMasked === true ||
        (!webgpu.vendor && !webgpu.isFallbackAdapter)),
    uaClientHintsPresent: Boolean(hints.available),
    uaClientHintsDenied: Boolean(hints.denied),
    maxTouchPoints: navigator.maxTouchPoints || 0,
    hardwareConcurrency: navigator.hardwareConcurrency || null,
    deviceMemory: navigator.deviceMemory ?? null,
    platform: navigator.platform || null,
    userAgent: ua,
    doNotTrack: navigator.doNotTrack || null,
    globalPrivacyControl: navigator.globalPrivacyControl ?? null,
    webdriver: navigator.webdriver ?? false,
    letterboxingLikely,
    chromeWidthGap,
    chromeHeightGap,
    timezoneUTC: Intl.DateTimeFormat().resolvedOptions().timeZone === 'UTC',
    dualRunLimitation:
      'Same-load dual-run misses session-stable farbling (e.g. Brave). Compare reloads and other browsers manually.',
    canvasDefenseNote:
      'Randomization-based canvas defenses may still be predictable/attackable (Nguyen & Vadrevu, WWW 2025).',
    scoreDisclaimer: 'Educational posture score — not a security certification.',
    emergingApis: {
      webnn: caps.webnn?.available ?? null,
      idleDetection: caps.idleDetection?.available ?? null,
      computePressure: caps.computePressure?.available ?? null,
    },
    workerMismatch: null,
  };

  const likelyProtections = [];
  if (signals.canvasNoisy || signals.audioNoisy || signals.webglNoisy) {
    likelyProtections.push('output-randomization');
  }
  if (canvas.stability?.sameReadStable === false) {
    likelyProtections.push('canvas-readback-noise');
  }
  if (signals.webglIdentitySpoofed) likelyProtections.push('webgl-identity-spoof');
  if (signals.webgpuScrubbed) likelyProtections.push('webgpu-scrub');
  if (!signals.uaClientHintsPresent && firefoxFamily) {
    likelyProtections.push('no-client-hints');
  }
  if (signals.letterboxingLikely) likelyProtections.push('letterboxing');
  if (signals.timezoneUTC && firefoxFamily) likelyProtections.push('timezone-utc');

  if (
    /Tor Browser|Mullvad/i.test(ua) ||
    (firefoxFamily &&
      signals.deviceMemory == null &&
      signals.hardwareConcurrency != null &&
      [2, 4, 8].includes(signals.hardwareConcurrency) &&
      !signals.uaClientHintsPresent)
  ) {
    likelyProtections.push('resistFingerprinting-like');
  }

  const braveUa =
    /Brave/i.test(ua) ||
    Boolean(
      hints?.lowEntropy?.brands?.some?.((b) => /Brave/i.test(b.brand)) ||
        hints?.highEntropy?.brands?.some?.((b) => /Brave/i.test(b.brand))
    );
  if (braveUa) {
    likelyProtections.push('brave-ua');
    if (signals.webglIdentitySpoofed || signals.webgpuScrubbed) {
      likelyProtections.push('brave-gpu-scrub');
    }
    if (signals.canvasNoisy || signals.audioNoisy || signals.webglNoisy) {
      likelyProtections.push('brave-like-farbling');
    } else {
      likelyProtections.push('brave-session-stable-possible');
    }
  }

  try {
    if (matchMedia('(forced-colors: active)').matches) {
      likelyProtections.push('forced-colors');
    }
  } catch {
    /* ignore */
  }

  return {
    available: true,
    signals,
    likelyProtections: [...new Set(likelyProtections)],
    privacyScore: scorePrivacy(signals, likelyProtections),
    components: {
      canvas: {
        noisy: canvas.stability?.noisy,
        sameReadStable: canvas.stability?.sameReadStable,
        fingerprint: canvas.fingerprint,
      },
      audio: { noisy: audio.stability?.noisy, fingerprint: audio.fingerprint },
      webgl: {
        noisy: webgl.stability?.noisy,
        renderError: webgl.renderError || null,
        fingerprint: webgl.fingerprint,
      },
    },
  };
}

function scorePrivacy(signals, protections) {
  let score = 30;
  if (signals.canvasNoisy) score += 15;
  if (signals.audioNoisy) score += 10;
  if (signals.webglNoisy) score += 10;
  if (protections.includes('canvas-readback-noise')) score += 8;
  if (signals.webgpuScrubbed) score += 8;
  if (signals.webglIdentitySpoofed || protections.includes('webgl-identity-spoof')) score += 6;
  if (protections.includes('no-client-hints')) score += 4;
  if (signals.globalPrivacyControl) score += 5;
  if (protections.includes('resistFingerprinting-like')) score += 18;
  if (protections.includes('letterboxing')) score += 10;
  if (protections.includes('timezone-utc')) score += 6;
  if (protections.includes('brave-ua')) score += 5;
  if (protections.includes('brave-gpu-scrub')) score += 10;
  if (protections.includes('brave-session-stable-possible')) score += 3;
  if (signals.webdriver) score -= 20;
  return Math.max(0, Math.min(100, score));
}
