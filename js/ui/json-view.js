import { el } from '../utils/dom.js';

const SKIP_KEYS = new Set(['error']);
const PRIORITY = [
  'fingerprint',
  'visitorId',
  'hash',
  'privacyScore',
  'available',
  'count',
  'ip',
  'vendor',
  'architecture',
  'device',
  'noisy',
  'sameReadStable',
  'likelyRandomized',
];

function isPlainObject(v) {
  return v != null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date);
}

function formatPrimitive(value) {
  if (value === null) return 'null';
  if (value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return String(value);
    if (Math.abs(value) >= 1e9 || (Math.abs(value) > 0 && Math.abs(value) < 1e-4)) {
      return value.toExponential(4);
    }
    if (!Number.isInteger(value)) return Number(value.toPrecision(8)).toString();
    return String(value);
  }
  const s = String(value);
  if (s.length > 120) return `${s.slice(0, 117)}…`;
  return s;
}

function shortLabel(key) {
  return String(key)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function sortKeys(keys) {
  return [...keys].sort((a, b) => {
    const ia = PRIORITY.indexOf(a);
    const ib = PRIORITY.indexOf(b);
    if (ia !== -1 || ib !== -1) {
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    }
    return a.localeCompare(b);
  });
}

function summarizeValue(value) {
  if (value == null) return '—';
  if (typeof value !== 'object') return formatPrimitive(value);
  if (Array.isArray(value)) {
    if (!value.length) return '[] empty';
    if (value.every((x) => typeof x !== 'object' || x == null)) {
      const preview = value.slice(0, 6).map(formatPrimitive).join(', ');
      return value.length > 6 ? `${preview} (+${value.length - 6})` : preview;
    }
    return `${value.length} items`;
  }
  const keys = Object.keys(value);
  if (!keys.length) return '{} empty';
  if (value.fingerprint) return String(value.fingerprint);
  if (value.error) return `Error: ${value.error}`;
  return `${keys.length} fields`;
}

/** Flatten useful top-level highlights for the card summary row. */
export function extractHighlights(data, limit = 6) {
  if (data == null) return [];
  if (typeof data !== 'object') return [['value', formatPrimitive(data)]];
  if (data.error) return [['error', String(data.error)]];

  const rows = [];
  const push = (k, v) => {
    if (rows.length >= limit) return;
    if (v == null || v === '') return;
    if (typeof v === 'object') {
      const s = summarizeValue(v);
      if (s && s !== '{} empty' && s !== '[] empty') rows.push([k, s]);
      return;
    }
    rows.push([k, formatPrimitive(v)]);
  };

  for (const key of PRIORITY) {
    if (key in data && !SKIP_KEYS.has(key)) push(key, data[key]);
  }

  // Stability nested
  if (data.stability && typeof data.stability === 'object') {
    if (data.stability.noisy != null) push('noisy', data.stability.noisy);
    if (data.stability.sameReadStable != null) push('sameRead', data.stability.sameReadStable);
  }

  for (const key of sortKeys(Object.keys(data))) {
    if (SKIP_KEYS.has(key) || PRIORITY.includes(key) || key === 'stability') continue;
    if (typeof data[key] === 'object') continue;
    push(key, data[key]);
  }

  // One nested object preview if still sparse
  if (rows.length < 3) {
    for (const key of sortKeys(Object.keys(data))) {
      if (typeof data[key] !== 'object' || data[key] == null) continue;
      push(key, data[key]);
      if (rows.length >= limit) break;
    }
  }

  return rows;
}

function renderArray(arr, depth) {
  const wrap = el('div', { className: 'jv-array' });
  if (!arr.length) {
    wrap.appendChild(el('div', { className: 'jv-empty', text: 'Empty list' }));
    return wrap;
  }

  // Primitive list → chips / compact list
  if (arr.every((x) => x == null || typeof x !== 'object')) {
    const list = el('ul', { className: 'jv-chips' });
    const max = depth > 1 ? 40 : 80;
    arr.slice(0, max).forEach((item) => {
      list.appendChild(el('li', { className: 'jv-chip', text: formatPrimitive(item) }));
    });
    if (arr.length > max) {
      list.appendChild(el('li', { className: 'jv-more', text: `+${arr.length - max} more` }));
    }
    wrap.appendChild(list);
    return wrap;
  }

  arr.slice(0, 30).forEach((item, i) => {
    const row = el('details', { className: 'jv-node', open: depth < 1 && arr.length <= 5 });
    row.appendChild(el('summary', { className: 'jv-summary', text: `[${i}] ${summarizeValue(item)}` }));
    row.appendChild(renderValue(item, depth + 1));
    wrap.appendChild(row);
  });
  if (arr.length > 30) {
    wrap.appendChild(el('div', { className: 'jv-more', text: `+${arr.length - 30} more items` }));
  }
  return wrap;
}

function renderObject(obj, depth) {
  const table = el('div', { className: 'jv-table' });
  const keys = sortKeys(Object.keys(obj)).filter((k) => !SKIP_KEYS.has(k) || obj.error);
  if (obj.error) {
    const err = el('div', { className: 'jv-row jv-row--error' });
    err.appendChild(el('div', { className: 'jv-key', text: 'Error' }));
    err.appendChild(el('div', { className: 'jv-val', text: String(obj.error) }));
    table.appendChild(err);
  }
  if (!keys.length && !obj.error) {
    table.appendChild(el('div', { className: 'jv-empty', text: 'No fields' }));
    return table;
  }

  for (const key of keys) {
    if (key === 'error') continue;
    const value = obj[key];
    const row = el('div', { className: 'jv-row' });
    row.appendChild(el('div', { className: 'jv-key', text: shortLabel(key) }));

    if (value != null && typeof value === 'object') {
      const cell = el('div', { className: 'jv-val jv-val--nested' });
      const nested = el('details', {
        className: 'jv-node',
        open: depth < 1 && (Array.isArray(value) ? value.length <= 8 : Object.keys(value).length <= 8),
      });
      nested.appendChild(
        el('summary', { className: 'jv-summary', text: summarizeValue(value) })
      );
      nested.appendChild(renderValue(value, depth + 1));
      cell.appendChild(nested);
      row.appendChild(cell);
    } else {
      const val = el('div', { className: 'jv-val' });
      if (typeof value === 'boolean') {
        val.appendChild(
          el('span', {
            className: `jv-bool jv-bool--${value}`,
            text: value ? 'yes' : 'no',
          })
        );
      } else {
        val.textContent = formatPrimitive(value);
      }
      row.appendChild(val);
    }
    table.appendChild(row);
  }
  return table;
}

function renderValue(value, depth = 0) {
  if (value == null || typeof value !== 'object') {
    return el('div', { className: 'jv-primitive', text: formatPrimitive(value) });
  }
  if (Array.isArray(value)) return renderArray(value, depth);
  if (isPlainObject(value)) return renderObject(value, depth);
  return el('div', { className: 'jv-primitive', text: formatPrimitive(value) });
}

/** Structured viewer for collector payloads (replaces raw JSON dump). */
export function renderJsonView(data, { showRaw = true } = {}) {
  const root = el('div', { className: 'jv' });
  root.appendChild(renderValue(data, 0));

  if (showRaw) {
    const raw = el('details', { className: 'jv-raw' });
    raw.appendChild(el('summary', { text: 'Raw JSON' }));
    const pre = el('pre', { className: 'jv-raw__pre' });
    try {
      pre.textContent = JSON.stringify(data, null, 2);
    } catch {
      pre.textContent = String(data);
    }
    raw.appendChild(pre);
    root.appendChild(raw);
  }

  // Stop card toggle when interacting with nested details
  root.addEventListener('click', (e) => e.stopPropagation());
  root.addEventListener('keydown', (e) => e.stopPropagation());
  return root;
}
