/**
 * Kilolane mock 3D scenes — three.js 0.187.0 (vendored).
 * Falls back to the existing SVG/CSS visuals if WebGL is missing.
 * Light for older iPhones: shared unit geometry, Lambert, no shadows, DPR cap, pause offscreen.
 */
import * as THREE from './vendor/three-0.187.0.module.min.js?v=20261113q1';

const THREE_VERSION = '0.187.0';
const C1_ASSET_V = '20261113q1';
const NAVY = 0x0b1530;
const BLUE = 0x3b7bff;
const BLUE_DEEP = 0x1e4fd8;
const GOLD = 0xffd23f;
const CREAM = 0xf2eee6;
const ORANGE = 0xe69f00;
const SLATE = 0x8a94a8;
const PINK = 0xcc79a7;
const TEAL = 0x1fa39a;
const GLASS = 0xbfe3ff;
const GRAY = 0xc9d1de;
const PAD = 0x9aa3b5;
const LAMP = 0xf4f7fb;
const IDLE_MS = 8000;
const DPR_CAP = 1.5;
const CREW = {
  zapsaurus: { color: BLUE_DEEP, kind: 'rex', name: 'Zapsaurus' },
  voltatops: { color: CREAM, kind: 'tri', name: 'Voltatops' },
  stegowatt: { color: ORANGE, kind: 'stego', name: 'Stegowatt' },
  tankamp: { color: SLATE, kind: 'ankylo', name: 'Tankamp' },
  pterowatt: { color: PINK, kind: 'ptero', name: 'Pterowatt' },
  honkwatt: { color: TEAL, kind: 'para', name: 'Honkwatt' },
};

const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1),
  sphere: new THREE.SphereGeometry(1, 22, 16),
  sphereLo: new THREE.SphereGeometry(1, 14, 11),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 18),
  cone: new THREE.ConeGeometry(1, 1, 14),
};

const PORT_SNAP = 0.38;
const PINCH_MIN = 0.7;
const PINCH_MAX = 2.2;
const TRAIL_LIFE_MS = 800;
const SHAKE_G = 18;
const ROAR_MS = 700;
const DOUBLE_TAP_MS = 280;

function dist3(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
function plugInRange(plug, port, radius) {
  return dist3(plug, port) <= (radius == null ? PORT_SNAP : radius);
}
function snapPlugToPort(port) { return { x: port.x, y: port.y, z: port.z }; }
function sagPoint(a, b, t, sag) {
  const k = Math.max(0, Math.min(1, t));
  return {
    x: a.x + (b.x - a.x) * k,
    y: a.y + (b.y - a.y) * k - sag * Math.sin(Math.PI * k),
    z: a.z + (b.z - a.z) * k,
  };
}
function trailTick(points, now, life) {
  const ms = life == null ? TRAIL_LIFE_MS : life;
  return points.filter((p) => now - p.t < ms);
}
function pinchScale(startDist, dist, prev, min, max) {
  const lo = min == null ? PINCH_MIN : min;
  const hi = max == null ? PINCH_MAX : max;
  if (!(startDist > 0) || !isFinite(dist) || !isFinite(prev)) return Math.max(lo, Math.min(hi, prev || 1));
  return Math.max(lo, Math.min(hi, prev * (dist / startDist)));
}
function accelMag(x, y, z) { return Math.sqrt(x * x + y * y + z * z); }
function shouldRoarShake(gMag, threshold) { return gMag >= (threshold == null ? SHAKE_G : threshold); }
function isDoubleTap(prevAt, now, windowMs) { return prevAt > 0 && now - prevAt <= (windowMs == null ? DOUBLE_TAP_MS : windowMs); }


const mounts = [];
let raf = 0;
let lastT = 0;
let cssInjected = false;

function rm() {
  try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
}
function isNight() {
  const h = new Date().getHours();
  return h < 6 || h >= 19;
}
export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl') || c.getContext('experimental-webgl'));
  } catch (e) { return false; }
}
function hexMat(color, extra) {
  const m = new THREE.MeshLambertMaterial({ color, ...extra });
  return m;
}
function softMat(color, extra) {
  return hexMat(color, { emissive: color, emissiveIntensity: 0.1, ...(extra || {}) });
}

function mesh(geo, color, sx, sy, sz, extra) {
  const mat = typeof color === 'number' ? hexMat(color, extra) : color;
  const o = new THREE.Mesh(geo, mat);
  o.scale.set(sx, sy, sz);
  return o;
}
function soft(geo, color, sx, sy, sz, extra) {
  return mesh(geo, softMat(color, extra), sx, sy, sz);
}

function add(parent, obj, x, y, z) {
  obj.position.set(x || 0, y || 0, z || 0);
  parent.add(obj);
  return obj;
}

function textTexture(draw, w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 1;
  tex.needsUpdate = true;
  return tex;
}

function injectCss() {
  if (cssInjected || document.getElementById('c1-three-css')) return;
  cssInjected = true;
  const st = document.createElement('style');
  st.id = 'c1-three-css';
  st.textContent = `
    .c1-3d-dock{flex:none;width:100%;min-width:0}
    .c1gl-host{position:relative;min-height:96px;width:100%;max-width:100%}
    .c1gl-host.c1gl-on>.c1-2d-src{visibility:hidden;pointer-events:none;position:absolute;inset:0;overflow:hidden}
    .c1gl{display:block;width:100%;height:100%;touch-action:none;-webkit-user-select:none;user-select:none}
    .c1gl-rmnote{position:absolute;left:4px;right:4px;bottom:2px;z-index:3;text-align:center;font-size:11px;line-height:14px;color:#8A94A8;pointer-events:none}
    #c1profile .c1p-hi, .c1p-hi{
      display:inline-block;padding:8px 12px;border-radius:12px;
      background:#E6F1FF!important;color:#0B1530!important;
      border:1px solid #9FB3D1;font-weight:800;
    }
    #c1profile .c1p-name, .c1p-name{
      margin-top:8px;color:#F4F7FB!important;font-weight:800;font-size:1.125rem;
    }
    .c1-3d-play{display:flex;gap:8px;align-items:center;justify-content:center;flex-wrap:wrap;margin:2px 0 6px}
    .c1-3d-play .chip{min-height:36px;font-weight:700}
    @media (prefers-reduced-motion:reduce){
      .c1gl-host .c1gl{/* still 3D, held still in JS */}
    }
  `;
  document.head.appendChild(st);
}

function makeRenderer(canvas, w, h) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false,
    powerPreference: 'low-power',
    failIfMajorPerformanceCaveat: false,
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, DPR_CAP));
  renderer.setSize(w, h, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  return renderer;
}

function litScene() {
  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 0.88));
  const d = new THREE.DirectionalLight(0xffffff, 0.75);
  d.position.set(2.2, 4.2, 3.2);
  scene.add(d);
  const f = new THREE.DirectionalLight(0xc8d8ff, 0.32);
  f.position.set(-2, 1.5, -2);
  scene.add(f);
  const rim = new THREE.DirectionalLight(0xfff1c8, 0.28);
  rim.position.set(0.4, 2.6, -3.1);
  scene.add(rim);
  return scene;
}

function bolt(size) {
  const g = new THREE.Group();
  const a = mesh(GEO.box, GOLD, size * 0.18, size * 0.55, size * 0.1);
  a.rotation.z = 0.4;
  const b = mesh(GEO.box, GOLD, size * 0.18, size * 0.45, size * 0.1);
  b.position.set(size * 0.12, -size * 0.35, 0);
  b.rotation.z = 0.4;
  g.add(a, b);
  return g;
}

