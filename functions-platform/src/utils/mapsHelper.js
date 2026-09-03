const { defineString } = require('firebase-functions/params');

const MAPS_API_KEY = defineString('GOOGLE_MAPS_API_KEY');

async function geocodeViaGoogleMaps(address) {
  if (process.env.FUNCTIONS_EMULATOR === 'true') {
    return { lat: 39.8283, lng: -98.5795 };
  }

  const apiKey = MAPS_API_KEY.value();
  if (!apiKey) {
    throw new Error('Missing Google Maps API key.');
  }

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Referer': 'https://sports-skill-tracker-dev.web.app',
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Google Maps API error: ${response.statusText}`);
  }

  const data = await response.json();
  if (data.status !== 'OK') {
    throw new Error(`Google Maps Geocoding error: ${data.status}`);
  }

  if (data.results && data.results.length > 0) {
    const loc = data.results[0].geometry.location;
    return { lat: loc.lat, lng: loc.lng };
  }

  throw new Error('No results found for address.');
}

module.exports = {
  geocodeViaGoogleMaps
};
