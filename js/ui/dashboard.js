import { ALL_COLLECTORS } from '../collectors/registry.js';
import { el, clearEl } from '../utils/dom.js';
import { section } from './cards.js';
import { profilePanel } from './profile.js';
import { exportPanel } from './export.js';

export { setProgress } from './progress.js';

const VENDOR_KEYS = ALL_COLLECTORS.filter((c) => c.group === 'vendor').map((c) => c.key);
const SOTA_KEYS = [
  ...ALL_COLLECTORS.filter((c) => c.group === 'sota').map((c) => c.key),
  'sota_antifp',
  'sota_composite',
];

const PROFILE_VENDOR_SKIP = new Set([
  'ghostDeviceInfo',
  'ghostIPData',
  'detectincognitojs',
]);

export function renderDashboard(root, data, crossBrowser, { version = '2.3.6' } = {}) {
  clearEl(root);
  root.classList.add('show');

  root.appendChild(profilePanel(data, crossBrowser));

  const nav = el('nav', { className: 'dash-nav', 'aria-label': 'Result sections' });
  nav.append(
    el('a', { href: '#xb-compare', className: 'dash-nav__link', text: 'XB' }),
    el('a', { href: '#fp-modules', className: 'dash-nav__link', text: 'Modules' }),
    el('a', { href: '#fp-libs', className: 'dash-nav__link', text: 'Libraries' }),
    el('a', { href: '#fp-export', className: 'dash-nav__link', text: 'Export' })
  );
  root.appendChild(nav);

  const sotaSec = section('Modules', SOTA_KEYS, data, {
    subtitle: `${SOTA_KEYS.filter((k) => k in data).length} probes`,
  });
  sotaSec.id = 'fp-modules';
  root.appendChild(sotaSec);

  const libKeys = VENDOR_KEYS.filter((k) => !PROFILE_VENDOR_SKIP.has(k));
  const libSec = section('Libraries', libKeys, data);
  libSec.id = 'fp-libs';
  root.appendChild(libSec);

  root.appendChild(exportPanel(data, crossBrowser, { version }));
}
