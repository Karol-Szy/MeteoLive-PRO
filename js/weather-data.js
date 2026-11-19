import { buildDemo, demoStart } from './demo.js';

export const CITIES = [
  { key: 'warszawa', name: 'Warszawa', region: 'mazowieckie', lat: 52.2297, lon: 21.0122 },
  { key: 'krakow', name: 'Kraków', region: 'małopolskie', lat: 50.0647, lon: 19.945 },
  { key: 'gdansk', name: 'Gdańsk', region: 'pomorskie', lat: 54.3521, lon: 18.6464 },
  { key: 'wroclaw', name: 'Wrocław', region: 'dolnośląskie', lat: 51.1079, lon: 17.0385 },
  { key: 'poznan', name: 'Poznań', region: 'wielkopolskie', lat: 52.4064, lon: 16.9252 },
  { key: 'szczecin', name: 'Szczecin', region: 'zachodniopomorskie', lat: 53.4285, lon: 14.5528 },
  { key: 'bialystok', name: 'Białystok', region: 'podlaskie', lat: 53.1325, lon: 23.1688 },
  { key: 'lublin', name: 'Lublin', region: 'lubelskie', lat: 51.2465, lon: 22.5684 },
  { key: 'radom', name: 'Radom', region: 'mazowieckie', lat: 51.4027, lon: 21.1471 },
  { key: 'zakopane', name: 'Zakopane', region: 'małopolskie', lat: 49.2992, lon: 19.9496 }
].map(city => ({ ...city, country: 'Polska' }));

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const AIR_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';

const CURRENT = 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m';
const HOURLY = 'temperature_2m,precipitation_probability,weather_code,is_day,visibility,uv_index,wind_speed_10m';
const DAILY = 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max,precipitation_sum,wind_speed_10m_max';

async function getJSON(url, { timeout = 7000, signal } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  const forward = () => controller.abort();
  signal?.addEventListener('abort', forward, { once: true });
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', forward);
  }
}

function validate(data) {
  const h = data?.hourly;
  const ok = h && Array.isArray(h.time) && h.time.length >= 72
    && Array.isArray(h.temperature_2m) && Array.isArray(h.precipitation_probability)
    && data.current && Array.isArray(data.daily?.time) && data.daily.time.length >= 5;
  if (!ok) throw new Error('Otrzymano niepełne dane pogodowe.');
  return data;
}

let demoFile;
function demoFileData() {
  demoFile ??= getJSON('data/demo.json', { timeout: 4000 }).catch(() => null);
  return demoFile;
}

function localOffsetHours() {
  return -new Date().getTimezoneOffset() / 60;
}

async function demoFor(place) {
  const file = await demoFileData();
  const stored = place.key && file?.cities?.[place.key];
  if (stored) {
    try {
      return validate(stored);
    } catch {
      return buildDemo(place, demoStart(), localOffsetHours());
    }
  }
  return buildDemo(place, demoStart(), localOffsetHours());
}

export async function loadWeather(place) {
  const location = { latitude: String(place.lat), longitude: String(place.lon), timezone: 'auto' };
  const forecastQuery = new URLSearchParams({ ...location, current: CURRENT, hourly: HOURLY, daily: DAILY, forecast_days: '7' });
  const airQuery = new URLSearchParams({ ...location, current: 'european_aqi,pm2_5,pm10' });
  try {
    const [forecast, air] = await Promise.all([
      getJSON(`${FORECAST_URL}?${forecastQuery}`),
      getJSON(`${AIR_URL}?${airQuery}`, { timeout: 5000 }).catch(() => null)
    ]);
    return { data: validate(forecast), air: air?.current ?? null, source: 'live', error: null };
  } catch (error) {
    const data = await demoFor(place);
    return { data, air: data.air?.current ?? null, source: 'demo', error: error.message };
  }
}

export async function loadCitiesNow() {
  const query = new URLSearchParams({
    latitude: CITIES.map(c => c.lat).join(','),
    longitude: CITIES.map(c => c.lon).join(','),
    current: 'temperature_2m,weather_code,is_day',
    timezone: 'auto'
  });
  try {
    const response = await getJSON(`${FORECAST_URL}?${query}`, { timeout: 6000 });
    const list = Array.isArray(response) ? response : [response];
    if (list.length !== CITIES.length || !list.every(item => item?.current)) throw new Error('Niepełna lista miast');
    return { cities: CITIES.map((city, i) => ({ ...city, current: list[i].current })), source: 'live' };
  } catch {
    const file = await demoFileData();
    const cities = CITIES.map(city => ({
      ...city,
      current: file?.cities?.[city.key]?.current ?? buildDemo(city, demoStart(), localOffsetHours()).current
    }));
    return { cities, source: 'demo' };
  }
}

const normalize = text => String(text).toLocaleLowerCase('pl').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');

function presetFor(lat, lon) {
  return CITIES.find(c => Math.abs(c.lat - lat) < 0.12 && Math.abs(c.lon - lon) < 0.12);
}

export async function searchPlaces(text, signal) {
  const q = text.trim();
  const query = new URLSearchParams({ name: q, count: '7', language: 'pl', format: 'json' });
  try {
    const response = await getJSON(`${GEOCODING_URL}?${query}`, { timeout: 5000, signal });
    const results = (response.results ?? []).map(r => {
      const preset = presetFor(r.latitude, r.longitude);
      return {
        key: preset && normalize(preset.name) === normalize(r.name) ? preset.key : undefined,
        name: r.name,
        region: r.admin1 ?? '',
        country: r.country ?? '',
        lat: r.latitude,
        lon: r.longitude
      };
    });
    return { results, source: 'live' };
  } catch (error) {
    if (signal?.aborted) throw error;
    const needle = normalize(q);
    return { results: CITIES.filter(c => normalize(c.name).includes(needle)), source: 'demo' };
  }
}
