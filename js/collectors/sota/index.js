import { collectWebGPU } from './webgpu.js';
import { collectClientHints } from './client-hints.js';
import { collectAudio } from './audio.js';
import { collectCanvas } from './canvas.js';
import { collectFonts } from './fonts.js';
import { collectMath } from './math.js';
import { collectSpeech } from './speech.js';
import { collectCodecs } from './codecs.js';
import { collectWebGL } from './webgl.js';
import { collectIntl } from './intl.js';
import { collectStorage } from './storage.js';
import { collectEmojiMetrics } from './emoji.js';
import { collectSensors } from './sensors.js';
import { collectTlsStatus } from './tls.js';
import { collectCapabilities } from './capabilities.js';
import { collectWorkerProbe } from './worker-probe.js';
import { collectExtensions } from './extensions.js';
import { collectDomRect } from './domrect.js';
import { collectCss } from './css.js';
import { collectScreen } from './screen.js';
import { collectWebRtc } from './webrtc.js';
import { collectTiming } from './timing.js';
import { collectSvg } from './svg.js';
import { collectUnicode } from './unicode.js';
import { analyzeAntiFingerprint } from './antifp.js';
import { hashObject } from '../../utils/hash.js';

export const SOTA_COLLECTORS = [
  { key: 'sota_webgpu', label: 'WebGPU', group: 'sota', collect: collectWebGPU },
  { key: 'sota_clientHints', label: 'Client Hints', group: 'sota', collect: collectClientHints },
  { key: 'sota_audio', label: 'AudioContext', group: 'sota', collect: collectAudio },
  { key: 'sota_canvas', label: 'Canvas+', group: 'sota', collect: collectCanvas },
  { key: 'sota_webgl', label: 'WebGL+', group: 'sota', collect: collectWebGL },
  { key: 'sota_fonts', label: 'Fonts', group: 'sota', collect: collectFonts },
  { key: 'sota_unicode', label: 'Unicode / Scripts', group: 'sota', collect: collectUnicode },
  { key: 'sota_math', label: 'Math', group: 'sota', collect: collectMath },
  { key: 'sota_speech', label: 'Speech Voices', group: 'sota', collect: collectSpeech },
  { key: 'sota_codecs', label: 'Codecs', group: 'sota', collect: collectCodecs },
  { key: 'sota_intl', label: 'Intl/Locale', group: 'sota', collect: collectIntl },
  { key: 'sota_storage', label: 'Storage', group: 'sota', collect: collectStorage },
  { key: 'sota_emoji', label: 'Emoji/MathML', group: 'sota', collect: collectEmojiMetrics },
  { key: 'sota_domrect', label: 'DomRect', group: 'sota', collect: collectDomRect },
  { key: 'sota_css', label: 'CSS / Media', group: 'sota', collect: collectCss },
  { key: 'sota_screen', label: 'Screen / Window', group: 'sota', collect: collectScreen },
  { key: 'sota_svg', label: 'SVG / Filter', group: 'sota', collect: collectSvg },
  { key: 'sota_webrtc', label: 'WebRTC', group: 'sota', collect: collectWebRtc },
  { key: 'sota_timing', label: 'Timing / WASM', group: 'sota', collect: collectTiming },
  { key: 'sota_sensors', label: 'Sensors/MQ', group: 'sota', collect: collectSensors },
  { key: 'sota_capabilities', label: 'Emerging APIs', group: 'sota', collect: collectCapabilities },
  { key: 'sota_worker', label: 'Worker Probe', group: 'sota', collect: collectWorkerProbe },
  { key: 'sota_extensions', label: 'Extensions / Tamper', group: 'sota', collect: collectExtensions },
  { key: 'sota_tls', label: 'TLS JA3/JA4', group: 'sota', collect: collectTlsStatus },
];

/** Layout/DOM mutators — run sequentially to avoid metric races */
const LAYOUT_KEYS = new Set([
  'sota_fonts',
  'sota_unicode',
  'sota_domrect',
  'sota_emoji',
  'sota_css',
  'sota_svg',
  'sota_extensions',
]);

