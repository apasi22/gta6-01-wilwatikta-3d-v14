// hud.js — semua tampilan 2D: HUD, minimap, portrait kru, dialog,
// layar title, peta besar, upgrade, dan mission passed. DOM di index.html,
// gambar di canvas 2D. Tidak ada yang di-load dari jaringan.

'use strict';

import { CITY, DISTRICTS, POIS, CREW, WEAPONS, RADIOS, districtAt, streetName } from './city.js';
import { MISSIONS, missionById, storyPercent, fmtTime, dialogLine, missionCheckpoints } from './missions.js';

const $ = (id) => document.getElementById(id);

// ---- uang ----
export function fmtMoney(n) {
  return '$' + n.toLocaleString('en-US');
}

// ---- portrait kru: wajah blok 2D di canvas kecil ----
export function drawPortrait(canvas, member) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = member.color;
  ctx.fillRect(0, 0, W, H);
  // Bahu / baju.
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(W / 2, H * 0.98, W * 0.42, H * 0.3, 0, Math.PI, 0); ctx.fill();
  // Wajah.
  ctx.fillStyle = '#e0aa7a';
  ctx.beginPath(); ctx.ellipse(W / 2, H * 0.52, W * 0.27, H * 0.3, 0, 0, Math.PI * 2); ctx.fill();
  // Rambut / topi.
  ctx.fillStyle = member.id === 'wanto' ? '#1d3a6e' : '#1a1a1a';
  ctx.beginPath(); ctx.ellipse(W / 2, H * 0.32, W * 0.28, H * 0.16, 0, Math.PI, 0); ctx.fill();
  if (member.id === 'wanto') {
    ctx.fillStyle = '#ffd21f';
    ctx.fillRect(W * 0.32, H * 0.26, W * 0.36, H * 0.06);
  }
  if (member.id === 'agus') {
    // Kacamata hitam.
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(W * 0.26, H * 0.48, W * 0.18, H * 0.07);
    ctx.fillRect(W * 0.56, H * 0.48, W * 0.18, H * 0.07);
  }
  if (member.id === 'ratna') {
    ctx.fillStyle = '#d24a7e';
    ctx.beginPath(); ctx.arc(W * 0.5, H * 0.3, W * 0.1, 0, Math.PI * 2); ctx.fill();
  }
  // Mata + senyum.
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath(); ctx.arc(W * 0.4, H * 0.52, W * 0.035, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(W * 0.6, H * 0.52, W * 0.035, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#7a3a1a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(W / 2, H * 0.66, W * 0.12, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
}

// ---- minimap bundar ----
export function drawMinimap(canvas, state) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const S = CITY.size;
  const scale = W / S;
  ctx.clearRect(0, 0, W, H);
  // Latar gelap.
  ctx.fillStyle = '#101418';
  ctx.fillRect(0, 0, W, H);
  // Distrik berwarna.
  for (const d of DISTRICTS) {
    ctx.fillStyle = d.color;
    ctx.fillRect(d.gx * CITY.cell * scale, d.gz * CITY.cell * scale, CITY.cell * 2 * scale, CITY.cell * 2 * scale);
  }
  // Jalan.
  ctx.strokeStyle = 'rgba(20,20,24,0.85)';
  ctx.lineWidth = 5;
  for (let i = 0; i <= 6; i++) {
    ctx.beginPath(); ctx.moveTo(i * CITY.cell * scale, 0); ctx.lineTo(i * CITY.cell * scale, H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * CITY.cell * scale); ctx.lineTo(W, i * CITY.cell * scale); ctx.stroke();
  }
  // POI.
  for (const p of POIS) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(p.x * scale, p.z * scale, 2.5, 0, Math.PI * 2); ctx.fill();
  }
  // Rute misi (garis kuning putus-putus) + objective.
  const mission = missionById(state.missionId);
  const cps = missionCheckpoints(mission);
  ctx.strokeStyle = '#ffd21f'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(state.player.x * scale, state.player.z * scale);
  for (const c of cps) ctx.lineTo(c.x * scale, c.z * scale);
  ctx.stroke();
  ctx.setLineDash([]);
  const obj = cps[state.checkpoint - 1] || cps[0];
  ctx.fillStyle = '#ffd21f';
  ctx.beginPath(); ctx.arc(obj.x * scale, obj.z * scale, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#7a3a1a';
  ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('★', obj.x * scale, obj.z * scale + 0.5);
  // Polisi (titik biru).
  for (const u of state.police) {
    ctx.fillStyle = '#4a90ff';
    ctx.beginPath(); ctx.arc(u.x * scale, u.z * scale, 3, 0, Math.PI * 2); ctx.fill();
  }
  // Pemain (panah putih).
  ctx.save();
  ctx.translate(state.player.x * scale, state.player.z * scale);
  ctx.rotate(state.player.yaw);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(5, 6); ctx.lineTo(-5, 6); ctx.closePath(); ctx.fill();
  ctx.restore();
}

