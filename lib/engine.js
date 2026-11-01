// =====================================================================
// 3D Visio — moteur de maquette générique
// Transforme une description JSON (« spec ») en maquette 3D Three.js.
// Repère : origine = coin nord-ouest du bâtiment, x vers l'est, z vers le sud, y vers le haut (mètres).
// =====================================================================
(function (global) {
'use strict';
const T3 = THREE;

// ---------- Textures procédurales ----------
function ctex(size, draw, h) {
  const c = document.createElement('canvas'); c.width = size; c.height = h || size;
  const g = c.getContext('2d'); draw(g, c.width, c.height);
  const t = new T3.CanvasTexture(c); t.wrapS = t.wrapT = T3.RepeatWrapping; t.encoding = T3.sRGBEncoding; t.anisotropy = 8; return t;
}
function noise(g, w, h, base, amp) {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  const im = g.getImageData(0, 0, w, h), d = im.data;
  for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - .5) * amp; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(im, 0, 0);
}
const TEX = {};
function tex(name) {
  if (TEX[name]) return TEX[name];
  let t;
  switch (name) {
    case 'enduit': t = ctex(256, (g, w, h) => noise(g, w, h, '#f1efe9', 10)); t.userData = { s: 2 }; break;
    case 'parpaing': t = ctex(512, (g, w, h) => { noise(g, w, h, '#a9a69f', 28); g.strokeStyle = 'rgba(70,70,70,.7)'; g.lineWidth = 4; for (let r = 0; r < 4; r++) { g.beginPath(); g.moveTo(0, r * 128); g.lineTo(w, r * 128); g.stroke(); const o = r % 2 ? 128 : 0; for (let c2 = 0; c2 < 3; c2++) { const x = (c2 * 256 + o) % w; g.beginPath(); g.moveTo(x, r * 128); g.lineTo(x, r * 128 + 128); g.stroke(); } } }); t.userData = { s: .8 }; break;
    case 'brique': t = ctex(512, (g, w, h) => { g.fillStyle = '#8f8a84'; g.fillRect(0, 0, w, h); for (let r = 0; r < 16; r++) { const o = r % 2 ? 64 : 0; for (let c2 = -1; c2 < 5; c2++) { const hh = Math.random(); g.fillStyle = `rgb(${130 + hh * 40 | 0},${60 + hh * 18 | 0},${45 + hh * 12 | 0})`; g.fillRect(c2 * 128 + o + 3, r * 32 + 3, 122, 26); } } }); t.userData = { s: .9 }; break;
    case 'bois': t = ctex(256, (g, w, h) => { const im = g.createImageData(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = Math.sin(y * .15 + Math.sin(x * .02) * 3) * 14 + (Math.random() - .5) * 10, i = (y * w + x) * 4; im.data[i] = 165 + v; im.data[i + 1] = 115 + v * .8; im.data[i + 2] = 64 + v * .5; im.data[i + 3] = 255; } g.putImageData(im, 0, 0); }); t.userData = { s: 1 }; break;
    case 'tole': t = ctex(256, (g, w, h) => { for (let x = 0; x < w; x++) { const v = 150 + Math.sin(x / w * Math.PI * 2 * 8) * 45; g.fillStyle = `rgb(${v},${v + 6},${v + 14})`; g.fillRect(x, 0, 1, h); } }); t.userData = { s: 1.2 }; break;
    case 'tuile': t = ctex(256, (g, w, h) => { g.fillStyle = '#9a3e22'; g.fillRect(0, 0, w, h); for (let r = 0; r < 8; r++) for (let c2 = 0; c2 < 8; c2++) { const o = r % 2 ? 16 : 0; const gr = g.createLinearGradient(0, r * 32, 0, r * 32 + 32); gr.addColorStop(0, '#b4532f'); gr.addColorStop(1, '#7a2f18'); g.fillStyle = gr; g.beginPath(); g.ellipse(c2 * 32 + o + 16, r * 32 + 24, 15, 12, 0, 0, Math.PI); g.fill(); } }); t.userData = { s: 1 }; break;
    case 'paille': t = ctex(256, (g, w, h) => { g.fillStyle = '#c9a85c'; g.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { g.strokeStyle = `rgba(${120 + Math.random() * 80 | 0},${90 + Math.random() * 60 | 0},40,.6)`; const x = Math.random() * w, y = Math.random() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - .5) * 6, y + 18); g.stroke(); } }); t.userData = { s: 1.5 }; break;
    case 'carrelage': t = ctex(256, (g, w, h) => { noise(g, w, h, '#e9e6df', 8); g.strokeStyle = 'rgba(140,135,125,.6)'; g.lineWidth = 3; g.strokeRect(0, 0, w, h); }); t.userData = { s: .6 }; break;
    case 'parquet': t = ctex(256, (g, w, h) => { for (let r = 0; r < 8; r++) { const hh = Math.random(); g.fillStyle = `rgb(${130 + hh * 40 | 0},${80 + hh * 25 | 0},${40 + hh * 15 | 0})`; g.fillRect(0, r * 32, w, 31); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect((r * 97) % w, r * 32, 2, 32); } }); t.userData = { s: 1.2 }; break;
    case 'beton': t = ctex(512, (g, w, h) => noise(g, w, h, '#a3a19c', 26)); t.userData = { s: 3 }; break;
    case 'terre': t = ctex(512, (g, w, h) => noise(g, w, h, '#8b7357', 36)); t.userData = { s: 4 }; break;
    case 'gazon': t = ctex(512, (g, w, h) => noise(g, w, h, '#5f8c3c', 38)); t.userData = { s: 3 }; break;
    case 'sable': t = ctex(512, (g, w, h) => noise(g, w, h, '#d8c39a', 22)); t.userData = { s: 3 }; break;
    case 'asphalte': t = ctex(512, (g, w, h) => noise(g, w, h, '#55575a', 28)); t.userData = { s: 4 }; break;
    case 'feuille': t = ctex(256, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = '#2f6b23'; g.lineWidth = 5; g.beginPath(); g.moveTo(w / 2, h); g.lineTo(w / 2, 0); g.stroke(); g.strokeStyle = '#3f8a2c'; g.lineWidth = 7; for (let i = 0; i < 14; i++) { const y = h - i * 17 - 10, l = (1 - i / 16) * 110; g.beginPath(); g.moveTo(w / 2, y); g.lineTo(w / 2 - l, y - 28); g.moveTo(w / 2, y); g.lineTo(w / 2 + l, y - 28); g.stroke(); } }); break;
    default: t = null;
  }
  TEX[name] = t; return t;
}
function col(c, d) { if (c == null || c === '') return d; if (typeof c === 'number') return c; const s = String(c).trim().replace('#', ''); const v = parseInt(s.length === 3 ? s.split('').map(x => x + x).join('') : s, 16); return isNaN(v) ? d : v; }
const MATS = {};
function mat(texName, color, opts) {
  const key = texName + '|' + color + '|' + JSON.stringify(opts || {});
  if (MATS[key]) return MATS[key];
  const t = texName ? tex(texName) : null;
  const m = new T3.MeshStandardMaterial(Object.assign({ map: t, color: col(color, 0xffffff), roughness: .85 }, opts || {}));
  m.userData.s = t && t.userData ? t.userData.s : 0; MATS[key] = m; return m;
}
const GLASS = new T3.MeshStandardMaterial({ color: 0xa9cbe0, transparent: true, opacity: .3, roughness: .05, metalness: .2, depthWrite: false });
const ALU = new T3.MeshStandardMaterial({ color: 0x4a4f55, roughness: .4, metalness: .6 });
const WHITE = new T3.MeshStandardMaterial({ color: 0xf3f3f1, roughness: .8 });
const BLACK = new T3.MeshStandardMaterial({ color: 0x222222, roughness: .6 });
const BULB = new T3.MeshBasicMaterial({ color: 0xfff2cc });

