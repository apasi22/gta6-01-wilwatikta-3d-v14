// city.js — data Kota WILWATIKTA: 6 distrik, jalan, gedung, dan properti.
// Semua posisi lahir dari RNG berbiji tetap, jadi kota yang sama muncul di
// setiap run. Tidak ada aset luar: semua geometri prosedural.

'use strict';

// Enam distrik, masing-masing 2x2 petak pada grid kota 6x6.
export const DISTRICTS = [
  { id: 'segara', name: 'PELABUHAN SEGARA', color: '#3b6ea5', dark: '#2a4f78', gx: 0, gz: 0, desc: 'Dermaga & gudang' },
  { id: 'batik', name: 'KAMPUNG BATIK', color: '#7a5fc0', dark: '#5a4494', gx: 2, gz: 0, desc: 'Kampung kain & galeri' },
  { id: 'emas', name: 'LORONG EMAS', color: '#c9a227', dark: '#9a7d1c', gx: 4, gz: 0, desc: 'Pasar emas & kasino' },
  { id: 'alun', name: 'ALUN-ALUN', color: '#3f6fb5', dark: '#2f5389', gx: 2, gz: 2, desc: 'Balai kota & taman' },
  { id: 'kidul', name: 'PANTAI KIDUL', color: '#3d9b8f', dark: '#2c7268', gx: 0, gz: 4, desc: 'Pantai & dermaga selatan' },
  { id: 'senja', name: 'PASAR SENJA', color: '#c96a2e', dark: '#9c5222', gx: 4, gz: 4, desc: 'Pasar malam & showroom' },
];

export const CITY = {
  cell: 42,          // lebar satu petak kota (meter)
  grid: 6,           // petak per sisi
  road: 10,          // lebar jalan
  size: 6 * 42,      // 252 meter per sisi
};

// Titik penting (POI) di peta, dipakai HUD, peta, dan misi.
export const POIS = [
  { id: 'warehouse', icon: 'W', label: 'Warehouse', district: 'segara', x: 52, z: 26 },
  { id: 'docks', icon: 'D', label: 'Docks', district: 'segara', x: 26, z: 78 },
  { id: 'casino', icon: 'C', label: 'Casino', district: 'emas', x: 196, z: 78 },
  { id: 'alun', icon: 'M', label: 'Alun-Alun', district: 'alun', x: 110, z: 110 },
  { id: 'bengkel', icon: 'G', label: 'Bengkel Bambang', district: 'alun', x: 152, z: 104 },
  { id: 'showroom', icon: 'S', label: 'Showroom', district: 'senja', x: 196, z: 152 },
  { id: 'safehouse', icon: 'S', label: 'Safehouse', district: 'kidul', x: 110, z: 196 },
  { id: 'polisi', icon: 'P', label: 'Kantor WPD', district: 'alun', x: 96, z: 128 },
  { id: 'pasar', icon: 'P', label: 'Pasar Senja', district: 'senja', x: 210, z: 196 },
  { id: 'pantai', icon: 'P', label: 'Pantai Kidul', district: 'kidul', x: 40, z: 220 },
];

export const STREETS = [
  'Jl. Dermaga', 'Jl. Pasar Senja', 'Jl. Gamelan', 'Jl. Segara',
  'Jl. Batik Tulis', 'Jl. Lorong Emas', 'Jl. Alun-Alun', 'Jl. Pantai Kidul',
  'Jl. Kenanga', 'Jl. Merdeka', 'Jl. Sultan Agung', 'Jl. Diponegoro',
];

// Mobil-mobil kota, dengan nama Jawa dan warnanya.
export const CARS = [
  { name: 'Garuda GT', color: '#c0272d', top: 0.9 },
  { name: 'Kencana S', color: '#e8a020', top: 0.85 },
  { name: 'Arjuna', color: '#2e6fc2', top: 0.9 },
  { name: 'Srikandi', color: '#d8d8e0', top: 0.95 },
  { name: 'Gatotkaca', color: '#3a3f46', top: 0.8 },
  { name: 'Bima', color: '#2f8f5b', top: 0.85 },
];

// Kru Sugeng: 6 orang, masing-masing dengan peran, warna, dan tarif sewa.
export const CREW = [
  { id: 'sugeng', name: 'SUGENG', role: 'YOU', color: '#e8823a', hire: 0, note: 'Sugeng Wibowo — fixer jalanan Wilwatikta.' },
  { id: 'agus', name: 'AGUS', role: 'DRIVER · GETAWAY', color: '#d24a7e', hire: 200, note: 'Agus Prasetyo — sopir kabur tercepat di kota.' },
  { id: 'wanto', name: 'WANTO', role: 'WPD · INSIDE', color: '#3f7fd0', hire: 500, note: 'Komisaris Wanto — mata di dalam WPD.' },
  { id: 'bambang', name: 'BAMBANG', role: 'MECHANIC · BENGKEL', color: '#8f7a2e', hire: 350, note: 'Bambang — bengkel & upgrade di Alun-Alun.' },
  { id: 'ratna', name: 'RATNA', role: 'HACKER · CCTV', color: '#3fae8f', hire: 300, note: 'Ratna — matikan CCTV satu distrik.' },
  { id: 'slamet', name: 'SLAMET', role: 'MUSCLE · BACKUP', color: '#b04040', hire: 400, note: 'Slamet — otot cadangan saat baku tembak.' },
];

