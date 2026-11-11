import { ALL_COLLECTORS, displayValueFor } from '../collectors/registry.js';
import { el } from '../utils/dom.js';
import { extractHighlights, renderJsonView } from './json-view.js';
import { iconForKey } from './icons.js';
import { whyFor, riskFor } from './copy.js';

export function labelFor(key) {
  const extras = {
    sota_composite: 'Composite',
    sota_antifp: 'Anti-FP Probe',
  };
  return ALL_COLLECTORS.find((c) => c.key === key)?.label || extras[key] || key;
}

export function chip(text, tone) {
  return el('span', { className: `chip${tone ? ` chip--${tone}` : ''}`, text });
}

function highlightList(data) {
  const list = el('dl', { className: 'fp-card__hl' });
  for (const [k, v] of extractHighlights(data, 5)) {
    list.appendChild(el('dt', { text: k }));
    list.appendChild(el('dd', { text: v }));
  }
  return list;
}

export function makeIdCard(key, data) {
  const card = el('article', {
    className: 'fp-card',
    tabIndex: '0',
    role: 'button',
    'aria-expanded': 'false',
  });
  if (data?.error) card.classList.add('is-error');
  if (data?.stability?.noisy || data?.stability?.likelyRandomized) card.classList.add('is-noisy');
  if (data?.available === false) card.classList.add('is-off');
  if (
    data?.status === 'partial' ||
    data?.source === 'partial-no-fonts' ||
    data?.opfs?.denied
  ) {
    card.classList.add('is-partial');
  }

  const head = el('div', { className: 'fp-card__head' });
  const titleRow = el('div', { className: 'fp-card__title-row' });
  titleRow.appendChild(iconForKey(key));
  titleRow.appendChild(el('h3', { className: 'fp-card__title', text: labelFor(key) }));
  head.appendChild(titleRow);
  head.appendChild(el('span', { className: 'fp-card__chevron', text: '＋', 'aria-hidden': 'true' }));

  const value = el('p', { className: 'fp-card__value', text: displayValueFor(key, data) });
  if (data?.fingerprint) value.title = String(data.fingerprint);
  const meta = el('div', { className: 'fp-card__meta' });
  const risk = riskFor(key);
  if (risk) meta.appendChild(chip(`risk ${risk}`, risk));
  if (
    data?.status === 'partial' ||
    data?.source === 'partial-no-fonts' ||
    data?.opfs?.denied
  ) {
    meta.appendChild(chip(data?.opfs?.denied ? 'OPFS denied' : 'partial', 'medium'));
  }
  if (data?.source === 'local-fallback') meta.appendChild(chip('fallback', 'ok'));
  if (data?.identityTrusted === false || data?.identityMasked || data?.webgpuScrubbed) {
    meta.appendChild(chip('identity masked', 'warn'));
  }
  if (data?.fontsCheckLied) meta.appendChild(chip('font check lied', 'warn'));
  else if (data?.fontsCheckUnreliable) meta.appendChild(chip('check≠presence', 'medium'));
  if (data?.stability?.noisy) meta.appendChild(chip('randomized', 'warn'));
  if (data?.available === false) meta.appendChild(chip('unavailable'));
  if (data?.privacyScore != null) meta.appendChild(chip(`score ${data.privacyScore}`, 'ok'));
  if (data?.count != null && key === 'sota_fonts') meta.appendChild(chip(`${data.count} fonts`));
  if (Array.isArray(data?.scripts)) meta.appendChild(chip(`${data.scripts.length} scripts`));
  if (data?.likelyProtections?.length) {
    meta.appendChild(chip(`${data.likelyProtections.length} protections`, 'ok'));
  }

  const preview = highlightList(data);
  const details = el('div', { className: 'fp-card__details', hidden: true });
  details.appendChild(el('p', { className: 'fp-card__why', text: whyFor(key) }));
  details.appendChild(renderJsonView(data));

  const toggle = () => {
    const open = details.hidden;
    details.hidden = !open;
    card.classList.toggle('is-open', open);
    card.setAttribute('aria-expanded', open ? 'true' : 'false');
    const chev = head.querySelector('.fp-card__chevron');
    if (chev) chev.textContent = open ? '－' : '＋';
  };
  card.addEventListener('click', (e) => {
    if (e.target.closest('.fp-card__details')) return;
    toggle();
  });
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle();
    }
  });

  card.append(head, value, meta, preview, details);
  return card;
}

export function section(title, keys, data, { subtitle } = {}) {
  const wrap = el('section', { className: 'fp-section' });
  const header = el('div', { className: 'fp-section__header' });
  header.appendChild(el('h2', { className: 'fp-section__title', text: title }));
  if (subtitle) header.appendChild(el('p', { className: 'fp-section__sub', text: subtitle }));
  wrap.appendChild(header);
  const grid = el('div', { className: 'fp-grid' });
  keys.forEach((key) => {
    if (!(key in data)) return;
    grid.appendChild(makeIdCard(key, data[key]));
  });
  wrap.appendChild(grid);
  return wrap;
}