// ---------- Primitives ----------
function boxUV(g, w, h, d, s) { const uv = g.attributes.uv, dm = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]]; for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * dm[f][0] / s, uv.getY(k) * dm[f][1] / s); } }
function box(p, w, h, d, m, x, y, z, ry) { const g = new T3.BoxGeometry(w, h, d); const s = m.userData && m.userData.s; if (s) boxUV(g, w, h, d, s); const me = new T3.Mesh(g, m); me.position.set(x, y + h / 2, z); if (ry) me.rotation.y = ry; me.castShadow = m !== GLASS; me.receiveShadow = true; p.add(me); return me; }
function cyl(p, rt, rb, h, m, x, y, z, seg) { const me = new T3.Mesh(new T3.CylinderGeometry(rt, rb, h, seg || 20), m); me.position.set(x, y + h / 2, z); me.castShadow = true; me.receiveShadow = true; p.add(me); return me; }
function plane(p, w, d, m, x, y, z) { const g = new T3.PlaneGeometry(w, d); const s = m.userData && m.userData.s; if (s) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / s, uv.getY(i) * d / s); } const me = new T3.Mesh(g, m); me.rotation.x = -Math.PI / 2; me.position.set(x, y, z); me.receiveShadow = true; p.add(me); return me; }
function group(p, x, y, z, ry) { const g = new T3.Group(); g.position.set(x || 0, y || 0, z || 0); g.rotation.y = (ry || 0); p.add(g); return g; }

