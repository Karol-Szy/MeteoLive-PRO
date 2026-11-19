import { icon, html, svgEl } from './ikony.js';
import { describeWeather, deg, tempColor, isNum } from './opisy.js';

const BORDER = [
  [14.22, 53.93], [14.45, 53.93], [14.77, 54.03], [15.3, 54.15], [15.58, 54.18], [16.1, 54.3], [16.4, 54.43], [16.85, 54.59],
  [17.3, 54.73], [17.55, 54.76], [18, 54.81], [18.33, 54.83], [18.4, 54.79], [18.81, 54.61], [18.6, 54.68], [18.45, 54.7],
  [18.55, 54.52], [18.68, 54.4], [18.95, 54.36], [19.3, 54.39], [19.63, 54.45], [19.68, 54.36], [20, 54.38], [20.5, 54.37],
  [21.3, 54.33], [22, 54.34], [22.79, 54.36], [23.05, 54.27], [23.35, 54.17], [23.5, 53.95], [23.65, 53.51], [23.77, 53.26],
  [23.93, 53.11], [23.92, 52.7], [23.45, 52.55], [23.15, 52.33], [23.4, 52.2], [23.65, 52.07], [23.63, 51.8], [23.55, 51.55],
  [23.62, 51.5], [23.8, 51.17], [24.14, 50.87], [24, 50.6], [23.6, 50.25], [23.3, 50.1], [23.1, 49.95], [22.95, 49.8],
  [22.66, 49.46], [22.56, 49.08], [22, 49.22], [21.45, 49.42], [20.95, 49.32], [20.6, 49.4], [20.35, 49.4], [20.1, 49.25],
  [19.85, 49.2], [19.78, 49.37], [19.53, 49.57], [19.2, 49.42], [18.97, 49.4], [18.85, 49.52], [18.6, 49.9], [18.3, 49.95],
  [17.85, 50.1], [17.65, 50.27], [17.38, 50.3], [17.05, 50.4], [16.9, 50.22], [16.67, 50.13], [16.45, 50.33], [16.24, 50.44],
  [16.18, 50.66], [15.98, 50.7], [15.74, 50.74], [15.38, 50.8], [15.12, 50.98], [14.83, 50.87], [14.99, 51.15], [14.97, 51.45],
  [14.72, 51.55], [14.72, 51.95], [14.67, 52.08], [14.56, 52.35], [14.63, 52.59], [14.15, 52.85], [14.39, 53.12], [14.42, 53.33],
  [14.27, 53.5], [14.25, 53.7], [14.22, 53.93]
];
const VISTULA = [[18.98, 49.62], [19.1, 49.95], [19.5, 50.03], [19.94, 50.05], [20.5, 50.2], [21.2, 50.4], [21.75, 50.68], [21.85, 51.05], [21.97, 51.42], [21.6, 51.95], [21.05, 52.25], [20.45, 52.4], [19.7, 52.56], [19.05, 52.88], [18.6, 53.01], [18.45, 53.2], [18.75, 53.48], [18.85, 53.85], [18.95, 54.36]];
const ODRA = [[18.2, 49.95], [18.25, 50.2], [17.92, 50.67], [17.5, 50.9], [17.03, 51.11], [16.55, 51.3], [16.08, 51.66], [15.7, 51.8], [15.1, 52.03], [14.67, 52.08], [14.56, 52.35], [14.63, 52.59], [14.15, 52.85], [14.39, 53.12], [14.55, 53.43], [14.6, 53.7]];

const WEST = 13.9, EAST = 24.4, NORTH = 55, SOUTH = 48.9, SCALE = 62;
const K = Math.cos((52 * Math.PI) / 180);
const W = Math.round((EAST - WEST) * K * SCALE);
const H = Math.round((NORTH - SOUTH) * SCALE);
const project = (lon, lat) => [(lon - WEST) * K * SCALE, (NORTH - lat) * SCALE];
const path = points => points.map(([lon, lat], i) => `${i ? 'L' : 'M'}${project(lon, lat).map(v => v.toFixed(1)).join(' ')}`).join('');
const inside = (lat, lon) => lat > SOUTH && lat < NORTH && lon > WEST && lon < EAST;

