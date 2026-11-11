const ghostip = {};

ghostip.getIPData = async () => {
  // ipify first — Firefox Enhanced Tracking Protection often blocks ipapi.co
  const endpoints = [
    'https://api.ipify.org?format=json',
    'https://ipapi.co/json/',
  ];

  for (const apiUrl of endpoints) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(apiUrl, { signal: controller.signal });
      clearTimeout(timer);
      if (!response.ok) continue;
      const data = await response.json();
      if (!data) continue;

      // ipify only returns { ip }
      if (data.ip && !data.country_name && apiUrl.includes('ipify')) {
        return {
          ip: data.ip,
          country: null,
          region: null,
          city: null,
          latitude: null,
          longitude: null,
          source: 'ipify',
        };
      }

      if (data.ip) {
        return {
          ip: data.ip,
          country: data.country_name || data.country || null,
          region: data.region || data.regionName || null,
          city: data.city || null,
          latitude: data.latitude ?? data.lat ?? null,
          longitude: data.longitude ?? data.lon ?? null,
          source: 'ipapi',
        };
      }
    } catch (error) {
      console.warn('GhostIP endpoint failed:', apiUrl, error.message || error);
    }
  }

  return { error: 'IP data unavailable' };
};

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = ghostip;
} else {
  window.ghostip = ghostip;
}