// Senjata: slot 0-4, dua terakhir terkunci sampai progres dibuka.
export const WEAPONS = [
  { slot: 0, name: 'TINJU', ammo: '∞', kind: 'fist' },
  { slot: 1, name: 'PISTOL', ammo: '12/60', kind: 'pistol' },
  { slot: 2, name: 'SMG TAWON', ammo: '32/160', kind: 'smg' },
  { slot: 3, name: 'SHOTGUN', ammo: 'LOCKED', kind: 'shotgun' },
  { slot: 4, name: 'RIFLE', ammo: 'LOCKED', kind: 'rifle' },
];

export const RADIOS = [
  { name: 'GAMELAN FM 101.1', track: 'Bonang Malam — Gamelan Wilwatikta', hue: 0 },
  { name: 'RADIO WILWATIKTA 98.4', track: 'Keroncong Senja — Orkes Pantai Kidul', hue: 1 },
  { name: 'LORONG EMAS FM 105.7', track: 'Dangdut Kilat — Srikandi Band', hue: 2 },
];

// Waktu dalam game: tiga suasana yang dipakai screenshot dan permainan.
export const TIMES = {
  dusk: { label: '18:37 · DAY 1', sky: '#5a3566', fog: [0.36, 0.22, 0.38], sun: [0.7, 0.35, -0.6], ambient: 0.62, night: 0.25, lampOn: true },
  night: { label: '19:49 · DAY 1', sky: '#111831', fog: [0.08, 0.09, 0.18], sun: [0.2, 0.5, -0.4], ambient: 0.42, night: 1.0, lampOn: true },
  day: { label: '14:05 · DAY 1', sky: '#7fb2e0', fog: [0.5, 0.7, 0.88], sun: [0.5, 0.8, 0.3], ambient: 0.75, night: 0.0, lampOn: false },
};

// Bangun daftar gedung + pohon + lampu dari biji tetap.
export function buildCity(rng) {
  const buildings = [];
  const trees = [];
  const lamps = [];
  const { cell, grid, road } = CITY;
  for (let gx = 0; gx < grid; gx++) {
    for (let gz = 0; gz < grid; gz++) {
      const bx = gx * cell + road / 2 + 3;
      const bz = gz * cell + road / 2 + 3;
      const bw = cell - road - 6;
      const district = DISTRICTS.find((d) => gx >= d.gx && gx < d.gx + 2 && gz >= d.gz && gz < d.gz + 2);
      // 2-4 gedung per petak, tinggi bervariasi; petak tengah Alun-Alun jadi taman.
      const isPark = district && district.id === 'alun' && gx === 2 && gz === 2;
      const count = isPark ? 1 : 2 + Math.floor(rng() * 3);
      for (let i = 0; i < count; i++) {
        const w = 10 + rng() * 14, d = 10 + rng() * 14;
        const h = 7 + rng() * rng() * 30;
        const x = bx + 4 + rng() * (bw - 8 - w);
        const z = bz + 4 + rng() * (bw - 8 - d);
        const palette = ['#8a6f4d', '#7d7468', '#9c7a54', '#6e6258', '#a8825a', '#5f6a75'];
        const warm = ['#c96a2e', '#b4552d', '#8a5a3b', '#7d4a3a'];
        buildings.push({
          x, z, w, d, h,
          color: rng() < 0.35 ? warm[Math.floor(rng() * warm.length)] : palette[Math.floor(rng() * palette.length)],
          roof: rng() < 0.5 ? '#4a4038' : '#3c4a3a',
          windows: Math.floor(h / 3),
          district: district ? district.id : 'alun',
        });
      }
      // Pohon palem di tepi petak, lampu jalan di sudut.
      const nTree = isPark ? 6 : 2 + Math.floor(rng() * 3);
      for (let i = 0; i < nTree; i++) {
        trees.push({ x: bx + rng() * bw, z: bz + rng() * bw, h: 5 + rng() * 3 });
      }
      lamps.push({ x: bx + 1, z: bz + 1 });
      lamps.push({ x: bx + bw - 1, z: bz + bw - 1 });
    }
  }
  return { buildings, trees, lamps };
}

// Nama jalan terdekat dari sebuah posisi (untuk HUD).
export function streetName(x, z) {
  const { cell } = CITY;
  const gx = Math.max(0, Math.min(5, Math.floor(x / cell)));
  const gz = Math.max(0, Math.min(5, Math.floor(z / cell)));
  return STREETS[(gx * 3 + gz * 5) % STREETS.length];
}

// Distrik dari sebuah posisi.
export function districtAt(x, z) {
  const { cell } = CITY;
  const gx = Math.floor(x / cell), gz = Math.floor(z / cell);
  for (const d of DISTRICTS) {
    if (gx >= d.gx && gx < d.gx + 2 && gz >= d.gz && gz < d.gz + 2) return d;
  }
  return DISTRICTS[3];
}

// Apakah sebuah titik berada di jalan (bukan di dalam gedung)?
export function onRoad(x, z) {
  const { cell, road } = CITY;
  const lx = x % cell, lz = z % cell;
  return lx < road || lz < road || lx > cell - 1 || lz > cell - 1;
}
