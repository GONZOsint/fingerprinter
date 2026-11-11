import { hashObject } from '../../utils/hash.js';

const HIGH_ENTROPY = [
  'architecture',
  'bitness',
  'model',
  'platformVersion',
  'fullVersionList',
  'wow64',
  'formFactors',
  'uaFullVersion',
  'platform',
];

/** User-Agent Client Hints (UA-CH) — can expose more than the legacy UA string. */
export async function collectClientHints() {
  const uaData = navigator.userAgentData;
  if (!uaData) {
    return {
      available: false,
      reason: 'userAgentData unavailable (Firefox/Tor/Mullvad typically)',
      brands: null,
      mobile: null,
      platform: null,
      note: 'High-entropy Client Hints can leak more than the classic User-Agent, especially for third parties.',
    };
  }

  const lowEntropy = {
    brands: uaData.brands || [],
    mobile: uaData.mobile,
    platform: uaData.platform,
  };

  let highEntropy = {};
  let denied = false;
  try {
    highEntropy = await uaData.getHighEntropyValues(HIGH_ENTROPY);
  } catch (error) {
    denied = true;
    highEntropy = { error: error.message || String(error) };
  }

  const payload = {
    available: true,
    lowEntropy,
    highEntropy,
    denied,
    note: 'High-entropy Client Hints can leak more than the classic User-Agent, especially for third parties.',
  };
  return {
    ...payload,
    fingerprint: await hashObject({
      lowEntropy,
      highEntropy: denied ? { denied: true } : highEntropy,
    }),
  };
}
