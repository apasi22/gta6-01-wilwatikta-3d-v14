// missions.js — 12 misi cerita WILWATIKTA: nama, distrik, hadiah, timer,
// checkpoint, dan dialog karakter. Misi aktif menggerakkan HUD dan peta.

'use strict';

import { POIS } from './city.js';

export const MISSIONS = [
  {
    id: 1, name: 'Selamat Datang', reward: 300, district: 'segara',
    brief: 'Ambil paket di Warehouse, antar ke Docks.',
    timer: 240, checkpoints: 2, done: true,
    dialog: [
      ['SUGENG', 'Baru turun kapal, kota sudah menagih.'],
      ['AGUS', 'Paketnya di gudang. Jangan bikin ribut dulu.'],
    ],
  },
  {
    id: 2, name: 'Hot Wheels', reward: 450, district: 'senja',
    brief: 'Curi Kencana S di Showroom, bawa ke Safehouse.',
    timer: 300, checkpoints: 2, done: true,
    dialog: [
      ['BAMBANG', 'Kencana S itu kencang. Kuncinya? Tidak ada.'],
      ['SUGENG', 'Bagus. Saya suka yang tanpa kunci.'],
    ],
  },
  {
    id: 3, name: 'Antar Paket', reward: 400, district: 'batik',
    brief: 'Antar tiga paket batik ke Kampung Batik sebelum tutup.',
    timer: 280, checkpoints: 3, done: true,
    dialog: [
      ['RATNA', 'Rute sudah saya tandai. CCTV mati 10 menit.'],
      ['SUGENG', 'Cukup. Saya tidak butuh lebih.'],
    ],
  },
  {
    id: 4, name: 'Tagihan Pasar', reward: 550, district: 'senja',
    brief: 'Tagih utang tiga pedagang di Pasar Senja.',
    timer: 320, checkpoints: 3, done: true,
    dialog: [
      ['SLAMET', 'Mereka bayar kalau saya yang datang.'],
      ['SUGENG', 'Kamu ikut. Saya yang bicara.'],
    ],
  },
  {
    id: 5, name: 'Mata-Mata', reward: 500, district: 'alun',
    brief: 'Foto pertemuan di Alun-Alun tanpa ketahuan.',
    timer: 260, checkpoints: 2, done: true,
    dialog: [
      ['WANTO', 'WPD patroli tiap 15 menit. Hitung sendiri.'],
      ['SUGENG', 'Saya hitung. Saya selalu hitung.'],
    ],
  },
  {
    id: 6, name: 'Balapan Senja', reward: 700, district: 'kidul',
    brief: 'Balapan 4 checkpoint: PANTAI KIDUL. Kalahkan 3 pembalap.',
    timer: 193, checkpoints: 4, done: false,
    dialog: [
      ['AGUS', 'Balapannya dari Pantai Kidul. Jangan rem di tikungan.'],
      ['SUGENG', 'Saya tidak pernah rem.'],
    ],
  },
  {
    id: 7, name: 'Gudang Segara', reward: 650, district: 'segara',
    brief: 'Bersihkan area: 4 musuh tersisa di Pelabuhan Segara.',
    timer: 235, checkpoints: 1, done: false,
    dialog: [
      ['AGUS', 'WPD datang dari utara. Bersihkan gudang, cepat!'],
      ['SUGENG', 'Mereka yang datang. Saya yang membersihkan.'],
    ],
  },
  {
    id: 8, name: 'Kabur dari WPD', reward: 600, district: 'alun',
    brief: 'Lepas dari kejaran 3 bintang, sampai ke Safehouse.',
    timer: 300, checkpoints: 2, done: false,
    dialog: [
      ['WANTO', 'Helikopter sudah naik. Jangan lewat jalan besar.'],
      ['RATNA', 'Saya matikan CCTV Alun-Alun. Jalan!'],
    ],
  },
  {
    id: 9, name: 'Heat Wave', reward: 750, district: 'emas',
    brief: 'Rampok kasino Lorong Emas, kabur sebelum alarm kedua.',
    timer: 280, checkpoints: 3, done: false,
    dialog: [
      ['SLAMET', 'Brankasnya di lantai dua. Saya jaga pintu.'],
      ['SUGENG', 'Dua menit. Tidak lebih.'],
    ],
  },
  {
    id: 10, name: 'Kencana Hilang', reward: 700, district: 'kidul',
    brief: 'Temukan Kencana S yang dicuri, bawa pulang ke bengkel.',
    timer: 320, checkpoints: 2, done: false,
    dialog: [
      ['BAMBANG', 'Mobil itu pesanan orang penting. Cari sampai ketemu.'],
      ['SUGENG', 'Orang penting bayar mahal. Saya cari.'],
    ],
  },
  {
    id: 11, name: 'Double Cross', reward: 900, district: 'emas',
    brief: 'Pertemuan ganda di kasino: siapa yang berkhianat?',
    timer: 300, checkpoints: 3, done: false,
    dialog: [
      ['WANTO', 'Ada yang bocorkan rute kita. Hati-hati malam ini.'],
      ['SUGENG', 'Pengkhianat selalu datang sendiri.'],
    ],
  },
  {
    id: 12, name: 'The Last Ride', reward: 1200, district: 'segara',
    brief: 'Pelayaran terakhir: bawa Sugeng keluar dari Wilwatikta.',
    timer: 420, checkpoints: 4, done: false,
    dialog: [
      ['AGUS', 'Kapal berangkat tengah malam. Ini jalan terakhir.'],
      ['SUGENG', 'Setiap jalan punya harga. Setiap pelarian punya cerita.'],
    ],
  },
];

export function missionById(id) {
  return MISSIONS.find((m) => m.id === id) || MISSIONS[5];
}

export function completedCount() {
  return MISSIONS.filter((m) => m.done).length;
}

export function storyPercent() {
  return Math.round((completedCount() / MISSIONS.length) * 100);
}

// Checkpoint sebuah misi: posisi POI yang relevan, dalam urutan.
export function missionCheckpoints(mission) {
  const byId = {};
  for (const p of POIS) byId[p.id] = p;
  const map = {
    1: ['warehouse', 'docks'],
    2: ['showroom', 'safehouse'],
    3: ['batik', 'batik', 'batik'],
    4: ['pasar', 'pasar', 'pasar'],
    5: ['alun', 'alun'],
    6: ['pantai', 'docks', 'safehouse', 'pantai'],
    7: ['warehouse'],
    8: ['alun', 'safehouse'],
    9: ['casino', 'casino', 'safehouse'],
    10: ['showroom', 'bengkel'],
    11: ['casino', 'alun', 'casino'],
    12: ['docks', 'pantai', 'docks', 'safehouse'],
  };
  const ids = map[mission.id] || ['alun'];
  // Kampung Batik tidak punya POI sendiri: pakai titik distriknya.
  const fallback = { batik: { x: 110, z: 40 }, pasar: { x: 210, z: 196 } };
  return ids.map((id, i) => {
    const p = byId[id] || fallback[id];
    return { x: p.x + (i % 2) * 6, z: p.z + (i % 3) * 4, label: p.label || p.id, index: i + 1 };
  });
}

// Format timer mm:ss.
export function fmtTime(sec) {
  const s = Math.max(0, Math.ceil(sec));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

// Dialog berjalan: sepasang baris bergantian tiap beberapa detik.
export function dialogLine(mission, t) {
  const lines = mission.dialog;
  const idx = Math.floor(t / 6) % lines.length;
  return lines[idx];
}
