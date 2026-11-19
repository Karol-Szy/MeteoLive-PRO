const TAU = Math.PI * 2;
const rand = (min, max) => min + Math.random() * (max - min);

const AMBIENT_SKY = {
  sun: { day: ['#1c4c98', '#0a1d42'], night: ['#0b1636', '#04081a'] },
  cloud: { day: ['#26405f', '#0c1629'], night: ['#121a31', '#050a16'] },
  rain: { day: ['#1e3050', '#091222'], night: ['#111830', '#050914'] },
  storm: { day: ['#181b38', '#060811'], night: ['#111329', '#04060e'] },
  snow: { day: ['#2f4767', '#111d33'], night: ['#18243d', '#070e1c'] }
};
const SKY = {
  sun: { day: ['#2a6ad0', '#0c2552'], night: ['#0d1a3d', '#04081a'] },
  cloud: { day: ['#30507c', '#0f1b33'], night: ['#151f3a', '#060b19'] },
  rain: { day: ['#24395f', '#0a1426'], night: ['#131b35', '#050a17'] },
  storm: { day: ['#1c2040', '#070913'], night: ['#13152d', '#04060f'] },
  snow: { day: ['#3d5a80', '#14243c'], night: ['#1c2a47', '#081020'] }
};
const CLOUD_COUNT = { sun: 2, cloud: 6, rain: 6, storm: 7, snow: 5 };
const CLOUD_TINT = { sun: [236, 242, 252], cloud: [196, 208, 228], rain: [126, 142, 172], storm: [72, 80, 108], snow: [214, 224, 240] };

function cloudSprite(scale, [r, g, b], opacity) {
  const canvas = document.createElement('canvas');
  const w = Math.ceil(300 * scale), h = Math.ceil(150 * scale);
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const light = `${Math.min(255, r + 18)},${Math.min(255, g + 18)},${Math.min(255, b + 14)}`;
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    const bump = Math.sin(t * Math.PI);
    const radius = (34 + 30 * bump + rand(-6, 8)) * scale;
    const x = w * (0.16 + 0.68 * t) + rand(-8, 8) * scale;
    const y = h * 0.64 - bump * 24 * scale + rand(-6, 6) * scale;
    const grad = ctx.createRadialGradient(x, y - radius * 0.35, radius * 0.1, x, y, radius);
    grad.addColorStop(0, `rgba(${light},${opacity})`);
    grad.addColorStop(0.55, `rgba(${r},${g},${b},${opacity * 0.72})`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
    ctx.fill();
  }
  return canvas;
}

export class WeatherSimulation {
  constructor(canvas, { ambient = false } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ambient = ambient;
    this.scene = 'sun';
    this.night = false;
    this.speed = 3;
    this.paused = false;
    this.visible = true;
    this.time = 0;
    this.last = 0;
    this.flash = 0;
    this.bolt = null;
    this.wind = 0;
    this.windTarget = 0;
    this.layers = [[], [], []];
    this.clouds = [];
    this.stars = [];
    this.reduce = matchMedia('(prefers-reduced-motion: reduce)');
    this.reduce.addEventListener?.('change', () => this.draw());
    new ResizeObserver(() => this.fit()).observe(canvas);
    new IntersectionObserver(([entry]) => { this.visible = entry.isIntersecting; }).observe(canvas);
    this.loop = this.loop.bind(this);
    this.fit();
    requestAnimationFrame(this.loop);
  }

  fit() {
    const rect = this.canvas.getBoundingClientRect();
    const ratio = Math.min(devicePixelRatio || 1, 2);
    this.w = Math.max(1, rect.width);
    this.h = Math.max(1, rect.height);
    this.canvas.width = Math.round(this.w * ratio);
    this.canvas.height = Math.round(this.h * ratio);
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.populate();
    this.draw();
  }

