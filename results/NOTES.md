# Lab notes

Day-to-day docs: [README](../README.md).

## Browser matrix expectations

| Browser | Auto | XB coverage | Notes |
|---------|------|-------------|-------|
| Chrome | OK | high (when GPU trusted) | Client Hints + WebGPU |
| Brave | OK | portable | WebGL/WebGPU scrubbed (`"Brave"`); `deviceMemory` farbled (not hashed) |
| Firefox | Manual / spawn | portable | RFP: GPU `…, or similar`, cores ≤8, coarse timers; OPFS often denied |
| Tor / Mullvad | Manual | portable | Allow scripts for localhost; never `file://` |

## Cross-browser

On the same machine, **XB compare** (`portableFingerprint`) matches Chrome ↔ Firefox ↔ Brave.

- **XB hardware** (`fullFingerprint`) only when `fullTrusted` (real GPU + cores).  
- Copy compare in the UI always uses the portable ID.

## Expected soft signals (not bugs)

- Firefox OPFS `getDirectory` SecurityError → storage card **partial**  
- Font visibility console noise under RFP (third-party libs may still probe)  
- FingerprintJS blank-iframe font probes under RFP (library behavior)
