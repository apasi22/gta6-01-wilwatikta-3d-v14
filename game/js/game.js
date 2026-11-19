// game.js — WILWATIKTA 3D: loop utama, kamera, input, misi, dan staging
// screenshot. Canvas WebGL dirender 2x (2560x1440) lalu ditampilkan 1280x720:
// supersampling gratis dari kompositor browser.

'use strict';

import { Renderer, MeshBuilder, mat4Perspective, mat4LookAt, mat4Identity, mat4Multiply, makeRng, hexRgb } from './gl.js';
import { CITY, TIMES, CARS, RADIOS, districtAt } from './city.js';
import { buildStaticMesh, drawCar, drawPerson, drawHeli, drawCheckpoint } from './world.js';
import {
  makePlayer, makeTraffic, stepTraffic, makePolice, stepPolice,
  makePeds, stepPeds, makeHeli, stepHeli, addWanted, decayWanted,
  shootAt, stagePositions, clamp, angLerp, dist2,
} from './actors.js';
import { MISSIONS, missionById, missionCheckpoints, fmtTime } from './missions.js';
import {
  updateHUD, drawMinimap, drawBigMap, buildCrewRow, buildMissionList,
  showOnly, hideOverlays, fmtMoney,
} from './hud.js';
import { unlockAudio, radioTick, setRadio, engineTick, sirenTick, gunshot, chime } from './audio.js';

const params = new URLSearchParams(location.search);
const SHOT = params.get('shot') || '';
const AUTO = params.get('auto') === '1';

// ---- keadaan permainan ----
const rng = makeRng(19981117);
const canvas = document.getElementById('game');
const renderer = new Renderer(canvas);
const staticWorld = buildStaticMesh(rng);
renderer.setStatic(staticWorld.mesh);

const player = makePlayer();
const traffic = makeTraffic(makeRng(77), 14);
const police = makePolice(makeRng(99), 4);
const peds = makePeds(makeRng(1234), 22);
const heli = makeHeli();

const state = {
  mode: 'title',           // title | play | map | upgrade | passed | pause
  time: 0,                 // detik sejak mulai
  missionId: 6,
  checkpoint: 1,
  missionTime: 193,
  radio: 0,
  speedKmh: 0,
  gear: 1,
  carCondition: 92,
  carName: 'GARUDA GT',
  dispatch: '2 unit mengejar · HELI 2 SPOTLIGHT — PANTAI KIDUL',
  distToObjective: 147,
  timeLabel: TIMES.dusk.label,
  timeOfDay: 'dusk',
  camYaw: Math.PI,
  camPitch: 0.32,
  flash: false,
  hitFloaters: [],
  message: '',
  messageT: 0,
  missionDoneFlash: 0,
};

let keys = {};
let mouseDown = false;
let lastX = 0, lastY = 0;
let lastT = performance.now();
let minimapTick = 0;