  populate() {
    const area = this.w * this.h;
    const density = (this.scene === 'snow' ? 1 / 2400 : 1 / 1500) * (this.ambient ? 0.55 : 1);
    const total = ['rain', 'storm', 'snow'].includes(this.scene) ? Math.min(520, Math.round(area * density)) : 0;
    this.layers = [0.35, 0.65, 1].map(z => Array.from({ length: Math.round(total / 3) }, () => ({ x: rand(-40, this.w + 40), y: rand(-this.h, this.h), z, phase: rand(0, TAU) })));
    this.clouds = Array.from({ length: CLOUD_COUNT[this.scene] }, (_, i) => this.makeCloud(i));
    this.stars = Array.from({ length: Math.round(area / 4200) }, () => ({ x: rand(0, this.w), y: rand(0, this.h * 0.65), r: rand(0.4, 1.4), phase: rand(0, TAU) }));
    this.bolt = null;
    this.flash = 0;
  }

  makeCloud(i) {
    const scale = rand(0.75, 1.35) * Math.max(0.55, Math.min(1.4, this.w / 760));
    const tint = this.night ? CLOUD_TINT[this.scene].map(v => Math.round(v * 0.55)) : CLOUD_TINT[this.scene];
    const sprite = cloudSprite(scale, tint, this.scene === 'sun' ? 0.6 : 0.82);
    const band = this.scene === 'sun' ? 0.5 : 0.32;
    return { sprite, x: rand(-sprite.width * 0.6, this.w), y: (rand(-0.08, band) * this.h), v: rand(6, 14) * (1 + i * 0.08), alpha: rand(0.6, 0.95) };
  }

  setScene(scene, { night = false } = {}) {
    if (!SKY[scene]) return;
    if (scene === this.scene && night === this.night) return;
    this.scene = scene;
    this.night = night;
    this.populate();
    this.draw();
  }

  setSpeed(value) {
    this.speed = Math.min(5, Math.max(1, Number(value) || 3));
  }

  setPaused(paused) {
    this.paused = Boolean(paused);
    this.draw();
  }

  setWind(share) {
    this.windTarget = Math.max(-1, Math.min(1, Number(share) || 0));
    if (this.paused || this.reduce.matches) {
      this.wind = this.windTarget;
      this.draw();
    }
  }

  strike(share = 0.5) {
    if (this.scene !== 'storm') return false;
    this.flash = 1;
    this.bolt = this.makeBolt(share * this.w);
    this.draw();
    return true;
  }

  slant() {
    return 0.22 + this.wind * 0.45;
  }

  sunPosition() {
    return this.ambient ? [this.w * 0.82, this.h * 0.3] : [this.w * 0.64, this.h * 0.34];
  }

  drawSun() {
    const c = this.ctx;
    const [x, y] = this.sunPosition();
    const r = Math.min(this.w, this.h) * (this.ambient ? 0.085 : 0.12);
    const glow = c.createRadialGradient(x, y, r * 0.4, x, y, r * 5.5);
    glow.addColorStop(0, 'rgba(255, 206, 102, .45)');
    glow.addColorStop(0.35, 'rgba(255, 170, 70, .14)');
    glow.addColorStop(1, 'rgba(255, 170, 70, 0)');
    c.fillStyle = glow;
    c.fillRect(0, 0, this.w, this.h);
    c.save();
    c.translate(x, y);
    c.rotate(this.time * 0.05);
    c.fillStyle = 'rgba(255, 220, 140, .07)';
    for (let i = 0; i < 12; i++) {
      c.rotate(TAU / 12);
      c.beginPath();
      c.moveTo(r * 0.8, 0);
      c.lineTo(r * 6.5, -r * 0.42);
      c.lineTo(r * 6.5, r * 0.42);
      c.fill();
    }
    c.restore();
    const disc = c.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    disc.addColorStop(0, '#fff7cf');
    disc.addColorStop(0.5, '#ffcf45');
    disc.addColorStop(1, '#ff9a1f');
    c.fillStyle = disc;
    c.beginPath();
    c.arc(x, y, r, 0, TAU);
    c.fill();
  }

