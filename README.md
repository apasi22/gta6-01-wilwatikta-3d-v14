# WILWATIKTA 3D — Cerita Jalanan 1998

[![gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/apasi22/gta6-01-wilwatikta-3d-v14/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard)
[![reward](https://make.fun/badge/gta6-01/apasi22/gta6-01-wilwatikta-3d-v14/reward.svg)](https://make.fun/bounty/gta6-01)

Game open-world crime 3D orisinal di kota fiksi **WILWATIKTA**, tahun 1998.
Sugeng Wibowo, fixer jalanan, menjalani 12 misi cerita — dari Pelabuhan
Segara sampai Pasar Senja — sambil dikejar WPD (Wilwatikta Police Dept).

## Mainkan

Buka `game/index.html` di desktop Chrome (tanpa jaringan, tanpa build):

- **WASD** gerak · **mouse** kamera · **E** masuk/keluar mobil · **klik** tembak
- **Q** ganti senjata · **M** peta · **U** bengkel upgrade · **R** ganti radio
- **P** jeda · **Enter** mulai misi

## Yang ada di game

- Kota 6 distrik (Pelabuhan Segara, Kampung Batik, Lorong Emas, Alun-Alun,
  Pantai Kidul, Pasar Senja) dengan lalu lintas, pejalan kaki, dan palem.
- 12 misi cerita bernomor dengan timer, checkpoint, dan dialog kru.
- Wanted level 1–5 bintang: mobil patroli WPD + helikopter bersorot.
- 6 mobil (Garuda GT, Kencana S, Arjuna, Srikandi, Gatotkaca, Bima) yang
  bisa dicuri, 5 slot senjata (SMG TAWON aktif), dan kru 6 orang yang
  bisa disewa: Agus, Komisaris Wanto, Bambang, Ratna, Slamet.
- HUD lengkap: minimap bundar, panel misi, radio Gamelan FM 101.1 dan
  Radio Wilwatikta, peta besar GPS dengan legenda, save/load, upgrade
  di Bengkel Bambang, dan layar mission passed.
- Render WebGL1 prosedural tanpa library: semua geometri, karakter, dan
  suara (gamelan WebAudio) dibuat dari kode — tanpa aset luar.

## Teknologi

- `main.ts` (Node 22) menyalin `game/` + `screenshots/` ke `/output` dan
  menulis `dossier.json` via `vendor/makefun-game.ts`.
- `game/js/gl.js` — renderer WebGL1 (supersampling 2x) + matematika matriks.
- `game/js/city.js` — data kota deterministik (distrik, POI, kru, mobil).
- `game/js/world.js` — mesh statis kota + gambar mobil/karakter/helikopter.
- `game/js/actors.js` — pemain, lalu lintas, polisi, pejalan kaki, heli.
- `game/js/missions.js` — 12 misi, checkpoint, dialog.
- `game/js/hud.js` — HUD, minimap, portrait kru, peta besar.
- `game/js/audio.js` — radio gamelan + SFX prosedural WebAudio.
- `game/js/game.js` — loop, kamera, input, staging screenshot.

## Lisensi

MIT — lihat `LICENSE`.