/* ---------- models ---------- */
function buildCar(body, paint) {
  const g = new THREE.Group();
  const color = new THREE.Color(paint || '#E8453C');
  const isSuv = body === 'suv';
  const isTruck = body === 'truck';
  const bodyH = isSuv ? 0.5 : 0.42;
  const bodyL = isTruck ? 2.25 : 1.95;
  const bodyW = isSuv ? 1.02 : 0.95;
  const cabinH = isSuv ? 0.42 : 0.32;
  const cabinL = isTruck ? 0.85 : 1.05;
  const cabinX = isTruck ? -0.35 : 0.05;
  const hull = mesh(GEO.box, color, bodyL, bodyH, bodyW);
  add(g, hull, 0, 0.46, 0);
  const cabin = mesh(GEO.box, color, cabinL, cabinH, bodyW * 0.92);
  add(g, cabin, cabinX, 0.46 + bodyH * 0.5 + cabinH * 0.5 - 0.02, 0);
  const win = mesh(GEO.box, GLASS, cabinL * 0.72, cabinH * 0.62, bodyW * 0.94);
  add(g, win, cabinX + 0.02, cabin.position.y + 0.02, 0);
  // wheels
  const wheelMat = hexMat(0x22304f);
  const hubMat = hexMat(0xc9d1de);
  const wdx = isTruck ? 0.72 : 0.62;
  const wheels = [];
  [[-wdx, -bodyW * 0.52], [wdx, -bodyW * 0.52], [-wdx, bodyW * 0.52], [wdx, bodyW * 0.52]].forEach(([x, z]) => {
    const wg = new THREE.Group();
    const w = new THREE.Mesh(GEO.cyl, wheelMat);
    w.scale.set(0.2, 0.14, 0.2);
    w.rotation.set(Math.PI / 2, 0, 0);
    const hub = new THREE.Mesh(GEO.cyl, hubMat);
    hub.scale.set(0.08, 0.16, 0.08);
    hub.rotation.set(Math.PI / 2, 0, 0);
    const spoke = mesh(GEO.box, 0xc9d1de, 0.04, 0.18, 0.04);
    spoke.rotation.x = Math.PI / 2;
    wg.add(w, hub, spoke);
    add(g, wg, x, 0.2, z);
    wheels.push(wg);
  });
  g.userData.wheels = wheels;
  // headlights / tails
  const hl = mesh(GEO.box, LAMP, 0.08, 0.1, 0.16);
  add(g, hl, bodyL * 0.48, 0.5, bodyW * 0.28);
  const hl2 = mesh(GEO.box, LAMP, 0.08, 0.1, 0.16);
  add(g, hl2, bodyL * 0.48, 0.5, -bodyW * 0.28);
  const tl = mesh(GEO.box, 0xe8453c, 0.08, 0.1, 0.16);
  add(g, tl, -bodyL * 0.48, 0.5, 0);
  // lit charge port — pulse is emissive only, never a fill / progress bar
  const port = mesh(GEO.box, BLUE, 0.06, 0.14, 0.1, { emissive: BLUE, emissiveIntensity: 0.7 });
  add(g, port, 0.15, 0.52, bodyW * 0.5 + 0.02);
  port.userData.port = true;
  g.userData.port = port;
  g.userData.headlights = [hl, hl2];
  g.userData.bodyKind = body;
  // shadow disc
  const sh = mesh(GEO.cyl, 0x0b1530, 0.9, 0.02, 0.55, { transparent: true, opacity: 0.18 });
  add(g, sh, 0, 0.01, 0);
  return g;
}

function buildCharger(plugs) {
  const g = new THREE.Group();
  const base = mesh(GEO.box, 0x5a6680, 0.7, 0.12, 0.45);
  add(g, base, 0, 0.06, 0);
  const body = mesh(GEO.box, 0xffffff, 0.85, 2.05, 0.55);
  add(g, body, 0, 1.15, 0);
  // navy stroke feel: slightly larger box behind? skip for perf — use dark edges via a thin wrap
  const cap = mesh(GEO.box, BLUE, 0.86, 0.38, 0.56, { emissive: BLUE, emissiveIntensity: 0.35 });
  add(g, cap, 0, 2.05, 0);
  g.userData.cap = cap;
  const mark = bolt(0.28);
  mark.scale.set(0.7, 0.7, 0.7);
  add(g, mark, 0, 2.12, 0.29);
  const screen = mesh(GEO.box, NAVY, 0.55, 0.38, 0.06);
  add(g, screen, 0, 1.55, 0.28);
  const have = new Set(plugs || []);
  const slots = [
    { type: 'CCS', label: 'CCS1', x: -0.18, y: 1.05 },
    { type: 'NACS', label: 'NACS', x: 0.18, y: 1.05 },
    { type: 'CHAdeMO', label: 'CHAdeMO', x: -0.18, y: 0.72 },
    { type: 'J1772', label: 'J1772', x: 0.18, y: 0.72 },
  ];
  const lamps = [];
  slots.forEach((s) => {
    if (have.size && !have.has(s.type)) return;
    const lamp = mesh(GEO.sphereLo, GRAY, 0.11, 0.11, 0.11);
    add(g, lamp, s.x, s.y, 0.3);
    lamp.userData.slot = s;
    lamps.push(lamp);
  });
  g.userData.lamps = lamps;
  const cable = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.42, 0.7, 0.1),
      new THREE.Vector3(0.7, 0.45, 0.25),
      new THREE.Vector3(0.55, 0.15, 0.35),
    ]), 8, 0.04, 6, false),
    hexMat(NAVY),
  );
  g.add(cable);
  const handle = mesh(GEO.box, 0x5a6680, 0.14, 0.22, 0.1);
  add(g, handle, 0.48, 0.82, 0.12);
  const glow = mesh(GEO.box, BLUE, 0.86, 0.05, 0.56, { emissive: BLUE, emissiveIntensity: 0.35 });
  add(g, glow, 0, 0.28, 0);
  g.userData.glow = glow;
  g.userData.screen = screen;
  return g;
}

function setBuddyFace(g, face) {
  const eyes = g.userData.eyes;
  const lids = g.userData.lids;
  const wink = g.userData.winkBit;
  const spark = g.userData.faceSpark;
  const zeds = g.userData.zeds;
  if (!eyes) return;
  const sleepy = face === 'sleepy';
  const winkOn = face === 'wink';
  const blink = face === 'blink';
  eyes.forEach((e, i) => { e.visible = !sleepy && !blink && !(winkOn && i === 1); });
  if (lids) lids.forEach((l) => { l.visible = sleepy || blink; });
  if (wink) wink.visible = winkOn;
  if (spark) spark.visible = winkOn;
  if (zeds) zeds.visible = sleepy;
  g.userData.face = face;
}


function addEyes(head, g, x, y, z, spread, col) {
  const eyeL = mesh(GEO.sphereLo, 0xffffff, 0.055, 0.055, 0.04);
  const eyeR = mesh(GEO.sphereLo, 0xffffff, 0.055, 0.055, 0.04);
  add(head, eyeL, x - spread, y, z);
  add(head, eyeR, x + spread, y, z);
  const puL = mesh(GEO.sphereLo, NAVY, 0.03, 0.03, 0.03);
  const puR = mesh(GEO.sphereLo, NAVY, 0.03, 0.03, 0.03);
  add(head, puL, x - spread + 0.01, y, z + 0.025);
  add(head, puR, x + spread + 0.01, y, z + 0.025);
  const glL = mesh(GEO.sphereLo, 0xffffff, 0.012, 0.012, 0.012);
  const glR = mesh(GEO.sphereLo, 0xffffff, 0.012, 0.012, 0.012);
  add(head, glL, x - spread + 0.016, y + 0.012, z + 0.038);
  add(head, glR, x + spread + 0.016, y + 0.012, z + 0.038);
  const lidL = mesh(GEO.box, col, 0.11, 0.025, 0.05);
  const lidR = mesh(GEO.box, col, 0.11, 0.025, 0.05);
  add(head, lidL, x - spread, y, z + 0.015);
  add(head, lidR, x + spread, y, z + 0.015);
  lidL.visible = lidR.visible = false;
  const winkBit = mesh(GEO.box, NAVY, 0.1, 0.018, 0.03);
  add(head, winkBit, x + spread, y, z + 0.015);
  winkBit.visible = false;
  g.userData.eyes = [eyeL, eyeR, puL, puR, glL, glR];
  g.userData.lids = [lidL, lidR];
  g.userData.winkBit = winkBit;
}

function crestBolt(parent, x, y, z, size) {
  const b = bolt(size);
  add(parent, b, x, y, z);
  return b;
}

function finishBuddy(g, body, id, kind, col, head, jaw) {
  const faceSpark = bolt(0.14);
  add(body, faceSpark, 0.2, 1.55, 0.55);
  faceSpark.visible = false;
  const zeds = new THREE.Group();
  const z1 = mesh(GEO.box, 0x5a6680, 0.1, 0.04, 0.04);
  const z2 = mesh(GEO.box, 0x5a6680, 0.07, 0.03, 0.03);
  add(zeds, z1, 0.28, 1.62, 0.5);
  add(zeds, z2, 0.4, 1.76, 0.5);
  zeds.visible = false;
  body.add(zeds);
  g.userData.faceSpark = faceSpark;
  g.userData.zeds = zeds;
  g.userData.kind = kind;
  g.userData.id = id;
  g.userData.jaw = jaw || null;
  const sparkHop = new THREE.Group();
  sparkHop.add(bolt(0.2), bolt(0.14));
  sparkHop.children[1].position.set(0.14, -0.1, 0);
  sparkHop.visible = false;
  add(g, sparkHop, 0.15, 1.7, 0.55);
  g.userData.hopSpark = sparkHop;
  setBuddyFace(g, 'happy');
  return g;
}

function spinePlate(parent, x, y, z, h) {
  const p = mesh(GEO.cone, GOLD, 0.09, h, 0.05, { emissive: GOLD, emissiveIntensity: 0.4 });
  add(parent, p, x, y, z);
  return p;
}

