import { writeFile } from 'node:fs/promises';
import { buildDemo } from '../js/demo.js';
import { CITIES } from '../js/weather-data.js';

const start = new Date(Date.UTC(2026, 10, 14, 9));
const cities = Object.fromEntries(CITIES.map(city => [city.key, buildDemo(city, start, 1)]));
const file = {
  opis: 'Dane wymyślone na potrzeby demonstracji (nie są pomiarami ani prognozą). Wygenerowane skryptem docs/generuj_demo.mjs.',
  wygenerowano: '2026-11-14',
  cities
};

const json = JSON.stringify(file, null, 1).replace(/\[\n\s+([^\]{}]*?)\n\s*\]/g, (_, body) => `[${body.replace(/\n\s+/g, ' ')}]`);
await writeFile(new URL('../data/demo.json', import.meta.url), json + '\n');
console.log('Zapisano data/demo.json:', Object.keys(cities).join(', '));
