// world.js — membangun mesh statis kota (tanah, jalan, gedung, pohon, lampu)
// dan menggambar entitas dinamis (mobil, karakter, helikopter) ke buffer dinamis.
// Semua geometri prosedural dari data city.js.

'use strict';

import { MeshBuilder, hexRgb, shade } from './gl.js';
import { CITY, DISTRICTS, buildCity } from './city.js';

const WIN_LIT = '#ffd977';
const WIN_DARK = '#2c3542';

// ---- mesh statis: dibangun sekali dari biji tetap ----
export function buildStaticMesh(rng) {
  const mb = new MeshBuilder();
  const { cell, grid, road, size } = CITY;

  // Tanah dasar kota.
  mb.groundQuad(-8, -8, size + 8, size + 8, -0.05, hexRgb('#2e3a2c'), 0);

  // Petak distrik (tanah berwarna per distrik) + jalan di antaranya.
  for (let gx = 0; gx < grid; gx++) {
    for (let gz = 0; gz < grid; gz++) {
      const x0 = gx * cell, z0 = gz * cell;
      const d = DISTRICTS.find((dd) => gx >= dd.gx && gx < dd.gx + 2 && gz >= dd.gz && gz < dd.gz + 2);
      const base = d ? hexRgb(d.dark) : hexRgb('#3a3f45');
      mb.groundQuad(x0, z0, x0 + cell, z0 + cell, 0, shade(base, 0.55), 0);
      // Trotoar di sekeliling petak.
      mb.groundQuad(x0 + road / 2, z0 + road / 2, x0 + cell - road / 2, z0 + cell - road / 2, 0.02, hexRgb('#5a5a52'), 0);
    }
  }
  // Jalan aspal + garis tengah kuning + garis tepi putih.
  for (let i = 0; i <= grid; i++) {
    const c = i * cell;
    mb.groundQuad(c - road / 2, 0, c + road / 2, size, 0.03, hexRgb('#232326'), 0);
    mb.groundQuad(0, c - road / 2, size, c + road / 2, 0.03, hexRgb('#232326'), 0);
    for (let s = 0; s < size; s += 8) {
      mb.groundQuad(c - 0.25, s, c + 0.25, s + 3.5, 0.05, hexRgb('#c9a227'), 0.35);
      mb.groundQuad(s, c - 0.25, s + 3.5, c + 0.25, 0.05, hexRgb('#c9a227'), 0.35);
    }
  }
  // Garis pantai di selatan (Pantai Kidul): pasir + laut.
  mb.groundQuad(0, size, size, size + 14, 0.02, hexRgb('#c2a878'), 0);
  mb.groundQuad(-8, size + 14, size + 8, size + 30, 0.0, hexRgb('#1e4d6b'), 0);

  const { buildings, trees, lamps } = buildCity(rng);

  // Gedung: kotak + jendela menyala di fasad.
  for (const b of buildings) {
    const col = hexRgb(b.color);
    const roof = hexRgb(b.roof);
    mb.box(b.x + b.w / 2, b.h / 2, b.z + b.d / 2, b.w, b.h, b.d, col, roof, 0);
    const lit = hexRgb(WIN_LIT), dark = hexRgb(WIN_DARK);
    const rows = Math.max(1, Math.floor(b.h / 3.2));
    const colsF = Math.max(1, Math.floor(b.w / 3.4));
    const colsS = Math.max(1, Math.floor(b.d / 3.4));
    for (let r = 0; r < rows; r++) {
      const wy = 2.2 + r * 3.2;
      if (wy > b.h - 1) break;
      for (let cI = 0; cI < colsF; cI++) {
        const wx = b.x + 1.6 + cI * 3.4 + 0.9;
        if (wx > b.x + b.w - 1.2) break;
        const on = rng() < 0.68;
        mb.faceQuad(wx, wy, b.z + b.d + 0.06, 1.5, 1.7, 0, on ? lit : dark, on ? 0.9 : 0);
        mb.faceQuad(wx, wy, b.z - 0.06, 1.5, 1.7, Math.PI, on ? lit : dark, on ? 0.9 : 0);
      }
      for (let cI = 0; cI < colsS; cI++) {
        const wz = b.z + 1.6 + cI * 3.4 + 0.9;
        if (wz > b.z + b.d - 1.2) break;
        const on = rng() < 0.68;
        mb.faceQuad(b.x + b.w + 0.06, wy, wz, 1.5, 1.7, Math.PI / 2, on ? lit : dark, on ? 0.9 : 0);
        mb.faceQuad(b.x - 0.06, wy, wz, 1.5, 1.7, -Math.PI / 2, on ? lit : dark, on ? 0.9 : 0);
      }
    }
    // Antena di atap gedung tinggi.
    if (b.h > 22) mb.box(b.x + b.w / 2, b.h + 1.5, b.z + b.d / 2, 0.3, 3, 0.3, hexRgb('#333333'), null, 0);
  }

  // Pohon palem: batang + tajuk kotak hijau.
  for (const t of trees) {
    mb.box(t.x, t.h / 2, t.z, 0.5, t.h, 0.5, hexRgb('#6b4a2a'), null, 0);
    mb.box(t.x, t.h + 0.8, t.z, 4.2, 1.4, 4.2, hexRgb('#2f7a3d'), hexRgb('#3f9a4d'), 0);
    mb.box(t.x, t.h + 0.4, t.z, 5.2, 0.5, 1.2, hexRgb('#2f7a3d'), null, 0);
    mb.box(t.x, t.h + 0.4, t.z, 1.2, 0.5, 5.2, hexRgb('#2f7a3d'), null, 0);
  }

  // Lampu jalan: tiang + kepala menyala.
  for (const l of lamps) {
    mb.box(l.x, 2.6, l.z, 0.25, 5.2, 0.25, hexRgb('#2a2d33'), null, 0);
    mb.box(l.x, 5.3, l.z, 0.9, 0.35, 0.9, hexRgb('#ffe9a8'), null, 0.95);
  }

  // Taman Alun-Alun: rumput + air mancur + bangku.
  const parkX = 2 * cell + road / 2 + 4, parkZ = 2 * cell + road / 2 + 4;
  mb.groundQuad(parkX, parkZ, parkX + 30, parkZ + 30, 0.04, hexRgb('#3d7a3a'), 0);
  mb.box(parkX + 15, 0.8, parkZ + 15, 7, 1.6, 7, hexRgb('#7fb2d8'), hexRgb('#a8d0e8'), 0.25);
  mb.box(parkX + 15, 2.0, parkZ + 15, 1.2, 2.2, 1.2, hexRgb('#9fb4c4'), null, 0.2);
  for (let i = 0; i < 4; i++) {
    mb.box(parkX + 4 + i * 7, 0.6, parkZ + 2, 4, 1.1, 1.2, hexRgb('#7a5a34'), null, 0);
  }

  // Dermaga Pelabuhan Segara: kayu + kontainer warna-warni.
  const dockX = 8, dockZ = 8;
  mb.groundQuad(dockX, dockZ, dockX + 26, dockZ + 12, 0.06, hexRgb('#8a6f4d'), 0);
  const contCols = ['#b04040', '#3f7fd0', '#c9a227', '#3fae8f'];
  for (let i = 0; i < 6; i++) {
    mb.box(dockX + 4 + (i % 3) * 8, 1.4, dockZ + 3 + Math.floor(i / 3) * 5, 6.5, 2.8, 2.6,
      hexRgb(contCols[i % contCols.length]), hexRgb('#333333'), 0);
  }

  return { mesh: mb, buildings };
}

