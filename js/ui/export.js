import { formatJson } from '../utils/safe.js';
import { el } from '../utils/dom.js';
import { iconSvg } from './icons.js';

export function buildExportPayload(results, crossBrowser, version = '2.3.6') {
  return {
    version,
    exportedAt: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    crossBrowser: crossBrowser || null,
    results: results || {},
  };
}

export function exportJsonText(results, crossBrowser, version) {
  return formatJson(buildExportPayload(results, crossBrowser, version));
}

export function downloadJson(text, filename) {
  const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function defaultExportFilename(crossBrowser) {
  const id = (crossBrowser?.compareId || crossBrowser?.fingerprint || 'lab')
    .toString()
    .slice(0, 10);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `fingerprinter-${id}-${stamp}.json`;
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  ta.remove();
}

function flashLabel(btn, doneLabel, restoreMs = 1400) {
  const textNode = [...btn.childNodes].find((n) => n.nodeType === Node.TEXT_NODE);
  if (!textNode) return;
  const prev = textNode.textContent;
  textNode.textContent = ` ${doneLabel}`;
  setTimeout(() => {
    textNode.textContent = prev;
  }, restoreMs);
}

/**
 * Export panel: download + copy + collapsible preview.
 */
export function exportPanel(results, crossBrowser, { version = '2.3.6' } = {}) {
  const text = exportJsonText(results, crossBrowser, version);
  const wrap = el('section', { className: 'export-panel', id: 'fp-export' });

  const head = el('div', { className: 'export-panel__head' });
  head.appendChild(el('h2', { className: 'export-panel__title', text: 'Export JSON' }));
  wrap.appendChild(head);

  const actions = el('div', { className: 'export-panel__actions' });

  const dl = el('button', { type: 'button', className: 'btn' });
  dl.appendChild(iconSvg('download'));
  dl.appendChild(document.createTextNode(' Download JSON'));
  dl.addEventListener('click', () => {
    downloadJson(text, defaultExportFilename(crossBrowser));
    flashLabel(dl, 'Downloaded');
  });
  actions.appendChild(dl);

  const copy = el('button', { type: 'button', className: 'btn btn--ghost' });
  copy.appendChild(iconSvg('copy'));
  copy.appendChild(document.createTextNode(' Copy JSON'));
  copy.addEventListener('click', async () => {
    try {
      await copyText(text);
      flashLabel(copy, 'Copied');
    } catch {
      flashLabel(copy, 'Copy failed');
    }
  });
  actions.appendChild(copy);

  wrap.appendChild(actions);

  const details = el('details', { className: 'export-panel__preview' });
  details.appendChild(el('summary', { text: 'Preview JSON' }));
  const pre = el('pre', { id: 'fingerprint-result', className: 'export-panel__pre' });
  pre.textContent = text;
  details.appendChild(pre);
  wrap.appendChild(details);

  return wrap;
}
