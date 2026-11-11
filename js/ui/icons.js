/**
 * Icons from the Lucide library (static/lucide.min.js UMD).
 * Loaded as a classic script before the app module — works without node_modules at runtime.
 * @see https://lucide.dev
 */

function lucideApi() {
  const api = typeof window !== 'undefined' ? window.lucide : null;
  if (!api?.createElement) {
    throw new Error('Lucide not loaded — include static/lucide.min.js before the app module');
  }
  return api;
}

/** Resolve icon node from Lucide UMD exports (handles renames/aliases). */
function resolveIcon(api, ...names) {
  for (const name of names) {
    if (api[name]) return api[name];
  }
  return api.Fingerprint || api.FingerprintPattern || api.Circle;
}

const ALIASES = {
  fingerprint: ['Fingerprint', 'FingerprintPattern'],
  shield: ['Shield'],
  monitor: ['Monitor'],
  wifi: ['Wifi', 'WiFi'],
  cpu: ['Cpu'],
  audio: ['Volume2'],
  eye: ['Eye'],
  refresh: ['RefreshCw'],
  check: ['Check'],
  alert: ['TriangleAlert', 'AlertTriangle', 'TriangleExclamationPoint'],
  globe: ['Globe', 'Earth'],
  lock: ['Lock'],
  layers: ['Layers'],
  spark: ['Sparkles'],
  copy: ['Copy'],
  download: ['Download', 'HardDriveDownload', 'ArrowDownToLine'],
  storage: ['HardDrive'],
  fonts: ['Type'],
  speech: ['Mic'],
  codecs: ['Film'],
  intl: ['Languages'],
  emoji: ['Laugh', 'Smile', 'FaceGrinning'],
  sensors: ['Radar'],
  capabilities: ['Scan'],
  puzzle: ['Puzzle', 'Boxes', 'LayoutGrid'],
};

const KEY_ICON = {
  sota_webgpu: 'cpu',
  sota_webgl: 'cpu',
  sota_clientHints: 'globe',
  sota_audio: 'audio',
  sota_canvas: 'layers',
  sota_fonts: 'fonts',
  sota_unicode: 'fonts',
  sota_math: 'spark',
  sota_speech: 'speech',
  sota_codecs: 'codecs',
  sota_intl: 'intl',
  sota_storage: 'storage',
  sota_emoji: 'emoji',
  sota_domrect: 'layers',
  sota_css: 'spark',
  sota_screen: 'monitor',
  sota_svg: 'layers',
  sota_webrtc: 'wifi',
  sota_timing: 'refresh',
  sota_sensors: 'sensors',
  sota_capabilities: 'capabilities',
  sota_worker: 'cpu',
  sota_extensions: 'puzzle',
  sota_tls: 'lock',
  sota_composite: 'fingerprint',
  sota_antifp: 'shield',
  ghostIPData: 'wifi',
  ghostDeviceInfo: 'monitor',
  fingerprintjs: 'fingerprint',
  thumbmarkjs: 'fingerprint',
  detectincognitojs: 'eye',
};

const SIZE_PX = { sm: 16, md: 20, lg: 24 };

export function iconSvg(name, { size = 'sm', className = '' } = {}) {
  const api = lucideApi();
  const aliases = ALIASES[name] || ALIASES.fingerprint;
  const iconNode = resolveIcon(api, ...aliases);
  const px = SIZE_PX[size] || SIZE_PX.sm;
  return api.createElement(iconNode, {
    class: `icon icon--${size}${className ? ` ${className}` : ''}`.trim(),
    width: px,
    height: px,
    'stroke-width': 2,
    'aria-hidden': 'true',
  });
}

export function iconForKey(key) {
  return iconSvg(KEY_ICON[key] || 'fingerprint');
}
