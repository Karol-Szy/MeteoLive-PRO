import { icon, html, svgEl } from './ikony.js';
import * as o from './opisy.js';

const $ = id => document.getElementById(id);
const at = (list, i) => (Array.isArray(list) ? list[i] : undefined);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const hidden = text => html('span', { className: 'visually-hidden', text });
const textNode = text => document.createTextNode(text);

export function nowIndex(data) {
  const hour = String(data.current?.time ?? '').slice(0, 13);
  return Math.max(0, data.hourly.time.findIndex(t => t.slice(0, 13) === hour));
}

function todayIndex(data) {
  const date = String(data.current?.time ?? '').slice(0, 10);
  return Math.max(0, data.daily.time.indexOf(date));
}

export function initDashboard() {
  const ticks = $('compassTicks');
  for (let angle = 0; angle < 360; angle += 10) {
    const major = angle % 90 === 0;
    const rad = (angle * Math.PI) / 180;
    const inner = major ? 37 : 40;
    svgEl('line', {
      x1: 50 + Math.sin(rad) * inner, y1: 50 - Math.cos(rad) * inner,
      x2: 50 + Math.sin(rad) * 43, y2: 50 - Math.cos(rad) * 43,
      class: major ? 'major' : ''
    }, ticks);
  }
}

export function renderDashboard({ data, air }) {
  const c = data.current;
  const i = nowIndex(data);
  const d = todayIndex(data);
  const isDay = c.is_day ?? at(data.hourly.is_day, i) ?? 1;
  const weather = o.describeWeather(c.weather_code, isDay);
  renderNow(data, weather, d);
  renderHighlights(data, air, i, d);
  renderHourly(data, i);
  renderWeek(data, d);
  return { scene: weather.scene, night: Number(isDay) === 0, label: weather.label };
}

function renderNow(data, weather, d) {
  const c = data.current;
  const daily = data.daily;
  const max = at(daily.temperature_2m_max, d);
  const min = at(daily.temperature_2m_min, d);
  const prob = at(daily.precipitation_probability_max, d);
  const sum = at(daily.precipitation_sum, d);

  $('nowDate').textContent = `${o.dateLong(c.time)} · ${o.hourOf(c.time)}`;
  $('nowIcon').replaceChildren(icon(weather.icon, { inline: true, label: weather.label }));
  $('nowTemp').textContent = o.num(c.temperature_2m);
  $('nowDesc').textContent = weather.label;
  $('nowRange').replaceChildren(
    html('span', {}, [icon('i-up'), hidden('Maksymalnie '), textNode(o.deg(max))]),
    html('span', {}, [icon('i-down'), hidden('Minimalnie '), textNode(o.deg(min))])
  );

  const parts = [`Dziś od ${o.deg(min)} do ${o.deg(max)}.`];
  if (o.isNum(prob)) {
    if (prob >= 60) parts.push(`Spodziewaj się opadów — szansa ${o.num(prob)}%${o.isNum(sum) && sum > 0 ? `, suma ok. ${o.num(sum, 1)} mm` : ''}.`);
    else if (prob >= 30) parts.push(`Możliwe przelotne opady (szansa ${o.num(prob)}%).`);
    else parts.push(`Raczej bez opadów — szansa ${o.num(prob)}%.`);
    if (o.isNum(min) && min <= 0 && prob >= 30) parts.push('Możliwa ślizgawica.');
  }
  if (o.isNum(c.wind_gusts_10m) && c.wind_gusts_10m >= 50) parts.push(`Uwaga na porywy wiatru do ${o.num(c.wind_gusts_10m)} km/h.`);
  $('nowSummary').textContent = parts.join(' ');

  const chips = [
    ['i-cloud', 'Chmury', o.isNum(c.cloud_cover) ? `${o.num(c.cloud_cover)}%` : '—'],
    ['i-umbrella', 'Opad', o.isNum(c.precipitation) ? `${o.num(c.precipitation, 1)} mm` : '—'],
    ['i-drop', 'Szansa', o.isNum(prob) ? `${o.num(prob)}%` : '—']
  ];
  $('nowChips').replaceChildren(...chips.map(([name, label, value]) => html('li', {}, [
    html('small', {}, [icon(name), textNode(label)]),
    html('strong', { text: value })
  ])));
}