async function runOne(collector, results) {
  try {
    results[collector.key] = await collector.collect();
  } catch (error) {
    results[collector.key] = { error: error.message || String(error) };
  }
}

export async function collectAllSota() {
  const results = {};
  const parallel = SOTA_COLLECTORS.filter((c) => !LAYOUT_KEYS.has(c.key));
  const layout = SOTA_COLLECTORS.filter((c) => LAYOUT_KEYS.has(c.key));
  // Stable layout order: fonts → domrect → emoji → css → svg → extensions
  const layoutOrder = [
    'sota_fonts',
    'sota_unicode',
    'sota_domrect',
    'sota_emoji',
    'sota_css',
    'sota_svg',
    'sota_extensions',
  ];
  layout.sort((a, b) => layoutOrder.indexOf(a.key) - layoutOrder.indexOf(b.key));

  await Promise.all(parallel.map((c) => runOne(c, results)));
  for (const c of layout) {
    await runOne(c, results);
  }

  results.sota_antifp = analyzeAntiFingerprint(results);
  const extra = [];
  if (results.sota_worker?.lied) {
    results.sota_antifp.signals.workerMismatch = results.sota_worker.mismatches;
    extra.push('worker-nav-mismatch');
  }
  if (results.sota_fonts?.fontsCheckLied) {
    results.sota_antifp.signals.fontsCheckLied = true;
    extra.push('fonts-check-overclaim');
  } else if (results.sota_fonts?.fontsCheckUnreliable) {
    results.sota_antifp.signals.fontsCheckUnreliable = true;
    // Informational only — normal on Chrome/Firefox; do not inflate privacy score
  }
  if (results.sota_fonts?.fontFaceOverclaimCount > 0) {
    results.sota_antifp.signals.fontFaceOverclaimCount =
      results.sota_fonts.fontFaceOverclaimCount;
  }
  if (results.sota_emoji?.stability?.canvasNoisy) {
    results.sota_antifp.signals.emojiCanvasNoisy = true;
    extra.push('emoji-canvas-noise');
  }
  if (results.sota_extensions?.jsTamper?.length) {
    results.sota_antifp.signals.jsTamper = results.sota_extensions.jsTamper;
    extra.push('js-tamper-signals');
  }
  if (results.sota_extensions?.chromeExtensionsPresent?.length) {
    results.sota_antifp.signals.extensionsSeen = results.sota_extensions.chromeExtensionsPresent;
  }
  if (results.sota_css?.prefs?.['(forced-colors: active)']) {
    results.sota_antifp.signals.forcedColors = true;
    extra.push('forced-colors');
  }
  if (results.sota_screen?.letterboxingLikely) {
    results.sota_antifp.signals.letterboxingLikely = true;
    if (!results.sota_antifp.likelyProtections?.includes('letterboxing')) {
      extra.push('letterboxing');
    }
  }
  if (results.sota_timing?.clock?.minDelta != null && results.sota_timing.clock.minDelta >= 1) {
    results.sota_antifp.signals.coarseTimer = results.sota_timing.clock.minDelta;
    extra.push('coarse-timer');
  }
  if (extra.length) {
    results.sota_antifp.likelyProtections = [
      ...new Set([...(results.sota_antifp.likelyProtections || []), ...extra]),
    ];
    if (
      extra.includes('js-tamper-signals') ||
      extra.includes('fonts-check-overclaim') ||
      extra.includes('coarse-timer')
    ) {
      results.sota_antifp.privacyScore = Math.min(
        100,
        (results.sota_antifp.privacyScore || 0) + 4
      );
    }
  }

  const compositeParts = SOTA_COLLECTORS.map((c) => results[c.key]?.fingerprint).filter(Boolean);
  results.sota_composite = {
    fingerprint: await hashObject(compositeParts),
    parts: compositeParts.length,
    note: 'Composite changes if any part fails intermittently.',
  };

  return results;
}
