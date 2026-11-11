import { existsSync } from 'node:fs';

/**
 * Local browser executables for smoke/matrix tools.
 * Override with env: FP_CHROME_EXE, FP_BRAVE_EXE, FP_FIREFOX_EXE, FP_TOR_EXE, FP_MULLVAD_EXE.
 * Tor/Mullvad have no default path (avoid machine-specific home dirs in the repo).
 */

const WIN = process.platform === 'win32';

const DEFAULTS = {
  chrome: WIN
    ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    : '/usr/bin/google-chrome',
  brave: WIN
    ? 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe'
    : '/usr/bin/brave-browser',
  firefox: WIN
    ? 'C:\\Program Files\\Mozilla Firefox\\firefox.exe'
    : '/usr/bin/firefox',
  tor: null,
  mullvad: null,
};

const ENV_KEYS = {
  chrome: 'FP_CHROME_EXE',
  brave: 'FP_BRAVE_EXE',
  firefox: 'FP_FIREFOX_EXE',
  tor: 'FP_TOR_EXE',
  mullvad: 'FP_MULLVAD_EXE',
};

export function browserExe(id) {
  const fromEnv = process.env[ENV_KEYS[id]];
  if (fromEnv && existsSync(fromEnv)) return fromEnv;
  if (fromEnv) return fromEnv; // let caller fail with a clear path
  const fallback = DEFAULTS[id];
  if (fallback && existsSync(fallback)) return fallback;
  return fallback;
}

export function requireExe(id) {
  const exe = browserExe(id);
  if (!exe) {
    throw new Error(
      `No executable for "${id}". Set ${ENV_KEYS[id]} to the browser binary path.`
    );
  }
  return exe;
}