// ---- entitas dinamis ----

// Mobil: badan + kabin + roda + lampu depan/belakang + (polisi) lightbar.
export function drawCar(mb, x, z, yaw, spec, isPolice, flash) {
  const body = hexRgb(spec.color);
  const dark = hexRgb('#15161a');
  const glass = hexRgb('#20262e');
  // Atap = warna bodi yang digelapkan (bukan abu-abu terang).
  const roof = [body[0] * 0.75, body[1] * 0.75, body[2] * 0.75];
  mb.boxRot(x, 0.75, z, 2.1, 0.75, 4.4, yaw, body, roof, 0);
  mb.boxRot(x, 1.35, z - 0.2, 1.8, 0.6, 2.2, yaw, glass, glass, 0);
  const c = Math.cos(yaw), s = Math.sin(yaw);
  const wheel = (dx, dz) => {
    const wx = x + dx * c + dz * s, wz = z - dx * s + dz * c;
    mb.box(wx, 0.35, wz, 0.35, 0.7, 0.9, dark, null, 0);
  };
  wheel(-1.0, 1.5); wheel(1.0, 1.5); wheel(-1.0, -1.5); wheel(1.0, -1.5);
  // Lampu: depan putih menyala, belakang merah menyala.
  const head = (dx) => {
    const hx = x + dx * c + 2.15 * s, hz = z - dx * s + 2.15 * c;
    mb.box(hx, 0.8, hz, 0.4, 0.25, 0.15, hexRgb('#fff2b0'), null, 1.0);
  };
  const tail = (dx) => {
    const hx = x + dx * c - 2.15 * s, hz = z - dx * s - 2.15 * c;
    mb.box(hx, 0.8, hz, 0.4, 0.25, 0.15, hexRgb('#ff2a2a'), null, 1.0);
  };
  head(-0.7); head(0.7); tail(-0.7); tail(0.7);
  if (isPolice) {
    // Lightbar merah-biru berkedip bergantian.
    const lx = x - 0.0 * c + 0.0 * s, lz = z;
    const red = flash ? 1.0 : 0.15, blue = flash ? 0.15 : 1.0;
    mb.boxRot(x - 0.45, 1.85, z - 0.2, 0.7, 0.22, 0.5, yaw, hexRgb('#ff2020'), null, red);
    mb.boxRot(x + 0.45, 1.85, z - 0.2, 0.7, 0.22, 0.5, yaw, hexRgb('#2040ff'), null, blue);
    void lx; void lz;
  }
}