// ---------- Mobilier & éléments (origine = centre, face vers +z sauf mention) ----------
const FURN = {
  lit(g) { box(g, 1.6, .45, 2.0, mat('bois', '#8a5a3a'), 0, 0, 0); box(g, 1.5, .2, 1.9, mat(null, '#f0f0f0'), 0, .45, .02); box(g, 1.6, .9, .08, mat('bois', '#6b4226'), 0, 0, -1.0); box(g, .6, .12, .4, mat(null, '#ffffff'), -.38, .65, -.72); box(g, .6, .12, .4, mat(null, '#ffffff'), .38, .65, -.72); },
  lit_simple(g) { box(g, .95, .45, 2.0, mat('bois', '#8a5a3a'), 0, 0, 0); box(g, .9, .2, 1.9, mat(null, '#e8eef5'), 0, .45, .02); box(g, .95, .85, .08, mat('bois', '#6b4226'), 0, 0, -1.0); },
  armoire(g) { box(g, 1.2, 2.0, .6, mat('bois', '#a0784e'), 0, 0, 0); box(g, .02, 1.9, .02, BLACK, 0, .05, .31); },
  table(g) { box(g, 1.6, .06, .9, mat('bois', '#8a5a3a'), 0, .72, 0); [[-.7, -.38], [.7, -.38], [-.7, .38], [.7, .38]].forEach(([a, b]) => box(g, .06, .72, .06, mat('bois', '#6b4226'), a, 0, b)); },
  chaise(g) { box(g, .45, .05, .45, mat('bois', '#8a5a3a'), 0, .45, 0); box(g, .45, .5, .05, mat('bois', '#8a5a3a'), 0, .45, -.2); [[-.2, -.2], [.2, -.2], [-.2, .2], [.2, .2]].forEach(([a, b]) => box(g, .04, .45, .04, BLACK, a, 0, b)); },
  canape(g) { const m = mat(null, '#7d6d8a'); box(g, 2.1, .45, .9, m, 0, 0, 0); box(g, 2.1, .45, .2, m, 0, .45, -.35); box(g, .2, .25, .9, m, -.95, .45, 0); box(g, .2, .25, .9, m, .95, .45, 0); },
  bureau(g) { box(g, 1.4, .06, .7, mat('bois', '#a0784e'), 0, .72, 0); box(g, .05, .72, .7, mat('bois', '#a0784e'), -.67, 0, 0); box(g, .05, .72, .7, mat('bois', '#a0784e'), .67, 0, 0); box(g, .5, .32, .04, BLACK, 0, .78, -.2); },
  cuisine(g) { box(g, 2.4, .9, .6, mat(null, '#f2f2f2'), 0, 0, 0); box(g, 2.45, .05, .65, mat(null, '#3a3a3a'), 0, .9, 0); box(g, .5, .02, .4, mat(null, '#bbbbbb', { metalness: .8, roughness: .3 }), .6, .95, 0); box(g, 2.4, .7, .35, mat(null, '#f2f2f2'), 0, 1.5, -.12); },
  frigo(g) { box(g, .7, 1.8, .65, mat(null, '#e9ecef', { metalness: .3, roughness: .3 }), 0, 0, 0); },
  wc(g) { box(g, .4, .42, .55, mat(null, '#ffffff', { roughness: .2 }), 0, 0, .05); box(g, .4, .4, .18, mat(null, '#ffffff', { roughness: .2 }), 0, .42, -.2); },
  lavabo(g) { box(g, .55, .15, .42, mat(null, '#ffffff', { roughness: .2 }), 0, .8, 0); box(g, .08, .8, .08, ALU, 0, 0, 0); },
  douche(g) { box(g, .9, .08, .9, mat(null, '#ffffff'), 0, 0, 0); const s = box(g, .02, 2.0, .9, GLASS, .45, .08, 0); s.castShadow = false; },
  baignoire(g) { box(g, .75, .55, 1.7, mat(null, '#ffffff', { roughness: .2 }), 0, 0, 0); },
  tv(g) { box(g, 1.3, .75, .06, BLACK, 0, 1.0, 0); box(g, 1.6, .5, .4, mat('bois', '#6b4226'), 0, 0, .05); },
  escalier(g, o) { const n = 16, hh = o.hauteur || 3, L = o.longueur || 4.2, w = o.largeur || 1; for (let i = 0; i < n; i++) box(g, w, hh / n * (i + 1), L / n, WHITE, 0, 0, -L / 2 + L / n * (i + .5)); },
  estrade(g, o) { box(g, o.largeur || 6, .6, o.profondeur || 3, mat('brique', '#ffffff'), 0, 0, 0); box(g, .5, 1.1, .4, mat(null, '#e8ecef'), 0, .6, .6); },
  chaises_rangees(g, o) { const w = o.largeur || 6, d = o.profondeur || 6, m = mat(null, o.couleur || '#1c2747'); for (let z = -d / 2 + .3; z <= d / 2 - .2; z += .9) for (let x = -w / 2 + .25; x <= w / 2 - .2; x += .55) { box(g, .42, .05, .4, m, x, .44, z); box(g, .4, .22, .03, m, x, .7, z + .21); box(g, .03, .44, .03, BLACK, x - .19, 0, z); box(g, .03, .44, .03, BLACK, x + .19, 0, z); } },
  enclos(g, o) { const w = o.largeur || 2.5, d = o.profondeur || 2.5, h = o.hauteur || 1, m = mat('parpaing', '#ffffff'); box(g, w, h, .15, m, 0, 0, -d / 2); box(g, .15, h, d, m, -w / 2, 0, 0); box(g, .15, h, d, m, w / 2, 0, 0); box(g, w / 2 - .45, h, .15, m, -w / 4 - .22, 0, d / 2); box(g, w / 2 - .45, h, .15, m, w / 4 + .22, 0, d / 2); const gate = box(g, .9, h * .9, .04, ALU, 0, 0, d / 2); gate.material = ALU; },
  mangeoire(g) { box(g, 1.2, .3, .35, mat('beton', '#ffffff'), 0, 0, 0); },
  abreuvoir(g) { cyl(g, .18, .14, .2, mat(null, '#2f6fa8'), 0, .3, 0); box(g, .04, .3, .04, ALU, 0, 0, 0); },
  voiture(g, o) { const pm = mat(null, o.couleur || '#2b4f8e', { metalness: .5, roughness: .3 }); box(g, 1.8, .55, 4.3, pm, 0, .3, 0); box(g, 1.55, .5, 2.2, mat(null, '#1b2530', { metalness: .6, roughness: .1 }), 0, .85, -.15); box(g, 1.6, .07, 1.9, pm, 0, 1.35, -.15); [[-.86, 1.35], [.86, 1.35], [-.86, -1.35], [.86, -1.35]].forEach(([a, b]) => { const w = cyl(g, .33, .33, .24, BLACK, 0, 0, 0, 16); w.rotation.z = Math.PI / 2; w.position.set(a, .33, b); }); },
  arbre(g, o) { const h = o.hauteur || 5; cyl(g, .15, .22, h * .45, mat(null, '#6b4f36'), 0, 0, 0, 8); const s = new T3.Mesh(new T3.IcosahedronGeometry(h * .3, 1), mat(null, '#3f7a2f')); s.position.y = h * .65; s.castShadow = true; g.add(s); },
  palmier(g, o) { const h = o.hauteur || 6; cyl(g, .16, .24, h, mat(null, '#7a6650'), 0, 0, 0, 10); const lm = new T3.MeshStandardMaterial({ map: tex('feuille'), alphaTest: .5, side: T3.DoubleSide }); for (let i = 0; i < 9; i++) { const lf = new T3.Mesh(new T3.PlaneGeometry(1.4, 3.2), lm); const a = i * Math.PI * 2 / 9; lf.position.set(Math.cos(a) * 1.1, h - .2, Math.sin(a) * 1.1); lf.rotation.order = 'YXZ'; lf.rotation.set(-1, -a + Math.PI / 2, 0); lf.castShadow = true; g.add(lf); } },
  banc(g) { box(g, 1.6, .06, .4, mat('bois', '#8a5a3a'), 0, .45, 0); box(g, .06, .45, .35, BLACK, -.7, 0, 0); box(g, .06, .45, .35, BLACK, .7, 0, 0); },
  piscine(g, o) { const w = o.largeur || 8, d = o.profondeur || 4; box(g, w + .6, .15, d + .6, mat('carrelage', '#ffffff'), 0, 0, 0); const e = plane(g, w, d, new T3.MeshStandardMaterial({ color: 0x3fa9d8, transparent: true, opacity: .8, roughness: .05 }), 0, .16, 0); },
  cloture(g, o) { const L = o.largeur || 10, h = o.hauteur || 1.8; box(g, L, h, .15, mat('parpaing', '#ffffff'), 0, 0, 0); },
  portail(g, o) { const L = o.largeur || 4; box(g, L, 2, .06, ALU, 0, 0, 0); box(g, .3, 2.3, .3, mat('enduit', '#ffffff'), -L / 2 - .15, 0, 0); box(g, .3, 2.3, .3, mat('enduit', '#ffffff'), L / 2 + .15, 0, 0); },
  plante(g) { box(g, .4, .45, .4, WHITE, 0, 0, 0); const lm = new T3.MeshStandardMaterial({ map: tex('feuille'), alphaTest: .5, side: T3.DoubleSide }); for (let i = 0; i < 6; i++) { const lf = new T3.Mesh(new T3.PlaneGeometry(.45, .9), lm); lf.position.y = .9; lf.rotation.set(-.4, i, 0); g.add(lf); } },
  reservoir(g) { cyl(g, .8, .8, 1.6, mat(null, '#2f6fa8'), 0, 2, 0); [[-.5, -.5], [.5, -.5], [-.5, .5], [.5, .5]].forEach(([a, b]) => box(g, .08, 2, .08, ALU, a, 0, b)); },
  boite(g, o) { box(g, o.largeur || 1, o.hauteur || 1, o.profondeur || 1, mat(null, o.couleur || '#cccccc'), 0, 0, 0); }
};
const FURN_LIST = Object.keys(FURN);

