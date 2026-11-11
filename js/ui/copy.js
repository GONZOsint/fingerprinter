/** Plain-English blurbs + qualitative risk for each signal. */

const WHY = {
  sota_webgpu:
    'GPU adapter info and limits can identify your graphics stack. Some privacy browsers scrub this.',
  sota_clientHints:
    'High-entropy Client Hints can reveal more than the classic User-Agent — especially to third parties.',
  sota_audio:
    'Offline audio rendering differs by engine and can be randomized by anti-fingerprinting.',
  sota_canvas:
    'Drawn pixels vary by GPU/OS fonts. Dual-run noise suggests farbling; stable ≠ unprotected.',
  sota_webgl:
    'Renderer strings and shader output expose GPU class. Failed shaders are not treated as a GPU ID.',
  sota_fonts:
    'DOM + canvas width probes. document.fonts.check(true) for a fake family is normal (fallback ready); overclaims vs metrics are flagged. Local Font Access only if already granted.',
  sota_unicode:
    'Script coverage metrics (Arabic, CJK, Indic, …) via DOM/canvas widths — high entropy, often less farbled than Latin font lists.',
  sota_math:
    'Tiny Math library differences can help grouping; privacy browsers may normalize them.',
  sota_speech: 'Installed voice packs leak OS/language setup without a permission prompt.',
  sota_codecs:
    'canPlayType + MediaCapabilities (file / webrtc decode + encode). Encoding tries webrtc then record for engine differences.',
  sota_intl: 'Timezone and locale are stable until you travel or change settings.',
  sota_storage: 'Storage APIs and persistence flags differ by mode (e.g. private browsing).',
  sota_emoji:
    'TextMetrics + CSS box sizes + ZWJ/flags; missing-glyph hints and dual-paint canvas noise.',
  sota_domrect:
    'Layout geometry via getBoundingClientRect / Range — engines and DPI produce distinct rect sets.',
  sota_css:
    'System colors, CSS.supports, prefs, color-gamut (sRGB/P3/rec2020), HDR / transparency queries.',
  sota_screen:
    'Screen/window sizes, chrome gaps, DPR and letterboxing heuristics (Tor/Mullvad-style).',
  sota_svg: 'SVG getBBox + path length + optional rasterized filter output.',
  sota_webrtc:
    'RTCRtpReceiver/Sender codec details + local ICE types (no STUN). Addresses are not stored.',
  sota_timing:
    'Timer resolution, SharedArrayBuffer / COOP isolation, and minimal WASM compile checks.',
  sota_sensors: 'Media queries, permissions, and device counts form a capability mosaic.',
  sota_capabilities:
    'Emerging APIs (WebNN, Idle, Pressure, Keyboard, scheduling, ink, storageBuckets) — presence only.',
  sota_worker: 'Compares navigator values in a Worker vs the main thread — mismatches can mean spoofing.',
  sota_extensions:
    'Chromium web_accessible_resources probes, DOM markers, and light JS tamper / iframe toString checks. Incomplete by design.',
  sota_tls: 'JA3/JA4 are seen by servers from the TLS handshake — not readable from JavaScript.',
  sota_composite: 'Hash of present module fingerprints. Intermittent failures change this value.',
  sota_antifp: 'Educational posture score from noise and known protection heuristics — not a cert.',
  thumbmarkjs: 'Open-source multi-signal library used by trackers and researchers.',
  fingerprintjs: 'Popular open-source visitor ID. Re-collect refreshes it in this lab.',
  clientjs: 'Classic ClientJS fingerprint from fonts, canvas, and browser props.',
  imprintjs: 'ImprintJS suite of browser attribute tests.',
  detectincognitojs: 'Detects private/incognito mode via side-channel heuristics.',
  getBrowserFingerprint: 'Lightweight hardware-oriented npm fingerprint helper.',
  opfsFingerprint: 'Origin Private File System based persistence probe.',
  canvasFingerprint: 'Canvasprint library hash of 2D canvas output.',
  ghostIPData: 'Public IP and geo via a third-party lookup (requires network).',
  ghostDeviceInfo: 'Aggregated device/CPU/GPU/network summary.',
  browserSignature: 'browser-signature package digest.',
  browserFingerprintPkg: 'npm browser-fingerprint package (not a CUID).',
};

const RISK = {
  sota_webgpu: 'high',
  sota_clientHints: 'high',
  sota_canvas: 'high',
  sota_webgl: 'high',
  sota_fonts: 'high',
  sota_unicode: 'high',
  sota_audio: 'medium',
  sota_codecs: 'medium',
  sota_speech: 'medium',
  sota_emoji: 'medium',
  sota_domrect: 'medium',
  sota_css: 'low',
  sota_screen: 'medium',
  sota_svg: 'medium',
  sota_webrtc: 'high',
  sota_timing: 'medium',
  sota_intl: 'medium',
  sota_sensors: 'medium',
  sota_capabilities: 'low',
  sota_worker: 'medium',
  sota_extensions: 'medium',
  sota_storage: 'low',
  sota_math: 'low',
  sota_tls: 'low',
  ghostIPData: 'high',
  fingerprintjs: 'high',
  thumbmarkjs: 'high',
};

export function whyFor(key) {
  return WHY[key] || 'Expand for structured fields collected from this signal.';
}

export function riskFor(key) {
  return RISK[key] || null;
}