// Karakter blok: kepala + torso + lengan + kaki + (opsional) pistol di tangan kanan.
export function drawPerson(mb, x, z, yaw, opt) {
  const s = opt.scale || 1;
  const skin = hexRgb(opt.skin || '#c98a5a');
  const shirt = hexRgb(opt.shirt || '#3f7fd0');
  const pants = hexRgb(opt.pants || '#3a3f46');
  const hair = hexRgb(opt.hair || '#1a1a1a');
  const y0 = 0;
  // Dua kaki (satu melangkah bila berjalan).
  const step = opt.walk ? Math.sin(opt.walkPhase || 0) * 0.25 * s : 0;
  const c = Math.cos(yaw), sn = Math.sin(yaw);
  const legX = (dx) => x + dx * c;
  const legZ = (dz) => z - dz * sn;
  mb.boxRot(legX(-0.2 * s), y0 + 0.45 * s, legZ(-0.2 * s), 0.3 * s, 0.9 * s, 0.38 * s, yaw, pants, null, 0);
  mb.boxRot(legX(0.2 * s), y0 + 0.45 * s, legZ(0.2 * s), 0.3 * s, 0.9 * s, 0.38 * s, yaw, pants, null, 0);
  void step;
  // Torso.
  mb.boxRot(x, y0 + 1.25 * s, z, 0.85 * s, 0.85 * s, 0.45 * s, yaw, shirt, null, 0);
  // Lengan: kiri turun, kanan memegang pistol (bila bersenjata) atau turun.
  const armY = y0 + 1.3 * s;
  mb.boxRot(x - 0.55 * s, armY, z, 0.28 * s, 0.75 * s, 0.32 * s, yaw, shirt, null, 0);
  if (opt.gun) {
    // Lengan kanan memegang pistol. gunSide (hero title): lengan menjulur
    // diagonal ke kanan-depan supaya pistol terlihat jelas dari depan.
    const c = Math.cos(yaw), sn = Math.sin(yaw);
    if (opt.gunSide) {
      // Pose hero: lengan kanan terentang ke samping, pistol gunmetal
      // menunjuk ke kanan — terbaca jelas dari depan.
      const rx = c, rz = -sn; // vektor kanan karakter
      const hx = x + rx * 0.7 * s, hz = z + rz * 0.7 * s;
      mb.boxRot(hx, armY + 0.08 * s, hz, 0.85 * s, 0.28 * s, 0.28 * s, yaw, shirt, null, 0);
      const gx = x + rx * 1.35 * s, gz = z + rz * 1.35 * s;
      mb.boxRot(gx, armY + 0.1 * s, gz, 0.7 * s, 0.2 * s, 0.18 * s, yaw, hexRgb('#9aa0a8'), null, 0.3);
      mb.boxRot(gx - rx * 0.15 * s, armY - 0.14 * s, gz - rz * 0.15 * s, 0.16 * s, 0.34 * s, 0.14 * s, yaw, hexRgb('#5a5f66'), null, 0);
    } else {
      const hx = x + 0.55 * s * c + 0.45 * s * sn, hz = z - 0.55 * s * sn + 0.45 * s * c;
      mb.boxRot(hx, armY + 0.1 * s, hz, 0.28 * s, 0.28 * s, 0.8 * s, yaw, shirt, null, 0);
      const gx = x + 0.55 * s * c + 0.95 * s * sn, gz = z - 0.55 * s * sn + 0.95 * s * c;
      mb.boxRot(gx, armY + 0.12 * s, gz, 0.12 * s, 0.16 * s, 0.55 * s, yaw, hexRgb('#141414'), null, 0);
    }
  } else {
    mb.boxRot(x + 0.55 * s, armY, z, 0.28 * s, 0.75 * s, 0.32 * s, yaw, shirt, null, 0);
  }
  // Kepala + rambut + topi/kacamata opsional.
  mb.boxRot(x, y0 + 2.0 * s, z, 0.62 * s, 0.6 * s, 0.55 * s, yaw, skin, null, 0);
  mb.boxRot(x, y0 + 2.32 * s, z, 0.64 * s, 0.22 * s, 0.57 * s, yaw, hair, null, 0);
  if (opt.face) {
    // Mata + mulut di wajah (sisi depan kepala) — hero title terbaca
    // menghadap kamera.
    const eye = (rx) => {
      const ex = x + rx * c + 0.3 * s * sn, ez = z - rx * sn + 0.3 * s * c;
      mb.boxRot(ex, y0 + 2.05 * s, ez, 0.09 * s, 0.08 * s, 0.06 * s, yaw, hexRgb('#141414'), null, 0);
    };
    eye(-0.14 * s); eye(0.14 * s);
    const mx = x + 0.3 * s * sn, mz = z + 0.3 * s * c;
    mb.boxRot(mx, y0 + 1.82 * s, mz, 0.22 * s, 0.05 * s, 0.06 * s, yaw, hexRgb('#7a3a1a'), null, 0);
  }
  if (opt.cap) mb.boxRot(x, y0 + 2.42 * s, z, 0.7 * s, 0.14 * s, 0.62 * s, yaw, hexRgb(opt.cap), null, 0);
  if (opt.shades) {
    const c = Math.cos(yaw), sn = Math.sin(yaw);
    const ex = x + 0.0 * c + 0.32 * s * sn, ez = z - 0.0 * sn + 0.32 * s * c;
    mb.boxRot(ex, y0 + 2.05 * s, ez, 0.5 * s, 0.12 * s, 0.08 * s, yaw, hexRgb('#0a0a0a'), null, 0);
  }
}

