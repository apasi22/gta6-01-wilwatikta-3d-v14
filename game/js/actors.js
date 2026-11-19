// actors.js — aktor kota: pemain, lalu lintas, polisi, pejalan kaki, helikopter,
// dan sistem wanted WPD. Semua pergerakan deterministik dari keadaan awal.

'use strict';

import { CITY, CARS, districtAt, onRoad } from './city.js';
import { makeRng } from './gl.js';

const TAU = Math.PI * 2;

export function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
export function lerp(a, b, t) { return a + (b - a) * t; }
export function angLerp(a, b, t) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return a + d * t;
}
export function dist2(ax, az, bx, bz) { const dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; }

// ---- Pemain ----
export function makePlayer() {
  return {
    x: 126, z: 210, yaw: Math.PI, speed: 0, onFoot: false,
    health: 100, armor: 0, money: 12480, rep: 1320, level: 4,
    wanted: 3, weapon: 2, ammo: [Infinity, 12, 32, 0, 0],
    car: 0, // indeks CARS yang dikendarai
    walkPhase: 0, shooting: false, kills: 14, carsStolen: 6, stunts: 2150,
  };
}

// ---- Lalu lintas: mobil yang berputar di jalan grid ----
export function makeTraffic(rng, n) {
  const cars = [];
  const { cell, grid, size } = CITY;
  for (let i = 0; i < n; i++) {
    // Mobil berjalan di tengah jalan (garis grid), arah sejajar sumbu.
    const horizontal = rng() < 0.5;
    const lane = Math.floor(rng() * (grid + 1)) * cell;
    const along = rng() * size;
    const spec = CARS[Math.floor(rng() * CARS.length)];
    cars.push({
      x: horizontal ? along : lane + (rng() < 0.5 ? -2.2 : 2.2),
      z: horizontal ? lane + (rng() < 0.5 ? -2.2 : 2.2) : along,
      yaw: horizontal ? (rng() < 0.5 ? 0 : Math.PI) : (rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2),
      speed: 6 + rng() * 5,
      spec,
      color: spec.color,
    });
  }
  return cars;
}

export function stepTraffic(cars, dt, time) {
  const { size } = CITY;
  for (const c of cars) {
    const dx = Math.sin(c.yaw), dz = Math.cos(c.yaw);
    c.x += dx * c.speed * dt;
    c.z += dz * c.speed * dt;
    // Belok di ujung jalan agar tetap di kota.
    if (c.x < 2 || c.x > size - 2 || c.z < 2 || c.z > size - 2) {
      c.yaw += Math.PI / 2;
      c.x = clamp(c.x, 2, size - 2);
      c.z = clamp(c.z, 2, size - 2);
    }
    void time;
  }
}

// ---- Polisi WPD: mengejar pemain saat wanted > 0 ----
export function makePolice(rng, n) {
  const units = [];
  for (let i = 0; i < n; i++) {
    units.push({
      x: 100 + rng() * 60, z: 160 + rng() * 60,
      yaw: rng() * TAU, speed: 0, flash: rng() < 0.5,
      state: 'patrol', target: null,
    });
  }
  return units;
}

export function stepPolice(units, player, dt, time) {
  for (const u of units) {
    u.flash = Math.floor(time * 3) % 2 === 0;
    const d = Math.sqrt(dist2(u.x, u.z, player.x, player.z));
    if (player.wanted > 0 && d < 120) {
      // Kejar: arahkan ke pemain, kecepatan naik dengan wanted.
      const want = Math.atan2(player.x - u.x, player.z - u.z);
      u.yaw = angLerp(u.yaw, want, clamp(dt * 2.2, 0, 1));
      u.speed = lerp(u.speed, 11 + player.wanted * 1.6, clamp(dt * 1.5, 0, 1));
      u.state = 'chase';
    } else {
      // Patroli pelan di jalan.
      u.speed = lerp(u.speed, 5, clamp(dt, 0, 1));
      if (Math.floor(time + u.x) % 17 === 0) u.yaw += 0.02;
      u.state = 'patrol';
    }
    u.x += Math.sin(u.yaw) * u.speed * dt;
    u.z += Math.cos(u.yaw) * u.speed * dt;
    u.x = clamp(u.x, 2, CITY.size - 2);
    u.z = clamp(u.z, 2, CITY.size - 2);
    // Tabrakan dengan pemain menaikkan wanted dan mengurangi health sedikit.
    if (d < 3.2 && player.wanted > 0) {
      player.health = Math.max(0, player.health - 2 * dt);
    }
  }
}

// ---- Pejalan kaki: berjalan di trotoar, lari saat tembakan ----
export function makePeds(rng, n) {
  const peds = [];
  const shirts = ['#d24a7e', '#3fae8f', '#e8a020', '#7a5fc0', '#c96a2e', '#5a7a9a'];
  const skins = ['#c98a5a', '#a06a3f', '#e0aa7a', '#8a5a30'];
  for (let i = 0; i < n; i++) {
    peds.push({
      x: rng() * CITY.size, z: rng() * CITY.size,
      yaw: rng() * TAU, speed: 1.2 + rng() * 1.2,
      shirt: shirts[i % shirts.length], skin: skins[i % skins.length],
      walkPhase: rng() * TAU, panic: 0, alive: true,
      kind: rng() < 0.18 ? 'gang' : 'civil',
    });
  }
  return peds;
}

