#!/usr/bin/env node
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, dirname, resolve, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LAB_CSP } from '../js/core/csp-headers.js';
import { requireExe } from './browser-paths.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8791;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.json': 'application/json',
};

const server = createServer((req, res) => {
  const pathOnly = decodeURIComponent((req.url || '/').split('?')[0]);
  const rel = pathOnly === '/' ? '/index.html' : pathOnly;
  const cleaned = rel.replace(/^\//, '').replace(/^([/\\])+/, '');
  const file = resolve(ROOT, normalize(cleaned));
  const sec = {
    'Content-Security-Policy': LAB_CSP,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  };
  if (!file.startsWith(resolve(ROOT))) {
    res.writeHead(403, sec);
    res.end();
    return;
  }
  if (!existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404, sec);
    res.end('missing');
    return;
  }
  res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream', ...sec });
  res.end(readFileSync(file));
});

await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

const browser = await chromium.launch({
  executablePath: requireExe('chrome'),
  headless: true,
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`page:${e}`));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`console:${m.text()}`);
});

await page.goto(`http://127.0.0.1:${PORT}/?autocollect=1`, {
  waitUntil: 'networkidle',
  timeout: 90000,
});
await page.waitForFunction(() => window.__FINGERPRINTER__?.results, { timeout: 90000 });

const summary = await page.evaluate(() => {
  const fp = window.__FINGERPRINTER__;
  const r = fp.results;
  const sota = Object.keys(r).filter((k) => k.startsWith('sota_'));
  const failedSota = sota.filter((k) => r[k]?.error || r[k]?.available === false);
  return {
    version: fp.version,
    hasProfile: Boolean(document.querySelector('.profile')),
    hasXbHero: Boolean(document.querySelector('#xb-compare.xb-hero')),
    xbHashLen: document.querySelector('.xb-hero__hash')?.textContent?.trim()?.length || 0,
    hasNav: Boolean(document.querySelector('.dash-nav')),
    hasExport: Boolean(document.querySelector('#fp-export')),
    hasExportDownload: Boolean(document.querySelector('[data-export-json]:not([disabled])')),
    hasHeroBadges: Boolean(document.querySelector('.hero__badges')),
    hasBraveTip: Boolean(
      [...document.querySelectorAll('.tip')].some((t) => /Brave may farble/i.test(t.textContent || ''))
    ),
    hasChecklist: Boolean(document.querySelector('[data-checklist]')),
    hasDeadPanels: Boolean(
      document.querySelector('[data-privacy-panel],[data-device-panel]')
    ),
    identity: document.querySelector('.profile__identity')?.textContent || null,
    modules: document.querySelectorAll('.fp-section').length,
    sotaCount: sota.length,
    newKeys: {
      screen: r.sota_screen?.available,
      svg: r.sota_svg?.available,
      webrtc: r.sota_webrtc?.available,
      timing: r.sota_timing?.available,
      domrect: r.sota_domrect?.available,
      css: r.sota_css?.available,
      unicode: r.sota_unicode?.available,
      webrtcSender: Boolean(r.sota_webrtc?.rtpSender),
      fontsUnreliable: r.sota_fonts?.fontsCheckUnreliable ?? null,
      fontsLied: r.sota_fonts?.fontsCheckLied ?? null,
      codecsEncodeType: r.sota_codecs?.mediaCapabilities?.videoEncode?.[0]?.type || null,
      codecsEncodeError: r.sota_codecs?.mediaCapabilities?.videoEncode?.[0]?.error || null,
    },
    fallbackSources: {
      gbf: r.getBrowserFingerprint?.source,
      sig: r.browserSignature?.source,
      bfp: r.browserFingerprintPkg?.source,
    },
    failedSota: failedSota.map((k) => ({ key: k, error: r[k]?.error || r[k]?.reason })),
    xbCoverage: fp.crossBrowser?.coverage,
    xbPortableEqualsFingerprint:
      fp.crossBrowser?.fingerprint === fp.crossBrowser?.portableFingerprint,
    xbFullTrusted: fp.crossBrowser?.fullTrusted ?? null,
    xbCompareLabel: [...document.querySelectorAll('.profile__id-grid--xb dt')].map(
      (e) => e.textContent
    ),
  };
});

const noise = (msg) =>
  /frame-ancestors|ERR_BLOCKED_BY_CLIENT|chrome-extension:|net::ERR_FAILED/i.test(msg);

const realErrors = errors.filter((e) => !noise(e));

console.log(
  JSON.stringify(
    {
      summary,
      realErrors: realErrors.slice(0, 20),
      ignoredNoise: errors.length - realErrors.length,
      ok:
        realErrors.length === 0 &&
        summary.hasProfile &&
        summary.hasXbHero &&
        summary.xbHashLen >= 32 &&
        summary.hasExport &&
        summary.hasExportDownload &&
        !summary.hasHeroBadges &&
        !summary.hasBraveTip &&
        !summary.hasChecklist &&
        !summary.hasDeadPanels &&
        summary.xbPortableEqualsFingerprint === true &&
        summary.version === '2.3.6',
    },
    null,
    2
  )
);

await browser.close();
server.close();
process.exit(realErrors.length === 0 && summary.hasProfile ? 0 : 1);