function buildRex(body, col, g) {
  // Torso sits back so the big head and long tail read in 3/4 view
  const torso = soft(GEO.sphere, col, 0.34, 0.3, 0.42);
  add(body, torso, 0, 0.92, -0.05);
  const belly = soft(GEO.sphere, BLUE, 0.26, 0.2, 0.28, { emissiveIntensity: 0.06 });
  add(body, belly, 0, 0.74, 0.06);
  // thick legs
  [[0.2, 0.02], [-0.2, -0.08]].forEach(([x, z]) => {
    add(body, soft(GEO.sphere, col, 0.18, 0.3, 0.18), x, 0.52, z);
    add(body, soft(GEO.sphere, col, 0.13, 0.26, 0.13), x, 0.22, z + 0.08);
    add(body, soft(GEO.sphere, col, 0.18, 0.07, 0.28), x, 0.07, z + 0.2);
  });
  // tiny T-rex arms
  const arm = new THREE.Group();
  add(arm, soft(GEO.sphere, col, 0.05, 0.11, 0.05), 0, -0.08, 0);
  add(arm, soft(GEO.sphere, col, 0.04, 0.09, 0.04), 0.03, -0.18, 0.06);
  add(body, arm, 0.26, 1.0, 0.22);
  g.userData.arm = arm;
  const armR = new THREE.Group();
  add(armR, soft(GEO.sphere, col, 0.05, 0.11, 0.05), 0, -0.08, 0);
  add(armR, soft(GEO.sphere, col, 0.04, 0.09, 0.04), -0.03, -0.18, 0.06);
  add(body, armR, -0.26, 1.0, 0.22);
  // long tapering tail
  const tail = new THREE.Group();
  add(tail, soft(GEO.sphere, col, 0.2, 0.16, 0.42), 0, 0, 0);
  add(tail, soft(GEO.sphere, col, 0.14, 0.11, 0.4), 0, -0.08, -0.38);
  add(tail, soft(GEO.sphere, col, 0.08, 0.07, 0.36), 0, -0.16, -0.72);
  add(tail, soft(GEO.sphere, col, 0.045, 0.04, 0.22), 0, -0.22, -1.0);
  spinePlate(tail, 0, 0.28, 0.05, 0.28);
  spinePlate(tail, 0, 0.22, -0.32, 0.24);
  spinePlate(tail, 0, 0.14, -0.64, 0.18);
  add(body, tail, 0, 0.86, -0.5);
  g.userData.tail = tail;
  // thick neck into a big head with a long snout and jaw
  add(body, soft(GEO.sphere, col, 0.18, 0.18, 0.22), 0, 1.18, 0.28);
  const head = new THREE.Group();
  add(body, head, 0, 1.42, 0.55);
  add(head, soft(GEO.sphere, col, 0.28, 0.26, 0.28), 0, 0.04, 0);
  // snout
  add(head, soft(GEO.sphere, col, 0.16, 0.12, 0.36), 0, -0.02, 0.38);
  add(head, soft(GEO.sphere, col, 0.11, 0.08, 0.16), 0, 0.0, 0.62);
  // nostrils
  add(head, mesh(GEO.sphereLo, NAVY, 0.02, 0.015, 0.02), 0.04, 0.04, 0.72);
  add(head, mesh(GEO.sphereLo, NAVY, 0.02, 0.015, 0.02), -0.04, 0.04, 0.72);
  const jaw = new THREE.Group();
  add(jaw, soft(GEO.sphere, col, 0.14, 0.06, 0.32), 0, 0, 0.16);
  add(jaw, mesh(GEO.box, 0xf4f7fb, 0.1, 0.02, 0.22), 0, 0.04, 0.16);
  add(head, jaw, 0, -0.16, 0.22);
  g.userData.head = head;
  // yellow lightning crest along the whole back
  spinePlate(body, 0, 1.58, 0.32, 0.32);
  spinePlate(body, 0, 1.36, 0.08, 0.36);
  spinePlate(body, 0, 1.18, -0.16, 0.32);
  spinePlate(body, 0, 1.06, -0.36, 0.26);
  addEyes(head, g, 0.0, 0.1, 0.2, 0.13, col);
  return { head, jaw };
}

function buildTri(body, col, g) {
  add(body, soft(GEO.sphere, col, 0.48, 0.32, 0.6), 0, 0.72, 0);
  [[0.22, 0.28], [-0.22, 0.28], [0.22, -0.22], [-0.22, -0.22]].forEach(([x, z]) => {
    add(body, soft(GEO.sphere, col, 0.1, 0.22, 0.1), x, 0.28, z);
    add(body, soft(GEO.sphere, col, 0.12, 0.06, 0.16), x, 0.07, z + 0.06);
  });
  const tail = new THREE.Group();
  add(tail, soft(GEO.sphere, col, 0.12, 0.1, 0.32), 0, 0, 0);
  add(body, tail, 0, 0.7, -0.55);
  g.userData.tail = tail;
  const head = new THREE.Group();
  add(body, head, 0, 0.95, 0.52);
  const frill = mesh(GEO.sphere, 0xfff3d6, 0.46, 0.4, 0.08);
  add(head, frill, 0, 0.12, -0.16);
  add(head, soft(GEO.sphere, col, 0.22, 0.18, 0.24), 0, 0, 0.08);
  add(head, mesh(GEO.cone, 0xfff3d6, 0.07, 0.28, 0.07), 0.0, 0.06, 0.32).rotation.x = Math.PI / 2;
  const hornL = mesh(GEO.cone, GOLD, 0.05, 0.2, 0.05);
  hornL.rotation.x = Math.PI / 2; hornL.rotation.z = 0.35;
  add(head, hornL, -0.14, 0.16, 0.12);
  const hornR = mesh(GEO.cone, GOLD, 0.05, 0.2, 0.05);
  hornR.rotation.x = Math.PI / 2; hornR.rotation.z = -0.35;
  add(head, hornR, 0.14, 0.16, 0.12);
  const mid = mesh(GEO.cone, GOLD, 0.055, 0.32, 0.055);
  mid.rotation.x = Math.PI / 2;
  add(head, mid, 0, 0.2, 0.18);
  g.userData.head = head;
  addEyes(head, g, 0, 0.08, 0.28, 0.1, col);
  return { head, jaw: null };
}

function buildStego(body, col, g) {
  add(body, soft(GEO.sphere, col, 0.32, 0.24, 0.7), 0, 0.62, 0);
  [[0.16, 0.32], [-0.16, 0.32], [0.16, -0.28], [-0.16, -0.28]].forEach(([x, z]) => {
    add(body, soft(GEO.sphere, col, 0.09, 0.2, 0.09), x, 0.26, z);
    add(body, soft(GEO.sphere, col, 0.11, 0.05, 0.14), x, 0.07, z + 0.05);
  });
  const tail = new THREE.Group();
  add(tail, soft(GEO.sphere, col, 0.1, 0.08, 0.4), 0, 0, 0);
  [[-0.08, -0.3], [0.08, -0.3], [-0.06, -0.4], [0.06, -0.4]].forEach(([x, z]) => {
    const sp = mesh(GEO.cone, GOLD, 0.03, 0.18, 0.03);
    sp.rotation.x = Math.PI / 2;
    add(tail, sp, x, 0.02, z);
  });
  add(body, tail, 0, 0.6, -0.62);
  g.userData.tail = tail;
  [-0.4, -0.2, 0, 0.2, 0.38].forEach((z, i) => {
    const h = 0.22 + (i === 2 || i === 1 ? 0.1 : 0);
    const p = mesh(GEO.cone, GOLD, 0.08, h, 0.04);
    add(body, p, (i % 2 ? 0.06 : -0.06), 0.78 + h * 0.15, z);
  });
  const head = new THREE.Group();
  add(body, head, 0, 0.7, 0.62);
  add(head, soft(GEO.sphere, col, 0.12, 0.1, 0.16), 0, 0, 0);
  g.userData.head = head;
  addEyes(head, g, 0, 0.04, 0.12, 0.07, col);
  return { head, jaw: null };
}

function buildAnkylo(body, col, g) {
  add(body, soft(GEO.sphere, col, 0.46, 0.22, 0.62), 0, 0.5, 0);
  [[0.2, 0.28], [-0.2, 0.28], [0.2, -0.24], [-0.2, -0.24]].forEach(([x, z]) => {
    add(body, soft(GEO.sphere, col, 0.09, 0.16, 0.09), x, 0.22, z);
    add(body, soft(GEO.sphere, col, 0.11, 0.05, 0.13), x, 0.07, z + 0.04);
  });
  [[-0.2, 0.2], [0, 0.28], [0.2, 0.2], [-0.16, 0], [0.16, 0], [0, -0.16], [0.24, -0.08]].forEach(([x, z]) => {
    add(body, mesh(GEO.sphereLo, 0xd7dce6, 0.08, 0.06, 0.08), x, 0.66, z);
  });
  const tail = new THREE.Group();
  add(tail, soft(GEO.sphere, col, 0.08, 0.07, 0.32), 0, 0, 0);
  add(tail, soft(GEO.sphere, col, 0.16, 0.12, 0.16), 0, 0, -0.34);
  add(body, tail, 0, 0.5, -0.52);
  g.userData.tail = tail;
  const head = new THREE.Group();
  add(body, head, 0, 0.58, 0.52);
  add(head, soft(GEO.sphere, col, 0.16, 0.12, 0.18), 0, 0, 0);
  add(head, mesh(GEO.sphere, 0xd7dce6, 0.08, 0.06, 0.12), 0, -0.02, 0.16);
  g.userData.head = head;
  addEyes(head, g, 0, 0.04, 0.14, 0.08, col);
  return { head, jaw: null };
}