export function stepPeds(peds, player, dt, time) {
  for (const p of peds) {
    if (!p.alive) continue;
    if (p.panic > 0) p.panic -= dt;
    const d = Math.sqrt(dist2(p.x, p.z, player.x, player.z));
    if (player.shooting && d < 25) p.panic = 3;
    const sp = p.panic > 0 ? p.speed * 3.2 : p.speed;
    p.x += Math.sin(p.yaw) * sp * dt;
    p.z += Math.cos(p.yaw) * sp * dt;
    p.walkPhase += dt * sp * 3;
    if (p.x < 2 || p.x > CITY.size - 2 || p.z < 2 || p.z > CITY.size - 2 || Math.floor(time * 0.5 + p.walkPhase) % 23 === 0) {
      p.yaw = (p.yaw + Math.PI / 2 + (p.panic > 0 ? Math.PI : 0)) % TAU;
      p.x = clamp(p.x, 2, CITY.size - 2);
      p.z = clamp(p.z, 2, CITY.size - 2);
    }
  }
}

// ---- Helikopter WPD: mengorbit pemain saat wanted >= 3 ----
export function makeHeli() {
  return { x: 126, y: 42, z: 180, yaw: 0, rotor: 0, active: false, orbit: 0 };
}

export function stepHeli(heli, player, dt, time) {
  heli.active = player.wanted >= 3;
  if (!heli.active) return;
  heli.orbit += dt * 0.35;
  const r = 26;
  heli.x = player.x + Math.sin(heli.orbit) * r;
  heli.z = player.z + Math.cos(heli.orbit) * r;
  heli.y = 40 + Math.sin(time * 0.7) * 2;
  heli.yaw = Math.atan2(player.x - heli.x, player.z - heli.z);
  heli.rotor += dt * 22;
}

// ---- Wanted: naik saat menembak/mencuri, turun saat bersembunyi ----
export function wantedStars(player) { return player.wanted; }

export function addWanted(player, n) {
  player.wanted = clamp(player.wanted + n, 0, 5);
}

export function decayWanted(player, dt, hiding) {
  if (player.wanted === 0) return;
  // Bersembunyi di gang / jauh dari polisi menurunkan wanted perlahan.
  if (hiding) player.wanted = Math.max(0, player.wanted - dt * 0.08);
}

// ---- Tembakan pemain: raycast sederhana ke pejalan kaki / polisi ----
export function shootAt(player, peds, police, yaw, pitch) {
  // Arah tembak dari kamera; cari target terdekat dalam kerucut sempit.
  const dx = Math.sin(yaw) * Math.cos(pitch), dz = Math.cos(yaw) * Math.cos(pitch);
  let best = null, bestD = 60;
  const test = (x, z) => {
    const rx = x - player.x, rz = z - player.z;
    const along = rx * dx + rz * dz;
    if (along < 2 || along > bestD) return;
    const perp = Math.abs(rx * dz - rz * dx);
    if (perp < 1.6 + along * 0.02) { bestD = along; best = { x, z, along }; }
  };
  for (const p of peds) if (p.alive) test(p.x, p.z);
  for (const u of police) test(u.x, u.z);
  if (best) {
    for (const p of peds) {
      if (p.alive && Math.abs(p.x - best.x) < 0.01 && Math.abs(p.z - best.z) < 0.01) {
        p.alive = false;
        player.kills += 1;
        player.money += 25;
        return { hit: true, kind: p.kind, dist: bestD };
      }
    }
    return { hit: true, kind: 'police', dist: bestD };
  }
  return { hit: false, kind: null, dist: 0 };
}

// ---- Posisi awal tiap adegan screenshot (deterministik) ----
export function stagePositions() {
  return {
    // Kejar-kejaran senja di Pantai Kidul: pemain di jalan x=42 menghadap
    // -z, checkpoint 1 (40,220) 12 m di depan, 2 polisi di depannya.
    chase: { px: 42, pz: 232, yaw: Math.PI, onFoot: false, car: 0, wanted: 3, time: 'dusk', mission: 6 },
    // Malam di Pelabuhan Segara: pemain jalan kaki di jalan x=42 menghadap
    // -z, 4 musuh di depan, heli di atas mereka.
    night: { px: 42, pz: 60, yaw: Math.PI, onFoot: true, car: 0, wanted: 2, time: 'night', mission: 7 },
    title: { px: 127, pz: 210, yaw: 0, onFoot: true, car: 0, wanted: 0, time: 'night', mission: 0 },
    map: { px: 42, pz: 232, yaw: Math.PI, onFoot: false, car: 0, wanted: 3, time: 'dusk', mission: 6 },
  };
}

export function districtNameAt(x, z) {
  return districtAt(x, z).name;
}

export { onRoad, makeRng };
