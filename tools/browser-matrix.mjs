#!/usr/bin/env node
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { join, extname, dirname, resolve, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { chromium, firefox as pwFirefox } from 'playwright';
import { LAB_CSP } from '../js/core/csp-headers.js';
import { browserExe } from './browser-paths.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const RESULTS = join(ROOT, 'results');
const PORT = 8765;
const HOST = '127.0.0.1';

const BROWSERS = [
  { id: 'chrome', exe: browserExe('chrome'), engine: 'chromium' },
  { id: 'brave', exe: browserExe('brave'), engine: 'chromium' },
  { id: 'firefox', exe: browserExe('firefox'), engine: 'spawn-report' },
  {
    id: 'tor',
    exe: browserExe('tor'),
    engine: 'spawn-report',
    note: 'Set FP_TOR_EXE. Needs Tor circuit; may block localhost depending on config',
  },
  {
    id: 'mullvad',
    exe: browserExe('mullvad'),
    engine: 'spawn-report',
    note: 'Set FP_MULLVAD_EXE',
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
  '.md': 'text/markdown; charset=utf-8',
};

const reports = new Map();

function startStaticServer() {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      try {
        const sec = {
          'Content-Security-Policy': LAB_CSP,
          'X-Content-Type-Options': 'nosniff',
          'Referrer-Policy': 'no-referrer',
        };
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
        let rel = pathOnly === '/' ? '/index.html' : pathOnly;
        const file = resolve(ROOT, normalize(rel.replace(/^\//, '').replace(/^([/\\])+/, '')));
        const rootResolved = resolve(ROOT);
        if (!file.startsWith(rootResolved + '\\') && !file.startsWith(rootResolved + '/') && file !== rootResolved) {
          res.writeHead(403);
          res.end('forbidden');
          return;
        }
        if (!existsSync(file) || statSync(file).isDirectory()) {
          res.writeHead(404);
          res.end('not found');
          return;
        }
        const body = readFileSync(file);
        res.writeHead(200, {
          'Content-Type': MIME[extname(file)] || 'application/octet-stream',
          ...sec,
        });
        res.end(body);
      } catch (e) {
        res.writeHead(500);
        res.end(String(e));
      }
    });
    server.listen(PORT, HOST, () => resolve(server));
  });
}

function pageUrl(reportId) {
  return `http://${HOST}:${PORT}/?autocollect=1&report=${encodeURIComponent(reportId)}`;
}

async function collectChromium(cfg) {
  const browser = await chromium.launch({
    executablePath: cfg.exe,
    headless: true,
    args: ['--disable-blink-features=AutomationControlled'],
  });
  const page = await browser.newPage();
  await page.goto(pageUrl(cfg.id), { waitUntil: 'domcontentloaded', timeout: 60000 });
  const handle = await page.waitForFunction(() => window.__FINGERPRINTER__, null, { timeout: 90000 });
  const payload = await handle.jsonValue();
  await browser.close();
  return { id: cfg.id, ok: true, payload };
}

async function collectSpawnReport(cfg, timeoutMs = 120000) {
  if (!cfg.exe || !existsSync(cfg.exe)) {
    return {
      id: cfg.id,
      error: cfg.exe
        ? `Executable not found: ${cfg.exe}`
        : `Executable not configured (set FP_${cfg.id.toUpperCase()}_EXE)`,
      skipped: true,
    };
  }

  reports.delete(cfg.id);
  const url = pageUrl(cfg.id);
  const profile = join(RESULTS, `profile-${cfg.id}`);
  mkdirSync(profile, { recursive: true });

  // Always pass an http(s) URL via -url so Firefox-family never treats the arg as a file:// path.
  // Tor/Mullvad still need the user to temporarily allow scripts (NoScript) for 127.0.0.1.
  const args =
    cfg.id === 'tor' || cfg.id === 'mullvad'
      ? ['-url', url]
      : ['-no-remote', '-profile', profile, '-url', url];

  const child = spawn(cfg.exe, args, {
    detached: true,
    stdio: 'ignore',
  });
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
        ok: true,
        payload: {
          results: body.results,
          crossBrowser: body.crossBrowser,
          userAgent: body.userAgent,
        },
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

  // Fallback: Playwright bundled Firefox (engine sample, not Tor/Mullvad)
  if (cfg.id === 'firefox') {
    try {
      const browser = await pwFirefox.launch({ headless: true });
      const page = await browser.newPage();
      await page.goto(pageUrl(`${cfg.id}-pw`), { waitUntil: 'domcontentloaded', timeout: 60000 });
      const handle = await page.waitForFunction(() => window.__FINGERPRINTER__, null, {
        timeout: 90000,
      });
      const payload = await handle.jsonValue();
      await browser.close();
      return { id: cfg.id, ok: true, payload, via: 'playwright-firefox', note: 'bundled PW Firefox fallback' };
    } catch (error) {
      return { id: cfg.id, error: `spawn timeout + PW fallback failed: ${error.message}` };
    }
  }

  return {
    id: cfg.id,
    error: `Timed out waiting for /api/report from ${cfg.id}. Open ${url} manually if the browser blocked automation.`,
  };
}

function summarize(entry) {
  if (!entry.ok) return { id: entry.id, error: entry.error || entry.message };
  const r = entry.payload?.results || {};
  return {
    id: entry.id,
    via: entry.via || 'playwright',
    crossBrowserId: entry.payload?.crossBrowser?.fingerprint || null,
    privacyScore: r.sota_antifp?.privacyScore ?? null,
    protections: (r.sota_antifp?.likelyProtections || []).join('|') || '',
    sotaComposite: r.sota_composite?.fingerprint || null,
    fingerprintjs: r.fingerprintjs?.visitorId || r.fingerprintjs?.error || null,
    canvasNoisy: r.sota_canvas?.stability?.noisy ?? null,
    audioNoisy: r.sota_audio?.stability?.noisy ?? null,
    webgpu: r.sota_webgpu?.available ?? null,
    clientHints: r.sota_clientHints?.available ?? null,
  };
}

async function main() {
  mkdirSync(RESULTS, { recursive: true });
  const server = await startStaticServer();
  console.log(`Serving ${ROOT} at http://${HOST}:${PORT}/`);

  const results = [];
  for (const cfg of BROWSERS) {
    process.stdout.write(`→ ${cfg.id} ... `);
    try {
      if ((!cfg.exe || !existsSync(cfg.exe)) && cfg.engine !== 'spawn-report') {
        results.push({
          id: cfg.id,
          error: cfg.exe ? `missing ${cfg.exe}` : `set FP_${cfg.id.toUpperCase()}_EXE`,
          skipped: true,
        });
        console.log('missing');
        continue;
      }
      const entry =
        cfg.engine === 'chromium' ? await collectChromium(cfg) : await collectSpawnReport(cfg);
      results.push(entry);
      console.log(entry.ok ? `ok (${entry.via || 'pw'})` : entry.error);
    } catch (error) {
      results.push({ id: cfg.id, error: error.message || String(error) });
      console.log('FAIL', error.message || error);
    }
  }

  const summary = results.map(summarize);
  const stamp = Date.now();
  writeFileSync(join(RESULTS, `matrix-${stamp}.json`), JSON.stringify({ summary, results }, null, 2));
  writeFileSync(join(RESULTS, 'matrix-latest.json'), JSON.stringify({ summary, results }, null, 2));
  console.log('\nSummary:');
  console.table(summary.map(({ error, ...rest }) => (error ? { id: rest.id, error: String(error).slice(0, 80) } : rest)));
  server.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
