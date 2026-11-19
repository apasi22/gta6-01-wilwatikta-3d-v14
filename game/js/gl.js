// gl.js — WebGL1 helpers for WILWATIKTA 3D: shader, matrices, box geometry,
// one static mesh buffer for the city and one dynamic buffer for actors.
// Everything here is written for this game; no library is used.

'use strict';

// ---- small vector / matrix helpers (column-major, like WebGL) ----
export function mat4Identity() {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

export function mat4Multiply(a, b) {
  const o = new Array(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
  }
  return o;
}

export function mat4Perspective(fovY, aspect, near, far) {
  const f = 1 / Math.tan(fovY / 2);
  const nf = 1 / (near - far);
  return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0];
}

export function mat4LookAt(eye, target, up) {
  const zx = eye[0] - target[0], zy = eye[1] - target[1], zz = eye[2] - target[2];
  let zl = Math.hypot(zx, zy, zz) || 1;
  const z = [zx / zl, zy / zl, zz / zl];
  const xx = up[1] * z[2] - up[2] * z[1], xy = up[2] * z[0] - up[0] * z[2], xz = up[0] * z[1] - up[1] * z[0];
  zl = Math.hypot(xx, xy, xz) || 1;
  const x = [xx / zl, xy / zl, xz / zl];
  const y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
  return [
    x[0], y[0], z[0], 0,
    x[1], y[1], z[1], 0,
    x[2], y[2], z[2], 0,
    -(x[0] * eye[0] + x[1] * eye[1] + x[2] * eye[2]),
    -(y[0] * eye[0] + y[1] * eye[1] + y[2] * eye[2]),
    -(z[0] * eye[0] + z[1] * eye[1] + z[2] * eye[2]),
    1,
  ];
}

export function mat4Translate(x, y, z) {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
}

export function mat4RotateY(a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1];
}

export function mat4RotateX(a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1];
}

export function mat4RotateZ(a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

export function mat4Scale(x, y, z) {
  return [x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1];
}

// ---- deterministic RNG (mulberry32) so the city is identical every run ----
export function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- colour helpers ----
export function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
}

export function shade(rgb, f) {
  return [Math.min(1, rgb[0] * f), Math.min(1, rgb[1] * f), Math.min(1, rgb[2] * f)];
}

// ---- vertex builder ----
// Each vertex: position(3) + normal(3) + colour(3) + emissive(1) = 10 floats.
export class MeshBuilder {
  constructor() { this.v = []; }
  get count() { return this.v.length / 10; }

  quad(p0, p1, p2, p3, normal, color, emissive) {
    const n = normal, c = color, e = emissive || 0;
    const pts = [p0, p1, p2, p0, p2, p3];
    for (const p of pts) this.v.push(p[0], p[1], p[2], n[0], n[1], n[2], c[0], c[1], c[2], e);
  }

  // Axis-aligned box centred at (cx,cy,cz) with size (sx,sy,sz); top face may
  // take its own colour (roofs), every other face shares `color`.
  box(cx, cy, cz, sx, sy, sz, color, topColor, emissive) {
    const x0 = cx - sx / 2, x1 = cx + sx / 2;
    const y0 = cy - sy / 2, y1 = cy + sy / 2;
    const z0 = cz - sz / 2, z1 = cz + sz / 2;
    const top = topColor || color, e = emissive || 0;
    // Sisi atas: urutan (A,D,C,B) supaya CCW dilihat dari atas; sisi bawah
    // kebalikannya. (Urutan lama membuat atap + tanah ter-cull.)
    this.quad([x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [0, 1, 0], top, e); // top
    this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0], color, 0); // bottom
    this.quad([x0, y0, z1], [x0, y1, z1], [x1, y1, z1], [x1, y0, z1], [0, 0, 1], color, e); // front +z
    this.quad([x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z0], [0, 0, -1], color, e); // back -z
    this.quad([x1, y0, z1], [x1, y1, z1], [x1, y1, z0], [x1, y0, z0], [1, 0, 0], color, e); // right +x
    this.quad([x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1], [-1, 0, 0], color, e); // left -x
  }

  // A box rotated around Y by `rot` radians, centred at (cx,cy,cz).
  boxRot(cx, cy, cz, sx, sy, sz, rot, color, topColor, emissive) {
    const c = Math.cos(rot), s = Math.sin(rot);
    const hx = sx / 2, hy = sy / 2, hz = sz / 2;
    const corners = [];
    for (const [lx, ly, lz] of [[-hx, -hy, -hz], [hx, -hy, -hz], [hx, -hy, hz], [-hx, -hy, hz], [-hx, hy, -hz], [hx, hy, -hz], [hx, hy, hz], [-hx, hy, hz]]) {
      corners.push([cx + lx * c + lz * s, cy + ly, cz - lx * s + lz * c]);
    }
    // local axes after rotation: +x -> (c,0,-s), +y -> (0,1,0), +z -> (s,0,c)
    const ax = [c, 0, -s], az = [s, 0, c];
    const top = topColor || color, e = emissive || 0;
    const neg = (v) => [-v[0], -v[1], -v[2]];
    this.quad(corners[4], corners[7], corners[6], corners[5], [0, 1, 0], top, e);
    this.quad(corners[0], corners[1], corners[2], corners[3], [0, -1, 0], color, 0);
    this.quad(corners[3], corners[7], corners[6], corners[2], az, color, e);
    this.quad(corners[1], corners[5], corners[4], corners[0], neg(az), color, e);
    this.quad(corners[2], corners[6], corners[5], corners[1], ax, color, e);
    this.quad(corners[0], corners[4], corners[7], corners[3], neg(ax), color, e);
  }

  // Flat quad on the ground (y constant), facing up (CCW from above).
  groundQuad(x0, z0, x1, z1, y, color, emissive) {
    this.quad([x0, y, z0], [x0, y, z1], [x1, y, z1], [x1, y, z0], [0, 1, 0], color, emissive || 0);
  }

  // A billboard-free vertical quad facing a yaw direction (for signs, windows).
  faceQuad(cx, cy, cz, w, h, yaw, color, emissive) {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const rx = [c, 0, -s], uy = [0, 1, 0];
    const hw = w / 2, hh = h / 2;
    const n = [s, 0, c];
    const p = (dx, dy) => [cx + rx[0] * dx + uy[0] * dy, cy + dy, cz + rx[2] * dx];
    this.quad(p(-hw, -hh), p(hw, -hh), p(hw, hh), p(-hw, hh), n, color, emissive || 0);
  }
}

