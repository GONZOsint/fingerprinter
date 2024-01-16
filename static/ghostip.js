const ghostip = {};

ghostip.getIPData = async () => {
  const apiUrl = 'https://ipapi.co/json/';

  try {
    const response = await fetch(apiUrl, { timeout: 8000 }); // 5-second timeout

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();

    return {
      ip: data.ip,
      country: data.country_name,
      region: data.region,
      city: data.city,
      latitude: data.latitude,
      longitude: data.longitude,
    };
  } catch (error) {
    console.error('Error fetching IP data:', error.message);
    return 'N/A';
  }
};

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = ghostip;
} else {
  window.ghostip = ghostip;
}
