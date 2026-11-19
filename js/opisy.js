const WEATHER_CODES = [
  [[0], 'Bezchmurnie', 'clear', 'sun'],
  [[1], 'Przeważnie pogodnie', 'partly', 'sun'],
  [[2], 'Częściowe zachmurzenie', 'partly', 'sun'],
  [[3], 'Pochmurno', 'cloud', 'cloud'],
  [[45], 'Mgła', 'fog', 'cloud'],
  [[48], 'Mgła osadzająca szadź', 'fog', 'cloud'],
  [[51], 'Lekka mżawka', 'drizzle', 'rain'],
  [[53], 'Mżawka', 'drizzle', 'rain'],
  [[55], 'Gęsta mżawka', 'drizzle', 'rain'],
  [[56, 57], 'Marznąca mżawka', 'drizzle', 'rain'],
  [[61], 'Słaby deszcz', 'rain', 'rain'],
  [[63], 'Deszcz', 'rain', 'rain'],
  [[65], 'Ulewny deszcz', 'rain', 'rain'],
  [[66, 67], 'Marznący deszcz', 'rain', 'rain'],
  [[71], 'Słaby śnieg', 'snow', 'snow'],
  [[73], 'Śnieg', 'snow', 'snow'],
  [[75], 'Intensywny śnieg', 'snow', 'snow'],
  [[77], 'Ziarna śniegu', 'snow', 'snow'],
  [[80], 'Przelotny deszcz', 'showers', 'rain'],
  [[81], 'Przelotne opady', 'showers', 'rain'],
  [[82], 'Gwałtowne ulewy', 'showers', 'rain'],
  [[85], 'Przelotny śnieg', 'snow', 'snow'],
  [[86], 'Śnieżyca', 'snow', 'snow'],
  [[95], 'Burza', 'storm', 'storm'],
  [[96, 99], 'Burza z gradem', 'storm', 'storm']
];

const ICONS = {
  clear: ['wi-sun', 'wi-moon'],
  partly: ['wi-sun-cloud', 'wi-moon-cloud'],
  cloud: ['wi-cloud', 'wi-cloud'],
  fog: ['wi-fog', 'wi-fog'],
  drizzle: ['wi-drizzle', 'wi-drizzle'],
  rain: ['wi-rain', 'wi-rain'],
  showers: ['wi-sun-rain', 'wi-rain'],
  snow: ['wi-snow', 'wi-snow'],
  storm: ['wi-storm', 'wi-storm']
};

export function describeWeather(code, isDay = 1) {
  const row = WEATHER_CODES.find(([codes]) => codes.includes(Number(code)));
  const [, label, kind, scene] = row ?? [null, 'Zmienna pogoda', 'partly', 'sun'];
  const day = Number(isDay) !== 0;
  return { label, scene, icon: ICONS[kind][day ? 0 : 1] };
}

const nf0 = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 1 });

export const isNum = v => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));
export const roundOrNull = v => (isNum(v) ? Math.round(Number(v)) || 0 : null);

export function num(v, digits = 0) {
  if (!isNum(v)) return '—';
  const value = digits ? Number(v) : Math.round(Number(v)) || 0;
  return (digits ? nf1 : nf0).format(value).replace('-', '−');
}

export const deg = v => (isNum(v) ? `${num(v)}°` : '—');

const utcFormat = options => new Intl.DateTimeFormat('pl-PL', { timeZone: 'UTC', ...options });
const weekdayShort = utcFormat({ weekday: 'short' });
const weekdayLong = utcFormat({ weekday: 'long' });
const longDate = utcFormat({ weekday: 'long', day: 'numeric', month: 'long' });
const dayMonth = utcFormat({ day: '2-digit', month: '2-digit' });

export function parseLocal(text) {
  const [date, time = '00:00'] = String(text).split('T');
  const [y, m, d] = date.split('-').map(Number);
  const [h, min] = time.split(':').map(Number);
  return new Date(Date.UTC(y, m - 1, d, h || 0, min || 0));
}