function renderHighlights(data, air, i, d) {
  const c = data.current;
  const daily = data.daily;
  $('hlHint').textContent = `Stan na ${o.hourOf(c.time)}`;

  const dir = c.wind_direction_10m;
  const [windShort, windName] = o.compass(dir);
  $('windValue').textContent = o.num(c.wind_speed_10m);
  $('windFoot').replaceChildren(
    html('span', { text: `${o.windLabel(c.wind_speed_10m)} z ${windShort}`, attrs: { title: `Wiatr ${windName}` } }),
    html('span', { text: o.isNum(c.wind_gusts_10m) ? `Porywy do ${o.num(c.wind_gusts_10m)} km/h` : '' })
  );
  $('compassNeedle').style.transform = `rotate(${(Number(dir) || 0) + 180}deg)`;

  const uv = at(data.hourly.uv_index, i) ?? at(daily.uv_index_max, d);
  const uvMax = at(daily.uv_index_max, d);
  const uvShare = o.isNum(uv) ? clamp(uv / 11, 0, 1) : 0;
  $('uvArc').style.strokeDasharray = `${uvShare * 100} 100`;
  $('uvDot').setAttribute('cx', (60 - 48 * Math.cos(Math.PI * uvShare)).toFixed(2));
  $('uvDot').setAttribute('cy', (60 - 48 * Math.sin(Math.PI * uvShare)).toFixed(2));
  $('uvValue').textContent = o.num(uv, 1);
  $('uvFoot').textContent = `${o.uvLabel(uv)}${o.isNum(uvMax) ? ` · maks. dziś ${o.num(uvMax, 1)}` : ''}`;

  const rise = at(daily.sunrise, d);
  const set = at(daily.sunset, d);
  const arc = $('sunArc');
  const dot = $('sunDot');
  if (rise && set) {
    const total = o.minutesBetween(rise, set);
    const passed = o.minutesBetween(rise, c.time);
    const share = clamp(passed / total, 0, 1);
    arc.style.strokeDasharray = `${share * 100} 100`;
    const point = arc.getPointAtLength(arc.getTotalLength() * share);
    dot.setAttribute('cx', point.x.toFixed(2));
    dot.setAttribute('cy', point.y.toFixed(2));
    dot.classList.toggle('is-night', passed < 0 || passed > total);
    $('sunrise').textContent = o.hourOf(rise);
    $('sunset').textContent = o.hourOf(set);
    $('dayLength').textContent = `Dzień trwa ${o.duration(total)}`;
  } else {
    $('sunrise').textContent = $('sunset').textContent = '—';
    $('dayLength').textContent = 'Brak danych o słońcu';
  }

  const aqi = air?.european_aqi;
  const info = o.aqiInfo(aqi);
  $('aqiValue').textContent = o.num(aqi);
  $('aqiLabel').textContent = info.label;
  $('aqiLabel').dataset.tone = info.tone;
  $('aqiMarker').style.left = `${o.isNum(aqi) ? clamp(aqi, 0, 100) : 0}%`;
  $('aqiMarker').hidden = !o.isNum(aqi);
  $('aqiFoot').textContent = air ? `PM2,5: ${o.num(air.pm2_5, 1)} · PM10: ${o.num(air.pm10, 1)} µg/m³` : 'Brak danych o jakości powietrza';

  const humidity = c.relative_humidity_2m;
  $('humValue').textContent = o.num(humidity);
  $('humBar').style.height = `${o.isNum(humidity) ? clamp(humidity, 0, 100) : 0}%`;
  $('humFoot').textContent = `Punkt rosy: ${o.deg(o.dewPoint(c.temperature_2m, humidity))}`;

  $('feelsValue').textContent = o.deg(c.apparent_temperature);
  $('feelsFoot').textContent = o.feelsLabel(c.temperature_2m, c.apparent_temperature) || '—';

  const pressure = c.pressure_msl;
  $('pressValue').textContent = o.num(pressure);
  $('pressNeedle').style.transform = `rotate(${o.isNum(pressure) ? clamp((pressure - 1010) / 40, -1, 1) * 90 : 0}deg)`;
  $('pressFoot').textContent = o.pressureLabel(pressure) || 'Brak danych';

  const meters = at(data.hourly.visibility, i);
  const km = o.isNum(meters) ? meters / 1000 : null;
  $('visValue').textContent = o.num(km, km !== null && km < 10 ? 1 : 0);
  $('visFoot').textContent = o.visibilityLabel(km) || 'Brak danych';
}

