#!/usr/bin/env node
/**
 * Cross-Browser ID compare.
 * Auto: Chrome + Brave (+ Firefox spawn).
 * Tor/Mullvad: skipped unless FP_HARDENED=1 — they block scripts until NoScript allows 127.0.0.1.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, extname, dirname, resolve, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { LAB_CSP } from '../js/core/csp-headers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PORT = 8799;
const HOST = '127.0.0.1';
const INCLUDE_HARDENED = process.env.FP_HARDENED === '1';

const BROWSERS = [
  { id: 'chrome', exe: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', engine: 'chromium' },
  {
    id: 'brave',
    exe: 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
    engine: 'chromium',
  },
  { id: 'firefox', exe: 'C:\\Program Files\\Mozilla Firefox\\firefox.exe', engine: 'spawn-report' },
  {
    id: 'tor',
    exe: process.env.FP_TOR_EXE || '',
    engine: 'spawn-report',
    hardened: true,
  },
  {
    id: 'mullvad',
    exe: process.env.FP_MULLVAD_EXE || '',
    engine: 'spawn-report',
    hardened: true,
  },
];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.json': 'application/json',
  '.map': 'application/json',
};

const reports = new Map();

function startServer() {
  return new Promise((resolvePromise) => {
    const server = createServer(async (req, res) => {
      const sec = {
        'Content-Security-Policy': LAB_CSP,
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
      };
      try {
        if (req.method === 'POST' && req.url === '/api/report') {
          const chunks = [];
          for await (const c of req) chunks.push(c);
          const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
          if (body.id) reports.set(body.id, body);
          res.writeHead(200, { 'Content-Type': 'application/json', ...sec });
          res.end(JSON.stringify({ ok: true }));
          return;
        }
        const pathOnly = decodeURIComponent((req.url || '/').split('?')[0]);
        const rel = pathOnly === '/' ? '/index.html' : pathOnly;
        const file = resolve(ROOT, normalize(rel.replace(/^\//, '').replace(/^([/\\])+/, '')));
        const rootResolved = resolve(ROOT);
        if (!file.startsWith(rootResolved) && file !== rootResolved) {
          res.writeHead(403, sec);
          res.end('forbidden');
          return;
        }
        if (!existsSync(file) || statSync(file).isDirectory()) {
          res.writeHead(404, sec);
          res.end('not found');
          return;
        }
        res.writeHead(200, {
          'Content-Type': MIME[extname(file)] || 'application/octet-stream',
          ...sec,
        });
        res.end(readFileSync(file));
      } catch (e) {
        res.writeHead(500);
        res.end(String(e));
      }
    });
    server.listen(PORT, HOST, () => resolvePromise(server));
  });
}

async function collectChromium(cfg) {
  if (!existsSync(cfg.exe)) return { id: cfg.id, error: 'executable missing' };
  const browser = await chromium.launch({ headless: true, executablePath: cfg.exe });
  const page = await browser.newPage();
  try {
    await page.goto(`http://${HOST}:${PORT}/?autocollect=1&report=${cfg.id}`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await page.waitForFunction(() => window.__FINGERPRINTER__?.crossBrowser?.fingerprint, null, {
      timeout: 120000,
    });
    const data = await page.evaluate(() => {
      const xb = window.__FINGERPRINTER__.crossBrowser;
      return {
        fingerprint: xb.fingerprint,
        coverage: xb.coverage,
        features: xb.features,
        lucide: Boolean(window.lucide?.createElement),
        iconCount: document.querySelectorAll('svg.icon').length,
      };
    });
    await browser.close();
    return { id: cfg.id, ...data };
  } catch (e) {
    await browser.close().catch(() => {});
    return { id: cfg.id, error: e.message || String(e) };
  }
}

async function collectSpawn(cfg, timeoutMs = 60000) {
  if (!existsSync(cfg.exe)) return { id: cfg.id, error: 'executable missing', skipped: true };
  reports.delete(cfg.id);
  const url = `http://${HOST}:${PORT}/?autocollect=1&report=${encodeURIComponent(cfg.id)}`;
  // -url forces http(s); never pass a bare path (Firefox-family may treat it as file://)
  const child = spawn(cfg.exe, ['-url', url], { detached: true, stdio: 'ignore' });
  child.unref();
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (reports.has(cfg.id)) {
      const body = reports.get(cfg.id);
      try {
        process.kill(child.pid);
      } catch {
        /* ignore */
      }
      return {
        id: cfg.id,
        fingerprint: body.crossBrowser?.fingerprint,
        coverage: body.crossBrowser?.coverage,
        features: body.crossBrowser?.features,
        via: 'spawn-report',
      };
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  try {
    process.kill(child.pid);
  } catch {
    /* ignore */
  }
  return {
    id: cfg.id,
    skipped: true,
    error:
      cfg.hardened
        ? `NoScript likely blocked scripts. Manually open ${url}, allow scripts for 127.0.0.1, then Collect.`
        : `timeout waiting for report (${url})`,
  };
}

const server = await startServer();
const results = [];
for (const cfg of BROWSERS) {
  if (cfg.hardened && !INCLUDE_HARDENED) {
    results.push({
      id: cfg.id,
      skipped: true,
      note: 'Set FP_HARDENED=1 after allowing NoScript for 127.0.0.1. Never use file://.',
    });
    console.log(`Skipping ${cfg.id} (hardened — manual NoScript allow required)`);
    continue;
  }
  console.log(`Collecting ${cfg.id}…`);
  results.push(cfg.engine === 'chromium' ? await collectChromium(cfg) : await collectSpawn(cfg));
}
server.close();

const byId = Object.fromEntries(results.filter((r) => r.fingerprint).map((r) => [r.id, r]));
const summary = {
  chromeBraveMatch: byId.chrome && byId.brave ? byId.chrome.fingerprint === byId.brave.fingerprint : null,
  chromeFirefoxMatch:
    byId.chrome && byId.firefox ? byId.chrome.fingerprint === byId.firefox.fingerprint : null,
  fingerprints: Object.fromEntries(
    results.filter((r) => r.fingerprint).map((r) => [r.id, r.fingerprint])
  ),
  results,
};

mkdirSync(join(ROOT, 'results'), { recursive: true });
writeFileSync(join(ROOT, 'results', 'xb-compare.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
process.exit(byId.chrome && byId.brave && summary.chromeBraveMatch === false ? 2 : 0);