export const hourOf = text => String(text ?? '').slice(11, 16) || '—';
export const weekday = (text, long = false) => (long ? weekdayLong : weekdayShort).format(parseLocal(text));
export const dateLong = text => longDate.format(parseLocal(text));
export const dateShort = text => dayMonth.format(parseLocal(text));
export const clockOf = date => `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;

export function minutesBetween(a, b) {
  return Math.round((parseLocal(b) - parseLocal(a)) / 60000);
}

export function duration(minutes) {
  if (!isNum(minutes)) return '—';
  return `${Math.floor(minutes / 60)} godz. ${minutes % 60} min`;
}

const COMPASS = [
  ['N', 'północny'], ['NE', 'północno-wschodni'], ['E', 'wschodni'], ['SE', 'południowo-wschodni'],
  ['S', 'południowy'], ['SW', 'południowo-zachodni'], ['W', 'zachodni'], ['NW', 'północno-zachodni']
];
export function compass(degrees) {
  if (!isNum(degrees)) return ['—', 'zmienny'];
  return COMPASS[Math.round(((Number(degrees) % 360) + 360) % 360 / 45) % 8];
}

export function windLabel(kmh) {
  if (!isNum(kmh)) return '';
  if (kmh < 6) return 'Cisza';
  if (kmh < 20) return 'Słaby wiatr';
  if (kmh < 39) return 'Umiarkowany wiatr';
  if (kmh < 62) return 'Silny wiatr';
  if (kmh < 89) return 'Bardzo silny wiatr';
  return 'Wichura';
}

export function uvLabel(uv) {
  if (!isNum(uv)) return 'Brak danych';
  if (uv < 3) return 'Niski';
  if (uv < 6) return 'Umiarkowany';
  if (uv < 8) return 'Wysoki';
  if (uv < 11) return 'Bardzo wysoki';
  return 'Ekstremalny';
}

export function aqiInfo(aqi) {
  if (!isNum(aqi)) return { label: 'Brak danych', tone: 'none' };
  if (aqi <= 20) return { label: 'Bardzo dobra', tone: 'great' };
  if (aqi <= 40) return { label: 'Dobra', tone: 'good' };
  if (aqi <= 60) return { label: 'Umiarkowana', tone: 'fair' };
  if (aqi <= 80) return { label: 'Dostateczna', tone: 'poor' };
  if (aqi <= 100) return { label: 'Zła', tone: 'bad' };
  return { label: 'Bardzo zła', tone: 'awful' };
}

export function pressureLabel(hpa) {
  if (!isNum(hpa)) return '';
  if (hpa < 1000) return 'Niskie ciśnienie';
  if (hpa <= 1025) return 'Ciśnienie w normie';
  return 'Wysokie ciśnienie';
}

export function visibilityLabel(km) {
  if (!isNum(km)) return '';
  if (km >= 20) return 'Doskonała widoczność';
  if (km >= 10) return 'Dobra widoczność';
  if (km >= 4) return 'Umiarkowana widoczność';
  if (km >= 1) return 'Słaba widoczność';
  return 'Bardzo słaba — mgła';
}

export function feelsLabel(actual, apparent) {
  if (!isNum(actual) || !isNum(apparent)) return '';
  const diff = apparent - actual;
  if (diff <= -2) return 'Wiatr sprawia, że jest chłodniej';
  if (diff >= 2) return 'Wilgotność sprawia, że jest cieplej';
  return 'Podobnie jak temperatura powietrza';
}

export function dewPoint(t, rh) {
  if (!isNum(t) || !isNum(rh) || rh <= 0) return null;
  const a = 17.62, b = 243.12;
  const g = Math.log(rh / 100) + (a * t) / (b + t);
  return (b * g) / (a - g);
}

const TEMP_STOPS = [[-15, [122, 140, 255]], [-5, [96, 170, 255]], [3, [94, 206, 255]], [10, [104, 226, 196]], [18, [255, 214, 102]], [26, [255, 150, 84]], [34, [255, 92, 92]]];
export function tempColor(t) {
  const v = Math.max(TEMP_STOPS[0][0], Math.min(TEMP_STOPS.at(-1)[0], Number(t) || 0));
  const i = Math.max(1, TEMP_STOPS.findIndex(([at]) => at >= v));
  const [a, ca] = TEMP_STOPS[i - 1], [b, cb] = TEMP_STOPS[i];
  const k = b === a ? 0 : (v - a) / (b - a);
  const mix = ca.map((c, n) => Math.round(c + (cb[n] - c) * k));
  return `rgb(${mix.join(' ')})`;
}