  drawMoon() {
    const c = this.ctx;
    const [x, y] = this.sunPosition();
    const r = Math.min(this.w, this.h) * (this.ambient ? 0.07 : 0.1);
    const glow = c.createRadialGradient(x, y, r * 0.5, x, y, r * 5);
    glow.addColorStop(0, 'rgba(190, 186, 255, .35)');
    glow.addColorStop(1, 'rgba(190, 186, 255, 0)');
    c.fillStyle = glow;
    c.fillRect(0, 0, this.w, this.h);
    const disc = c.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    disc.addColorStop(0, '#fbfaff');
    disc.addColorStop(1, '#b4aefc');
    c.fillStyle = disc;
    c.beginPath();
    c.arc(x, y, r, 0, TAU);
    c.fill();
    c.fillStyle = 'rgba(120, 112, 200, .18)';
    for (const [dx, dy, s] of [[-0.3, -0.1, 0.22], [0.25, 0.3, 0.16], [0.1, -0.4, 0.12]]) {
      c.beginPath();
      c.arc(x + dx * r, y + dy * r, s * r, 0, TAU);
      c.fill();
    }
  }

  drawStars(alpha) {
    const c = this.ctx;
    for (const s of this.stars) {
      c.fillStyle = `rgba(230, 238, 255, ${alpha * (0.35 + 0.65 * Math.abs(Math.sin(this.time * 1.6 + s.phase)))})`;
      c.beginPath();
      c.arc(s.x, s.y, s.r, 0, TAU);
      c.fill();
    }
  }

  drawPrecipitation() {
    const c = this.ctx;
    const fade = this.ambient ? 0.75 : 1;
    if (this.scene === 'snow') {
      for (const layer of this.layers) {
        if (!layer.length) continue;
        const z = layer[0].z;
        c.fillStyle = `rgba(244, 249, 255, ${(0.45 + 0.5 * z) * fade})`;
        c.beginPath();
        for (const p of layer) {
          c.moveTo(p.x + 1 + 2.4 * z, p.y);
          c.arc(p.x, p.y, 1 + 2.4 * z, 0, TAU);
        }
        c.fill();
      }
      return;
    }
    c.lineCap = 'round';
    for (const layer of this.layers) {
      if (!layer.length) continue;
      const z = layer[0].z;
      const len = 10 + 22 * z;
      c.strokeStyle = this.scene === 'storm' ? `rgba(186, 214, 255, ${(0.14 + 0.5 * z) * fade})` : `rgba(160, 214, 255, ${(0.14 + 0.5 * z) * fade})`;
      c.lineWidth = 0.6 + 1.3 * z;
      c.beginPath();
      const slant = this.slant();
      for (const p of layer) {
        c.moveTo(p.x, p.y);
        c.lineTo(p.x - slant * len, p.y + len);
      }
      c.stroke();
    }
  }

  makeBolt(startX = rand(0.3, 0.85) * this.w) {
    const limit = this.h * (this.ambient ? 0.6 : 0.72);
    let x = startX, y = 0;
    const main = [[x, y]];
    while (y < limit) {
      y += rand(12, 30);
      x += rand(-22, 22);
      main.push([x, y]);
    }
    const branches = [];
    for (let b = 0; b < 2; b++) {
      const start = main[Math.floor(rand(2, main.length - 2))];
      if (!start) continue;
      let [bx, by] = start;
      const dir = Math.random() < 0.5 ? -1 : 1;
      const branch = [[bx, by]];
      for (let k = 0; k < 4; k++) {
        bx += dir * rand(8, 22);
        by += rand(10, 22);
        branch.push([bx, by]);
      }
      branches.push(branch);
    }
    return { main, branches };
  }

  drawLightning() {
    if (this.flash <= 0 || !this.bolt) return;
    const c = this.ctx;
    const a = this.flash > 0.6 || this.flash < 0.35 ? this.flash : this.flash * 0.3;
    c.fillStyle = `rgba(205, 222, 255, ${0.2 * a})`;
    c.fillRect(0, 0, this.w, this.h);
    c.save();
    c.shadowColor = '#d4e8ff';
    c.shadowBlur = 18;
    c.strokeStyle = `rgba(245, 248, 255, ${a})`;
    c.lineJoin = 'round';
    const line = (points, width) => {
      c.lineWidth = width;
      c.beginPath();
      points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.stroke();
    };
    line(this.bolt.main, 2.6);
    this.bolt.branches.forEach(branch => line(branch, 1.2));
    c.restore();
  }