// ---------- Murs avec ouvertures ----------
function wallRun(p, axis, c, a0, a1, y0, hh, th, m, ops) {
  // axis 'x' : mur le long de x (ligne z=c) ; 'z' : le long de z (ligne x=c)
  const seg = (s0, s1, b, t) => { if (s1 - s0 < .01 || t - b < .01) return; const L = s1 - s0, mid = (s0 + s1) / 2; if (axis === 'x') box(p, L, t - b, th, m, mid, y0 + b, c); else box(p, th, t - b, L, m, c, y0 + b, mid); };
  const xs = new Set([a0, a1]); ops.forEach(o => { xs.add(Math.max(a0, Math.min(a1, o.a0))); xs.add(Math.max(a0, Math.min(a1, o.a1))); });
  const P = [...xs].sort((a, b) => a - b);
  for (let i = 0; i < P.length - 1; i++) { const s0 = P[i], s1 = P[i + 1]; if (s1 - s0 < .005) continue; const mid = (s0 + s1) / 2; const cov = ops.filter(o => o.a0 < mid && o.a1 > mid).map(o => [o.y0, o.y1]).sort((a, b) => a[0] - b[0]); let y = 0; cov.forEach(([q0, q1]) => { if (q0 > y) seg(s0, s1, y, q0); y = Math.max(y, q1); }); if (y < hh) seg(s0, s1, y, hh); }
  ops.forEach(o => {
    const w = o.a1 - o.a0, h = o.y1 - o.y0, mid = (o.a0 + o.a1) / 2, f = .06;
    const pb = (along, L, b, hgt, dep, mm) => axis === 'x' ? box(p, L, hgt, dep, mm, along, y0 + b, c) : box(p, dep, hgt, L, mm, c, y0 + b, along);
    if (o.type === 'porte' || o.type === 'portail') {
      pb(mid, w, o.y1 - f, f, th + .02, ALU); pb(o.a0 + f / 2, f, 0, h, th + .02, ALU); pb(o.a1 - f / 2, f, 0, h, th + .02, ALU);
      const leaf = pb(o.a0 + w / 2, w - .1, 0, h - .08, .05, o.type === 'portail' ? ALU : mat('bois', '#8a5a3a'));
      // vantail légèrement ouvert pour la lisibilité
      leaf.position[axis === 'x' ? 'z' : 'x'] += .0;
    } else {
      const gl = pb(mid, w, o.y0, h, .02, GLASS); gl.castShadow = false;
      pb(mid, w, o.y0, f, th + .02, ALU); pb(mid, w, o.y1 - f, f, th + .02, ALU); pb(o.a0 + f / 2, f, o.y0, h, th + .02, ALU); pb(o.a1 - f / 2, f, o.y0, h, th + .02, ALU);
      const n = Math.max(1, Math.round(w / 1.2)); for (let k = 1; k < n; k++) pb(o.a0 + k * w / n, .05, o.y0, h, .08, ALU);
    }
  });
}

// ---------- Construction ----------
function normalize(spec) {
  const s = JSON.parse(JSON.stringify(spec || {}));
  s.murs = Object.assign({ epaisseur: .2, materiau: 'enduit', couleur: '#f1efe9' }, s.murs || {});
  s.toit = Object.assign({ type: 'deux_pans', materiau: 'tole', couleur: '#b9c2c9', debord: .5 }, s.toit || {});
  s.niveaux = (s.niveaux && s.niveaux.length ? s.niveaux : [{ nom: 'RDC', hauteur: 3, pieces: [{ id: 'p1', nom: 'Pièce', x: 0, z: 0, largeur: 6, profondeur: 5 }] }]);
  s.niveaux.forEach((n, i) => { n.hauteur = +n.hauteur || 3; n.pieces = n.pieces || []; n.ouvertures = n.ouvertures || []; n.mobilier = n.mobilier || []; n.nom = n.nom || (i ? 'Étage ' + i : 'RDC'); n.pieces.forEach((p, k) => { p.id = p.id || ('p' + (i + 1) + '_' + (k + 1)); p.x = +p.x || 0; p.z = +p.z || 0; p.largeur = +p.largeur || 3; p.profondeur = +p.profondeur || 3; }); });
  s.exterieur = s.exterieur || [];
  return s;
}