function buildPtero(body, col, g) {
  add(body, soft(GEO.sphere, col, 0.18, 0.16, 0.28), 0, 0.85, 0);
  const wingL = soft(GEO.sphere, col, 0.7, 0.04, 0.32);
  wingL.rotation.z = 0.2;
  add(body, wingL, -0.55, 0.95, -0.05);
  const wingR = soft(GEO.sphere, 0xffd9a0, 0.7, 0.04, 0.32);
  wingR.rotation.z = -0.2;
  add(body, wingR, 0.55, 0.95, -0.05);
  add(body, soft(GEO.sphere, col, 0.06, 0.28, 0.06), 0.08, 0.4, 0.04);
  add(body, soft(GEO.sphere, col, 0.06, 0.28, 0.06), -0.08, 0.4, 0.04);
  add(body, soft(GEO.sphere, col, 0.1, 0.04, 0.14), 0.08, 0.12, 0.1);
  add(body, soft(GEO.sphere, col, 0.1, 0.04, 0.14), -0.08, 0.12, 0.1);
  const tail = new THREE.Group();
  add(tail, soft(GEO.sphere, col, 0.04, 0.04, 0.28), 0, 0, 0);
  add(body, tail, 0, 0.78, -0.32);
  g.userData.tail = tail;
  const trail = new THREE.Group();
  trail.add(bolt(0.12), bolt(0.08));
  trail.children[1].position.set(-0.1, -0.12, 0);
  add(body, trail, -0.7, 1.15, 0.05);
  trail.visible = false;
  g.userData.trail = trail;
  const head = new THREE.Group();
  add(body, head, 0, 1.05, 0.22);
  add(head, soft(GEO.sphere, col, 0.12, 0.11, 0.14), 0, 0, 0);
  const beak = soft(GEO.sphere, col, 0.06, 0.05, 0.28);
  add(head, beak, 0, -0.02, 0.26);
  const crest = soft(GEO.sphere, col, 0.04, 0.16, 0.1);
  crest.rotation.x = -0.6;
  add(head, crest, 0, 0.16, -0.06);
  g.userData.head = head;
  addEyes(head, g, 0, 0.04, 0.1, 0.07, col);
  return { head, jaw: null };
}

function buildPara(body, col, g) {
  add(body, soft(GEO.sphere, col, 0.32, 0.28, 0.42), 0, 0.92, 0);
  add(body, soft(GEO.sphere, 0xbfede8, 0.2, 0.16, 0.24, { emissiveIntensity: 0.05 }), 0, 0.78, 0.08);
  [[0.16, 0.04], [-0.16, -0.05]].forEach(([x, z]) => {
    add(body, soft(GEO.sphere, col, 0.14, 0.24, 0.14), x, 0.5, z);
    add(body, soft(GEO.sphere, col, 0.11, 0.22, 0.11), x, 0.22, z + 0.05);
    add(body, soft(GEO.sphere, col, 0.14, 0.06, 0.2), x, 0.07, z + 0.14);
  });
  const arm = new THREE.Group();
  add(arm, soft(GEO.sphere, col, 0.05, 0.12, 0.05), 0, -0.06, 0);
  add(body, arm, 0.26, 0.98, 0.2);
  g.userData.arm = arm;
  const tail = new THREE.Group();
  add(tail, soft(GEO.sphere, col, 0.14, 0.12, 0.4), 0, 0, 0);
  add(tail, soft(GEO.sphere, col, 0.08, 0.07, 0.28), 0, -0.06, -0.32);
  add(body, tail, 0, 0.86, -0.4);
  g.userData.tail = tail;
  const head = new THREE.Group();
  add(body, head, 0, 1.28, 0.36);
  add(head, soft(GEO.sphere, col, 0.16, 0.14, 0.18), 0, 0, 0);
  add(head, mesh(GEO.sphere, 0xbfede8, 0.12, 0.08, 0.2), 0, -0.02, 0.2);
  const crest = new THREE.Group();
  add(crest, mesh(GEO.sphere, 0xffd9a0, 0.07, 0.08, 0.32), 0, 0.1, -0.22);
  const hum = bolt(0.1);
  add(crest, hum, 0, 0.22, -0.36);
  add(head, crest, 0, 0.12, -0.04);
  g.userData.head = head;
  g.userData.hum = hum;
  addEyes(head, g, 0, 0.04, 0.14, 0.08, col);
  return { head, jaw: null };
}

function buildBuddy(id) {
  const def = CREW[id] || CREW.zapsaurus;
  const g = new THREE.Group();
  const kind = def.kind;
  const col = def.color;
  const body = new THREE.Group();
  g.add(body);
  g.userData.body = body;
  const sh = mesh(GEO.sphere, 0x0b1530, 0.7, 0.08, 0.45, { transparent: true, opacity: 0.22 });
  add(g, sh, 0, 0.04, 0);
  let parts;
  if (kind === 'rex') parts = buildRex(body, col, g);
  else if (kind === 'tri') parts = buildTri(body, col, g);
  else if (kind === 'stego') parts = buildStego(body, col, g);
  else if (kind === 'ankylo') parts = buildAnkylo(body, col, g);
  else if (kind === 'ptero') parts = buildPtero(body, col, g);
  else parts = buildPara(body, col, g);
  return finishBuddy(g, body, id || 'zapsaurus', kind, col, parts && parts.head, parts && parts.jaw);
}

function buildStall(stall) {
  const g = new THREE.Group();
  const outline = stall.fits ? BLUE : NAVY;
  const pad = mesh(GEO.box, PAD, 0.9, 0.06, 1.15);
  add(g, pad, 0, 0.03, 0);
  if (stall.fits) {
    const ring = mesh(GEO.box, BLUE, 0.98, 0.03, 1.23, { emissive: BLUE, emissiveIntensity: 0.25 });
    add(g, ring, 0, 0.01, 0);
  }
  const post = mesh(GEO.box, GRAY, 0.22, 0.55, 0.16);
  post.material = hexMat(GRAY);
  // darker edge via navy thin box behind
  const edge = mesh(GEO.box, outline, 0.26, 0.58, 0.2);
  add(g, edge, 0, 0.38, -0.35);
  add(g, post, 0, 0.38, -0.35);
  const label = textTexture((ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0B1530';
    ctx.font = 'bold 28px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(stall.plugLabel || '', w / 2, 36);
    ctx.font = '16px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#5A6680';
    ctx.fillText('Live status coming soon', w / 2, 58);
  }, 256, 80);
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.28), new THREE.MeshBasicMaterial({ map: label, transparent: true }));
  add(g, plane, 0, 0.18, 0.55);
  plane.rotation.x = -0.45;
  return g;
}

function buildWalletCard() {
  const g = new THREE.Group();
  const tex = textTexture((ctx, w, h) => {
    ctx.fillStyle = '#1E4FD8';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#0B1530';
    ctx.lineWidth = 14;
    ctx.strokeRect(7, 7, w - 14, h - 14);
    // gold path mark (no logo)
    ctx.strokeStyle = '#FFD23F';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(70, 250);
    ctx.lineTo(130, 70);
    ctx.lineTo(190, 250);
    ctx.stroke();
    ctx.fillStyle = '#FFD23F';
    ctx.font = 'bold 28px Inter, system-ui, sans-serif';
    ctx.fillText('SAMPLE', 360, 64);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Inter, system-ui, sans-serif';
    ctx.fillText('Kilolane', 220, 140);
    ctx.fillStyle = '#DDE5F2';
    ctx.font = '22px Inter, system-ui, sans-serif';
    ctx.fillText('Every charge. One lane.', 220, 178);
    ctx.fillStyle = '#FFD23F';
    ctx.font = 'bold 32px Inter, system-ui, sans-serif';
    ctx.fillText('Coming soon', 220, 240);
  }, 512, 320);
  const front = new THREE.Mesh(GEO.box, new THREE.MeshLambertMaterial({ map: tex }));
  front.scale.set(2.2, 1.38, 0.06);
  g.add(front);
  const backTex = textTexture((ctx, w, h) => {
    ctx.fillStyle = '#1E4FD8';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#FFD23F';
    ctx.font = 'bold 36px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Coming soon', w / 2, h / 2);
    ctx.font = 'bold 22px Inter, system-ui, sans-serif';
    ctx.fillText('SAMPLE', w / 2, h / 2 + 40);
  }, 512, 320);
  const back = new THREE.Mesh(GEO.box, new THREE.MeshLambertMaterial({ map: backTex }));
  back.scale.set(2.2, 1.38, 0.02);
  back.position.z = -0.04;
  back.rotation.y = Math.PI;
  g.add(back);
  const edge = mesh(GEO.box, NAVY, 2.24, 1.42, 0.05);
  add(g, edge, 0, 0, -0.01);
  // Zapsaurus peek (matching Hans), no payment fields
  const peek = buildBuddy('zapsaurus');
  peek.scale.set(0.22, 0.22, 0.22);
  add(g, peek, 0.7, 0.82, 0);
  peek.userData.peek = true;
  g.userData.peek = peek;
  return g;
}