function buildSvg(wrap) {
  const svg = svgEl('svg', { class: 'map-svg', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Mapa Polski z aktualną temperaturą w największych miastach' }, wrap);
  const defs = svgEl('defs', {}, svg);
  const land = svgEl('linearGradient', { id: 'gMapLand', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
  svgEl('stop', { offset: 0, 'stop-color': '#173263' }, land);
  svgEl('stop', { offset: 1, 'stop-color': '#0d1c3a' }, land);
  const clip = svgEl('clipPath', { id: 'clipPoland' }, defs);
  svgEl('path', { d: `${path(BORDER)}Z` }, clip);

  const grid = svgEl('g', { class: 'map-grid' }, svg);
  for (let lon = 14; lon <= 24; lon++) {
    const [x] = project(lon, 0);
    svgEl('line', { x1: x, y1: 0, x2: x, y2: H }, grid);
  }
  for (let lat = 49; lat <= 54; lat++) {
    const [, y] = project(0, lat);
    svgEl('line', { x1: 0, y1: y, x2: W, y2: y }, grid);
  }

  const label = svgEl('text', { class: 'map-label', x: 6, y: 14 }, svg);
  label.textContent = 'MORZE BAŁTYCKIE';
  svgEl('path', { class: 'map-glow', d: `${path(BORDER)}Z` }, svg);
  svgEl('path', { class: 'map-border', d: `${path(BORDER)}Z` }, svg);
  const heat = svgEl('g', { class: 'map-heat', 'clip-path': 'url(#clipPoland)' }, svg);
  svgEl('path', { class: 'map-river', d: path(VISTULA) }, svg);
  svgEl('path', { class: 'map-river', d: path(ODRA) }, svg);
  return { svg, defs, heat };
}

export function initMap(wrap, list, onSelect) {
  wrap.style.aspectRatio = `${W} / ${H}`;
  const { defs, heat } = buildSvg(wrap);
  const layer = html('div', { className: 'map-markers' });
  wrap.append(layer);
  let cities = [];
  let place = null;
  let placeNow = null;

  const isSelected = city => place && (place.key ? place.key === city.key : false);

  function marker(item, selected, custom = false) {
    const weather = describeWeather(item.current?.weather_code, item.current?.is_day ?? 1);
    const temp = deg(item.current?.temperature_2m);
    const button = html('button', {
      className: `map-marker${selected ? ' is-selected' : ''}${custom ? ' is-custom' : ''}`,
      attrs: { type: 'button', 'aria-label': `${item.name}: ${temp}, ${weather.label}` }
    });
    if (!custom) button.append(icon(weather.icon));
    button.append(document.createTextNode(custom ? `${item.name} ${temp}` : temp));
    const [x, y] = project(item.lon, item.lat);
    button.style.left = `${(x / W) * 100}%`;
    button.style.top = `${(y / H) * 100}%`;
    if (selected) button.setAttribute('aria-current', 'true');
    button.addEventListener('click', () => onSelect(item));
    return button;
  }

  function renderHeat() {
    heat.replaceChildren();
    defs.querySelectorAll('.heat-grad').forEach(node => node.remove());
    cities.filter(c => isNum(c.current?.temperature_2m)).forEach((city, i) => {
      const grad = svgEl('radialGradient', { id: `heat${i}`, class: 'heat-grad' }, defs);
      svgEl('stop', { offset: 0, 'stop-color': tempColor(city.current.temperature_2m), 'stop-opacity': .55 }, grad);
      svgEl('stop', { offset: 1, 'stop-color': tempColor(city.current.temperature_2m), 'stop-opacity': 0 }, grad);
      const [cx, cy] = project(city.lon, city.lat);
      svgEl('circle', { cx, cy, r: 78, fill: `url(#heat${i})` }, heat);
    });
  }

  function render() {
    const markers = cities.map(city => marker(city, isSelected(city)));
    if (place && !place.key && inside(place.lat, place.lon)) markers.push(marker({ ...place, current: placeNow }, true, true));
    layer.replaceChildren(...markers);

    list.replaceChildren(...cities.map(city => {
      const weather = describeWeather(city.current?.weather_code, city.current?.is_day ?? 1);
      const row = html('button', { className: 'city-row', attrs: { type: 'button' } }, [
        icon(weather.icon),
        html('span', {}, [html('strong', { text: city.name }), html('small', { text: weather.label })]),
        html('span', { className: 'city-temp', text: deg(city.current?.temperature_2m) })
      ]);
      if (isSelected(city)) row.setAttribute('aria-current', 'true');
      row.addEventListener('click', () => onSelect(city));
      return html('li', {}, [row]);
    }));
  }

  return {
    setCities(next) {
      cities = next;
      renderHeat();
      render();
    },
    setPlace(next, current) {
      place = next;
      placeNow = current ?? null;
      if (next?.key && current) {
        cities = cities.map(c => (c.key === next.key ? { ...c, current: { ...c.current, ...current } } : c));
        renderHeat();
      }
      render();
    }
  };
}
