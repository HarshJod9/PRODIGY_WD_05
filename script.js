const searchForm = document.querySelector('#search-form');
const locationInput = document.querySelector('#location-input');
const locationButton = document.querySelector('#location-button');
const unitButton = document.querySelector('#unit-toggle');
const weatherContent = document.querySelector('#weather-content');
const welcome = document.querySelector('#welcome');
const notice = document.querySelector('#notice');

let useFahrenheit = false;
let latestWeather = null;
let noticeTimer;

const weatherTypes = {
  0: ['Clear sky', '☀'], 1: ['Mainly clear', '🌤'], 2: ['Partly cloudy', '⛅'], 3: ['Overcast', '☁'],
  45: ['Foggy', '🌫'], 48: ['Rime fog', '🌫'], 51: ['Light drizzle', '🌦'], 53: ['Drizzle', '🌦'], 55: ['Heavy drizzle', '🌧'],
  56: ['Freezing drizzle', '🌧'], 57: ['Freezing drizzle', '🌧'], 61: ['Light rain', '🌦'], 63: ['Rain', '🌧'], 65: ['Heavy rain', '🌧'],
  66: ['Freezing rain', '🌧'], 67: ['Heavy freezing rain', '🌧'], 71: ['Light snow', '🌨'], 73: ['Snow', '🌨'], 75: ['Heavy snow', '❄'],
  77: ['Snow grains', '🌨'], 80: ['Rain showers', '🌦'], 81: ['Rain showers', '🌧'], 82: ['Heavy showers', '🌧'], 85: ['Snow showers', '🌨'],
  86: ['Heavy snow showers', '❄'], 95: ['Thunderstorm', '⛈'], 96: ['Thunderstorm + hail', '⛈'], 99: ['Thunderstorm + hail', '⛈']
};

function weatherFor(code) {
  return weatherTypes[code] ?? ['Conditions unavailable', '☁'];
}

function showNotice(message, isError = false) {
  window.clearTimeout(noticeTimer);
  notice.textContent = message;
  notice.style.color = isError ? '#a64f39' : '';
  notice.hidden = false;
  noticeTimer = window.setTimeout(() => { notice.hidden = true; }, 5200);
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Weather service returned ${response.status}. Please try again.`);
  return response.json();
}

function setLoading(loading) {
  const submit = searchForm.querySelector('button');
  submit.disabled = loading;
  submit.textContent = loading ? '…' : '↗';
  locationButton.disabled = loading;
  searchForm.setAttribute('aria-busy', String(loading));
}

async function loadPlace(place) {
  setLoading(true);
  notice.hidden = true;
  try {
    const params = new URLSearchParams({ latitude: place.latitude, longitude: place.longitude, current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m', hourly: 'temperature_2m,precipitation_probability,weather_code', daily: 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset', timezone: 'auto', forecast_days: '5' });
    const data = await fetchJson(`https://api.open-meteo.com/v1/forecast?${params}`);
    latestWeather = { place, data };
    render();
    weatherContent.hidden = false;
    welcome.hidden = true;
  } catch (error) {
    showNotice(error.message || 'Could not load the forecast. Please try again.', true);
  } finally {
    setLoading(false);
  }
}

async function searchPlace(query) {
  setLoading(true);
  notice.hidden = true;
  try {
    const params = new URLSearchParams({ name: query, count: '1', language: 'en', format: 'json' });
    const result = await fetchJson(`https://geocoding-api.open-meteo.com/v1/search?${params}`);
    if (!result.results?.length) throw new Error(`No place found for “${query}”. Try a nearby city or town.`);
    await loadPlace(result.results[0]);
  } catch (error) {
    showNotice(error.message || 'Could not find that place. Please try again.', true);
  } finally {
    setLoading(false);
  }
}

function temperature(value, unit = useFahrenheit ? 'F' : 'C') {
  const converted = unit === 'F' ? value * 9 / 5 + 32 : value;
  return Math.round(converted);
}

function currentLocalTime(time, timezone) {
  if (!time) return '—';
  const [hourText, minuteText] = time.slice(11, 16).split(':');
  const hour = Number(hourText);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  return `${hour % 12 || 12}:${minuteText} ${suffix}`;
}

function render() {
  if (!latestWeather) return;
  const { place, data } = latestWeather;
  const current = data.current;
  const units = data.current_units;
  const [description, icon] = weatherFor(current.weather_code);
  const area = [place.name, place.admin1, place.country].filter((value, index, array) => value && array.indexOf(value) === index).join(', ');
  document.querySelector('#location-name').textContent = area;
  document.querySelector('#condition').textContent = description;
  document.querySelector('#temperature').textContent = temperature(current.temperature_2m);
  document.querySelector('#feels-like').textContent = temperature(current.apparent_temperature);
  document.querySelector('#weather-symbol').textContent = icon;
  document.querySelector('#wind-speed').textContent = Math.round(current.wind_speed_10m);
  document.querySelector('#humidity').textContent = Math.round(current.relative_humidity_2m);
  document.querySelector('#precipitation').textContent = Number(current.precipitation).toFixed(1);
  document.querySelector('#sunrise').textContent = currentLocalTime(data.daily.sunrise[0], data.timezone);
  document.querySelector('#sunset').textContent = currentLocalTime(data.daily.sunset[0], data.timezone);
  document.querySelector('#local-time').textContent = currentLocalTime(current.time, data.timezone);
  document.querySelector('#updated-at').textContent = `LOCAL TIME · ${data.timezone_abbreviation || data.timezone} · ${units.temperature_2m}`;
  renderHourly(data);
  renderDaily(data);
}

