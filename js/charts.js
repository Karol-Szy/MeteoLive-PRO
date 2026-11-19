import { svgEl, html } from './ikony.js';
import { deg, num, hourOf, weekday, tempColor, isNum } from './opisy.js';

const PAD = { top: 26, right: 14, bottom: 30, left: 38 };
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const ease = t => 1 - (1 - t) ** 3;

function reducedMotion() {
  return matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('motion-off');
}

function niceTicks(lo, hi, count = 4) {
  const raw = (hi - lo) / count;
  const step = [1, 2, 5, 10, 20].find(s => s >= raw) ?? 20;
  const start = Math.floor(lo / step) * step;
  const end = Math.ceil(hi / step) * step;
  const ticks = [];
  for (let v = start; v <= end + 1e-9; v += step) ticks.push(v);
  return ticks;
}

function monotonePath(points) {
  const n = points.length;
  if (n < 2) return '';
  const dx = [], slope = [], m = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = points[i + 1][0] - points[i][0];
    slope[i] = (points[i + 1][1] - points[i][1]) / dx[i];
  }
  m[0] = slope[0];
  m[n - 1] = slope[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / slope[i], b = m[i + 1] / slope[i], s = a * a + b * b;
    if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * slope[i]; m[i + 1] = t * b * slope[i]; }
  }
  let d = `M${points[0][0].toFixed(1)},${points[0][1].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = points[i], [x1, y1] = points[i + 1], h = dx[i] / 3;
    d += `C${(x0 + h).toFixed(1)},${(y0 + m[i] * h).toFixed(1)} ${(x1 - h).toFixed(1)},${(y1 - m[i + 1] * h).toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
  }
  return d;
}

function timeLabel(time, index) {
  return index === 0 || time.slice(11, 13) === '00' ? `${weekday(time)} ${hourOf(time)}` : hourOf(time);
}

class Chart {
  constructor(root, kind) {
    this.root = root;
    this.kind = kind;
    this.points = [];
    this.active = -1;
    this.from = null;
    this.frame = 0;
    this.width = 0;
    this.svg = svgEl('svg', { class: 'chart-svg', tabindex: 0, role: 'img' });
    this.tip = html('div', { className: 'chart-tip', attrs: { 'aria-hidden': 'true' } }, [html('small'), html('strong')]);
    this.tip.hidden = true;
    this.live = html('p', { className: 'visually-hidden', attrs: { 'aria-live': 'polite' } });
    root.append(this.svg, this.tip, this.live);
    this.bind();
    new ResizeObserver(() => {
      if (Math.abs(root.clientWidth - this.width) > 2 && this.points.length) this.draw(1, false);
    }).observe(root);
  }