/* ---------- interaction + loop ---------- */
function attachSpin(canvas, state, opts) {
  const inertia = opts.inertia !== false;
  let pid = null, lastX = 0, lastT = 0, moved = 0, downAt = 0;
  const down = (x, t, id) => {
    pid = id;
    lastX = x;
    lastT = t;
    moved = 0;
    downAt = t;
    state.dragging = true;
    state.vel = 0;
    state.idleAt = t;
  };
  const move = (x, t) => {
    if (pid == null) return;
    const dx = x - lastX;
    const dt = Math.max(0.008, (t - lastT) / 1000);
    lastX = x;
    lastT = t;
    moved += Math.abs(dx);
    const dyaw = dx * 0.012;
    state.yaw += dyaw;
    state.vel = dyaw / dt;
    state.idleAt = t;
    if (opts.onDrag) opts.onDrag(state, dx);
  };
  const up = (t, ev) => {
    if (pid == null) return;
    const wasTap = moved < 8;
    const held = t - downAt;
    state.dragging = false;
    pid = null;
    if (rm()) state.vel = 0;
    else if (!inertia) state.vel = 0;
    state.idleAt = t;
    if (wasTap && held >= 350 && opts.onLong) opts.onLong(state, ev);
    else if (wasTap && opts.onTap) opts.onTap(state, ev);
  };
  canvas.addEventListener('pointerdown', (e) => {
    if (rm() && !opts.allowRmRotate) return;
    canvas.setPointerCapture?.(e.pointerId);
    down(e.clientX, performance.now(), e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => move(e.clientX, performance.now()));
  const end = (e) => up(performance.now(), e);
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('contextmenu', (e) => { e.preventDefault(); if (opts.onLong) opts.onLong(state, e); });
}

function kick() {
  if (!raf) {
    lastT = performance.now();
    raf = requestAnimationFrame(tick);
  }
}
function tick(now) {
  raf = requestAnimationFrame(tick);
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  const hidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
  let any = false;
  for (let i = mounts.length - 1; i >= 0; i--) {
    const m = mounts[i];
    if (!m.canvas.isConnected) { disposeMount(m); mounts.splice(i, 1); continue; }
    if (hidden || !m.visible || !m.active) continue;
    any = true;
    try { m.update(dt, now); m.renderer.render(m.scene, m.camera); } catch (e) { m.active = false; }
  }
  if (!any) {
    cancelAnimationFrame(raf);
    raf = 0;
  }
}

function disposeMount(m) {
  m.active = false;
  m.io?.disconnect();
  m.ro?.disconnect();
  try { m.renderer.dispose(); } catch (e) {}
  if (m.canvas && m.canvas.parentNode) m.canvas.parentNode.removeChild(m.canvas);
  if (m.host) m.host.classList.remove('c1gl-on');
}

function prepareHost(el, height) {
  injectCss();
  let host = el.closest('.c1gl-host');
  if (!host) {
    host = document.createElement('div');
    host.className = 'c1gl-host';
    el.parentNode.insertBefore(host, el);
    el.classList.add('c1-2d-src');
    host.appendChild(el);
  }
  host.style.height = (height || Math.max(el.offsetHeight, 120)) + 'px';
  host.querySelectorAll('canvas.c1gl').forEach((c) => c.remove());
  const canvas = document.createElement('canvas');
  canvas.className = 'c1gl';
  canvas.setAttribute('data-c1-three', '1');
  canvas.setAttribute('aria-hidden', 'true');
  host.appendChild(canvas);
  return { host, canvas };
}

function ensureRmNote(host) {
  let n = host.querySelector('.c1gl-rmnote');
  if (!rm()) { if (n) n.remove(); return; }
  if (!n) {
    n = document.createElement('div');
    n.className = 'c1gl-rmnote';
    n.textContent = 'Motion is off (Reduce Motion)';
    host.appendChild(n);
  }
}

function resizeMount(m) {
  const w = m.host.clientWidth || 0;
  const h = m.host.clientHeight || 0;
  if (w < 2 || h < 2) return false;
  m.renderer.setSize(w, h, false);
  if (m.camera.isPerspectiveCamera) {
    m.camera.aspect = w / h;
    m.camera.updateProjectionMatrix();
  }
  m.visible = true;
  try { m.update(0, performance.now()); m.renderer.render(m.scene, m.camera); } catch (e) {}
  return true;
}

function revealMounts() {
  mounts.forEach((m) => {
    if (!m.canvas.isConnected) return;
    ensureRmNote(m.host);
    resizeMount(m);
  });
  kick();
}

function observe(m) {
  // A host inside a display:none tab starts at 0×0. iPhone Safari often
  // does not fire IntersectionObserver when the tab later becomes flex, so
  // we also resize/kick from ResizeObserver and from go()/tab hooks.
  m.visible = true;
  m.io = new IntersectionObserver((entries) => {
    const on = entries.some((e) => e.isIntersecting && e.intersectionRatio > 0);
    if (on) {
      m.visible = true;
      resizeMount(m);
      kick();
    } else if (m.host.clientWidth < 2 || m.host.clientHeight < 2) {
      m.visible = false;
    } else {
      m.visible = entries.some((e) => e.isIntersecting);
      if (m.visible) kick();
    }
  }, { threshold: [0, 0.01, 0.05] });
  m.io.observe(m.host);
  m.ro = new ResizeObserver(() => {
    if (resizeMount(m)) kick();
  });
  m.ro.observe(m.host);
  ensureRmNote(m.host);
}

function startMount(kind, el, height, setup) {
  if (!el || !webglAvailable()) return null;
  const prev = mounts.find((x) => x.el === el);
  if (prev) { disposeMount(prev); const i = mounts.indexOf(prev); if (i >= 0) mounts.splice(i, 1); }
  const { host, canvas } = prepareHost(el, height);
  const w = host.clientWidth || 280;
  const h = host.clientHeight || height || 140;
  let renderer;
  try { renderer = makeRenderer(canvas, w, h); }
  catch (e) { canvas.remove(); return null; }
  const scene = litScene();
  const camera = new THREE.PerspectiveCamera(36, w / Math.max(h, 1), 0.1, 40);
  camera.position.set(2.4, 1.6, 3.2);
  camera.lookAt(0, 0.6, 0);
  const still = rm();
  const state = { yaw: still ? 0 : 0.45, vel: 0, dragging: false, idleAt: performance.now(), wraps: 0, lastYaw: 0 };
  const m = { kind, el, host, canvas, renderer, scene, camera, state, still, visible: true, active: true, update: () => {} };
  setup(m);
  host.classList.add('c1gl-on');
  observe(m);
  mounts.push(m);
  kick();
  return m;
}

function spinUpdate(m, target, dt, now) {
  const s = m.state;
  if (m.still) {
    s.vel = 0;
    target.rotation.y = 0;
    return;
  }
  if (!s.dragging && s.vel) {
    s.yaw += s.vel * dt;
    s.vel *= Math.exp(-2.8 * dt);
    if (Math.abs(s.vel) < 0.05) s.vel = 0;
  }
  target.rotation.y = s.yaw;
  // count wraps for Easter eggs
  const turns = Math.floor(Math.abs(s.yaw) / (Math.PI * 2));
  if (turns > s.wraps) {
    const added = turns - s.wraps;
    s.wraps = turns;
    if (m.onWrap) m.onWrap(added, s.wraps);
  }
}

/* ---------- mounts ---------- */
function mountCar(el, opts) {
  return startMount('car', el, opts.height || 150, (m) => {
    const car = buildCar(opts.body || 'sedan', opts.paint || '#E8453C');
    m.scene.add(car);
    m.camera.position.set(2.6, 1.35, 2.7);
    m.camera.lookAt(0, 0.45, 0);
    const fx = new THREE.Group();
    m.scene.add(fx);
    const trail = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const b = bolt(0.22);
      b.position.set(-1.1 - i * 0.28, 0.55, 0.15 * ((i % 2) ? 1 : -1));
      trail.add(b);
    }
    trail.visible = false;
    fx.add(trail);
    const sparks = new THREE.Group();
    sparks.add(bolt(0.18), bolt(0.14));
    sparks.children[1].position.set(0.1, -0.1, 0);
    sparks.position.set(1.0, 0.55, 0.3);
    sparks.visible = false;
    fx.add(sparks);
    const pop = buildBuddy('zapsaurus');
    pop.scale.set(0.28, 0.28, 0.28);
    pop.position.set(-0.7, 0.85, 0);
    pop.visible = false;
    const zap = bolt(0.2);
    zap.position.set(-0.45, 1.15, 0.2);
    fx.add(pop, zap);
    zap.visible = false;
    m.state.taps = 0;
    m.state.blinkUntil = 0;
    m.state.wheel = 0;
    m.state.t0 = performance.now();
    attachSpin(m.canvas, m.state, {
      inertia: true,
      onTap: () => {
        if (m.still) return;
        m.state.taps += 1;
        m.state.blinkUntil = performance.now() + 280;
        if (m.state.taps % 3 === 0) {
          pop.visible = true; zap.visible = true;
          setTimeout(() => { pop.visible = false; zap.visible = false; }, 1400);
        }
      },
      onLong: () => {
        if (m.still) return;
        sparks.visible = true;
        m.userHeadlights = true;
        setTimeout(() => { sparks.visible = false; m.userHeadlights = false; }, 900);
      },
      onDrag: () => {},
    });
    m.onWrap = (_added, wraps) => {
      if (!m.still && wraps >= 3) trail.visible = true;
    };
    m.update = (dt, now) => {
      spinUpdate(m, car, dt, now);
      const port = car.userData.port;
      if (port && !m.still) {
        const pulse = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(now / 500));
        port.material.emissiveIntensity = pulse;
      } else if (port) {
        port.material.emissiveIntensity = 0.7;
      }
      const blinkOn = !m.still && (m.userHeadlights || now < (m.state.blinkUntil || 0));
      if (car.userData.headlights) {
        car.userData.headlights.forEach((h) => {
          h.material.color.set(blinkOn ? 0xfff3b0 : 0xf4f7fb);
        });
      }
      if (m.still) {
        car.position.x = 0;
        car.position.y = 0;
        car.rotation.z = 0;
      } else {
        const age = now - (m.state.t0 || now);
        const u = Math.min(1, age / 700);
        car.position.x = u >= 1 ? 0 : 2.2 * (1 - Math.pow(1 - u, 3));
        car.position.y = 0.03 * Math.sin(now / 550);
        car.rotation.z = 0.025 * Math.sin(now / 650);
        const driving = age < 700;
        const speed = (driving ? 7 : 0) + (m.state.vel || 0) * 1.4;
        m.state.wheel = (m.state.wheel || 0) + speed * dt;
        (car.userData.wheels || []).forEach((w) => { w.rotation.z = m.state.wheel; });
      }
    };
  });
}