function renderHourly(data) {
  const list = document.querySelector('#hourly-list');
  const now = data.current.time.slice(0, 13);
  let start = data.hourly.time.findIndex(time => time.slice(0, 13) >= now);
  if (start < 0) start = 0;
  list.replaceChildren();
  for (let index = start; index < Math.min(start + 6, data.hourly.time.length); index += 1) {
    const item = document.createElement('div');
    item.className = 'hour-item';
    const [hourText] = data.hourly.time[index].slice(11, 16).split(':');
    const hour = Number(hourText);
    const label = index === start ? 'Now' : `${hour % 12 || 12}${hour >= 12 ? 'p' : 'a'}`;
    const [description, icon] = weatherFor(data.hourly.weather_code[index]);
    item.setAttribute('aria-label', `${label}: ${temperature(data.hourly.temperature_2m[index])} degrees, ${description}`);
    item.innerHTML = `<span class="hour-time">${label}</span><span class="hour-icon" aria-hidden="true">${icon}</span><span class="hour-temp">${temperature(data.hourly.temperature_2m[index])}°</span><span class="hour-rain">${data.hourly.precipitation_probability[index] ?? 0}% rain</span>`;
    list.append(item);
  }
}

function renderDaily(data) {
  const list = document.querySelector('#daily-list');
  list.replaceChildren();
  data.daily.time.forEach((date, index) => {
    const dayName = index === 0 ? 'Today' : new Intl.DateTimeFormat('en', { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
    const [description, icon] = weatherFor(data.daily.weather_code[index]);
    const row = document.createElement('div');
    row.className = 'day-row';
    row.setAttribute('aria-label', `${dayName}: ${description}, high ${temperature(data.daily.temperature_2m_max[index])}, low ${temperature(data.daily.temperature_2m_min[index])}`);
    row.innerHTML = `<span class="day-name">${dayName}</span><span class="day-icon" aria-hidden="true">${icon}</span><span class="day-range"><strong>${temperature(data.daily.temperature_2m_max[index])}°</strong><span>${temperature(data.daily.temperature_2m_min[index])}°</span></span><span class="day-rain">${weatherCodeRainChance(data, index)}</span>`;
    list.append(row);
  });
}

function weatherCodeRainChance(data, dayIndex) {
  const start = dayIndex * 24;
  const probabilities = data.hourly.precipitation_probability.slice(start, start + 24).filter(value => value != null);
  return probabilities.length ? `${Math.max(...probabilities)}%` : '';
}

searchForm.addEventListener('submit', event => {
  event.preventDefault();
  const query = locationInput.value.trim();
  if (query) searchPlace(query);
});

locationButton.addEventListener('click', () => {
  if (!navigator.geolocation) {
    showNotice('Location services are not available in this browser.', true);
    return;
  }
  setLoading(true);
  navigator.geolocation.getCurrentPosition(async position => {
    const place = { latitude: position.coords.latitude, longitude: position.coords.longitude, name: 'Your location' };
    try {
      const params = new URLSearchParams({ latitude: place.latitude, longitude: place.longitude, current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m', hourly: 'temperature_2m,precipitation_probability,weather_code', daily: 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset', timezone: 'auto', forecast_days: '5' });
      latestWeather = { place, data: await fetchJson(`https://api.open-meteo.com/v1/forecast?${params}`) };
      render();
      weatherContent.hidden = false;
      welcome.hidden = true;
    } catch (error) {
      showNotice(error.message || 'Could not load the forecast. Please try again.', true);
    } finally {
      setLoading(false);
    }
  }, error => {
    const message = error.code === error.PERMISSION_DENIED ? 'Location access was denied. Search for a city instead.' : 'Could not determine your location. Search for a city instead.';
    showNotice(message, true);
    setLoading(false);
  }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
});

unitButton.addEventListener('click', () => {
  useFahrenheit = !useFahrenheit;
  unitButton.setAttribute('aria-pressed', String(useFahrenheit));
  unitButton.querySelectorAll('.unit-option').forEach(option => option.classList.toggle('active', option.dataset.unit === (useFahrenheit ? 'F' : 'C')));
  if (latestWeather) render();
});

document.querySelector('#footer-time').textContent = new Intl.DateTimeFormat('en', { year: 'numeric' }).format(new Date());
