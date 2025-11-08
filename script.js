// script.js - Weather app main logic
// Usage: add your OpenWeatherMap API key below and include this script in your HTML.
// Replace 'YOUR_API_KEY_HERE' with a valid OpenWeatherMap API key.

const API_KEY = 'YOUR_API_KEY_HERE'; // <-- insert your API key here

// DOM elements (update selectors to match your HTML)
const searchForm = document.querySelector('#search-form');
const searchInput = document.querySelector('#search-input');
const cityEl = document.querySelector('#city');
const tempEl = document.querySelector('#temperature');
const descEl = document.querySelector('#description');
const iconEl = document.querySelector('#weather-icon');
const detailsEl = document.querySelector('#details');
const errorEl = document.querySelector('#error-message');
const loaderEl = document.querySelector('#loader');

// Helper: show/hide loader
function showLoader(show = true) {
  if (!loaderEl) return;
  loaderEl.style.display = show ? 'block' : 'none';
}

// Helper: format temperature (Celsius)
function formatTemp(kelvin) {
  // If you prefer metric units, OpenWeatherMap can return metric directly.
  // Here we assume the API returns metric (C). If using Kelvin, convert: C = K - 273.15
  return `${Math.round(kelvin)}°C`;
}

// Render weather data to DOM
function renderWeather(data) {
  if (!data) return;

  // Clear previous errors
  if (errorEl) errorEl.textContent = '';

  const cityName = `${data.name}${data.sys && data.sys.country ? ', ' + data.sys.country : ''}`;
  const temp = data.main && data.main.temp;
  const description = data.weather && data.weather[0] && data.weather[0].description;
  const iconCode = data.weather && data.weather[0] && data.weather[0].icon;
  const humidity = data.main && data.main.humidity;
  const windSpeed = data.wind && data.wind.speed;
  const feelsLike = data.main && data.main.feels_like;

  if (cityEl) cityEl.textContent = cityName || 'Unknown location';
  if (tempEl) tempEl.textContent = temp !== undefined ? formatTemp(temp) : '--';
  if (descEl) descEl.textContent = description ? description.charAt(0).toUpperCase() + description.slice(1) : '';
  if (detailsEl) {
    detailsEl.innerHTML = `
      ${feelsLike !== undefined ? `<div>Feels like: ${formatTemp(feelsLike)}</div>` : ''}
      ${humidity !== undefined ? `<div>Humidity: ${humidity}%</div>` : ''}
      ${windSpeed !== undefined ? `<div>Wind: ${windSpeed} m/s</div>` : ''}
    `;
  }

  if (iconEl && iconCode) {
    // Use OpenWeatherMap icon endpoint
    iconEl.src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
    iconEl.alt = description || 'weather icon';
    iconEl.style.display = 'inline-block';
  } else if (iconEl) {
    iconEl.style.display = 'none';
  }
}

// Fetch weather by city name (uses OpenWeatherMap "Current weather" API)
async function fetchWeatherByCity(city) {
  if (!city) throw new Error('City is required');

  const encoded = encodeURIComponent(city.trim());
  // Request metric units (Celsius). Change units=imperial for Fahrenheit.
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encoded}&units=metric&appid=${API_KEY}`;

  showLoader(true);
  try {
    const res = await fetch(url);
    if (!res.ok) {
      // Convert non-2xx responses into readable errors
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`Weather API error: ${res.status} ${res.statusText} - ${errText}`);
    }
    const data = await res.json();
    showLoader(false);
    return data;
  } catch (err) {
    showLoader(false);
    throw err;
  }
}

// Show error message
function showError(message) {
  if (!errorEl) {
    alert(message);
    return;
  }
  errorEl.textContent = message;
}

// On search submit
async function onSearch(e) {
  e.preventDefault();
  const query = searchInput ? searchInput.value : '';
  if (!query) {
    showError('Please enter a city name.');
    return;
  }

  try {
    const data = await fetchWeatherByCity(query);
    renderWeather(data);
  } catch (err) {
    // Try to give a helpful message for common error responses
    if (err && err.message && err.message.includes('404')) {
      showError('City not found. Try a different city name.');
    } else if (err && err.message && err.message.includes('401')) {
      showError('Invalid API key. Replace API_KEY with a valid OpenWeatherMap key.');
    } else {
      console.error(err);
      showError('Could not fetch weather. Check your network/console for details.');
    }
  }
}

// Optional: get weather for user geolocation
async function loadByGeolocation() {
  if (!navigator.geolocation) return;
  showLoader(true);
  navigator.geolocation.getCurrentPosition(async (pos) => {
    const { latitude, longitude } = pos.coords;
    // use the "lat" & "lon" query instead of q=
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${API_KEY}`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      renderWeather(data);
    } catch (err) {
      console.error('geolocation fetch error', err);
    } finally {
      showLoader(false);
    }
  }, (err) => {
    // permission denied or other error
    console.warn('Geolocation error', err);
    showLoader(false);
  });
}

// Wire up event listeners
function init() {
  if (searchForm) searchForm.addEventListener('submit', onSearch);
  // Optionally load weather for user's location on start:
  loadByGeolocation();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