function build(spec, opts) {
  const s = normalize(spec);
  const root = new T3.Group(); root.name = 'maquette';
  const levels = [], roofG = new T3.Group(), ceilG = new T3.Group(), rooms = [], labels = [];
  root.add(roofG); root.add(ceilG);
  const wallM = mat(s.murs.materiau === 'enduit' ? 'enduit' : s.murs.materiau, s.murs.materiau === 'enduit' ? s.murs.couleur : '#ffffff');
  const th = +s.murs.epaisseur || .2;
  // emprise générale
  let minX = 1e9, minZ = 1e9, maxX = -1e9, maxZ = -1e9;
  s.niveaux.forEach(n => n.pieces.forEach(p => { minX = Math.min(minX, p.x); minZ = Math.min(minZ, p.z); maxX = Math.max(maxX, p.x + p.largeur); maxZ = Math.max(maxZ, p.z + p.profondeur); }));
  if (minX > maxX) { minX = 0; minZ = 0; maxX = 6; maxZ = 5; }
  let y0 = 0; const slab = .2;
  // dalle / soubassement
  box(root, maxX - minX + .6, .35, maxZ - minZ + .6, mat('beton', '#ffffff'), (minX + maxX) / 2, -.35, (minZ + maxZ) / 2);
  s.niveaux.forEach((n, li) => {
    const lg = new T3.Group(); lg.name = n.nom; root.add(lg); levels.push({ nom: n.nom, group: lg, y: y0, h: n.hauteur });
    // emprise du niveau
    let a = 1e9, b = 1e9, c2 = -1e9, d = -1e9; n.pieces.forEach(p => { a = Math.min(a, p.x); b = Math.min(b, p.z); c2 = Math.max(c2, p.x + p.largeur); d = Math.max(d, p.z + p.profondeur); });
    if (li > 0 && a < c2) box(lg, c2 - a + th, slab, d - b + th, WHITE, (a + c2) / 2, y0 - slab, (b + d) / 2);
    // sols + étiquettes
    n.pieces.forEach(p => {
      const fm = mat(p.sol || 'carrelage', '#ffffff'); plane(lg, p.largeur, p.profondeur, fm, p.x + p.largeur / 2, y0 + .01, p.z + p.profondeur / 2);
      if (!p.ouvert) { const cm = plane(ceilG, p.largeur, p.profondeur, WHITE, p.x + p.largeur / 2, y0 + n.hauteur - .01, p.z + p.profondeur / 2); cm.rotation.x = Math.PI / 2; const bl = new T3.Mesh(new T3.SphereGeometry(.07, 8, 6), BULB); bl.position.set(p.x + p.largeur / 2, y0 + n.hauteur - .12, p.z + p.profondeur / 2); ceilG.add(bl); }
      rooms.push({ id: p.id, nom: p.nom || p.id, niveau: li, x: p.x + p.largeur / 2, z: p.z + p.profondeur / 2, y: y0, w: p.largeur, d: p.profondeur, h: n.hauteur });
      labels.push({ text: (p.nom || p.id) + `<small>${(+p.largeur).toFixed(1)} × ${(+p.profondeur).toFixed(1)} m</small>`, p: new T3.Vector3(p.x + p.largeur / 2, y0 + 1.2, p.z + p.profondeur / 2), group: lg });
    });
    // murs : arêtes de pièces dédoublonnées
    const edges = new Map(); const key = (ax, c, a0, a1) => ax + ':' + c.toFixed(2) + ':' + a0.toFixed(2) + ':' + a1.toFixed(2);
    n.pieces.forEach(p => {
      if (p.ouvert) return;
      const pm = p.couleur_mur ? mat('enduit', p.couleur_mur) : null;
      [['x', p.z, p.x, p.x + p.largeur, 'nord'], ['x', p.z + p.profondeur, p.x, p.x + p.largeur, 'sud'], ['z', p.x, p.z, p.z + p.profondeur, 'ouest'], ['z', p.x + p.largeur, p.z, p.z + p.profondeur, 'est']].forEach(([ax, c, a0, a1, side]) => {
        const k = key(ax, c, a0, a1); if (!edges.has(k)) edges.set(k, { ax, c, a0, a1, ops: [], m: pm }); edges.get(k).sides = (edges.get(k).sides || []).concat([[p.id, side]]);
      });
    });
    // ouvertures
    n.ouvertures.forEach(o => {
      const p = n.pieces.find(q => q.id === o.piece) || n.pieces[0]; if (!p) return;
      const side = o.mur || 'sud'; const ax = (side === 'nord' || side === 'sud') ? 'x' : 'z';
      const c = side === 'nord' ? p.z : side === 'sud' ? p.z + p.profondeur : side === 'ouest' ? p.x : p.x + p.largeur;
      const start = ax === 'x' ? p.x : p.z, len = ax === 'x' ? p.largeur : p.profondeur;
      const type = o.type || 'fenetre'; const w = +o.largeur || (type === 'porte' ? .9 : type === 'portail' ? 3 : type === 'baie' ? 2.4 : 1.2);
      const pos = o.position != null ? +o.position : (len - w) / 2;
      const isDoor = type === 'porte' || type === 'portail';
      const h = +o.hauteur || (isDoor ? (type === 'portail' ? 2.6 : 2.1) : type === 'baie' ? 2.2 : 1.2);
      const all = o.allege != null ? +o.allege : (isDoor || type === 'baie' ? 0 : 1.0);
      const op = { a0: start + pos, a1: start + pos + w, y0: all, y1: Math.min(n.hauteur - .05, all + h), type };
      // trouve l'arête qui contient l'ouverture
      let best = null; edges.forEach(e => { if (e.ax === ax && Math.abs(e.c - c) < .02 && e.a0 <= op.a0 + .01 && e.a1 >= op.a1 - .01) best = e; });
      if (best) best.ops.push(op);
    });
    edges.forEach(e => wallRun(lg, e.ax, e.c, e.a0 - (e.ax === 'x' ? th / 2 : 0), e.a1 + (e.ax === 'x' ? th / 2 : 0), y0, n.hauteur, th, e.m || wallM, e.ops));
    // mobilier
    n.mobilier.forEach(f => { const fn = FURN[f.type]; if (!fn) return; const g = group(lg, +f.x || 0, y0, +f.z || 0, (+f.rotation || 0) * Math.PI / 180); fn(g, f); });
    y0 += n.hauteur + (li < s.niveaux.length - 1 ? slab : 0);
  });
  // toiture
  const top = y0, deb = +s.toit.debord || .5, W = maxX - minX + deb * 2, D = maxZ - minZ + deb * 2, cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
  const rm = mat(s.toit.materiau === 'dalle' ? null : s.toit.materiau, s.toit.materiau === 'dalle' ? '#e9e9e6' : (s.toit.couleur || '#ffffff'), { side: T3.DoubleSide, metalness: s.toit.materiau === 'tole' ? .4 : 0, roughness: .6 });
  if (s.toit.type === 'plat') { box(roofG, maxX - minX + th, .3, maxZ - minZ + th, mat(null, '#e9e9e6'), cx, top, cz); const ph = .7, pm = wallM; box(roofG, maxX - minX + th, ph, th, pm, cx, top, minZ); box(roofG, maxX - minX + th, ph, th, pm, cx, top, maxZ); box(roofG, th, ph, maxZ - minZ, pm, minX, top, cz); box(roofG, th, ph, maxZ - minZ, pm, maxX, top, cz); }
  else if (s.toit.type === 'un_pan') { const rise = Math.max(.6, D * .12); const len = Math.hypot(D, rise); const g = new T3.PlaneGeometry(W, len); const uvs = g.attributes.uv; const sc = rm.userData.s || 1; for (let i = 0; i < uvs.count; i++) uvs.setXY(i, uvs.getX(i) * W / sc, uvs.getY(i) * len / sc); const m = new T3.Mesh(g, rm); m.position.set(cx, top + rise / 2 + .1, cz); m.rotation.x = -Math.PI / 2 + Math.atan2(rise, D); m.castShadow = true; m.receiveShadow = true; roofG.add(m); }
  else if (s.toit.type === 'deux_pans') { const along = W >= D; const span = along ? D : W, L = along ? W : D, rise = Math.max(.8, span * .2), half = Math.hypot(span / 2, rise), ang = Math.atan2(rise, span / 2);
    [-1, 1].forEach(sd => { const g = new T3.PlaneGeometry(L, half); const uvs = g.attributes.uv; const sc = rm.userData.s || 1; for (let i = 0; i < uvs.count; i++) uvs.setXY(i, uvs.getX(i) * L / sc, uvs.getY(i) * half / sc); const m = new T3.Mesh(g, rm); m.castShadow = true; m.receiveShadow = true;
      if (along) { m.position.set(cx, top + rise / 2 + .1, cz + sd * span / 4); m.rotation.x = -Math.PI / 2 + sd * ang; } else { m.rotation.order = 'YXZ'; m.rotation.y = Math.PI / 2; m.rotation.x = -Math.PI / 2 + sd * ang; m.position.set(cx + sd * span / 4, top + rise / 2 + .1, cz); } roofG.add(m); });
    // pignons
    const gm = wallM; const sh = new T3.Shape(); const hs = (along ? maxZ - minZ : maxX - minX) / 2; sh.moveTo(-hs, 0); sh.lineTo(hs, 0); sh.lineTo(0, rise * ((hs) / (span / 2))); sh.lineTo(-hs, 0);
    [along ? minX : minZ, along ? maxX : maxZ].forEach(v => { const m = new T3.Mesh(new T3.ShapeGeometry(sh), gm); m.material = new T3.MeshStandardMaterial({ color: gm.color, map: gm.map, side: T3.DoubleSide, roughness: .9 }); if (along) { m.rotation.y = Math.PI / 2; m.position.set(v, top, cz); } else m.position.set(cx, top, v); m.castShadow = true; roofG.add(m); }); }
  // terrain & extérieur
  const ter = s.terrain || {}; const TW = +ter.largeur || Math.max(40, (maxX - minX) + 30), TD = +ter.profondeur || Math.max(40, (maxZ - minZ) + 30);
  plane(root, 400, 400, mat('gazon', '#ffffff'), cx, -.36, cz);
  if (ter.sol && ter.sol !== 'gazon') plane(root, TW, TD, mat(ter.sol, '#ffffff'), cx, -.355, cz);
  s.exterieur.forEach(e => { if (e.type === 'parking' || e.type === 'allee') { plane(root, +e.largeur || 6, +e.profondeur || 5, mat(e.type === 'parking' ? 'asphalte' : 'beton', '#ffffff'), +e.x || 0, -.34, +e.z || 0); return; } const fn = FURN[e.type]; if (!fn) return; const g = group(root, +e.x || 0, -.35, +e.z || 0, (+e.rotation || 0) * Math.PI / 180); fn(g, e); });
  return { root, levels, roofG, ceilG, rooms, labels, bounds: { minX, minZ, maxX, maxZ, top }, spec: s };
}

