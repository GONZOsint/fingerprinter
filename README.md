# Fingerprinter

Local **privacy lab**: run vendor libraries and in-house collectors in your browser, read a device/browser profile, then inspect every module. Nothing is uploaded — use it to see what a page can learn about you.

**Version:** 2.3.6 · [github.com/GONZOsint/fingerprinter](https://github.com/GONZOsint/fingerprinter)

## Quick start

```bash
cd fingerprinter
npm install
npm run serve
# → http://127.0.0.1:8765/
```

ES modules need HTTP — do **not** open `index.html` as `file://`.  
Auto-collect: `http://127.0.0.1:8765/?autocollect=1`

```bash
npm run test:profile    # Chrome smoke (profile + XB portable)
npm run test:xb         # Cross-browser smoke
npm run test:browsers   # matrix → results/matrix-latest.json
```

Optional executable overrides: `FP_CHROME_EXE`, `FP_BRAVE_EXE`, `FP_FIREFOX_EXE`, `FP_TOR_EXE`, `FP_MULLVAD_EXE`.  
Hardened browsers (Tor/Mullvad): set the path env var and `FP_HARDENED=1` after allowing scripts for `127.0.0.1`.

---

## What you see

1. **XB compare** — portable cross-browser ID (full hardware hash when trusted)  
2. **Profile** — browser, OS, GPU, screen, privacy signals  
3. **Modules** — vendor libraries + custom collectors + composite hash  
4. **Export JSON** — download / copy the full payload locally  

UI groups: **Modules** (per-signal cards), **Libraries** (vendor), **Composite** (combined SOTA hash).

---

## Techniques

Collectors fall into three layers: **vendor libraries** (bundled under `static/`, no CDN), **custom modules** (`js/collectors/sota/`), and a **cross-browser ID** built from stable hardware-oriented features.

### Vendor libraries

| Key | Technique |
|-----|-----------|
| ThumbmarkJS | Multi-signal browser hash (canvas, WebGL, audio, fonts, …) |
| ImprintJS | Lightweight composite fingerprint |
| FingerprintJS | Open-source visitor ID (entropy components + confidence) |
| ClientJS | Classic UA / plugin / canvas / storage fingerprint |
| Detect Incognito | Private-mode heuristics |
| get-browser-fingerprint | Compact browser signature |
| OPFS | Origin Private File System persistence probe (may be **partial** under Firefox RFP) |
| Canvasprint | Canvas 2D render hash |
| GhostIP | Public IP / network metadata (HTTPS) |
| GhostDevice | Device summary (CPU, memory, display, graphics) |
| BrowserSignature / browser-fingerprint | Additional packaged browser hashes |

### Custom collectors (`sota_*`)

| Module | Technique |
|--------|-----------|
| **WebGPU** | Adapter `requestAdapter` identity + limits; Brave scrub detection; optional micro compute timing (not in XB) |
| **Client Hints** | `navigator.userAgentData` / high-entropy hints when allowed |
| **AudioContext** | OfflineAudioContext render hash + **dual-run** noise check |
| **Canvas+** | 2D draw hash, same-read stability, dual-run farbling probe |
| **WebGL+** | Unmasked vendor/renderer, parameter limits, geometry render hash, dual-run noise; flags RFP `…, or similar` and Brave `"Brave"` scrub |
| **Fonts** | DOM + canvas metric enumeration (no Local Font Access prompt); `document.fonts.check` overclaim vs metrics |
| **Unicode / Scripts** | Glyph metrics across Arabic, CJK, Indic, … (high entropy, often less farbled than Latin lists) |
| **Math** | Portable trig/constants with fixed precision (feeds XB) |
| **Speech voices** | `speechSynthesis.getVoices()` inventory |
| **Codecs** | `MediaSource` / `MediaCapabilities` / WebCodecs availability |
| **Intl / Locale** | Resolved locale, calendars, numbering systems, collators |
| **Storage** | `localStorage` / `indexedDB` / persistence / OPFS / storage buckets |
| **Emoji / MathML** | Emoji + ZWJ + flag + MathML bbox / canvas metrics |
| **DomRect** | Fixed-element geometry (layout-engine differences) |
| **CSS / Media** | System colors, `matchMedia` prefs (gamut, forced-colors, …) |
| **Screen / Window** | Viewport vs screen, DPR, chrome gaps → letterboxing heuristic |
| **SVG / Filter** | SVG filter / bbox render fingerprint |
| **WebRTC** | Local ICE (no external STUN by default) + RTP codec lists |
| **Timing / WASM** | Coarse timer detection, short microbenches, WASM feature flags |
| **Sensors / MQ** | Sensor API presence + media-query environment |
| **Emerging APIs** | Feature-detect WebNN, Idle Detection (permission state only), Compute Pressure, … |
| **Worker probe** | Worker vs main-thread navigator mismatch (spoof / isolation) |
| **Extensions / Tamper** | Chrome extension WAR probes + JS tamper signals |
| **TLS JA3/JA4** | Documented as **server-side only** (page JS cannot read ClientHello) |
| **Anti-FP** | Posture score from the signals above (educational, not a grade) |
| **Composite** | SHA hash of all successful module fingerprints |

Layout-sensitive probes (fonts, unicode, DomRect, emoji, CSS, SVG, extensions) run **sequentially** to avoid metric races; the rest run in parallel.

### Cross-Browser ID (XB)

Built in `js/cross-browser/id.js` after collection.

| Field | Inputs | When it matches |
|-------|--------|-----------------|
| `fingerprint` / `compareId` / `portableFingerprint` | Math + WebGL **limits** + `colorDepth` + `maxTouchPoints` | **Canonical** — Chrome ↔ Firefox ↔ Brave on the same machine |
| `fullFingerprint` | Portable + normalized GPU vendor/model + cores bucket | Same-engine enrichment when `fullTrusted` |

Design rules:

- GPU strings are **normalized** (strip ANGLE / Direct3D / `or similar`) so engines map to the same hardware tokens.  
- Spoofed GPU (`…, or similar`, literal `"Brave"`, RFP-like) → `gpuSpoofed`, coverage `portable`; identity not hashed into full ID.  
- Prefer WebGPU vendor/arch when WebGL identity is scrubbed but WebGPU is still trustworthy.  
- `deviceMemory` is shown but **never hashed** (Brave farbling / Firefox missing).  
- Cores are bucketed and dropped under RFP-like / coarse-timer conditions.  
- UI **Copy compare** always copies the portable ID.

### Anti-fingerprinting signals

`sota_antifp` aggregates soft signals into `likelyProtections`, for example:

- output randomization / canvas readback noise  
- WebGL identity spoof / WebGPU scrub  
- letterboxing, timezone UTC, no Client Hints  
- worker–main mismatch, font-check overclaim, coarse timers, JS tamper  

Dual-run equality on one page load can miss **session-stable** Brave farbling — compare reloads and browsers manually. Score is educational only.

---

## Architecture

```
index.html                 # CSP locked; no third-party scripts
css/                       # tokens, layout, dashboard
js/
  main.js                  # boot → collect → profile → cards → export
  core/{loader,csp-headers}.js
  collectors/
    registry.js            # vendors ∥ then SOTA batch
    vendor/                # wrappers around static/* libs
    sota/                  # custom modules + antifp + composite
  cross-browser/id.js      # portable + full XB hashes
  ui/                      # profile, dashboard, cards, export, progress
  utils/                   # hash, dom, safe, style
static/                    # vendor UMD/ESM + icons (local only)
tools/                     # smoke-profile, smoke-xb, browser-matrix, browser-paths
results/NOTES.md           # short lab matrix notes
```

---

## Browser expectations

| Browser | Auto collect | XB coverage | Notes |
|---------|--------------|-------------|-------|
| Chrome | OK | high (GPU trusted) | Client Hints + WebGPU |
| Brave | OK | portable | WebGL/WebGPU scrubbed; `deviceMemory` farbled |
| Firefox | spawn / manual | portable | RFP: GPU spoof, cores ≤8, coarse timers; OPFS often partial |
| Tor / Mullvad | manual | portable | Allow scripts for localhost; never `file://` |

Soft signals (not bugs): Firefox OPFS `SecurityError` → storage **partial**; font-visibility noise under RFP; FingerprintJS blank-iframe font probes under RFP.

More day-to-day notes: [`results/NOTES.md`](results/NOTES.md).

---

## CSP (lab)

| Directive | Why |
|-----------|-----|
| `script-src 'self' 'wasm-unsafe-eval'` | No CDN; WASM compile for timing probes |
| `style-src 'self' 'unsafe-inline'` | Dynamic probe styles |
| `connect-src 'self' https: blob:` | GhostIP + blob workers |
| `worker-src 'self' blob:` | Worker probe |

---

## Resources

- [W3C Fingerprinting Guidance](https://www.w3.org/TR/fingerprinting-guidance/)  
- [EFF — Browser Fingerprinting](https://www.eff.org/pages/browser-fingerprinting)  
- [PrivacyTests](https://privacytests.org/)  
- [EFF Cover Your Tracks](https://coveryourtracks.eff.org/)  
- [CreepJS](https://abrahamjuliot.github.io/creepjs/)  

Educational use only — not a tracker, not a security certification.
