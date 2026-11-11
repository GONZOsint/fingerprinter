# Fingerprinter

Educational privacy lab: collect vendor + **SOTA** browser signals, read a **device/browser profile**, then inspect modules. Not a tracker — use it to see what your browser leaks.

**Version:** 2.3.6

## Quick start

```bash
cd fingerprinter
npm install
npm run serve
# → http://127.0.0.1:8765/
```

ES modules require HTTP (never open `index.html` as `file://`).  
Auto-collect: `http://127.0.0.1:8765/?autocollect=1`

```bash
npm run test:profile    # Chrome smoke (profile + XB portable)
npm run test:xb         # Cross-Browser smoke
npm run test:browsers   # matrix → results/matrix-latest.json
```

## What you get

1. **XB compare** — portable cross-browser ID (full hash in the profile hero)  
2. **Profile** — browser, OS, GPU, screen, privacy signals  
3. **Modules** — vendor libs + SOTA collectors  
4. **Export JSON** — download / copy the full payload locally  

### Cross-Browser ID (XB)

| Field | Contents | When it matches |
|-------|----------|-----------------|
| `fingerprint` / `compareId` / `portableFingerprint` | Math + WebGL limits + colorDepth + touch | **Canonical** — Chrome ↔ Firefox ↔ Brave |
| `fullFingerprint` | Portable + GPU vendor/model + cores | Same-engine enrichment when `fullTrusted` |

- UI **Copy compare** always uses the portable ID.  
- `deviceMemory` is shown but **never hashed** (Brave farbling / Firefox missing).  
- Firefox RFP spoofs WebGL (`…, or similar`); Brave scrubs identity to `"Brave"` — both → `gpuSpoofed`, coverage `portable`.  
- OPFS `getDirectory` may be denied under Firefox RFP — shown as **partial**, not a hard error.

## Architecture

```
index.html              # CSP: script-src 'self' 'wasm-unsafe-eval'
css/                    # tokens, layout, dashboard
js/
  main.js               # boot, collect, render, export
  core/{loader,csp-headers}.js
  collectors/
    registry.js
    vendor/             # ClientJS, Imprint, FPJS, OPFS-local, DetectIncognito…
    sota/               # WebGPU, canvas, webgl, fonts, unicode, codecs, antifp…
  cross-browser/id.js   # portable + full XB hashes
  ui/                   # profile (XB hero), dashboard, cards, export
static/                 # vendor UMD/ESM (no CDN)
tools/                  # smoke-profile, smoke-xb, browser-matrix
results/NOTES.md        # short lab matrix notes
```

### SOTA collectors

| Signal | Why it matters |
|--------|----------------|
| WebGPU / WebGL | GPU identity + limits (scrubbed under Brave/RFP) |
| Audio / Canvas | Render FPs + dual-run noise |
| Fonts / Unicode / Emoji | Metric + script coverage |
| Math | Portable across engines (feeds XB) |
| Codecs / WebRTC | MediaCapabilities + RTP sender/receiver |
| Screen / Timing / CSS | Letterboxing, coarse timers, color-gamut |
| Anti-FP | Educational privacy posture score |

## CSP (lab)

- `script-src 'self' 'wasm-unsafe-eval'` — no CDN; WASM compile allowed  
- `style-src 'self' 'unsafe-inline'` — dynamic probe styles  
- `connect-src 'self' https: blob:` — GhostIP + blob workers  

## Lab notes

See [`results/NOTES.md`](results/NOTES.md).  
Upstream inspiration: [GONZOsint/fingerprinter](https://github.com/GONZOsint/fingerprinter).