// ---- staging adegan untuk screenshot (deterministik, ?shot=...) ----
function stageShot() {
  const pos = stagePositions();
  const s = pos[SHOT] || pos.chase;
  player.x = s.px; player.z = s.pz; player.yaw = s.yaw;
  player.onFoot = s.onFoot; player.car = s.car; player.wanted = s.wanted;
  player.health = 95; player.money = SHOT === 'night' ? 13230 : 12480;
  state.missionId = s.mission || 6;
  state.checkpoint = 1;
  state.missionTime = missionById(state.missionId).timer;
  state.timeOfDay = s.time;
  state.timeLabel = TIMES[s.time].label;
  state.camYaw = s.yaw;
  if (SHOT === 'title') {
    state.mode = 'title';
    showOnly('title-screen');
    // Hero berdiri di jalan, menghadap kamera (yaw 0 = ke +z, kamera di +z).
    player.x = 127; player.z = 210; player.yaw = 0;
    state.camYaw = 0;
  } else if (SHOT === 'map') {
    state.mode = 'map';
    buildMissionList();
    updateMapStats();
    drawBigMap(document.getElementById('bigmap'), hudState());
    showOnly('map-screen');
  } else {
    state.mode = 'play';
    hideOverlays();
  }
  // Polisi diposisikan untuk adegan kejar-kejaran: DUA di depan pemain
  // saja (yang di belakang kamera hanya menutupi pandangan).
  if (SHOT === 'chase') {
    police[0].x = 36; police[0].z = 210; police[0].yaw = Math.PI;
    police[1].x = 48; police[1].z = 204; police[1].yaw = Math.PI;
    police[2].x = 90; police[2].z = 150; police[2].yaw = Math.PI;
    police[3].x = 150; police[3].z = 120; police[3].yaw = Math.PI / 2;
    traffic[0].x = 34; traffic[0].z = 196; traffic[0].yaw = Math.PI;
    traffic[1].x = 50; traffic[1].z = 188; traffic[1].yaw = Math.PI;
    // Tampilan spidometer adegan: 100 km/jam, gigi 3.
    state.speedKmh = 100; state.gear = 3;
  }
  if (SHOT === 'night') {
    // Musuh di DEPAN pemain (pemain menghadap -z): z lebih kecil.
    peds[0].x = 38; peds[0].z = 46; peds[0].kind = 'gang';
    peds[1].x = 46; peds[1].z = 42; peds[1].kind = 'gang';
    peds[2].x = 42; peds[2].z = 38; peds[2].kind = 'gang';
    peds[3].x = 34; peds[3].z = 50; peds[3].kind = 'gang';
    heli.active = true; heli.x = 30; heli.y = 36; heli.z = 46; heli.yaw = 0;
    addHitFloater(38, 3.2, 46, 'HIT! -12 HP', '#ff5a4a');
    addHitFloater(46, 3.6, 42, 'HIT! -5 HP', '#ff8a5a');
    state.dispatch = '2 unit mengejar — PELABUHAN SEGARA';
  }
}

function hudState() {
  const m = missionById(state.missionId);
  const cps = missionCheckpoints(m);
  const obj = cps[state.checkpoint - 1] || cps[0];
  return {
    player, police, missionId: state.missionId, checkpoint: state.checkpoint,
    missionTime: state.missionTime, time: state.time, timeLabel: state.timeLabel,
    radio: state.radio, speedKmh: state.speedKmh, gear: state.gear,
    carCondition: state.carCondition, carName: state.carName,
    dispatch: state.dispatch, distToObjective: Math.sqrt(dist2(player.x, player.z, obj.x, obj.z)),
  };
}

function updateMapStats() {
  document.getElementById('stat-cash').textContent = fmtMoney(player.money);
  document.getElementById('stat-time').textContent = state.timeLabel;
  document.getElementById('stat-wanted').textContent = '★'.repeat(player.wanted) + '☆'.repeat(5 - player.wanted);
  document.getElementById('stat-kills').textContent = player.kills;
  document.getElementById('stat-cars').textContent = player.carsStolen;
  document.getElementById('stat-stunts').textContent = fmtMoney(player.stunts);
  document.getElementById('stat-rep').textContent = 'FIXER · ' + player.rep;
  document.getElementById('map-job-name').textContent = missionById(state.missionId).name;
  document.getElementById('map-job-detail').textContent =
    'Checkpoint ' + state.checkpoint + ' of ' + missionById(state.missionId).checkpoints + ': ' +
    missionById(state.missionId).district.toUpperCase();
  document.getElementById('map-job-gps').textContent = 'GPS ' + Math.round(hudState().distToObjective) + ' m';
  document.getElementById('map-progress').textContent = Math.round(MISSIONS.filter((mm) => mm.done).length / MISSIONS.length * 100) + '%';
}

// ---- hit floater (teks melayang di layar, diproyeksikan dari 3D) ----
function addHitFloater(x, y, z, text, color) {
  state.hitFloaters.push({ x, y, z, text, color, ttl: 1.6 });
}

let projMat = null, viewMat = null;
function project(x, y, z) {
  if (!projMat || !viewMat) return null;
  // Klip = proyeksi x tampilan (urutan matriks: proj * view * posisi).
  const m = mat4Multiply(projMat, viewMat);
  const cx = m[0] * x + m[4] * y + m[8] * z + m[12];
  const cy = m[1] * x + m[5] * y + m[9] * z + m[13];
  const cw = m[3] * x + m[7] * y + m[11] * z + m[15];
  if (cw <= 0.01) return null;
  return { x: (cx / cw * 0.5 + 0.5) * 1280, y: (0.5 - cy / cw * 0.5) * 720 };
}