function mountCharger(el, opts) {
  return startMount('charger', el, opts.height || 180, (m) => {
    const ch = buildCharger(opts.plugs || []);
    m.scene.add(ch);
    m.camera.position.set(2.1, 1.8, 3.4);
    m.camera.lookAt(0, 1.0, 0);
    // fit lamps
    const user = opts.userPlug;
    (ch.userData.lamps || []).forEach((lamp) => {
      const t = lamp.userData.slot.type;
      const fits = user && (
        (user === 'CCS1' || user === 'CCS') ? t === 'CCS' :
        user === 'NACS' ? t === 'NACS' :
        user === 'CHAdeMO' ? t === 'CHAdeMO' :
        t === 'J1772'
      );
      lamp.material.color.set(fits ? BLUE : GRAY);
      if (fits) { lamp.material.emissive = new THREE.Color(BLUE); lamp.material.emissiveIntensity = 0.4; }
    });
    const peek = new THREE.Group();
    peek.visible = false;
    peek.position.set(-0.55, 1.3, -0.2);
    m.scene.add(peek);
    const waveBuddy = buildBuddy('zapsaurus');
    waveBuddy.scale.set(0.28, 0.28, 0.28);
    waveBuddy.position.set(0.55, 0.7, -0.35);
    waveBuddy.visible = false;
    m.scene.add(waveBuddy);
    const stars = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const s = mesh(GEO.sphereLo, GOLD, 0.04, 0.04, 0.04, { emissive: GOLD, emissiveIntensity: 0.8 });
      s.position.set(-0.5 + i * 0.5, 2.45 + (i % 2) * 0.12, 0.2);
      stars.add(s);
    }
    stars.visible = isNight();
    m.scene.add(stars);
    m.state.taps = 0;
    m.state.auto = !m.still;
    attachSpin(m.canvas, m.state, {
      inertia: true,
      onTap: () => {
        if (m.still) return;
        m.state.taps += 1;
        if (m.state.taps % 5 === 0) {
          peek.clear();
          const ids = Object.keys(CREW);
          const buddy = buildBuddy(ids[Math.floor(Math.random() * ids.length)]);
          buddy.scale.set(0.32, 0.32, 0.32);
          peek.add(buddy);
          peek.visible = true;
          setTimeout(() => { peek.visible = false; }, 1600);
        }
      },
    });
    m.onWrap = () => {
      if (m.still) return;
      waveBuddy.visible = true;
      setTimeout(() => { waveBuddy.visible = false; }, 1400);
    };
    const t0 = performance.now();
    m.update = (dt, now) => {
      if (m.state.auto && !m.state.dragging && !m.still && !m.state.vel) {
        m.state.yaw = ((now - t0) / 6000) * Math.PI * 2;
      }
      spinUpdate(m, ch, dt, now);
      if (stars.visible && !m.still) {
        stars.children.forEach((s, i) => {
          s.position.y = 2.45 + 0.08 * Math.sin(now / 400 + i);
          s.material.emissiveIntensity = 0.5 + 0.5 * (0.5 + 0.5 * Math.sin(now / 300 + i));
        });
      }
      if (waveBuddy.visible && !m.still) {
        waveBuddy.rotation.z = Math.sin(now / 150) * 0.25;
      }
    };
  });
}


function triggerRoar(m, buddy) {
  if (!buddy || m.still) return;
  const now = performance.now();
  if (m.state.roarUntil && now < m.state.roarUntil) return;
  m.state.roarUntil = now + ROAR_MS;
  m.state.hopT = 1;
  m.state.idleAt = now;
  setBuddyFace(buddy, 'happy');
  if (buddy.userData.hopSpark) buddy.userData.hopSpark.visible = true;
  if (buddy.userData.faceSpark) buddy.userData.faceSpark.visible = true;
  if (buddy.userData.jaw) buddy.userData.jaw.rotation.x = 0.55;
  setTimeout(() => {
    if (buddy.userData.hopSpark) buddy.userData.hopSpark.visible = false;
    if (buddy.userData.faceSpark) buddy.userData.faceSpark.visible = false;
    if (buddy.userData.jaw) buddy.userData.jaw.rotation.x = 0;
  }, ROAR_MS);
}

function bindBuddyPlay(m, buddy) {
  let lastTap = 0;
  const canvas = m.canvas;
  canvas.addEventListener('pointerdown', () => {
    if (m.still) return;
    const t = performance.now();
    if (isDoubleTap(lastTap, t)) triggerRoar(m, buddy);
    lastTap = t;
  });
  const onMotion = (ev) => {
    if (m.still) return;
    const a = ev.accelerationIncludingGravity || ev.acceleration;
    if (!a) return;
    if (shouldRoarShake(accelMag(a.x || 0, a.y || 0, a.z || 0))) triggerRoar(m, buddy);
  };
  try { window.addEventListener('devicemotion', onMotion, { passive: true }); } catch (e) {}
  m._roarMotion = onMotion;
}

function mountBuddy(el, opts) {
  return startMount('buddy', el, opts.height || 140, (m) => {
    const buddy = buildBuddy(opts.id || 'zapsaurus');
    m.scene.add(buddy);
    m.camera.position.set(3.35, 1.15, 1.85);
    m.camera.lookAt(0.05, 0.82, 0.05);
    m.camera.fov = 32;
    m.camera.updateProjectionMatrix();
    if (m.host) {
      m.host.style.width = '168px';
      m.host.style.maxWidth = '54%';
      m.host.style.minHeight = (opts.height || 168) + 'px';
    }
    m.state.waveT = 0;
    m.state.hopT = 0;
    m.state.yaw = 0.18;
    m.state.auto = !m.still;
    const t0 = performance.now();
    bindBuddyPlay(m, buddy);
    attachSpin(m.canvas, m.state, {
      inertia: true,
      onTap: () => {
        if (m.still) return;
        m.state.hopT = 1;
        m.state.idleAt = performance.now();
        setBuddyFace(buddy, 'happy');
        if (buddy.userData.hopSpark) buddy.userData.hopSpark.visible = true;
        setTimeout(() => { if (buddy.userData.hopSpark) buddy.userData.hopSpark.visible = false; }, 450);
      },
    });
    m.update = (dt, now) => {
      if (m.state.auto && !m.state.dragging && !m.still && !m.state.vel) {
        m.state.yaw = 0.18 + 0.16 * Math.sin((now - t0) / 2500);
      }
      spinUpdate(m, buddy, dt, now);
      if (m.still) {
        setBuddyFace(buddy, 'happy');
        buddy.position.y = 0;
        m.state.yaw = 0.18;
        buddy.rotation.y = 0.18;
        if (buddy.userData.body) {
          buddy.userData.body.rotation.z = 0;
          buddy.userData.body.rotation.x = 0;
          buddy.userData.body.scale.set(1, 1, 1);
        }
        if (buddy.userData.tail) buddy.userData.tail.rotation.z = 0;
        if (buddy.userData.head) buddy.userData.head.rotation.y = 0;
        if (buddy.userData.arm) buddy.userData.arm.rotation.z = 0;
        if (buddy.userData.jaw) buddy.userData.jaw.rotation.x = 0;
        if (buddy.userData.trail) buddy.userData.trail.visible = false;
        if (buddy.userData.hum) buddy.userData.hum.visible = true;
        return;
      }
      // idle breath + head sway
      const body = buddy.userData.body;
      const p = Math.sin(now / 700);
      if (body) {
        body.scale.set(1 - 0.015 * p, 1 + 0.03 * p, 1);
        body.rotation.x = Math.sin(now / 900) * 0.06;
      }
      if (buddy.userData.head) buddy.userData.head.rotation.y = Math.sin(now / 1100) * 0.18;
      if (buddy.userData.tail) {
        buddy.userData.tail.rotation.y = Math.sin(now / 450) * 0.28;
      }
      // wave periodically with the small arm, not the whole body
      const wavePhase = ((now / 1000) % 7);
      const waving = wavePhase < 0.9 && buddy.userData.face !== 'sleepy';
      if (buddy.userData.arm) {
        buddy.userData.arm.rotation.z = waving ? Math.sin(now / 90) * 0.9 : 0;
      }
      // hop
      if (m.state.hopT > 0) {
        m.state.hopT = Math.max(0, m.state.hopT - dt * 3.2);
        buddy.position.y = Math.sin((1 - m.state.hopT) * Math.PI) * 0.22 * m.state.hopT * 2;
      } else buddy.position.y = 0;
      // sleepy after idle; blink while awake
      if (now - m.state.idleAt > IDLE_MS) setBuddyFace(buddy, 'sleepy');
      else {
        const blink = ((now % 3200) + 3200) % 3200 < 140;
        setBuddyFace(buddy, blink ? 'blink' : 'happy');
      }
      if (buddy.userData.trail) buddy.userData.trail.visible = true;
      if (buddy.userData.hum) {
        buddy.userData.hum.rotation.z = Math.sin(now / 180) * 0.4;
      }
    };
  });
}