  bind() {
    const pick = event => {
      const box = this.svg.getBoundingClientRect();
      const x = event.clientX - box.left;
      const n = this.points.length;
      if (!n) return;
      const i = Math.round(((x - PAD.left) / (this.width - PAD.left - PAD.right)) * (this.kind === 'rain' ? n : n - 1) - (this.kind === 'rain' ? 0.5 : 0));
      this.setActive(clamp(i, 0, n - 1));
    };
    this.svg.addEventListener('pointermove', pick);
    this.svg.addEventListener('pointerdown', pick);
    this.svg.addEventListener('pointerleave', () => { if (document.activeElement !== this.svg) this.setActive(-1); });
    this.svg.addEventListener('focus', () => { if (this.active < 0) this.setActive(0); });
    this.svg.addEventListener('blur', () => this.setActive(-1));
    this.svg.addEventListener('keydown', event => {
      const n = this.points.length;
      const moves = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 };
      if (event.key in moves) this.setActive(clamp(this.active + moves[event.key], 0, n - 1));
      else if (event.key === 'Home') this.setActive(0);
      else if (event.key === 'End') this.setActive(n - 1);
      else return;
      event.preventDefault();
    });
  }

  setData(points) {
    const previous = this.coords?.map(([, y]) => y);
    this.points = points;
    this.active = -1;
    this.tip.hidden = true;
    const values = points.map(p => p.value);
    const label = this.kind === 'temp'
      ? `Wykres temperatury: od ${deg(Math.min(...values))} do ${deg(Math.max(...values))}. Użyj strzałek, aby odczytać kolejne godziny.`
      : `Wykres szansy opadów: maksymalnie ${num(Math.max(...values))}%. Użyj strzałek, aby odczytać kolejne godziny.`;
    this.svg.setAttribute('aria-label', label);
    cancelAnimationFrame(this.frame);
    if (reducedMotion()) {
      this.draw(1, false);
      return;
    }
    this.from = previous && previous.length === points.length ? previous : null;
    const start = performance.now();
    const step = now => {
      const t = clamp((now - start) / 650, 0, 1);
      this.draw(ease(t), true);
      if (t < 1) this.frame = requestAnimationFrame(step);
    };
    this.frame = requestAnimationFrame(step);
  }

  layout() {
    this.width = this.root.clientWidth;
    this.height = this.root.clientHeight;
    const values = this.points.map(p => p.value);
    if (this.kind === 'temp') {
      const ticks = niceTicks(Math.min(...values) - 1, Math.max(...values) + 1);
      this.lo = ticks[0];
      this.hi = ticks.at(-1);
      this.ticks = ticks;
    } else {
      this.lo = 0;
      this.hi = 100;
      this.ticks = [0, 25, 50, 75, 100];
    }
    const pw = this.width - PAD.left - PAD.right;
    const n = this.points.length;
    this.xAt = this.kind === 'temp'
      ? i => PAD.left + (n <= 1 ? 0 : (i * pw) / (n - 1))
      : i => PAD.left + (i + 0.5) * (pw / n);
    this.yAt = v => PAD.top + ((this.hi - v) / (this.hi - this.lo)) * (this.height - PAD.top - PAD.bottom);
    this.base = this.height - PAD.bottom;
  }

  frameAxes(svg) {
    for (const v of this.ticks) {
      const y = this.yAt(v);
      svgEl('line', { class: 'chart-grid', x1: PAD.left, x2: this.width - PAD.right, y1: y, y2: y }, svg);
      svgEl('text', { x: PAD.left - 10, y: y + 4, 'text-anchor': 'end' }, svg).textContent = this.kind === 'temp' ? `${num(v)}°` : `${v}%`;
    }
    const n = this.points.length;
    const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(this.width / 92))));
    for (let i = 0; i < n; i += every) {
      const anchor = this.kind === 'temp' && i === 0 ? 'start' : 'middle';
      svgEl('text', { x: this.xAt(i), y: this.height - 8, 'text-anchor': anchor }, svg).textContent = timeLabel(this.points[i].time, i);
    }
  }

  draw(progress, animating) {
    this.layout();
    const svg = this.svg;
    svg.replaceChildren();
    svg.setAttribute('viewBox', `0 0 ${this.width} ${this.height}`);
    this.frameAxes(svg);
    const target = this.points.map(p => this.yAt(clamp(p.value, this.lo, this.hi)));
    const startY = this.from ?? target.map(() => this.base);
    const ys = target.map((y, i) => startY[i] + (y - startY[i]) * progress);
    this.coords = this.points.map((_, i) => [this.xAt(i), ys[i]]);
    if (this.kind === 'temp') this.drawTemp(svg, !animating || progress === 1);
    else this.drawRain(svg, !animating || progress === 1);
    this.overlay = svgEl('g', {}, svg);
    if (progress === 1) this.from = null;
    if (this.active >= 0) this.setActive(this.active);
  }

  drawTemp(svg, done) {
    const defs = svgEl('defs', {}, svg);
    const id = `t${Math.random().toString(36).slice(2, 7)}`;
    const values = this.points.map(p => p.value);
    const max = Math.max(...values), min = Math.min(...values);
    const stroke = svgEl('linearGradient', { id: `${id}s`, gradientUnits: 'userSpaceOnUse', x1: 0, x2: 0, y1: this.yAt(max), y2: this.yAt(min) }, defs);
    svgEl('stop', { offset: 0, 'stop-color': tempColor(max) }, stroke);
    svgEl('stop', { offset: 1, 'stop-color': tempColor(min) }, stroke);
    const area = svgEl('linearGradient', { id: `${id}a`, x1: 0, x2: 0, y1: 0, y2: 1 }, defs);
    svgEl('stop', { offset: 0, 'stop-color': '#5aa2ff', 'stop-opacity': .32 }, area);
    svgEl('stop', { offset: 1, 'stop-color': '#5aa2ff', 'stop-opacity': 0 }, area);
    const line = monotonePath(this.coords);
    const lastX = this.coords.at(-1)[0];
    svgEl('path', { d: `${line}L${lastX},${this.base}L${PAD.left},${this.base}Z`, fill: `url(#${id}a)` }, svg);
    svgEl('path', { d: line, fill: 'none', stroke: `url(#${id}s)`, 'stroke-width': 3, 'stroke-linecap': 'round' }, svg);
    if (!done) return;
    const iMax = values.indexOf(max), iMin = values.indexOf(min);
    for (const [i, above] of [[iMax, true], [iMin, false]]) {
      const [x, y] = this.coords[i];
      svgEl('circle', { cx: x, cy: y, r: 3.5, fill: '#fff' }, svg);
      const tx = clamp(x, PAD.left + 14, this.width - PAD.right - 14);
      svgEl('text', { class: 'chart-extreme', x: tx, y: above ? y - 10 : y + 18, 'text-anchor': 'middle' }, svg).textContent = deg(values[i]);
    }
  }

  drawRain(svg) {
    const defs = svgEl('defs', {}, svg);
    const id = `r${Math.random().toString(36).slice(2, 7)}`;
    const grad = svgEl('linearGradient', { id, x1: 0, x2: 0, y1: 0, y2: 1 }, defs);
    svgEl('stop', { offset: 0, 'stop-color': '#8fdcff' }, grad);
    svgEl('stop', { offset: 1, 'stop-color': '#3a7bff' }, grad);
    const n = this.points.length;
    const slot = (this.width - PAD.left - PAD.right) / n;
    const width = clamp(slot * 0.56, 4, 16);
    const top = this.yAt(100);
    this.bars = this.coords.map(([x, y]) => {
      svgEl('rect', { class: 'chart-track', x: x - width / 2, y: top, width, height: this.base - top, rx: width / 2 }, svg);
      const h = Math.max(width, this.base - y);
      return svgEl('rect', { class: 'chart-bar', x: x - width / 2, y: this.base - h, width, height: h, rx: width / 2, fill: `url(#${id})` }, svg);
    });
  }

  setActive(i) {
    this.active = i;
    this.overlay?.replaceChildren();
    this.svg.classList.toggle('has-active', i >= 0);
    this.bars?.forEach((bar, k) => bar.classList.toggle('is-active', k === i));
    if (i < 0 || !this.coords?.[i]) {
      this.tip.hidden = true;
      return;
    }
    const [x, y] = this.coords[i];
    const point = this.points[i];
    if (this.kind === 'temp') {
      svgEl('line', { class: 'chart-cross', x1: x, x2: x, y1: PAD.top - 6, y2: this.base }, this.overlay);
      svgEl('circle', { class: 'chart-dot', cx: x, cy: y, r: 6, stroke: tempColor(point.value) }, this.overlay);
    }
    const value = this.kind === 'temp' ? `${num(point.value, 1)}°C` : `${num(point.value)}%`;
    const [small, strong] = this.tip.children;
    small.textContent = timeLabel(point.time, 0);
    strong.textContent = value;
    this.tip.hidden = false;
    const tipY = this.kind === 'temp' ? y : Math.min(y, this.base - 8);
    this.tip.style.left = `${clamp(x, 48, this.width - 48)}px`;
    this.tip.style.top = `${Math.max(tipY, 46)}px`;
    this.live.textContent = `${timeLabel(point.time, 0)}: ${value}`;
  }
}

