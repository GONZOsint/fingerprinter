import { loadLibraries } from './core/loader.js';
import { collectAllFingerprints } from './collectors/registry.js';
import { calculateCrossBrowserId } from './cross-browser/id.js';
import { renderDashboard, setProgress } from './ui/dashboard.js';
import { iconSvg } from './ui/icons.js';
import {
  downloadJson,
  defaultExportFilename,
  exportJsonText,
} from './ui/export.js';

const VERSION = '2.3.6';

const state = {
  busy: false,
  lastResults: null,
};

function qs(sel) {
  return document.querySelector(sel);
}

function setStatus(msg, tone = 'info') {
  const el = qs('[data-status]');
  if (!el) return;
  el.textContent = msg;
  el.dataset.tone = tone;
}

function setExportEnabled(on) {
  const btn = qs('[data-export-json]');
  if (!btn) return;
  if (on) {
    btn.removeAttribute('disabled');
    btn.removeAttribute('title');
  } else {
    btn.setAttribute('disabled', 'true');
    btn.title = 'Collect first';
  }
}

function wireButtons() {
  const collect = qs('[data-collect]');
  if (collect && !collect.dataset.iconized) {
    collect.dataset.iconized = '1';
    const label = collect.textContent.trim();
    collect.textContent = '';
    collect.appendChild(iconSvg('fingerprint'));
    collect.appendChild(document.createTextNode(` ${label}`));
  }

  const exp = qs('[data-export-json]');
  if (exp && !exp.dataset.iconized) {
    exp.dataset.iconized = '1';
    const label = exp.textContent.trim();
    exp.textContent = '';
    exp.appendChild(iconSvg('download'));
    exp.appendChild(document.createTextNode(` ${label}`));
  }
}

function runExportDownload() {
  if (!state.lastResults) {
    setStatus('Collect first', 'warn');
    return;
  }
  const { results, crossBrowser } = state.lastResults;
  const text = exportJsonText(results, crossBrowser, VERSION);
  downloadJson(text, defaultExportFilename(crossBrowser));
  setStatus('Exported', 'ok');
}

async function runCollection() {
  if (state.busy) return;
  state.busy = true;

  const btn = qs('[data-collect]');
  const progress = qs('[data-progress]');
  const dash = qs('#dashboard-container');
  const loader = qs('.loader-container');

  btn?.setAttribute('disabled', 'true');
  btn?.setAttribute('aria-busy', 'true');
  setExportEnabled(false);
  loader?.classList.add('active');
  setStatus('Collecting', 'info');
  setProgress(progress, { percent: 0, key: 'start', status: 'ok' });

  try {
    const results = await collectAllFingerprints({
      onProgress: (p) => setProgress(progress, p),
    });
    const crossBrowser = await calculateCrossBrowserId(results);
    state.lastResults = { results, crossBrowser };

    if (progress) progress.hidden = true;
    renderDashboard(dash, results, crossBrowser, { version: VERSION });
    setExportEnabled(true);
    setStatus('Done', 'ok');

    window.__FINGERPRINTER__ = {
      results,
      crossBrowser,
      version: VERSION,
      collectedAt: results.meta?.collectedAt,
    };

    const params = new URLSearchParams(location.search);
    const reportId = params.get('report');
    if (reportId) {
      try {
        await fetch('/api/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: reportId,
            results,
            crossBrowser,
            userAgent: navigator.userAgent,
          }),
        });
      } catch (err) {
        console.warn('Report POST failed', err);
      }
    }
  } catch (error) {
    console.error(error);
    setStatus(`Failed: ${error.message || error}`, 'error');
    if (dash) {
      dash.classList.add('show');
      dash.replaceChildren();
      const banner = document.createElement('div');
      banner.className = 'error-banner';
      banner.textContent = String(error.message || error);
      dash.appendChild(banner);
    }
  } finally {
    state.busy = false;
    btn?.removeAttribute('disabled');
    btn?.removeAttribute('aria-busy');
    loader?.classList.remove('active');
    if (state.lastResults) setExportEnabled(true);
  }
}

function showHardenedTip() {
  const tip = qs('[data-hardened-tip]');
  if (tip && /Tor|Mullvad/i.test(navigator.userAgent || '')) tip.hidden = false;
}

async function boot() {
  showHardenedTip();
  if (!window.lucide?.createElement) {
    setStatus('Lucide icons failed to load (static/lucide.min.js).', 'error');
  }
  wireButtons();
  setExportEnabled(false);
  setStatus('Loading…', 'info');
  const libStatus = await loadLibraries({
    onStatus: (name, st) => console.log(`[lib] ${name}: ${st}`),
  });
  window.__FP_LIBS__ = libStatus;

  const failed = Object.entries(libStatus).some(([, v]) => v === 'error');
  setStatus('Ready', failed ? 'warn' : 'ok');

  qs('[data-collect]')?.addEventListener('click', runCollection);
  qs('[data-export-json]')?.addEventListener('click', runExportDownload);

  const params = new URLSearchParams(location.search);
  if (params.get('autocollect') === '1') {
    await runCollection();
  }
}

window.addEventListener('DOMContentLoaded', boot);
window.refreshData = () => location.reload();
