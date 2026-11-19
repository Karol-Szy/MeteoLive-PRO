import { CITIES, loadWeather, loadCitiesNow } from './weather-data.js';
import { clockOf, hourOf } from './opisy.js';
import { initDashboard, renderDashboard, nowIndex } from './pulpit.js';
import { WeatherCharts } from './charts.js';
import { WeatherSimulation } from './symulacja.js';
import { initMap } from './mapa.js';
import { initSearch } from './szukaj.js';
import { initGallery } from './galeria.js';
import { initPlayer } from './odtwarzacz.js';

const $ = id => document.getElementById(id);
const STORAGE_KEY = 'meteolive:miejsce';
const SCENES = {
  sun: ['Słoneczny dzień', 'Promienie słońca i pojedyncze chmury'],
  rain: ['Deszczowa aura', 'Krople w trzech warstwach głębi'],
  storm: ['Nadciąga burza', 'Losowo generowane wyładowania'],
  snow: ['Opady śniegu', 'Płatki kołyszą się na wietrze']
};
const SCENE_ORDER = Object.keys(SCENES);

const state = {
  place: restorePlace(),
  request: 0,
  current: null,
  offsetSeconds: 3600,
  motionOff: matchMedia('(prefers-reduced-motion: reduce)').matches
};

const ambient = new WeatherSimulation($('ambientCanvas'), { ambient: true });
const studio = new WeatherSimulation($('weatherCanvas'));
const charts = new WeatherCharts({
  temperature: $('temperatureChart'),
  precipitation: $('precipitationChart'),
  table: $('chartTable'),
  tempStat: $('tempStat'),
  rainStat: $('rainStat')
});
const map = initMap($('mapWrap'), $('cityList'), place => selectPlace(place, { scroll: true }));

function restorePlace() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Number.isFinite(saved.lat) && Number.isFinite(saved.lon) && saved.name) return saved;
  } catch {}
  return CITIES[0];
}

function savePlace(place) {
  try {
    const { key, name, region, country, lat, lon } = place;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ key, name, region, country, lat, lon }));
  } catch {}
}

function showPlace(place) {
  $('placeName').textContent = place.name;
  $('placeMeta').textContent = [place.region, place.country].filter(Boolean).join(', ') || 'Wybrana lokalizacja';
  document.title = `${place.name} — MeteoLive PRO`;
}

function showStatus(result) {
  const pill = $('livePill');
  const status = $('dataStatus');
  const live = result.source === 'live';
  pill.dataset.source = result.source;
  status.dataset.source = result.source;
  $('liveLabel').textContent = live ? 'NA ŻYWO' : 'DEMO';
  pill.title = live ? 'Dane na żywo z Open-Meteo' : 'Tryb demonstracyjny — dane przykładowe';
  status.textContent = live
    ? `Dane na żywo z Open-Meteo · ${state.place.name} · stan na ${hourOf(result.data.current.time)}${result.air ? '' : ' · brak danych o jakości powietrza'}`
    : `Tryb demonstracyjny: brak połączenia z Open-Meteo, więc pokazujemy przykładowe, wymyślone dane dla miasta ${state.place.name} (nie są prognozą).`;
}

function tickClock() {
  const local = new Date(Date.now() + state.offsetSeconds * 1000);
  const clock = $('localClock');
  clock.textContent = clockOf(local);
  clock.dateTime = local.toISOString().slice(0, 16);
}

function setBusy(busy) {
  $('refreshButton').disabled = busy;
  $('refreshButton').classList.toggle('is-spinning', busy);
  document.querySelector('.now-card').setAttribute('aria-busy', String(busy));
}

async function updateWeather() {
  const id = ++state.request;
  setBusy(true);
  showPlace(state.place);
  try {
    const result = await loadWeather(state.place);
    if (id !== state.request) return;
    document.body.classList.remove('is-loading');
    state.offsetSeconds = Number(result.data.utc_offset_seconds ?? 3600);
    tickClock();
    showStatus(result);
    const view = renderDashboard(result);
    ambient.setScene(view.scene, { night: view.night });
    charts.setData(result.data, nowIndex(result.data));
    state.current = result.data.current;
    map.setPlace(state.place, state.current);
  } finally {
    if (id === state.request) setBusy(false);
  }
}

async function updateCities() {
  const { cities } = await loadCitiesNow();
  map.setCities(cities);
  map.setPlace(state.place, state.current);
}