// ---------- Visionneuse ----------
function Viewer(container, opt) {
  opt = opt || {};
  const renderer = new T3.WebGLRenderer({ antialias: true }); renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T3.PCFSoftShadowMap; renderer.outputEncoding = T3.sRGBEncoding; renderer.toneMapping = T3.ACESFilmicToneMapping;
  container.appendChild(renderer.domElement);
  const scene = new T3.Scene(); scene.background = new T3.Color(0xbcd6ec);
  const hemi = new T3.HemisphereLight(0xffffff, 0xb9a58a, .6); scene.add(hemi); const amb = new T3.AmbientLight(0xffffff, .18); scene.add(amb);
  const sun = new T3.DirectionalLight(0xfff1d6, 2.0); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.0004; sun.shadow.normalBias = .02; scene.add(sun); scene.add(sun.target);
  const persp = new T3.PerspectiveCamera(50, 1, .05, 600), ortho = new T3.OrthographicCamera(-1, 1, 1, -1, .1, 300); ortho.up.set(0, 0, -1);
  const oc = new T3.OrbitControls(persp, renderer.domElement); oc.enableDamping = true; const pc = new T3.OrbitControls(ortho, renderer.domElement); pc.enableRotate = false; pc.screenSpacePanning = true; pc.enabled = false;
  const labelsEl = document.createElement('div'); labelsEl.className = 'v-labels'; container.appendChild(labelsEl);
  let cur = null, cam = persp, view = 'ext', showLabels = true, night = false; const LB = [];
  function resize() { const w = container.clientWidth, h = container.clientHeight; renderer.setSize(w, h); persp.aspect = w / h; persp.updateProjectionMatrix(); fitOrtho(); }
  function fitOrtho() { if (!cur) return; const b = cur.bounds, w = container.clientWidth, h = container.clientHeight, a = w / h; let hh = Math.max((b.maxZ - b.minZ) / 2 + 4, ((b.maxX - b.minX) / 2 + 4) / a); ortho.left = -hh * a; ortho.right = hh * a; ortho.top = hh; ortho.bottom = -hh; ortho.updateProjectionMatrix(); ortho.position.set((b.minX + b.maxX) / 2, 120, (b.minZ + b.maxZ) / 2); pc.target.set((b.minX + b.maxX) / 2, 0, (b.minZ + b.maxZ) / 2); }
  function load(spec) {
    if (cur) scene.remove(cur.root); LB.forEach(l => l.el.remove()); LB.length = 0;
    cur = build(spec); scene.add(cur.root);
    const b = cur.bounds, cx = (b.minX + b.maxX) / 2, cz = (b.minZ + b.maxZ) / 2, R = Math.max(b.maxX - b.minX, b.maxZ - b.minZ, 8);
    sun.position.set(cx - R, R * 1.6 + 10, cz + R * .9); sun.target.position.set(cx, 0, cz); Object.assign(sun.shadow.camera, { left: -R * 1.2, right: R * 1.2, top: R * 1.2, bottom: -R * 1.2, near: 1, far: R * 6 + 60 }); sun.shadow.camera.updateProjectionMatrix();
    cur.labels.forEach(l => { const d = document.createElement('div'); d.className = 'v-lbl'; d.innerHTML = l.text; labelsEl.appendChild(d); LB.push({ el: d, p: l.p, group: l.group }); });
    resize(); setView(view === 'int' ? 'ext' : view, true); return cur;
  }
  function setView(v, keepCam) {
    view = v; const b = cur.bounds, cx = (b.minX + b.maxX) / 2, cz = (b.minZ + b.maxZ) / 2, R = Math.max(b.maxX - b.minX, b.maxZ - b.minZ, 8);
    cur.roofG.visible = v === 'ext' || v === 'int'; cur.ceilG.visible = v === 'int';
    persp.fov = v === 'int' ? 72 : 50; persp.updateProjectionMatrix();
    if (v === 'plan') { cam = ortho; oc.enabled = false; pc.enabled = true; fitOrtho(); ortho.zoom = 1; ortho.updateProjectionMatrix(); }
    else { cam = persp; pc.enabled = false; oc.enabled = true; }
    if (v === 'ext' || v === 'notoit') { oc.enableZoom = oc.enablePan = true; oc.rotateSpeed = 1; oc.minDistance = 3; oc.maxDistance = 250; oc.maxPolarAngle = Math.PI * .49; persp.position.set(cx + R * 1.1, v === 'ext' ? R * .7 + 4 : R * 1.2 + 6, cz + R * 1.3); oc.target.set(cx, b.top * .35, cz); }
    if (v === 'int') { oc.enableZoom = false; oc.enablePan = false; oc.rotateSpeed = -.35; oc.minDistance = 0; oc.maxDistance = 1; oc.maxPolarAngle = Math.PI * .9; const r = cur.rooms[0]; if (r) goRoom(r.id, true); }
    oc.update(); if (opt.onView) opt.onView(v);
  }
  function goRoom(id, silent) { const r = cur.rooms.find(q => q.id === id || q.nom === id); if (!r) return false; if (view !== 'int' && !silent) setView('int'); persp.position.set(r.x - r.w * .35, r.y + 1.65, r.z + r.d * .35); const t = new T3.Vector3(r.x + r.w * .3, r.y + 1.2, r.z - r.d * .3); const dir = t.sub(persp.position).normalize(); oc.target.copy(persp.position).addScaledVector(dir, .05); oc.update(); return r; }
  function setNight(v) { night = v; sun.intensity = v ? .05 : 2.0; hemi.intensity = v ? .08 : .6; amb.intensity = v ? .05 : .18; scene.background = new T3.Color(v ? 0x0b1020 : 0xbcd6ec); }
  // déplacements clavier
  const K = {}; addEventListener('keydown', e => { if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return; K[e.code] = true; if (view === 'int' && /Arrow|Page|Space/.test(e.code)) e.preventDefault(); }); addEventListener('keyup', e => K[e.code] = false);
  renderer.domElement.addEventListener('wheel', e => { if (view !== 'int') return; e.preventDefault(); step(-Math.sign(e.deltaY) * .5, 0, 0); }, { passive: false });
  function step(f, r, u) { const fw = new T3.Vector3().subVectors(oc.target, persp.position); fw.y = 0; if (fw.lengthSq() < 1e-9) return; fw.normalize(); const rt = new T3.Vector3(-fw.z, 0, fw.x); const mv = fw.multiplyScalar(f).add(rt.multiplyScalar(r)); mv.y = u; persp.position.add(mv); oc.target.add(mv); }
  let last = performance.now(); const UP = new T3.Vector3(0, 1, 0), v3 = new T3.Vector3();
  function loop() {
    requestAnimationFrame(loop); const t = performance.now(), dt = Math.min(.05, (t - last) / 1000); last = t;
    if (view === 'int') { const sp = (K.ShiftLeft || K.ShiftRight ? 5 : 2.4) * dt; let f = 0, r = 0, u = 0, tr = 0; if (K.KeyW || K.KeyZ || K.ArrowUp) f++; if (K.KeyS || K.ArrowDown) f--; if (K.KeyA || K.KeyQ) r--; if (K.KeyD) r++; if (K.ArrowLeft) tr++; if (K.ArrowRight) tr--; if (K.PageUp || K.KeyE) u++; if (K.PageDown || K.KeyC) u--;
      if (tr) { const d = new T3.Vector3().subVectors(oc.target, persp.position); d.applyAxisAngle(UP, tr * 1.8 * dt); oc.target.copy(persp.position).add(d); } if (f || r || u) { const n = Math.hypot(f, r) || 1; step(f / n * sp, r / n * sp, u * 2.4 * dt); } }
    if (cam === persp) oc.update(); else pc.update(); renderer.render(scene, cam);
    const w = container.clientWidth, h = container.clientHeight; LB.forEach(l => { let vis = showLabels && (view === 'notoit' || view === 'plan') && l.group.visible; if (vis) { v3.copy(l.p).project(cam); if (v3.z > 1 || v3.z < -1) vis = false; else l.el.style.transform = `translate(-50%,-50%) translate(${(v3.x * .5 + .5) * w}px,${(-v3.y * .5 + .5) * h}px)`; } l.el.style.display = vis ? 'block' : 'none'; });
  }
  addEventListener('resize', resize); loop();
  return { load, setView, goRoom, setNight, get view() { return view; }, get model() { return cur; }, set labels(v) { showLabels = v; }, get labels() { return showLabels; }, step, persp, oc, scene, renderer,
    setLevelVisible(i, v) { if (cur && cur.levels[i]) cur.levels[i].group.visible = v; } };
}

