const HOUR = 3600000;
const DAYS = 7;

const CLIMATE = {
  warszawa: { temp: 5, wind: 13, aqi: 38 },
  krakow: { temp: 5.2, wind: 9, aqi: 62 },
  gdansk: { temp: 6.2, wind: 22, aqi: 18 },
  wroclaw: { temp: 6.6, wind: 12, aqi: 44 },
  poznan: { temp: 6, wind: 14, aqi: 32 },
  szczecin: { temp: 6.6, wind: 18, aqi: 24 },
  bialystok: { temp: 3.4, wind: 12, aqi: 26 },
  lublin: { temp: 4.4, wind: 13, aqi: 34 },
  radom: { temp: 4.9, wind: 12, aqi: 40 },
  zakopane: { temp: 0.8, wind: 9, aqi: 52 }
};

export function hashSeed(text) {
  let h = 2166136261;
  for (const ch of String(text)) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function random(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const r1 = v => Math.round(v * 10) / 10;

function sunTimes(day, lat, lon, offsetHours) {
  const start = Date.UTC(day.getUTCFullYear(), 0, 1);
  const n = Math.floor((day - start) / 86400000);
  const g = (2 * Math.PI / 365) * n;
  const eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const phi = lat * Math.PI / 180;
  const cosH = Math.cos(90.833 * Math.PI / 180) / (Math.cos(phi) * Math.cos(decl)) - Math.tan(phi) * Math.tan(decl);
  const ha = Math.acos(clamp(cosH, -1, 1)) * 180 / Math.PI;
  const toDate = minutesUtc => new Date(day.getTime() + Math.round(minutesUtc + offsetHours * 60) * 60000);
  return { rise: toDate(720 - 4 * (lon + ha) - eq), set: toDate(720 - 4 * (lon - ha) - eq) };
}

function codeFor(prob, temp, cloud, humidity, wind, hour) {
  if (prob >= 70) return temp <= 0.5 ? (prob >= 85 ? 73 : 71) : (prob >= 85 ? 63 : 61);
  if (prob >= 52) return temp <= 0.5 ? 85 : 80;
  if (humidity >= 93 && wind < 10 && (hour <= 9 || hour >= 22)) return 45;
  if (cloud >= 85) return 3;
  if (cloud >= 55) return 2;
  if (cloud >= 28) return 1;
  return 0;
}

function apparent(temp, wind, humidity) {
  if (temp <= 10 && wind > 4.8) {
    const v = wind ** 0.16;
    return 13.12 + 0.6215 * temp - 11.37 * v + 0.3965 * temp * v;
  }
  return temp + (humidity - 70) * 0.02;
}

const SEVERITY = [95, 96, 99, 75, 73, 86, 85, 71, 65, 63, 82, 81, 80, 61, 55, 53, 51, 45, 48, 3, 2, 1, 0];

export function buildDemo(place, start, offsetHours = 1) {
  const key = place.key ?? '';
  const climate = CLIMATE[key] ?? { temp: 5 + (hashSeed(place.name) % 7) - 3, wind: 12, aqi: 32 };
  const rnd = random(hashSeed(`${key || place.name}|${iso(start).slice(0, 10)}`));
  const phase = [rnd() * 6.28, rnd() * 6.28, rnd() * 6.28, rnd() * 6.28];
  const total = DAYS * 24;
  const firstHour = start.getUTCHours();
  const dayStart = new Date(start.getTime() - firstHour * HOUR);

  const suns = Array.from({ length: DAYS + 1 }, (_, d) => sunTimes(new Date(dayStart.getTime() + d * 86400000), place.lat, place.lon, offsetHours));

  const hourly = { time: [], temperature_2m: [], precipitation_probability: [], weather_code: [], is_day: [], visibility: [], uv_index: [], wind_speed_10m: [] };
  const extra = [];

  for (let i = 0; i < total; i++) {
    const t = new Date(start.getTime() + i * HOUR);
    const h = t.getUTCHours();
    const dayIndex = Math.floor((i + firstHour) / 24);
    const sun = suns[dayIndex];
    const isDay = t >= sun.rise && t < sun.set ? 1 : 0;

    const prob = Math.round(clamp(34 + 34 * Math.sin(i / 27 + phase[0]) + 16 * Math.sin(i / 9 + phase[1]) + (rnd() - 0.5) * 12, 0, 100));
    const cloud = Math.round(clamp(prob * 0.85 + 22 + (rnd() - 0.5) * 24, 0, 100));
    const diurnal = 3.6 * Math.sin(((h - 9) / 24) * 2 * Math.PI) * (1 - cloud / 260);
    const temp = r1(climate.temp + diurnal + 2.6 * Math.sin(i / 52 + phase[2]) - prob / 70 + (rnd() - 0.5) * 0.8);
    const humidity = Math.round(clamp(68 + prob * 0.22 + (isDay ? -6 : 6) + (rnd() - 0.5) * 6, 48, 99));
    const wind = r1(Math.max(2, climate.wind + 6 * Math.sin(i / 19 + phase[3]) + prob / 14 + (rnd() - 0.5) * 4));
    const code = codeFor(prob, temp, cloud, humidity, wind, h);
    const visibility = code === 45 ? Math.round(300 + rnd() * 700) : prob >= 52 ? Math.round(6000 + rnd() * 7000) : Math.round(clamp(42000 - humidity * 280 + rnd() * 6000, 9000, 40000));
    const span = sun.set - sun.rise;
    const uv = isDay ? Math.round(Math.max(0, 1.3 * Math.sin(Math.PI * (t - sun.rise) / span)) * (1 - cloud / 160) * 100) / 100 : 0;

    hourly.time.push(iso(t));
    hourly.temperature_2m.push(temp);
    hourly.precipitation_probability.push(prob);
    hourly.weather_code.push(code);
    hourly.is_day.push(isDay);
    hourly.visibility.push(visibility);
    hourly.uv_index.push(uv);
    hourly.wind_speed_10m.push(wind);
    extra.push({
      cloud, humidity,
      rainMm: prob >= 70 ? r1(0.3 + rnd() * 1.1) : prob >= 52 ? r1(rnd() * 0.4) : 0,
      dir: Math.round((((235 + 70 * Math.sin(i / 37 + phase[1])) % 360) + 360) % 360),
      gust: Math.round(wind * (1.55 + rnd() * 0.25)),
      pressure: r1(1014 + 9 * Math.cos(i / 41 + phase[2]) - (prob - 40) * 0.07)
    });
  }

  const daily = { time: [], weather_code: [], temperature_2m_max: [], temperature_2m_min: [], sunrise: [], sunset: [], uv_index_max: [], precipitation_probability_max: [], precipitation_sum: [], wind_speed_10m_max: [] };
  for (let d = 0; d < DAYS; d++) {
    const date = iso(new Date(dayStart.getTime() + d * 86400000)).slice(0, 10);
    const idx = hourly.time.map((time, i) => (time.startsWith(date) ? i : -1)).filter(i => i >= 0);
    const temps = idx.map(i => hourly.temperature_2m[i]);
    const dayCodes = idx.filter(i => hourly.is_day[i]).map(i => hourly.weather_code[i]);
    const codes = dayCodes.length ? dayCodes : idx.map(i => hourly.weather_code[i]);
    const rainy = codes.filter(c => c >= 51).length;
    const worst = SEVERITY.find(c => codes.includes(c));
    const code = worst >= 51 && rainy < 3 ? (codes.includes(3) ? 3 : 2) : worst;
    const bias = d === 0 ? 0 : (rnd() - 0.5) * 1.4;
    daily.time.push(date);
    daily.weather_code.push(code ?? 2);
    daily.temperature_2m_max.push(r1(Math.max(...temps) + Math.abs(bias)));
    daily.temperature_2m_min.push(r1(Math.min(...temps) - Math.abs(bias) - (d === 0 ? 0 : 1.2)));
    daily.sunrise.push(iso(suns[d].rise));
    daily.sunset.push(iso(suns[d].set));
    daily.uv_index_max.push(Math.max(0, ...idx.map(i => hourly.uv_index[i])));
    daily.precipitation_probability_max.push(Math.max(...idx.map(i => hourly.precipitation_probability[i])));
    daily.precipitation_sum.push(r1(idx.reduce((sum, i) => sum + extra[i].rainMm, 0)));
    daily.wind_speed_10m_max.push(Math.max(...idx.map(i => hourly.wind_speed_10m[i])));
  }

  const now = extra[0];
  const temp0 = hourly.temperature_2m[0];
  const wind0 = hourly.wind_speed_10m[0];
  const current = {
    time: hourly.time[0],
    temperature_2m: temp0,
    relative_humidity_2m: now.humidity,
    apparent_temperature: r1(apparent(temp0, wind0, now.humidity)),
    is_day: hourly.is_day[0],
    precipitation: now.rainMm,
    weather_code: hourly.weather_code[0],
    cloud_cover: now.cloud,
    pressure_msl: now.pressure,
    wind_speed_10m: wind0,
    wind_direction_10m: now.dir,
    wind_gusts_10m: now.gust
  };

  const aqi = Math.round(clamp(climate.aqi + (rnd() - 0.5) * 14 - wind0 / 3, 8, 140));
  const air = { current: { time: hourly.time[0], european_aqi: aqi, pm2_5: r1(aqi * 0.42 + rnd() * 3), pm10: r1(aqi * 0.62 + rnd() * 4) } };

  return {
    latitude: place.lat,
    longitude: place.lon,
    timezone: 'Europe/Warsaw',
    utc_offset_seconds: offsetHours * 3600,
    current,
    hourly,
    daily,
    air
  };
}

export function demoStart(date = new Date()) {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()));
}