  drawGround() {
    const c = this.ctx;
    const { w, h } = this;
    const snow = this.scene === 'snow';
    const back = c.createLinearGradient(0, h * 0.7, 0, h);
    back.addColorStop(0, snow ? '#c9d7ea' : '#16305a');
    back.addColorStop(1, snow ? '#7f93b3' : '#0a1730');
    c.fillStyle = back;
    c.beginPath();
    c.moveTo(0, h);
    c.lineTo(0, h * 0.8);
    c.bezierCurveTo(w * 0.18, h * 0.7, w * 0.32, h * 0.74, w * 0.46, h * 0.79);
    c.bezierCurveTo(w * 0.62, h * 0.84, w * 0.8, h * 0.68, w, h * 0.76);
    c.lineTo(w, h);
    c.fill();
    const front = c.createLinearGradient(0, h * 0.8, 0, h);
    front.addColorStop(0, snow ? '#eef4fc' : '#0f2142');
    front.addColorStop(1, snow ? '#a8bad3' : '#050c1a');
    c.fillStyle = front;
    c.beginPath();
    c.moveTo(0, h);
    c.lineTo(0, h * 0.9);
    c.bezierCurveTo(w * 0.25, h * 0.82, w * 0.5, h * 0.92, w * 0.72, h * 0.86);
    c.bezierCurveTo(w * 0.86, h * 0.82, w * 0.94, h * 0.85, w, h * 0.84);
    c.lineTo(w, h);
    c.fill();
  }

  draw() {
    const c = this.ctx;
    const { w, h } = this;
    if (!w || !h) return;
    const [top, bottom] = (this.ambient ? AMBIENT_SKY : SKY)[this.scene][this.night ? 'night' : 'day'];
    const sky = c.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, top);
    sky.addColorStop(1, bottom);
    c.fillStyle = sky;
    c.fillRect(0, 0, w, h);
    if (this.night) this.drawStars(this.scene === 'sun' ? 1 : 0.35);
    if (this.scene === 'sun') (this.night ? this.drawMoon() : this.drawSun());
    for (const cloud of this.clouds) {
      c.globalAlpha = cloud.alpha;
      c.drawImage(cloud.sprite, cloud.x, cloud.y);
    }
    c.globalAlpha = 1;
    this.drawLightning();
    this.drawPrecipitation();
    if (!this.ambient) this.drawGround();
  }

  step(dt) {
    const v = dt * (0.35 + this.speed * 0.25);
    this.time += v;
    this.wind += (this.windTarget - this.wind) * Math.min(1, dt * 3);
    const slant = this.slant();
    for (const cloud of this.clouds) {
      cloud.x += cloud.v * v * 2 * (1 + this.wind * 2.2);
      if (cloud.x > this.w + 20) cloud.x = -cloud.sprite.width;
      if (cloud.x < -cloud.sprite.width - 20) cloud.x = this.w;
    }
    const snow = this.scene === 'snow';
    for (const layer of this.layers) {
      for (const p of layer) {
        if (snow) {
          p.y += (26 + 58 * p.z) * v;
          p.x += (Math.sin(this.time * 1.4 + p.phase) * 14 + 8 + this.wind * 60) * v;
        } else {
          const dy = (520 + 700 * p.z) * v;
          p.y += dy;
          p.x -= slant * dy;
        }
        if (p.y > this.h + 30) {
          p.y = rand(-60, -10);
          p.x = rand(-this.h * 0.3, this.w + this.h * 0.7);
        }
        if (p.x < -60) p.x += this.w + 100;
        if (p.x > this.w + 60) p.x -= this.w + 100;
      }
    }
    if (this.scene === 'storm') {
      this.flash = Math.max(0, this.flash - dt * 2.4);
      if (this.flash === 0 && Math.random() < dt * 0.45) {
        this.flash = 1;
        this.bolt = this.makeBolt();
      }
    }
  }

  loop(now) {
    const dt = this.last ? Math.min((now - this.last) / 1000, 0.05) : 0;
    this.last = now;
    const still = this.paused || this.reduce.matches || document.hidden || !this.visible;
    if (!still) {
      this.step(dt);
      this.draw();
    }
    requestAnimationFrame(this.loop);
  }
}