// ---------- Schéma pour l'IA ----------
const SCHEMA = {
  type: 'object', required: ['nom', 'niveaux'],
  properties: {
    nom: { type: 'string' }, description: { type: 'string' },
    murs: { type: 'object', properties: { epaisseur: { type: 'number' }, materiau: { type: 'string', enum: ['enduit', 'parpaing', 'brique', 'bois', 'tole'] }, couleur: { type: 'string' } } },
    niveaux: { type: 'array', items: { type: 'object', required: ['pieces'], properties: {
      nom: { type: 'string' }, hauteur: { type: 'number' },
      pieces: { type: 'array', items: { type: 'object', required: ['id', 'nom', 'x', 'z', 'largeur', 'profondeur'], properties: { id: { type: 'string' }, nom: { type: 'string' }, x: { type: 'number' }, z: { type: 'number' }, largeur: { type: 'number' }, profondeur: { type: 'number' }, sol: { type: 'string', enum: ['carrelage', 'parquet', 'beton', 'terre', 'gazon', 'sable'] }, couleur_mur: { type: 'string' }, ouvert: { type: 'boolean' } } } },
      ouvertures: { type: 'array', items: { type: 'object', required: ['piece', 'mur', 'type'], properties: { piece: { type: 'string' }, mur: { type: 'string', enum: ['nord', 'sud', 'est', 'ouest'] }, type: { type: 'string', enum: ['porte', 'fenetre', 'baie', 'portail'] }, position: { type: 'number' }, largeur: { type: 'number' }, hauteur: { type: 'number' }, allege: { type: 'number' } } } },
      mobilier: { type: 'array', items: { type: 'object', required: ['type', 'x', 'z'], properties: { type: { type: 'string', enum: FURN_LIST }, x: { type: 'number' }, z: { type: 'number' }, rotation: { type: 'number' }, largeur: { type: 'number' }, profondeur: { type: 'number' }, hauteur: { type: 'number' }, couleur: { type: 'string' } } } } } } },
    toit: { type: 'object', properties: { type: { type: 'string', enum: ['plat', 'un_pan', 'deux_pans', 'aucun'] }, materiau: { type: 'string', enum: ['tole', 'tuile', 'dalle', 'paille'] }, couleur: { type: 'string' }, debord: { type: 'number' } } },
    terrain: { type: 'object', properties: { largeur: { type: 'number' }, profondeur: { type: 'number' }, sol: { type: 'string', enum: ['gazon', 'terre', 'beton', 'sable'] } } },
    exterieur: { type: 'array', items: { type: 'object', required: ['type', 'x', 'z'], properties: { type: { type: 'string', enum: ['arbre', 'palmier', 'voiture', 'cloture', 'portail', 'parking', 'allee', 'piscine', 'banc', 'reservoir', 'boite'] }, x: { type: 'number' }, z: { type: 'number' }, largeur: { type: 'number' }, profondeur: { type: 'number' }, hauteur: { type: 'number' }, rotation: { type: 'number' }, couleur: { type: 'string' } } } }
  }
};
const GUIDE = `FORMAT DE MAQUETTE (outil definir_maquette) :
- Repère en mètres : origine = coin nord-ouest du bâtiment ; x vers l'est, z vers le sud.
- Chaque pièce est un rectangle {id, nom, x, z, largeur (selon x), profondeur (selon z)}. Les pièces voisines partagent exactement leurs bords (ex. pièce A x=0 largeur 4 et pièce B x=4) : les murs communs sont fusionnés.
- Ouvertures : {piece, mur: nord|sud|est|ouest, type: porte|fenetre|baie|portail, position = distance depuis le début du mur (depuis l'ouest pour nord/sud, depuis le nord pour est/ouest), largeur, hauteur, allege}. Une porte entre deux pièces se déclare une seule fois, sur le mur commun.
- Niveaux empilés dans l'ordre (RDC d'abord) avec leur hauteur sous plafond (2.7 à 3 m habituellement, plus pour une salle).
- Mobilier disponible : ${FURN_LIST.join(', ')}. Coordonnées absolues (même repère), rotation en degrés. Les meubles font face à +z (sud) à rotation 0.
- Pièces extérieures (terrasse, cour, enclos sans toit) : ouvert=true.
- Toit : plat (dalle + acrotère), un_pan, deux_pans, aucun ; matériaux tole, tuile, dalle, paille.
- Extérieur : arbres, palmiers, voitures, clôtures, portail, parking, allée, piscine…
Sois réaliste dans les dimensions (chambre 3×3.5 à 4×4, salon 4×5+, couloir 1.2, porte 0.9, fenêtre 1.2×1.2 allège 1). Si une cote manque, choisis la valeur la plus logique et signale-le.`;

global.Visio = { build, Viewer, SCHEMA, GUIDE, FURN_LIST, normalize };
})(window);
