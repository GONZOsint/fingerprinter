import { withTimeout } from './timeout.js';

export async function ghostIP() {
  if (typeof ghostip === 'undefined' || typeof ghostip.getIPData !== 'function') {
    return { error: 'GhostIP not loaded' };
  }
  try {
    const ipData = await withTimeout(ghostip.getIPData(), 10000, 'GhostIP');
    if (!ipData || typeof ipData !== 'object' || !ipData.ip) {
      return { error: ipData?.error || 'IP data unavailable' };
    }
    return ipData;
  } catch (error) {
    return { error: error.message || String(error) };
  }
}

export async function ghostDevice() {
  if (typeof ghostDeviceInfo === 'undefined' || typeof ghostDeviceInfo.getDeviceInfo !== 'function') {
    return { error: 'GhostDeviceInfo not loaded' };
  }
  try {
    const info = await withTimeout(ghostDeviceInfo.getDeviceInfo(), 20000, 'GhostDevice');
    if (!info || typeof info !== 'object') return { error: 'Device info unavailable' };
    return info;
  } catch (error) {
    return { error: error.message || String(error) };
  }
}