export class WeatherCharts {
  constructor({ temperature, precipitation, table, tempStat, rainStat }) {
    this.temp = new Chart(temperature, 'temp');
    this.rain = new Chart(precipitation, 'rain');
    this.table = table;
    this.tempStat = tempStat;
    this.rainStat = rainStat;
    this.hours = 24;
    this.data = null;
    this.offset = 0;
  }

  setData(data, offset) {
    this.data = data;
    this.offset = offset;
    this.update();
  }

  setHours(hours) {
    this.hours = hours;
    this.update();
  }

  sample(key) {
    const h = this.data.hourly;
    const end = Math.min(this.offset + this.hours, h.time.length);
    const step = Math.max(1, Math.round(this.hours / 24));
    const points = [];
    for (let i = this.offset; i < end; i += step) {
      const value = h[key]?.[i];
      points.push({ time: h.time[i], value: isNum(value) ? Number(value) : 0 });
    }
    return points;
  }

  update() {
    if (!this.data) return;
    const temps = this.sample('temperature_2m');
    const rain = this.sample('precipitation_probability');
    this.temp.setData(temps);
    this.rain.setData(rain);

    const values = temps.map(p => p.value);
    this.tempStat.replaceChildren('min ', html('b', { text: deg(Math.min(...values)) }), ' · maks. ', html('b', { text: deg(Math.max(...values)) }));
    const peak = rain.reduce((best, p) => (p.value > best.value ? p : best), rain[0]);
    this.rainStat.replaceChildren('najwyżej ', html('b', { text: `${num(peak.value)}%` }), ` · ${timeLabel(peak.time, 0)}`);

    const body = this.table.tBodies[0];
    body.replaceChildren(...temps.map((p, i) => html('tr', {}, [
      html('td', { text: timeLabel(p.time, 0) }),
      html('td', { text: `${num(p.value, 1)}°C` }),
      html('td', { text: `${num(rain[i]?.value)}%` })
    ])));
  }
}