function updateFloaters(dt) {
  const layer = document.getElementById('floaters');
  layer.innerHTML = '';
  // Di adegan screenshot, floater tidak memudar (diorama beku).
  if (!SHOT) state.hitFloaters = state.hitFloaters.filter((f) => (f.ttl -= dt) > 0);
  for (const f of state.hitFloaters) {
    const p = project(f.x, f.y + (1.6 - f.ttl) * 1.2, f.z);
    if (!p) continue;
    const div = document.createElement('div');
    div.className = 'floater';
    div.style.left = p.x + 'px';
    div.style.top = p.y + 'px';
    div.style.color = f.color;
    div.textContent = f.text;
    layer.appendChild(div);
  }
}

// ---- input ----
window.addEventListener('keydown', (e) => {
  keys[e.key.toLowerCase()] = true;
  unlockAudio();
  if (e.key === 'm' || e.key === 'M') toggleMap();
  if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') togglePause();
  if (e.key === 'u' || e.key === 'U') toggleUpgrade();
  if (e.key === 'r' || e.key === 'R') { state.radio = (state.radio + 1) % RADIOS.length; }
  if (e.key === 'q' || e.key === 'Q') {
    player.weapon = (player.weapon + 1) % 3; // slot 3-4 terkunci
  }
  if (e.key === 'e' || e.key === 'E') toggleCar();
  if (e.key === 'Enter' && state.mode === 'title') startGame();
  if (e.key === 'Enter' && state.mode === 'passed') nextMission();
});

window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

canvas.addEventListener('mousedown', (e) => {
  mouseDown = true; lastX = e.clientX; lastY = e.clientY;
  unlockAudio();
  if (state.mode === 'play') fireWeapon();
});
window.addEventListener('mouseup', () => { mouseDown = false; player.shooting = false; });
window.addEventListener('mousemove', (e) => {
  if (!mouseDown) return;
  state.camYaw -= (e.clientX - lastX) * 0.004;
  state.camPitch = clamp(state.camPitch + (e.clientY - lastY) * 0.003, 0.05, 0.9);
  lastX = e.clientX; lastY = e.clientY;
});

// Tombol title / overlay (klik mouse).
document.getElementById('btn-start').addEventListener('click', () => { unlockAudio(); startGame(); });
document.getElementById('btn-save').addEventListener('click', () => { unlockAudio(); saveGame(); toast('GAME TERSIMPAN — WILWATIKTA'); });
document.getElementById('btn-load').addEventListener('click', () => { unlockAudio(); loadGame(); toast('SAVE DIMUAT'); });
document.getElementById('btn-end').addEventListener('click', () => { state.mode = 'title'; showOnly('title-screen'); });
document.getElementById('btn-close-map').addEventListener('click', () => toggleMap());
document.getElementById('btn-title-map').addEventListener('click', () => { state.mode = 'title'; showOnly('title-screen'); });
document.getElementById('btn-close-upgrade').addEventListener('click', () => toggleUpgrade());
document.getElementById('btn-next-mission').addEventListener('click', () => nextMission());
document.querySelectorAll('.upg-buy').forEach((b) => {
  b.addEventListener('click', () => buyUpgrade(b.dataset.upg));
});

function toast(text) {
  state.message = text; state.messageT = 2.5;
  document.getElementById('toast').textContent = text;
  document.getElementById('toast').classList.remove('hidden');
}

function startGame() {
  state.mode = 'play';
  hideOverlays();
  setRadio(true, state.radio);
  toast('MISI 6/12 — BALAPAN SENJA DIMULAI');
}

function toggleMap() {
  if (state.mode === 'map') { state.mode = 'play'; hideOverlays(); return; }
  if (state.mode !== 'play') return;
  state.mode = 'map';
  buildMissionList();
  updateMapStats();
  drawBigMap(document.getElementById('bigmap'), hudState());
  showOnly('map-screen');
}

function togglePause() {
  if (state.mode === 'pause') { state.mode = 'play'; hideOverlays(); return; }
  if (state.mode !== 'play') return;
  state.mode = 'pause';
  showOnly('pause-screen');
}

function toggleUpgrade() {
  if (state.mode === 'upgrade') { state.mode = 'play'; hideOverlays(); return; }
  if (state.mode !== 'play') return;
  state.mode = 'upgrade';
  showOnly('upgrade-screen');
}