function mountLot(el, row) {
  if (!row || !row.listed || !row.stalls || !row.stalls.length) return null;
  return startMount('lot', el, 130, (m) => {
    const root = new THREE.Group();
    m.scene.add(root);
    const n = row.stalls.length;
    row.stalls.forEach((st, i) => {
      const s = buildStall(st);
      const span = 1.15;
      s.position.set((i - (n - 1) / 2) * span, 0, 0);
      root.add(s);
    });
    const width = Math.max(3.2, n * 1.15 + 1);
    m.camera.position.set(0.4, 2.2, 4.2);
    m.camera.lookAt(0, 0.2, 0);
    m.camera.fov = 32;
    m.camera.updateProjectionMatrix();
    // empty group at origin; we rotate the row slightly
    attachSpin(m.canvas, m.state, { inertia: true });
    m.state.yaw = 0.15;
    m.update = (dt, now) => {
      spinUpdate(m, root, dt, now);
      // clamp lot yaw so stalls stay readable
      root.rotation.y = Math.max(-0.5, Math.min(0.5, m.state.yaw));
    };
    if (row.hidden > 0 && !el.parentNode.querySelector('.c1lot-more-gl')) {
      const more = document.createElement('div');
      more.className = 'c1lot-more c1lot-more-gl';
      more.style.cssText = 'color:#3B7BFF;font-weight:800;padding:0 8px';
      more.textContent = '+' + row.hidden + ' more';
      el.parentNode.appendChild(more);
    }
  });
}

function mountWallet(el) {
  return startMount('wallet', el, 180, (m) => {
    const card = buildWalletCard();
    m.scene.add(card);
    m.camera.position.set(0, 0.2, 4.0);
    m.camera.lookAt(0, 0, 0);
    m.state.yaw = 0.35;
    attachSpin(m.canvas, m.state, { inertia: true });
    const peek = card.userData.peek;
    m.update = (dt, now) => {
      spinUpdate(m, card, dt, now);
      if (peek && !m.still) {
        peek.position.y = 0.82 + 0.03 * Math.sin(now / 500);
      }
    };
  });
}

function userPlug() {
  try {
    if (typeof window.buddyPlug === 'function') {
      const p = window.buddyPlug();
      if (p) return p === 'CCS' ? 'CCS1' : p;
    }
    if (typeof window.carPlug === 'function') {
      const p = window.carPlug();
      if (p) return p === 'CCS' ? 'CCS1' : p;
    }
  } catch (e) {}
  return null;
}
function loadPaintBody() {
  try {
    if (typeof window.loadSet === 'function') {
      const s = window.loadSet();
      return { paint: s.paint || '#E8453C', body: s.body || 'sedan', avatar: s.profileAvatar || 'dino', buddyId: (window.loadProf && window.loadProf().buddyId) || 'zapsaurus' };
    }
  } catch (e) {}
  return { paint: '#E8453C', body: 'sedan', avatar: 'dino', buddyId: 'zapsaurus' };
}



function setChargerLights(chg, on) {
  const cap = chg && chg.userData.cap;
  const glow = chg && chg.userData.glow;
  if (cap) {
    cap.material.color.setHex(on ? BLUE : 0x5a6680);
    cap.material.emissive.setHex(on ? BLUE : 0x000000);
    cap.material.emissiveIntensity = on ? 0.45 : 0;
  }
  if (glow) {
    glow.material.color.setHex(on ? BLUE : 0xc9d1de);
    glow.material.emissive.setHex(on ? BLUE : 0x000000);
    glow.material.emissiveIntensity = on ? 0.4 : 0;
    glow.visible = true;
  }
}

function buildSagCable(from, to, sag) {
  const pts = [];
  for (let i = 0; i <= 12; i++) {
    const p = sagPoint(from, to, i / 12, sag);
    pts.push(new THREE.Vector3(p.x, p.y, p.z));
  }
  const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.032, 6, false);
  return new THREE.Mesh(geo, hexMat(NAVY));
}

function canvasHit(m, cx, cy, yPlane) {
  const rect = m.canvas.getBoundingClientRect();
  const nx = ((cx - rect.left) / Math.max(1, rect.width)) * 2 - 1;
  const ny = -(((cy - rect.top) / Math.max(1, rect.height)) * 2 - 1);
  const v = new THREE.Vector3(nx, ny, 0.5).unproject(m.camera);
  const dir = v.sub(m.camera.position).normalize();
  const planeY = yPlane == null ? 0.55 : yPlane;
  if (Math.abs(dir.y) < 0.02) return new THREE.Vector3(nx * 2, planeY, 0);
  const t = (planeY - m.camera.position.y) / dir.y;
  return m.camera.position.clone().add(dir.multiplyScalar(t));
}

function mountChargeScene(el, opts) {
  if (!el) return null;
  return startMount('charge', el, opts.height || 200, (m) => {
    const root = new THREE.Group();
    m.scene.add(root);
    const chg = buildCharger(opts.plugs || []);
    chg.scale.set(0.72, 0.72, 0.72);
    chg.position.set(-1.35, 0, 0);
    root.add(chg);
    const car = buildCar(opts.body, opts.paint);
    car.position.set(1.15, 0, 0.05);
    car.rotation.y = -Math.PI / 2;
    root.add(car);
    const hang = { x: -0.55, y: 0.62, z: 0.15 };
    const plug = mesh(GEO.box, 0x5a6680, 0.12, 0.2, 0.1);
    add(root, plug, hang.x, hang.y, hang.z);
    const outlet = { x: -0.95, y: 0.78, z: 0.12 };
    let cable = buildSagCable(outlet, hang, 0.28);
    root.add(cable);
    const trailGrp = new THREE.Group();
    root.add(trailGrp);
    const zapBolt = bolt(0.28);
    zapBolt.visible = false;
    root.add(zapBolt);

    m.state.lightsOn = true;
    m.state.plugged = false;
    m.state.zoom = 1;
    m.state.trails = [];
    m.state.plug = { ...hang };
    setChargerLights(chg, true);
    const baseCam = m.camera.position.clone();
    const pad = mesh(GEO.cyl, 0x12203c, 2.6, 0.04, 1.5, { transparent: true, opacity: 0.7 });
    add(root, pad, 0, 0.02, 0);
    m.camera.position.set(0.55, 1.25, 5.8);
    m.camera.lookAt(-0.05, 0.7, 0);
    m.camera.fov = 30;
    m.camera.updateProjectionMatrix();
    baseCam.copy(m.camera.position);

    const portWorld = () => {
      const v = new THREE.Vector3();
      if (car.userData.port) car.userData.port.getWorldPosition(v);
      else v.set(0.55, 0.55, 0.15);
      return v;
    };

    function refreshCable() {
      const dest = m.state.plugged ? portWorld() : m.state.plug;
      root.remove(cable);
      try { cable.geometry.dispose(); } catch (e) {}
      cable = buildSagCable(outlet, dest, m.state.plugged ? 0.22 : 0.28);
      root.add(cable);
      plug.position.set(dest.x, dest.y, dest.z);
      if (car.userData.port) {
        car.userData.port.material.emissiveIntensity = m.state.plugged ? 1.1 : 0.7;
      }
    }

    const btn = opts.lightsBtn;
    if (btn) {
      btn.setAttribute('aria-pressed', 'true');
      btn.textContent = 'Charger lights on';
      btn.onclick = () => {
        m.state.lightsOn = !m.state.lightsOn;
        setChargerLights(chg, m.state.lightsOn);
        btn.setAttribute('aria-pressed', m.state.lightsOn ? 'true' : 'false');
        btn.textContent = m.state.lightsOn ? 'Charger lights on' : 'Charger lights off';
      };
    }

    const ptrs = new Map();
    let dragging = false;
    let drawing = false;
    let pinch0 = 0;
    let pinchZoom = 1;
    const onDown = (e) => {
      if (m.still) return;
      m.canvas.setPointerCapture?.(e.pointerId);
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 2) {
        const arr = [...ptrs.values()];
        pinch0 = Math.hypot(arr[0].x - arr[1].x, arr[0].y - arr[1].y);
        pinchZoom = m.state.zoom;
        dragging = drawing = false;
        return;
      }
      const hit = canvasHit(m, e.clientX, e.clientY, 0.6);
      const dest = m.state.plugged ? portWorld() : m.state.plug;
      if (!m.state.plugged && dist3(hit, dest) < 0.45) dragging = true;
      else drawing = true;
    };
    const onMove = (e) => {
      if (m.still) return;
      if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 2) {
        const arr = [...ptrs.values()];
        const dist = Math.hypot(arr[0].x - arr[1].x, arr[0].y - arr[1].y);
        m.state.zoom = pinchScale(pinch0, dist, pinchZoom);
        const z = m.state.zoom;
        m.camera.position.copy(baseCam).multiplyScalar(1 / z);
        return;
      }
      if (dragging) {
        const hit = canvasHit(m, e.clientX, e.clientY, 0.6);
        m.state.plug = { x: hit.x, y: Math.max(0.2, Math.min(1.2, hit.y)), z: hit.z };
        refreshCable();
        return;
      }
      if (drawing) {
        const hit = canvasHit(m, e.clientX, e.clientY, 0.9);
        m.state.trails.push({ x: hit.x, y: hit.y, z: hit.z, t: performance.now() });
      }
    };
    const onUp = (e) => {
      ptrs.delete(e.pointerId);
      if (dragging) {
        const port = portWorld();
        if (plugInRange(m.state.plug, port, 0.42)) {
          m.state.plugged = true;
          m.state.plug = snapPlugToPort(port);
          zapBolt.position.set(port.x, port.y + 0.2, port.z);
          zapBolt.visible = true;
          setTimeout(() => { zapBolt.visible = false; }, 450);
        } else {
          m.state.plug = { ...hang };
        }
        refreshCable();
      }
      dragging = false;
      drawing = false;
    };
    m.canvas.addEventListener('pointerdown', onDown);
    m.canvas.addEventListener('pointermove', onMove);
    m.canvas.addEventListener('pointerup', onUp);
    m.canvas.addEventListener('pointercancel', onUp);

    m.update = (dt, now) => {
      if (car.userData.port && !m.still) {
        const pulse = 0.55 + 0.35 * Math.sin(now / 400);
        car.userData.port.material.emissiveIntensity = m.state.plugged ? 1.15 : pulse;
      }
      if (car.userData.wheels && !m.still && !m.state.plugged) {
        car.userData.wheels.forEach((w) => { w.rotation.z += dt * 0.4; });
      }
      // refresh trail meshes lightly
      const live = trailTick(m.state.trails, now);
      m.state.trails = live;
      while (trailGrp.children.length > live.length) {
        const c = trailGrp.children[trailGrp.children.length - 1];
        trailGrp.remove(c);
      }
      live.forEach((p, i) => {
        let b = trailGrp.children[i];
        if (!b) {
          b = bolt(0.12);
          trailGrp.add(b);
        }
        b.position.set(p.x, p.y, p.z);
        b.visible = !m.still;
      });
      if (m.still) {
        trailGrp.visible = false;
        zapBolt.visible = false;
      } else trailGrp.visible = true;
    };
    refreshCable();
  });
}