// Helikopter polisi: badan + ekor + rotor berputar + sorot lampu.
export function drawHeli(mb, x, y, z, yaw, rotorAngle, lightOn) {
  const body = hexRgb('#e8e8e8');
  const dark = hexRgb('#1d3a6e');
  mb.boxRot(x, y, z, 3.2, 1.8, 5.2, yaw, body, body, 0);
  mb.boxRot(x, y + 0.3, z - 3.4, 0.7, 0.7, 3.4, yaw, body, null, 0);
  mb.boxRot(x, y + 1.3, z, 0.5, 0.5, 4.6, yaw + rotorAngle, dark, null, 0);
  mb.boxRot(x, y + 1.3, z, 4.6, 0.12, 0.5, yaw + rotorAngle, dark, null, 0);
  mb.boxRot(x, y - 0.9, z + 2.2, 0.9, 0.5, 0.9, yaw, dark, null, 0);
  // Sorot: berkas cahaya ramping dari heli sampai ke tanah + lingkaran
  // terang di tanah.
  if (lightOn) {
    mb.boxRot(x, y - 18, z, 1.4, 36, 1.4, yaw, hexRgb('#fff6c0'), null, 0.4);
    mb.groundQuad(x - 2.4, z - 2.4, x + 2.4, z + 2.4, 0.07, hexRgb('#fff6c0'), 0.85);
  }
}

// Checkpoint: cincin + pilar cahaya kuning.
export function drawCheckpoint(mb, x, z, t) {
  const pulse = 0.7 + 0.3 * Math.sin(t * 3);
  mb.box(x, 0.5, z, 0.3, 1.0, 0.3, hexRgb('#ffd21f'), null, pulse);
  mb.box(x, 3.2, z, 0.5, 6.0, 0.5, hexRgb('#ffd21f'), null, 0.45 * pulse);
  // Cincin di tanah (4 kotak membentuk persegi).
  const r = 3.2;
  mb.box(x - r, 0.12, z, 2.2, 0.12, 0.5, hexRgb('#ffd21f'), null, 0.9);
  mb.box(x + r, 0.12, z, 2.2, 0.12, 0.5, hexRgb('#ffd21f'), null, 0.9);
  mb.box(x, 0.12, z - r, 0.5, 0.12, 2.2, hexRgb('#ffd21f'), null, 0.9);
  mb.box(x, 0.12, z + r, 0.5, 0.12, 2.2, hexRgb('#ffd21f'), null, 0.9);
}