function toggleCar() {
  if (state.mode !== 'play') return;
  if (player.onFoot) {
    // Cari mobil lalu lintas terdekat untuk dicuri.
    let best = null, bestD = 16;
    for (const c of traffic) {
      const d = dist2(player.x, player.z, c.x, c.z);
      if (d < bestD) { bestD = d; best = c; }
    }
    if (best) {
      player.onFoot = false;
      player.car = CARS.indexOf(best.spec);
      state.carName = best.spec.name.toUpperCase();
      player.x = best.x; player.z = best.z; player.yaw = best.yaw;
      player.carsStolen += 1;
      addWanted(player, 1);
      toast('MOBIL DICURI — ' + state.carName);
    }
  } else {
    player.onFoot = true;
    player.x += Math.sin(player.yaw + Math.PI / 2) * 2.5;
    player.z += Math.cos(player.yaw + Math.PI / 2) * 2.5;
    player.speed = 0;
  }
}

function fireWeapon() {
  if (player.weapon === 0) return;
  if (player.ammo[player.weapon] <= 0) { toast('AMUNISI HABIS — CARI TOKO SENJATA'); return; }
  player.ammo[player.weapon] -= 1;
  player.shooting = true;
  gunshot();
  const pitch = -state.camPitch * 0.4;
  const res = shootAt(player, peds, police, state.camYaw + Math.PI, pitch);
  if (res.hit) {
    addWanted(player, 1);
    addHitFloater(player.x + Math.sin(state.camYaw + Math.PI) * res.dist, 2.2,
      player.z + Math.cos(state.camYaw + Math.PI) * res.dist,
      'HIT! -' + (res.kind === 'gang' ? 12 : 8) + ' HP', '#ff5a4a');
    if (res.kind === 'gang') player.money += 25;
  }
}

function buyUpgrade(kind) {
  const prices = { armor: 400, engine: 600, tires: 350 };
  const price = prices[kind] || 400;
  if (player.money < price) { toast('UANG TIDAK CUKUP — ' + fmtMoney(price)); return; }
  player.money -= price;
  if (kind === 'armor') player.armor = Math.min(100, player.armor + 50);
  if (kind === 'engine') state.carCondition = 100;
  if (kind === 'tires') state.carCondition = Math.min(100, state.carCondition + 20);
  chime();
  toast('UPGRADE DIBELI — ' + kind.toUpperCase());
}

function saveGame() {
  try {
    localStorage.setItem('wilwatikta-save', JSON.stringify({
      money: player.money, rep: player.rep, missionId: state.missionId,
      done: MISSIONS.filter((m) => m.done).map((m) => m.id),
      wanted: player.wanted,
    }));
  } catch (e) { /* penyimpanan tidak tersedia */ }
}

function loadGame() {
  try {
    const raw = localStorage.getItem('wilwatikta-save');
    if (!raw) { toast('TIDAK ADA SAVE'); return; }
    const s = JSON.parse(raw);
    player.money = s.money; player.rep = s.rep; state.missionId = s.missionId || 6;
    for (const m of MISSIONS) m.done = (s.done || []).includes(m.id);
  } catch (e) { /* abaikan */ }
}

function nextMission() {
  const m = missionById(state.missionId);
  m.done = true;
  player.money += m.reward;
  state.missionId = Math.min(12, state.missionId + 1);
  state.checkpoint = 1;
  state.missionTime = missionById(state.missionId).timer;
  state.mode = 'play';
  hideOverlays();
  chime();
  toast('MISI ' + m.id + ' SELESAI — +' + fmtMoney(m.reward));
}

function completeMission() {
  state.mode = 'passed';
  document.getElementById('passed-title').textContent = 'MISSION PASSED';
  document.getElementById('passed-name').textContent = missionById(state.missionId).name.toUpperCase();
  document.getElementById('passed-reward').textContent = '+' + fmtMoney(missionById(state.missionId).reward);
  document.getElementById('passed-stats').textContent =
    'Waktu ' + fmtTime(missionById(state.missionId).timer - state.missionTime) +
    ' · Takedown ' + player.kills + ' · Mobil dicuri ' + player.carsStolen;
  showOnly('passed-screen');
  chime();
}