function ensureSheetDock(root) {
  // cardInto() moves any #sheet sibling that is not .c1h / .c1more
  // into hidden .c1more. Keep the dock inside the visible header.
  const head = root.querySelector(':scope > .c1h');
  if (!head) return null;
  const dockId = root.id === 's-station' ? 'c1-3d-dock-station' : 'c1-3d-dock';
  let dock = root.querySelector('#' + dockId);
  if (dock && (dock.closest('.c1more') || !head.contains(dock))) {
    dock.remove();
    dock = null;
  }
  if (dock && dock.isConnected) return dock;
  dock = document.createElement('div');
  dock.id = dockId;
  dock.className = 'c1-3d-dock notr';
  dock.innerHTML = '<div class="c1-3d-charge" style="height:168px;min-height:168px;max-height:168px;margin:6px 0 4px"></div>'
    + '<div class="c1-3d-play"><button type="button" class="chip c1-lights-btn" aria-pressed="true">Charger lights on</button></div>'
    + '<div class="c1-3d-lot" style="min-height:100px;margin:4px 0 0"></div>'
    + '<div class="c1-3d-lot-cap muted" style="font-size:11px;text-align:center;margin:0 0 4px">Live status coming soon</div>';
  const btns = head.querySelector('.c1btns');
  if (btns) head.insertBefore(dock, btns);
  else head.appendChild(dock);
  return dock;
}

function fillStationDock(root, set, s) {
  if (!root || root.hidden) return;
  const dock = ensureSheetDock(root);
  if (!dock) return;
  const cap = dock.querySelector('.c1-3d-lot-cap');
  mountChargeScene(dock.querySelector('.c1-3d-charge'), {
    plugs: (s && s.plugs) || [],
    userPlug: userPlug(),
    body: set.body,
    paint: set.paint,
    height: 168,
    lightsBtn: dock.querySelector('.c1-lights-btn'),
  });
  const lotHost = dock.querySelector('.c1-3d-lot');
  if (lotHost && s && typeof window.buildLotRow === 'function') {
    const row = window.buildLotRow({ dcPorts: s.dcPorts, l2Ports: s.l2Ports, portsListed: s.portsListed, plugs: s.plugs, userPlug: userPlug() });
    if (!row.listed) {
      lotHost.innerHTML = '<div class="c1lot-missing muted">Charger count not listed</div>';
      if (cap) cap.hidden = true;
    } else {
      if (cap) cap.hidden = false;
      mountLot(lotHost, row);
    }
  }
}

export function remountAll() {
  if (!webglAvailable()) {
    window.c1Three = Object.assign(window.c1Three || {}, { webgl: false, version: THREE_VERSION, ready: true, mounts: 0 });
    return;
  }
  const set = loadPaintBody();
  // Profile hero
  const hero = document.querySelector('#c1profile .c1avatar-wrap');
  if (hero) {
    if (set.avatar === 'car') mountCar(hero, { body: set.body, paint: set.paint, height: 140 });
    else mountBuddy(hero, { id: set.buddyId, height: 168 });
  }
  // Edit preview
  const prev = document.getElementById('c1av-preview');
  if (prev) {
    if (set.avatar === 'car') mountCar(prev, { body: set.body, paint: set.paint, height: 130 });
    else mountBuddy(prev, { id: set.buddyId, height: 150 });
  }
  // Station scene — dock inside the visible .c1h (cardInto swallows other siblings)
  const s = window.c1GuideStation || window.cur;
  const sheet = document.getElementById('sheet');
  if (sheet && !sheet.hidden) fillStationDock(sheet, set, s);
  const station = document.getElementById('s-station');
  if (station && station.offsetParent) fillStationDock(station, set, s);
  // Wallet card
  const wcard = document.querySelector('#c1wallet .c1wcard');
  if (wcard) mountWallet(wcard);
  // Ask your buddy — replace the CSS/SVG buddy wherever it is
  document.querySelectorAll('#c1ask-tab .c1buddy3d, #c1ask .c1buddy3d, #c1p-buddy').forEach((el) => {
    mountBuddy(el, { id: set.buddyId, height: 160 });
  });
  window.c1Three = Object.assign(window.c1Three || {}, {
    webgl: true,
    version: THREE_VERSION,
    revision: THREE.REVISION,
    asset: C1_ASSET_V,
    ready: true,
    mounts: mounts.length,
    remount: remountAll,
    play: { plugInRange, sagPoint, pinchScale, shouldRoarShake, isDoubleTap, trailTick, snapPlugToPort },
  });
}

function hook(name, after) {
  const prev = window[name];
  if (typeof prev !== 'function' || prev._c1three) return;
  const wrapped = function () {
    const r = prev.apply(this, arguments);
    try { after.apply(this, arguments); } catch (e) {}
    return r;
  };
  wrapped._c1three = 1;
  window[name] = wrapped;
}

function boot() {
  injectCss();
  const go = () => { try { remountAll(); revealMounts(); } catch (e) {} };
  hook('renderWallet', () => setTimeout(go, 0));
  hook('renderProfileV23', () => setTimeout(go, 0));
  hook('openEditV23', () => setTimeout(go, 0));
  hook('renderAsk', () => setTimeout(go, 0));
  hook('mountAsk', () => setTimeout(go, 0));
  hook('decorateSheet', () => setTimeout(go, 30));
  hook('pick', () => setTimeout(go, 40));
  hook('fillStation', () => setTimeout(go, 40));
  hook('cardAll', () => setTimeout(go, 40));
  hook('cardInto', (root) => {
    if (!root) return;
    root.querySelectorAll('.c1more .c1-3d-dock, .c1more #c1-3d-dock, .c1more #c1-3d-dock-station').forEach((d) => {
      const head = root.querySelector(':scope > .c1h');
      if (head) head.appendChild(d);
    });
  });
  hook('mountLot', () => setTimeout(go, 40));
  hook('go', () => setTimeout(go, 0));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { revealMounts(); kick(); } });
  window.addEventListener('pageshow', () => { revealMounts(); kick(); });
  go();
  // First paint of a later tab: catch class changes even if go() is not used
  const mo = new MutationObserver(() => { setTimeout(() => { revealMounts(); kick(); }, 0); });
  document.querySelectorAll('.screen').forEach((s) => mo.observe(s, { attributes: true, attributeFilter: ['class', 'hidden', 'style'] }));
}

window.c1Three = { webgl: webglAvailable(), version: THREE_VERSION, revision: THREE.REVISION, asset: C1_ASSET_V, ready: false, remount: remountAll, webglAvailable };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