function selectPlace(place, { scroll = false } = {}) {
  state.place = place;
  state.current = null;
  savePlace(place);
  updateWeather();
  if (scroll && $('pulpit').getBoundingClientRect().top < -200) {
    $('pulpit').scrollIntoView({ behavior: state.motionOff ? 'auto' : 'smooth' });
  }
}

function setMotion(off) {
  state.motionOff = off;
  document.documentElement.classList.toggle('motion-off', off);
  ambient.setPaused(off);
  studio.setPaused(off);
  const button = $('motionToggle');
  button.setAttribute('aria-pressed', String(off));
  button.setAttribute('aria-label', off ? 'Wznów animacje' : 'Wstrzymaj animacje');
  button.title = off ? 'Wznów animacje' : 'Wstrzymaj animacje';
  $('motionIcon').setAttribute('href', off ? '#i-play' : '#i-pause');
  syncCycleMotion();
}

function syncCycleMotion() {
  try {
    $('waterCycle').contentDocument?.documentElement.classList.toggle('motion-off', state.motionOff);
  } catch {}
}

function initNav() {
  const links = [...document.querySelectorAll('.side-link')];
  const targets = links.map(link => document.querySelector(link.hash));
  let queued = false;
  const spy = () => {
    queued = false;
    const line = innerHeight * 0.35;
    const atEnd = innerHeight + scrollY >= document.documentElement.scrollHeight - 4;
    let current = 0;
    targets.forEach((target, i) => { if (target.getBoundingClientRect().top <= line) current = i; });
    if (atEnd) current = targets.length - 1;
    links.forEach((link, i) => (i === current ? link.setAttribute('aria-current', 'true') : link.removeAttribute('aria-current')));
  };
  addEventListener('scroll', () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(spy);
    }
  }, { passive: true });
  spy();
}

function initControls() {
  $('refreshButton').addEventListener('click', () => {
    updateWeather();
    updateCities();
  });
  $('motionToggle').addEventListener('click', () => setMotion(!state.motionOff));
  $('waterCycle').addEventListener('load', syncCycleMotion);

  document.querySelectorAll('[data-scroll]').forEach(button => button.addEventListener('click', () => {
    $('hourlyList').scrollBy({ left: Number(button.dataset.scroll) * 320, behavior: state.motionOff ? 'auto' : 'smooth' });
  }));

  document.querySelectorAll('.seg-btn').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('.seg-btn').forEach(other => {
      const on = other === button;
      other.classList.toggle('is-active', on);
      other.setAttribute('aria-pressed', String(on));
    });
    charts.setHours(Number(button.dataset.hours));
  }));

  document.querySelectorAll('.scene-btn').forEach(button => button.addEventListener('click', () => {
    const scene = button.dataset.scene;
    document.querySelectorAll('.scene-btn').forEach(other => {
      const on = other === button;
      other.classList.toggle('is-active', on);
      other.setAttribute('aria-pressed', String(on));
    });
    studio.setScene(scene);
    $('sceneTitle').textContent = SCENES[scene][0];
    $('sceneDetail').textContent = SCENES[scene][1];
    $('sceneCount').textContent = `0${SCENE_ORDER.indexOf(scene) + 1} / 04`;
  }));

  const stage = $('symulator');
  const share = event => {
    const box = $('weatherCanvas').getBoundingClientRect();
    return (event.clientX - box.left) / box.width;
  };
  const onControls = event => event.target.closest('.studio-bottom, .studio-top');
  stage.addEventListener('pointermove', event => { if (!onControls(event)) studio.setWind((share(event) - 0.5) * 2); });
  stage.addEventListener('pointerleave', () => studio.setWind(0));
  stage.addEventListener('click', event => {
    if (onControls(event)) return;
    if (!studio.strike(share(event))) $('sceneDetail').textContent = 'Błyskawice wywołasz kliknięciem w scenie „Burza”.';
  });

  $('speedRange').addEventListener('input', event => {
    studio.setSpeed(event.target.value);
    ambient.setSpeed(event.target.value);
    $('speedValue').textContent = `${event.target.value} / 5`;
  });
}

document.body.classList.add('is-loading');
initDashboard();
initControls();
initNav();
initSearch(place => selectPlace(place));
initGallery();
initPlayer();
setMotion(state.motionOff);
tickClock();
setInterval(tickClock, 15000);
updateWeather();
updateCities();