// ---- pergerakan pemain ----
function stepPlayer(dt) {
  const speed = player.onFoot ? 6 : 0;
  if (player.onFoot) {
    let fx = 0, fz = 0;
    const fwd = [Math.sin(state.camYaw + Math.PI), Math.cos(state.camYaw + Math.PI)];
    const right = [Math.cos(state.camYaw + Math.PI), -Math.sin(state.camYaw + Math.PI)];
    if (keys['w']) { fx += fwd[0]; fz += fwd[1]; }
    if (keys['s']) { fx -= fwd[0]; fz -= fwd[1]; }
    if (keys['a']) { fx -= right[0]; fz -= right[1]; }
    if (keys['d']) { fx += right[0]; fz += right[1]; }
    const len = Math.hypot(fx, fz);
    if (len > 0) {
      player.x += (fx / len) * speed * dt;
      player.z += (fz / len) * speed * dt;
      player.yaw = Math.atan2(fx, fz);
      player.walkPhase += dt * 9;
      state.speedKmh = speed * 3.6;
    } else {
      state.speedKmh = 0;
    }
    player.x = clamp(player.x, 2, CITY.size - 2);
    player.z = clamp(player.z, 2, CITY.size - 2);
  } else {
    // Mobil: W gas, S rem/mundur, A/D setir.
    const maxSpeed = 42;
    if (keys['w']) player.speed = Math.min(maxSpeed, player.speed + 22 * dt);
    else if (keys['s']) player.speed = Math.max(-8, player.speed - 26 * dt);
    else player.speed = Math.max(0, player.speed - 10 * dt);
    if (keys[' ']) player.speed = Math.max(0, player.speed - 40 * dt);
    const steer = (keys['a'] ? 1 : 0) - (keys['d'] ? 1 : 0);
    player.yaw += steer * clamp(player.speed / maxSpeed, -1, 1) * 1.9 * dt * (player.speed >= 0 ? 1 : -1);
    player.x += Math.sin(player.yaw) * player.speed * dt;
    player.z += Math.cos(player.yaw) * player.speed * dt;
    player.x = clamp(player.x, 2, CITY.size - 2);
    player.z = clamp(player.z, 2, CITY.size - 2);
    state.speedKmh = Math.abs(player.speed) * 3.6;
    state.gear = 1 + Math.min(4, Math.floor(Math.abs(player.speed) / 9));
    state.carCondition = Math.max(60, state.carCondition - dt * 0.02);
  }
}

// ---- checkpoint misi ----
function stepMission(dt) {
  if (state.mode !== 'play') return;
  state.missionTime -= dt;
  if (state.missionTime <= 0) {
    state.missionTime = missionById(state.missionId).timer;
    state.checkpoint = 1;
    toast('WAKTU HABIS — MISI DIULANG');
    return;
  }
  const m = missionById(state.missionId);
  const cps = missionCheckpoints(m);
  const obj = cps[state.checkpoint - 1];
  if (!obj) return;
  const d = Math.sqrt(dist2(player.x, player.z, obj.x, obj.z));
  if (d < 5.5) {
    state.checkpoint += 1;
    chime();
    if (state.checkpoint > m.checkpoints) {
      completeMission();
    } else {
      toast('CHECKPOINT ' + (state.checkpoint - 1) + '/' + m.checkpoints + ' — LANJUT!');
    }
  }
}