function renderHourly(data, start) {
  const h = data.hourly;
  const items = [];
  for (let k = 0; k < 24 && start + k < h.time.length; k++) {
    const j = start + k;
    const time = h.time[j];
    const now = k === 0;
    const weather = now
      ? o.describeWeather(data.current.weather_code, data.current.is_day ?? at(h.is_day, j) ?? 1)
      : o.describeWeather(at(h.weather_code, j) ?? data.current.weather_code, at(h.is_day, j) ?? 1);
    const prob = at(h.precipitation_probability, j);
    const item = html('li', { className: now ? 'hour is-now' : 'hour' });
    item.style.animationDelay = `${k * 18}ms`;
    if (k > 0 && time.slice(11, 13) === '00') item.append(html('span', { className: 'hour-day', text: o.weekday(time) }));
    item.append(
      html('span', { className: 'hour-time', text: now ? 'Teraz' : o.hourOf(time) }),
      icon(weather.icon, { label: weather.label }),
      html('span', { className: 'hour-temp', text: o.deg(now ? data.current.temperature_2m : at(h.temperature_2m, j)) }),
      html('span', { className: o.isNum(prob) && prob >= 20 ? 'hour-rain' : 'hour-rain is-dry' }, [icon('i-drop'), hidden('Szansa opadów '), textNode(`${o.num(prob)}%`)])
    );
    items.push(item);
  }
  $('hourlyList').replaceChildren(...items);
  $('hourlyList').scrollLeft = 0;
}

function renderWeek(data, d) {
  const daily = data.daily;
  const days = daily.time.slice(d, d + 7).map((date, k) => {
    const j = d + k;
    return { date, j, min: at(daily.temperature_2m_min, j), max: at(daily.temperature_2m_max, j), prob: at(daily.precipitation_probability_max, j), code: at(daily.weather_code, j) };
  });
  const lows = days.map(x => x.min).filter(o.isNum);
  const highs = days.map(x => x.max).filter(o.isNum);
  const lo = Math.min(...lows);
  const hi = Math.max(...highs);
  const span = hi - lo || 1;
  const pos = t => `${((t - lo) / span) * 100}%`;
  const current = data.current.temperature_2m;

  $('weekHint').textContent = lows.length ? `od ${o.deg(lo)} do ${o.deg(hi)}` : '';
  $('weekList').replaceChildren(...days.map((day, k) => {
    const weather = o.describeWeather(day.code, 1);
    const name = k === 0 ? 'Dziś' : k === 1 ? 'Jutro' : o.weekday(day.date);
    const fill = html('span', { className: 'day-fill' });
    if (o.isNum(day.min) && o.isNum(day.max)) {
      fill.style.left = pos(day.min);
      fill.style.width = `${((day.max - day.min) / span) * 100}%`;
      fill.style.background = `linear-gradient(90deg, ${o.tempColor(day.min)}, ${o.tempColor(day.max)})`;
    }
    const bar = html('span', { className: 'day-bar', attrs: { 'aria-hidden': 'true' } }, [fill]);
    if (k === 0 && o.isNum(current)) {
      const marker = html('span', { className: 'day-now' });
      marker.style.left = pos(clamp(current, lo, hi));
      bar.append(marker);
    }
    const item = html('li', { className: k === 0 ? 'day is-today' : 'day' }, [
      html('span', { className: 'day-name' }, [html('strong', { text: name }), html('small', { text: o.dateShort(day.date) })]),
      icon(weather.icon, { label: weather.label }),
      html('span', { className: o.isNum(day.prob) && day.prob >= 20 ? 'day-rain' : 'day-rain is-dry' }, [hidden('Szansa opadów '), textNode(`${o.num(day.prob)}%`)]),
      html('span', { className: 'day-min' }, [hidden('minimalnie '), textNode(o.deg(day.min))]),
      bar,
      html('span', { className: 'day-max' }, [hidden('maksymalnie '), textNode(o.deg(day.max))])
    ]);
    item.style.animationDelay = `${k * 40}ms`;
    return item;
  }));
}
