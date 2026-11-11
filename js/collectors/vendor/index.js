import { thumbmark } from './thumbmark.js';
import { fingerprintjs } from './fingerprintjs.js';
import { clientjs } from './clientjs.js';
import { ghostIP, ghostDevice } from './ghost.js';
import {
  imprintjs,
  detectIncognito,
  getBrowserFingerprint,
  opfs,
  canvasprint,
  collectBrowserSignature,
  browserFingerprintPkg,
} from './misc.js';

export const VENDOR_COLLECTORS = [
  { key: 'thumbmarkjs', label: 'ThumbmarkJS', group: 'vendor', collect: thumbmark },
  { key: 'imprintjs', label: 'ImprintJS', group: 'vendor', collect: imprintjs },
  { key: 'fingerprintjs', label: 'FingerprintJS', group: 'vendor', collect: fingerprintjs },
  { key: 'clientjs', label: 'ClientJS', group: 'vendor', collect: clientjs },
  { key: 'detectincognitojs', label: 'Detect Incognito', group: 'vendor', collect: detectIncognito },
  { key: 'getBrowserFingerprint', label: 'get-browser-fingerprint', group: 'vendor', collect: getBrowserFingerprint },
  { key: 'opfsFingerprint', label: 'OPFS', group: 'vendor', collect: opfs },
  { key: 'canvasFingerprint', label: 'Canvasprint', group: 'vendor', collect: canvasprint },
  { key: 'ghostIPData', label: 'GhostIP', group: 'vendor', collect: ghostIP },
  { key: 'ghostDeviceInfo', label: 'GhostDevice', group: 'vendor', collect: ghostDevice },
  { key: 'browserSignature', label: 'BrowserSignature', group: 'vendor', collect: collectBrowserSignature },
  {
    key: 'browserFingerprintPkg',
    label: 'browser-fingerprint',
    group: 'vendor',
    collect: browserFingerprintPkg,
  },
];