// ---- render ----
function render() {
  const tod = TIMES[state.timeOfDay];
  const aspect = canvas.width / canvas.height;
  projMat = mat4Perspective(1.05, aspect, 0.1, 900);
  let eye, target;
  if (state.mode === 'title' || SHOT === 'title') {
    // Title: kamera di depan hero — hero MENGHADAP kamera, ~40% frame,
    // pistol di tangan kanan terlihat jelas (terentang ke samping).
    // Hero di tengah jalan (x=127) supaya latarnya jalanan, bukan gedung.
    eye = [125.6, 1.9, 214.6];
    target = [127.0, 1.7, 210];
  } else if (player.onFoot) {
    const back = 7.5, up = 3.4;
    eye = [
      player.x - Math.sin(state.camYaw) * back,
      up,
      player.z - Math.cos(state.camYaw) * back,
    ];
    target = [player.x, 1.6, player.z];
  } else {
    const back = 12, up = 3.8;
    const cy = player.yaw;
    eye = [player.x - Math.sin(cy) * back, up, player.z - Math.cos(cy) * back];
    target = [player.x + Math.sin(cy) * 6, 1.3, player.z + Math.cos(cy) * 6];
  }
  viewMat = mat4LookAt(eye, target, [0, 1, 0]);
  renderer.begin(projMat, viewMat, tod.sun, tod.fog, 70, 450, tod.ambient, tod.night, eye);
  renderer.drawStatic(mat4Identity());

  // Entitas dinamis.
  const dyn = new MeshBuilder();
  // Mobil pemain (Garuda GT merah) bila mengemudi.
  if (!player.onFoot) {
    drawCar(dyn, player.x, player.z, player.yaw, CARS[player.car], false, false);
  } else {
    // Hero jalan kaki — di title, pistol terangkat menghadap kamera.
    const heroTitle = state.mode === 'title' || SHOT === 'title';
    drawPerson(dyn, player.x, player.z, player.yaw, {
      scale: heroTitle ? 1.1 : 1.06, shirt: '#2f7a3d', pants: '#c9b896', skin: '#c98a5a',
      hair: '#1a1a1a', gun: heroTitle || player.weapon > 0, gunSide: heroTitle,
      face: heroTitle, walk: player.walkPhase > 0, walkPhase: player.walkPhase,
    });
  }
  // Mobil merah (Garuda GT) parkir di belakang hero (title shot).
  if (SHOT === 'title' || state.mode === 'title') {
    drawCar(dyn, 122, 198, Math.PI, CARS[0], false, false);
  }
  // Di layar title: hanya hero + mobilnya yang tampil (tanpa lalu lintas,
  // pejalan kaki, dan polisi — supaya hero tidak tertutup).
  const isTitle = SHOT === 'title' || state.mode === 'title';
  if (!isTitle) {
    for (const c of traffic) drawCar(dyn, c.x, c.z, c.yaw, c.spec, false, false);
    for (const u of police) drawCar(dyn, u.x, u.z, u.yaw, { color: '#e8e8e8' }, true, u.flash);
    for (const p of peds) {
      if (!p.alive) continue;
      drawPerson(dyn, p.x, p.z, p.yaw, {
        scale: 1, shirt: p.shirt, skin: p.skin, pants: p.kind === 'gang' ? '#5a2a2a' : '#3a3f46',
        walk: true, walkPhase: p.walkPhase, gun: p.kind === 'gang',
      });
    }
  }
  if (heli.active) drawHeli(dyn, heli.x, heli.y, heli.z, heli.yaw, heli.rotor, true);
  // Checkpoint misi aktif.
  if (state.mode === 'play' || SHOT === 'chase' || SHOT === 'night') {
    const m = missionById(state.missionId);
    const cps = missionCheckpoints(m);
    const obj = cps[state.checkpoint - 1];
    if (obj) drawCheckpoint(dyn, obj.x, obj.z, state.time);
  }
  renderer.drawDynamic(dyn, mat4Identity());
}

// ---- loop ----
function frame(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  state.time += dt;
  if (SHOT) {
    // Adegan screenshot adalah diorama beku: aktor tidak bergerak supaya
    // komposisi tetap seperti yang di-staging (polisi tidak menabrak
    // kamera, lalu lintas tidak melintas di depan hero).
  } else if (state.mode === 'play') {
    stepPlayer(dt);
    stepTraffic(traffic, dt, state.time);
    stepPolice(police, player, dt, state.time);
    stepPeds(peds, player, dt, state.time);
    stepHeli(heli, player, dt, state.time);
    decayWanted(player, dt, false);
    stepMission(dt);
    radioTick(dt);
    engineTick(state.speedKmh, !player.onFoot);
    sirenTick(player.wanted > 0, state.time);
  }
  if (state.messageT > 0) {
    state.messageT -= dt;
    if (state.messageT <= 0) document.getElementById('toast').classList.add('hidden');
  }
  render();
  updateFloaters(dt);
  minimapTick += dt;
  if (minimapTick > 0.12) {
    minimapTick = 0;
    updateHUD(hudState());
    drawMinimap(document.getElementById('minimap'), hudState());
  }
  requestAnimationFrame(frame);
}

// ---- mulai ----
buildCrewRow();
buildMissionList();
if (SHOT) {
  stageShot();
} else {
  state.mode = 'title';
  showOnly('title-screen');
  setRadio(false, 0);
}
if (AUTO) {
  // Mode otomatis (playtest): mulai permainan tanpa klik.
  setTimeout(() => { if (state.mode === 'title') startGame(); }, 400);
}
updateHUD(hudState());
requestAnimationFrame(frame);