// ---- WebGL renderer: one lambert+fog+emissive program, two buffers ----
const VERT = `
attribute vec3 aPos; attribute vec3 aNor; attribute vec3 aCol; attribute float aEmi;
uniform mat4 uProj; uniform mat4 uView; uniform mat4 uModel;
uniform vec3 uSun; uniform vec3 uFog; uniform float uFogNear; uniform float uFogFar;
uniform float uAmbient; uniform float uNight; uniform vec3 uEye;
varying vec3 vCol; varying float vFog; varying float vEmi;
void main() {
  vec4 wp = uModel * vec4(aPos, 1.0);
  vec3 wn = normalize(mat3(uModel) * aNor);
  float diff = max(dot(wn, normalize(uSun)), 0.0);
  float lit = uAmbient + (1.0 - uAmbient) * diff;
  vCol = aCol * lit;
  vEmi = aEmi;
  float dist = length(wp.xyz - uEye);
  vFog = clamp((dist - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
  gl_Position = uProj * uView * wp;
}`;
const FRAG = `
precision mediump float;
uniform vec3 uFog; uniform float uNight;
varying vec3 vCol; varying float vFog; varying float vEmi;
void main() {
  vec3 c = vCol + vEmi * vec3(1.0, 0.85, 0.55);
  c = mix(c, uFog, vFog);
  c *= (1.0 - uNight * 0.25);
  gl_FragColor = vec4(c, 1.0);
}`;

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl', { antialias: true, preserveDrawingBuffer: true });
    if (!gl) throw new Error('WebGL tidak tersedia');
    this.gl = gl;
    const vs = gl.createShader(gl.VERTEX_SHADER); gl.shaderSource(vs, VERT); gl.compileShader(vs);
    const fs = gl.createShader(gl.FRAGMENT_SHADER); gl.shaderSource(fs, FRAG); gl.compileShader(fs);
    const prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('shader gagal: ' + gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    this.prog = prog;
    this.u = {};
    for (const name of ['uProj', 'uView', 'uModel', 'uSun', 'uFog', 'uFogNear', 'uFogFar', 'uAmbient', 'uNight', 'uEye']) {
      this.u[name] = gl.getUniformLocation(prog, name);
    }
    this.staticBuf = gl.createBuffer();
    this.dynBuf = gl.createBuffer();
    this.staticCount = 0;
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
  }

  setStatic(builder) {
    const gl = this.gl;
    const data = new Float32Array(builder.v);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.staticBuf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    this.staticCount = builder.count;
  }

  begin(proj, view, sun, fogColor, fogNear, fogFar, ambient, night, eye) {
    const gl = this.gl;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(fogColor[0], fogColor[1], fogColor[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniformMatrix4fv(this.u.uProj, false, new Float32Array(proj));
    gl.uniformMatrix4fv(this.u.uView, false, new Float32Array(view));
    gl.uniform3fv(this.u.uSun, new Float32Array(sun));
    gl.uniform3fv(this.u.uFog, new Float32Array(fogColor));
    gl.uniform1f(this.u.uFogNear, fogNear);
    gl.uniform1f(this.u.uFogFar, fogFar);
    gl.uniform1f(this.u.uAmbient, ambient);
    gl.uniform1f(this.u.uNight, night);
    gl.uniform3fv(this.u.uEye, new Float32Array(eye || [0, 0, 0]));
  }

  draw(buf, count, model) {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.uniformMatrix4fv(this.u.uModel, false, new Float32Array(model || mat4Identity()));
    const stride = 10 * 4;
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0); gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, stride, 3 * 4); gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(2, 3, gl.FLOAT, false, stride, 6 * 4); gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(3, 1, gl.FLOAT, false, stride, 9 * 4); gl.enableVertexAttribArray(3);
    gl.drawArrays(gl.TRIANGLES, 0, count);
  }

  drawStatic(model) { this.draw(this.staticBuf, this.staticCount, model); }

  drawDynamic(builder, model) {
    const gl = this.gl;
    const data = new Float32Array(builder.v);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.dynBuf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
    this.draw(this.dynBuf, builder.count, model);
  }
}