// ---- peta besar (layar M): grid 6x6 + daftar misi + statistik ----
export function drawBigMap(canvas, state) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const S = CITY.size;
  const padL = 46, padT = 30, padR = 10, padB = 10;
  const mw = W - padL - padR, mh = H - padT - padB;
  const sx = mw / S, sz = mh / S;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, W, H);
  // Huruf kolom + angka baris.
  ctx.fillStyle = '#9aa4b0'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let i = 0; i < 6; i++) {
    ctx.fillText(String.fromCharCode(65 + i), padL + (i + 0.5) * (mw / 6), 14);
    ctx.fillText(String(i + 1), 22, padT + (i + 0.5) * (mh / 6));
  }
  ctx.save();
  ctx.translate(12, padT + mh / 2); ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = '#7a8a9a'; ctx.font = 'bold 12px sans-serif';
  ctx.fillText('3° LAUT JAWA', 0, 0);
  ctx.restore();
  // Petak distrik (isi warna saja; namanya digambar belakangan, di atas POI).
  for (const d of DISTRICTS) {
    ctx.fillStyle = d.color;
    ctx.fillRect(padL + d.gx * CITY.cell * sx, padT + d.gz * CITY.cell * sz, CITY.cell * 2 * sx, CITY.cell * 2 * sz);
  }
  // Jalan.
  ctx.strokeStyle = 'rgba(15,15,20,0.8)'; ctx.lineWidth = 4;
  for (let i = 0; i <= 6; i++) {
    ctx.beginPath(); ctx.moveTo(padL + i * CITY.cell * sx, padT); ctx.lineTo(padL + i * CITY.cell * sx, padT + mh); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(padL, padT + i * CITY.cell * sz); ctx.lineTo(padL + mw, padT + i * CITY.cell * sz); ctx.stroke();
  }
  // POI.
  for (const p of POIS) {
    const px = padL + p.x * sx, py = padT + p.z * sz;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(px, py, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1a1a1a'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(p.icon, px, py + 0.5);
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = '10px sans-serif';
    ctx.fillText(p.label, px, py + 22);
  }
  // Rute + objective.
  const mission = missionById(state.missionId);
  const cps = missionCheckpoints(mission);
  ctx.strokeStyle = '#ffd21f'; ctx.lineWidth = 3; ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(padL + state.player.x * sx, padT + state.player.z * sz);
  for (const c of cps) ctx.lineTo(padL + c.x * sx, padT + c.z * sz);
  ctx.stroke();
  ctx.setLineDash([]);
  const obj = cps[state.checkpoint - 1] || cps[0];
  ctx.fillStyle = '#ff4040';
  ctx.beginPath(); ctx.arc(padL + obj.x * sx, padT + obj.z * sz, 9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 12px sans-serif';
  ctx.fillText('★', padL + obj.x * sx, padT + obj.z * sz + 0.5);
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'left';
  // Label OBJECTIVE di ATAS bintang (bukan di bawah, supaya tidak menabrak
  // label POI di bawahnya).
  ctx.fillText('OBJECTIVE', padL + obj.x * sx - 28, padT + obj.z * sz - 24);
  // Nama distrik digambar TERAKHIR, di atas POI, dengan outline gelap.
  for (const d of DISTRICTS) {
    ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'left';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.strokeText(d.name, padL + d.gx * CITY.cell * sx + 8, padT + d.gz * CITY.cell * sz + 18);
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillText(d.name, padL + d.gx * CITY.cell * sx + 8, padT + d.gz * CITY.cell * sz + 18);
  }
  // Pemain.
  ctx.save();
  ctx.translate(padL + state.player.x * sx, padT + state.player.z * sz);
  ctx.rotate(state.player.yaw);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(7, 8); ctx.lineTo(-7, 8); ctx.closePath(); ctx.fill();
  ctx.restore();
}

// ---- update HUD tiap frame ----
export function updateHUD(state) {
  const p = state.player;
  const d = districtAt(p.x, p.z);
  $('money').textContent = fmtMoney(p.money);
  $('stars').textContent = '★'.repeat(p.wanted) + '☆'.repeat(5 - p.wanted);
  $('clock').textContent = state.timeLabel;
  $('district-name').textContent = d.name;
  $('district-street').textContent = streetName(p.x, p.z);
  $('rep-fill').style.width = Math.min(100, (p.rep % 500) / 5) + '%';
  $('rep-text').textContent = 'REP FIXER · ' + p.rep + ' · LV ' + p.level;
  // Slot senjata.
  const slots = document.querySelectorAll('.wslot');
  slots.forEach((el, i) => {
    const w = WEAPONS[i];
    el.classList.toggle('active', i === p.weapon);
    el.classList.toggle('locked', w.ammo === 'LOCKED');
    el.querySelector('.wammo').textContent = w.ammo;
  });
  $('weapon-name').textContent = WEAPONS[p.weapon].name + ' · ' + WEAPONS[p.weapon].ammo + ' ROUNDS';
  // Radio + kendaraan (tepat 2 kotak kanan).
  const radio = RADIOS[state.radio % RADIOS.length];
  $('radio-name').textContent = radio.name;
  $('radio-track').textContent = radio.track;
  const carName = p.onFoot ? 'SUGENG WIBOWO — ON FOOT' : (state.carName || 'GARUDA GT');
  $('veh-name').textContent = carName;
  $('veh-label').textContent = p.onFoot ? 'HEALTH' : 'CONDITION';
  $('veh-value').textContent = p.onFoot ? Math.round(p.health) : Math.round(state.speedKmh);
  $('veh-unit').textContent = p.onFoot ? '' : 'KM/H';
  $('veh-gear').textContent = p.onFoot ? 'JALAN' : ('G' + state.gear);
  $('veh-fill').style.width = (p.onFoot ? p.health : state.carCondition) + '%';
  $('veh-pct').textContent = Math.round(p.onFoot ? p.health : state.carCondition) + '%';
  // Panel misi.
  const m = missionById(state.missionId);
  $('mission-title').textContent = 'MISSION ' + m.id + '/12 — ' + m.name.toUpperCase();
  const briefTail = m.brief.indexOf(':') >= 0 ? m.brief.slice(m.brief.indexOf(':') + 1).trim() : m.brief;
  $('mission-brief').textContent = 'Checkpoint ' + state.checkpoint + ' of ' + m.checkpoints + ': ' + briefTail;
  $('mission-timer').textContent = fmtTime(state.missionTime);
  $('mission-next').textContent = 'NEXT: ' + (MISSIONS[m.id] ? MISSIONS[m.id].name.toUpperCase() : '—');
  $('mission-dist').textContent = '▲ ' + Math.round(state.distToObjective) + 'm';
  $('mission-progress').style.width = (state.checkpoint / m.checkpoints * 100) + '%';
  $('dispatch').textContent = 'WPD DISPATCH: ' + state.dispatch;
  $('health-fill').style.width = p.health + '%';
  // Dialog.
  const [who, line] = dialogLine(m, state.time);
  const member = CREW.find((c) => c.name === who) || CREW[0];
  $('dialog-name').textContent = member.name;
  $('dialog-role').textContent = member.role;
  $('dialog-line').textContent = line;
  drawPortrait($('dialog-portrait'), member);
}

// ---- bangun kru + daftar misi di DOM (sekali) ----
export function buildCrewRow() {
  const row = $('crew-row');
  row.innerHTML = '';
  for (const member of CREW) {
    const div = document.createElement('div');
    div.className = 'crew-card' + (member.id === 'sugeng' ? ' you' : '');
    const cv = document.createElement('canvas');
    cv.width = 64; cv.height = 64;
    drawPortrait(cv, member);
    const nm = document.createElement('div');
    nm.className = 'crew-name';
    nm.textContent = member.name;
    const sub = document.createElement('div');
    sub.className = 'crew-sub';
    sub.textContent = member.id === 'sugeng' ? 'YOU' : fmtMoney(member.hire) + ' HIRE [Z]';
    div.appendChild(cv); div.appendChild(nm); div.appendChild(sub);
    row.appendChild(div);
  }
}

export function buildMissionList() {
  const list = $('mission-list');
  list.innerHTML = '';
  for (const m of MISSIONS) {
    const div = document.createElement('div');
    div.className = 'mrow' + (m.done ? ' done' : '') + (m.id === 6 ? ' active' : '');
    div.innerHTML = '<span class="mnum">' + m.id + '.</span> <span class="mname">' + m.name + '</span>' +
      '<span class="mreward">' + fmtMoney(m.reward) + '</span>' +
      '<span class="mstate">' + (m.done ? 'DONE ✓' : (m.id === 6 ? 'ACTIVE' : '—')) + '</span>';
    list.appendChild(div);
  }
  $('story-count').textContent = MISSIONS.filter((m) => m.done).length + ' / 12 jobs';
  $('stat-story').textContent = storyPercent() + '%';
}

// ---- overlay ----
export function showOnly(id) {
  for (const o of ['title-screen', 'map-screen', 'upgrade-screen', 'passed-screen', 'pause-screen']) {
    $(o).classList.toggle('hidden', o !== id);
  }
  // HUD bersembunyi di bawah overlay apa pun (supaya tidak tembus di peta).
  $('hud').classList.toggle('hidden', id !== null);
}

export function hideOverlays() {
  showOnly(null);
}
