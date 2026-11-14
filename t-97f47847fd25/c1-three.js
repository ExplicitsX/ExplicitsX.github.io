/**
 * Kilolane mock 3D scenes — three.js 0.187.0 (vendored).
 * Falls back to the existing SVG/CSS visuals if WebGL is missing.
 * Light for older iPhones: shared unit geometry, Lambert, no shadows, DPR cap, pause offscreen.
 */
import * as THREE from './vendor/three-0.187.0.module.min.js?v=20261113q3';

const THREE_VERSION = '0.187.0';
const C1_ASSET_V = '20261113q3';
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
  voltbot: { color: BLUE_DEEP, kind: 'volt', name: 'Voltbot' },
  ampbot: { color: CREAM, kind: 'amp', name: 'Ampbot' },
  sparkbot: { color: ORANGE, kind: 'spark', name: 'Sparkbot' },
  coilbot: { color: SLATE, kind: 'coil', name: 'Coilbot' },
  plugbot: { color: PINK, kind: 'plug', name: 'Plugbot' },
  glowbot: { color: TEAL, kind: 'glow', name: 'Glowbot' },
};
CREW.zapsaurus = CREW.voltbot;
CREW.voltatops = CREW.ampbot;
CREW.stegowatt = CREW.sparkbot;
CREW.tankamp = CREW.coilbot;
CREW.pterowatt = CREW.plugbot;
CREW.honkwatt = CREW.glowbot;

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
    .c1-3d-card,.c1-3d-dock.c1-3d-card{
      background:#0B1530!important;
      border:1px solid #9FB3D1;
      border-radius:16px;
      padding:8px 8px 6px;
      margin:8px 0;
    }
    #s-station .c1-3d-dock, #s-charge .c1-3d-dock, #chx .c1-3d-dock{
      background:#0B1530!important;
      border:1px solid #9FB3D1;
      border-radius:16px;
      padding:8px 8px 6px;
    }
    #s-station .c1gl-host, #s-charge .c1gl-host, .c1-3d-card .c1gl-host{background:#0B1530;border-radius:12px}
    #s-charge:has(#c1-3d-dock-charge .c1gl-on) #chcar .evh{display:none}
    #s-map .c1-3d-dock, #sheet .c1-3d-dock{display:none!important}
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
  const bodyL = isTruck ? 2.2 : 1.95;
  const bodyW = isSuv ? 1.02 : 0.92;
  const bodyH = isSuv ? 0.38 : 0.32;
  const cabinH = isSuv ? 0.36 : (isTruck ? 0.32 : 0.28);
  const cabinL = isTruck ? 0.72 : 0.95;
  const cabinX = isTruck ? -0.28 : 0.08;
  // Curved lower body (not a box): a long ellipsoid plus rounded nose and tail
  const hull = soft(GEO.sphere, color.getHex(), bodyL * 0.5, bodyH, bodyW * 0.5);
  add(g, hull, 0, 0.48, 0);
  add(g, soft(GEO.sphere, color.getHex(), 0.42, bodyH * 0.85, bodyW * 0.46), bodyL * 0.28, 0.46, 0);
  add(g, soft(GEO.sphere, color.getHex(), 0.4, bodyH * 0.82, bodyW * 0.46), -bodyL * 0.3, 0.46, 0);
  if (isTruck) {
    add(g, soft(GEO.sphere, color.getHex(), 0.55, bodyH * 0.7, bodyW * 0.46), -0.15, 0.5, 0);
  }
  // Glass canopy
  const glassMat = { transparent: true, opacity: 0.78, emissive: GLASS, emissiveIntensity: 0.18 };
  const canopy = mesh(GEO.sphere, GLASS, cabinL * 0.5, cabinH, bodyW * 0.42, glassMat);
  add(g, canopy, cabinX, 0.48 + bodyH + cabinH * 0.15, 0);
  const windshield = mesh(GEO.sphere, GLASS, cabinL * 0.28, cabinH * 0.7, bodyW * 0.4, glassMat);
  add(g, windshield, cabinX + cabinL * 0.28, 0.62, 0);
  // Wheel arches (fenders) so the wheels stay visible
  const wdx = isTruck ? 0.7 : 0.6;
  const wdz = bodyW * 0.5;
  const archCol = color.getHex();
  [[-wdx, -wdz], [wdx, -wdz], [-wdx, wdz], [wdx, wdz]].forEach(([x, z]) => {
    add(g, soft(GEO.sphere, archCol, 0.26, 0.16, 0.2), x, 0.36, z);
  });
  // Visible wheels: dark tire, light rim, spokes
  const wheelMat = hexMat(0x1a2438);
  const hubMat = hexMat(0xe6f1ff);
  const wheels = [];
  [[-wdx, -wdz], [wdx, -wdz], [-wdx, wdz], [wdx, wdz]].forEach(([x, z]) => {
    const wg = new THREE.Group();
    const tire = new THREE.Mesh(GEO.cyl, wheelMat);
    tire.scale.set(0.22, 0.12, 0.22);
    tire.rotation.set(Math.PI / 2, 0, 0);
    const rim = new THREE.Mesh(GEO.cyl, hubMat);
    rim.scale.set(0.12, 0.13, 0.12);
    rim.rotation.set(Math.PI / 2, 0, 0);
    const spoke = mesh(GEO.box, 0xc9d1de, 0.04, 0.2, 0.03);
    spoke.rotation.x = Math.PI / 2;
    const spoke2 = mesh(GEO.box, 0xc9d1de, 0.2, 0.04, 0.03);
    spoke2.rotation.x = Math.PI / 2;
    wg.add(tire, rim, spoke, spoke2);
    add(g, wg, x, 0.22, z);
    wheels.push(wg);
  });
  g.userData.wheels = wheels;
  // headlights / tails — rounded
  const hl = mesh(GEO.sphere, LAMP, 0.08, 0.07, 0.1, { emissive: LAMP, emissiveIntensity: 0.35 });
  add(g, hl, bodyL * 0.46, 0.5, bodyW * 0.22);
  const hl2 = mesh(GEO.sphere, LAMP, 0.08, 0.07, 0.1, { emissive: LAMP, emissiveIntensity: 0.35 });
  add(g, hl2, bodyL * 0.46, 0.5, -bodyW * 0.22);
  const tl = mesh(GEO.sphere, 0xe8453c, 0.07, 0.06, 0.1);
  add(g, tl, -bodyL * 0.46, 0.5, 0);
  // lit charge port — pulse is emissive only, never a fill / progress bar
  const port = mesh(GEO.sphere, BLUE, 0.07, 0.07, 0.06, { emissive: BLUE, emissiveIntensity: 0.7 });
  add(g, port, 0.12, 0.52, bodyW * 0.5 + 0.04);
  port.userData.port = true;
  g.userData.port = port;
  g.userData.headlights = [hl, hl2];
  g.userData.bodyKind = body;
  const sh = mesh(GEO.cyl, 0x0b1530, 1.0, 0.02, 0.55, { transparent: true, opacity: 0.22 });
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


function addEyes(head, g, x, y, z, spread, col, ring) {
  const eyeCol = ring ? NAVY : 0xffffff;
  const eyeL = mesh(GEO.sphereLo, eyeCol, 0.055, 0.055, 0.04, { emissive: 0x9cc2ff, emissiveIntensity: 0.2 });
  const eyeR = mesh(GEO.sphereLo, eyeCol, 0.055, 0.055, 0.04, { emissive: 0x9cc2ff, emissiveIntensity: 0.2 });
  add(head, eyeL, x - spread, y, z);
  add(head, eyeR, x + spread, y, z);
  if (ring) {
    add(head, mesh(GEO.cyl, 0x9cc2ff, 0.06, 0.02, 0.06, { emissive: 0x9cc2ff, emissiveIntensity: 0.35 }), x - spread, y, z + 0.02).rotation.x = Math.PI / 2;
    add(head, mesh(GEO.cyl, 0x9cc2ff, 0.06, 0.02, 0.06, { emissive: 0x9cc2ff, emissiveIntensity: 0.35 }), x + spread, y, z + 0.02).rotation.x = Math.PI / 2;
  }
  const puL = mesh(GEO.sphereLo, NAVY, 0.03, 0.03, 0.03);
  const puR = mesh(GEO.sphereLo, NAVY, 0.03, 0.03, 0.03);
  add(head, puL, x - spread + 0.01, y, z + 0.025);
  add(head, puR, x + spread + 0.01, y, z + 0.025);
  const glL = mesh(GEO.sphereLo, 0xffffff, 0.012, 0.012, 0.012);
  const glR = mesh(GEO.sphereLo, 0xffffff, 0.012, 0.012, 0.012);
  add(head, glL, x - spread + 0.016, y + 0.012, z + 0.038);
  add(head, glR, x + spread + 0.016, y + 0.012, z + 0.038);
  const haloL = mesh(GEO.sphereLo, 0x9cc2ff, 0.1, 0.1, 0.06, { emissive: 0x9cc2ff, emissiveIntensity: 0.15, transparent: true, opacity: 0 });
  const haloR = mesh(GEO.sphereLo, 0x9cc2ff, 0.1, 0.1, 0.06, { emissive: 0x9cc2ff, emissiveIntensity: 0.15, transparent: true, opacity: 0 });
  add(head, haloL, x - spread, y, z);
  add(head, haloR, x + spread, y, z);
  const lidL = mesh(GEO.box, col, 0.11, 0.025, 0.05);
  const lidR = mesh(GEO.box, col, 0.11, 0.025, 0.05);
  add(head, lidL, x - spread, y, z + 0.015);
  add(head, lidR, x + spread, y, z + 0.015);
  lidL.visible = lidR.visible = false;
  const winkBit = mesh(GEO.box, NAVY, 0.1, 0.018, 0.03);
  add(head, winkBit, x + spread, y, z + 0.015);
  winkBit.visible = false;
  g.userData.eyes = [eyeL, eyeR, puL, puR, glL, glR];
  g.userData.eyeHalos = [haloL, haloR];
  g.userData.eyeMats = [eyeL.material, eyeR.material];
  g.userData.lids = [lidL, lidR];
  g.userData.winkBit = winkBit;
}

function setEyeGlow(g, on) {
  const halos = g && g.userData && g.userData.eyeHalos;
  const mats = g && g.userData && g.userData.eyeMats;
  if (halos) halos.forEach((h) => { h.material.opacity = on ? 0.55 : 0; h.material.emissiveIntensity = on ? 0.9 : 0.15; });
  if (mats) mats.forEach((m) => { m.emissiveIntensity = on ? 0.85 : 0.2; });
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

function plugAntenna(col, variant) {
  const g = new THREE.Group();
  const stem = mesh(GEO.cyl, 0xc9d1de, 0.025, 0.32, 0.025);
  add(g, stem, 0, 0.16, 0);
  let tip;
  if (variant === 'round') {
    tip = mesh(GEO.sphereLo, 0xc9d1de, 0.07, 0.07, 0.07);
    add(g, tip, 0, 0.36, 0);
  } else if (variant === 'slim') {
    tip = mesh(GEO.box, 0xc9d1de, 0.07, 0.14, 0.05);
    add(g, tip, 0, 0.38, 0);
    add(g, mesh(GEO.cyl, NAVY, 0.012, 0.08, 0.012), 0.02, 0.48, 0);
    add(g, mesh(GEO.cyl, NAVY, 0.012, 0.08, 0.012), -0.02, 0.48, 0);
  } else if (variant === 'coil') {
    add(g, mesh(GEO.torus || GEO.cyl, 0xc9d1de, 0.07, 0.04, 0.07), 0, 0.28, 0);
    add(g, mesh(GEO.cyl, 0xc9d1de, 0.06, 0.05, 0.06), 0, 0.22, 0);
    add(g, mesh(GEO.cyl, 0xc9d1de, 0.06, 0.05, 0.06), 0, 0.34, 0);
    tip = mesh(GEO.box, 0xc9d1de, 0.08, 0.06, 0.08);
    add(g, tip, 0, 0.42, 0);
  } else if (variant === 'block') {
    tip = mesh(GEO.box, 0xc9d1de, 0.12, 0.1, 0.08);
    add(g, tip, 0, 0.36, 0);
    add(g, mesh(GEO.cyl, NAVY, 0.015, 0.08, 0.015), 0.025, 0.46, 0);
    add(g, mesh(GEO.cyl, NAVY, 0.015, 0.08, 0.015), -0.025, 0.46, 0);
  } else if (variant === 'ring') {
    tip = mesh(GEO.cyl, 0xc9d1de, 0.08, 0.04, 0.08);
    add(g, tip, 0, 0.36, 0);
    add(g, mesh(GEO.sphereLo, GOLD, 0.03, 0.03, 0.03, { emissive: GOLD, emissiveIntensity: 0.4 }), 0, 0.36, 0);
  } else {
    tip = mesh(GEO.box, 0xc9d1de, 0.14, 0.08, 0.08);
    add(g, tip, 0, 0.36, 0);
    add(g, mesh(GEO.box, NAVY, 0.06, 0.05, 0.05), 0, 0.44, 0);
  }
  return g;
}

function stubbyArm(col) {
  const arm = new THREE.Group();
  add(arm, soft(GEO.sphere, col, 0.06, 0.14, 0.06), 0, -0.08, 0);
  add(arm, soft(GEO.sphere, col, 0.07, 0.06, 0.07), 0.02, -0.2, 0.02);
  return arm;
}

function wheelGrp() {
  const w = new THREE.Group();
  add(w, mesh(GEO.cyl, 0x1a1f2b, 0.2, 0.08, 0.2), 0, 0, 0).rotation.z = Math.PI / 2;
  add(w, mesh(GEO.cyl, 0xc9d1de, 0.12, 0.09, 0.12), 0, 0, 0).rotation.z = Math.PI / 2;
  add(w, mesh(GEO.box, NAVY, 0.02, 0.22, 0.02), 0, 0, 0);
  add(w, mesh(GEO.box, NAVY, 0.22, 0.02, 0.02), 0, 0, 0);
  return w;
}

function hoverGrp(col) {
  const h = new THREE.Group();
  add(h, mesh(GEO.cyl, col, 0.32, 0.04, 0.32, { transparent: true, opacity: 0.45, emissive: col, emissiveIntensity: 0.25 }), 0, 0, 0);
  add(h, mesh(GEO.cyl, NAVY, 0.34, 0.015, 0.34), 0, 0.02, 0);
  add(h, mesh(GEO.cyl, col, 0.18, 0.02, 0.18, { emissive: col, emissiveIntensity: 0.35 }), 0, -0.02, 0);
  return h;
}

function buildVolt(body, col, g) {
  const wheel = wheelGrp();
  add(body, wheel, 0, 0.16, 0);
  g.userData.wheel = wheel;
  add(body, mesh(GEO.cyl, col, 0.05, 0.18, 0.05), 0, 0.28, 0);
  add(body, soft(GEO.sphere, col, 0.32, 0.48, 0.28), 0, 0.78, 0);
  add(body, mesh(GEO.cyl, 0xc9d1de, 0.08, 0.03, 0.08), 0, 0.78, 0.22);
  const arm = stubbyArm(col);
  add(body, arm, 0.3, 0.9, 0.08);
  g.userData.arm = arm;
  add(body, stubbyArm(col), -0.3, 0.9, 0.08);
  const head = new THREE.Group();
  add(body, head, 0, 1.28, 0);
  add(head, soft(GEO.sphere, col, 0.22, 0.2, 0.2), 0, 0, 0);
  g.userData.head = head;
  addEyes(head, g, 0, 0.02, 0.16, 0.08, col);
  const ant = plugAntenna(col, 'flat');
  add(head, ant, 0, 0.18, 0);
  g.userData.tail = ant;
  return { head, jaw: null };
}

function buildAmp(body, col, g) {
  const hover = hoverGrp(col);
  add(body, hover, 0, 0.08, 0);
  g.userData.hover = hover;
  add(body, soft(GEO.sphere, col, 0.4, 0.38, 0.36), 0, 0.7, 0);
  add(body, soft(GEO.sphere, 0xfff8e8, 0.22, 0.16, 0.2, { emissiveIntensity: 0.04 }), 0, 0.62, 0.12);
  const arm = stubbyArm(col);
  add(body, arm, 0.36, 0.78, 0.1);
  g.userData.arm = arm;
  add(body, stubbyArm(col), -0.36, 0.78, 0.1);
  const head = new THREE.Group();
  add(body, head, 0, 1.12, 0);
  add(head, soft(GEO.sphere, col, 0.24, 0.2, 0.22), 0, 0, 0);
  g.userData.head = head;
  addEyes(head, g, 0, 0.02, 0.16, 0.09, col);
  const ant = plugAntenna(col, 'round');
  add(head, ant, 0, 0.18, 0);
  g.userData.tail = ant;
  return { head, jaw: null };
}

function buildSpark(body, col, g) {
  const wheel = wheelGrp();
  add(body, wheel, 0, 0.14, 0);
  g.userData.wheel = wheel;
  const forkL = mesh(GEO.cyl, NAVY, 0.02, 0.28, 0.02);
  const forkR = mesh(GEO.cyl, NAVY, 0.02, 0.28, 0.02);
  forkL.rotation.z = 0.25; forkR.rotation.z = -0.25;
  add(body, forkL, -0.08, 0.3, 0);
  add(body, forkR, 0.08, 0.3, 0);
  add(body, soft(GEO.sphere, col, 0.24, 0.46, 0.22), 0, 0.78, 0);
  const arm = stubbyArm(col);
  add(body, arm, 0.24, 0.9, 0.08);
  g.userData.arm = arm;
  add(body, stubbyArm(col), -0.24, 0.9, 0.08);
  const head = new THREE.Group();
  add(body, head, 0, 1.26, 0);
  add(head, soft(GEO.sphere, col, 0.18, 0.17, 0.18), 0, 0, 0);
  g.userData.head = head;
  addEyes(head, g, 0, 0.02, 0.14, 0.07, col);
  const ant = plugAntenna(col, 'slim');
  add(head, ant, 0.04, 0.16, 0);
  g.userData.tail = ant;
  return { head, jaw: null };
}

function buildCoil(body, col, g) {
  const hover = hoverGrp(col);
  hover.scale.set(1.2, 1, 1.2);
  add(body, hover, 0, 0.08, 0);
  g.userData.hover = hover;
  add(body, soft(GEO.sphere, col, 0.48, 0.28, 0.38), 0, 0.62, 0);
  add(body, mesh(GEO.box, 0xc9d1de, 0.4, 0.08, 0.2), 0, 0.62, 0.2);
  const arm = stubbyArm(col);
  add(body, arm, 0.42, 0.7, 0.1);
  g.userData.arm = arm;
  add(body, stubbyArm(col), -0.42, 0.7, 0.1);
  const head = new THREE.Group();
  add(body, head, 0, 0.98, 0);
  add(head, mesh(GEO.box, col, 0.36, 0.28, 0.28), 0, 0, 0);
  // round the boxy face slightly with a cap
  add(head, soft(GEO.sphere, col, 0.2, 0.16, 0.16), 0, 0.08, 0.02);
  g.userData.head = head;
  addEyes(head, g, 0, 0.02, 0.16, 0.09, col);
  const ant = plugAntenna(col, 'coil');
  add(head, ant, 0, 0.16, 0);
  g.userData.tail = ant;
  return { head, jaw: null };
}

function buildPlug(body, col, g) {
  const wheel = wheelGrp();
  add(body, wheel, 0, 0.15, 0);
  g.userData.wheel = wheel;
  add(body, soft(GEO.sphere, col, 0.36, 0.12, 0.28), 0, 0.32, 0); // fender
  add(body, soft(GEO.sphere, col, 0.34, 0.44, 0.3), 0, 0.76, 0);
  const arm = stubbyArm(col);
  add(body, arm, 0.32, 0.86, 0.1);
  g.userData.arm = arm;
  add(body, stubbyArm(col), -0.32, 0.86, 0.1);
  const head = new THREE.Group();
  add(body, head, 0, 1.22, 0);
  add(head, soft(GEO.sphere, col, 0.2, 0.18, 0.2), 0, 0, 0);
  add(head, soft(GEO.sphere, col, 0.05, 0.04, 0.05), -0.16, -0.04, 0.12);
  add(head, soft(GEO.sphere, col, 0.05, 0.04, 0.05), 0.16, -0.04, 0.12);
  g.userData.head = head;
  addEyes(head, g, 0, 0.02, 0.14, 0.08, col);
  const ant = plugAntenna(col, 'block');
  add(head, ant, 0, 0.16, 0);
  g.userData.tail = ant;
  return { head, jaw: null };
}

function buildGlow(body, col, g) {
  const hover = hoverGrp(col);
  add(body, hover, 0, 0.08, 0);
  g.userData.hover = hover;
  add(body, soft(GEO.sphere, col, 0.22, 0.5, 0.2), 0, 0.78, 0);
  const arm = stubbyArm(col);
  add(body, arm, 0.22, 0.9, 0.08);
  g.userData.arm = arm;
  add(body, stubbyArm(col), -0.22, 0.9, 0.08);
  const head = new THREE.Group();
  add(body, head, 0, 1.3, 0);
  add(head, soft(GEO.sphere, col, 0.18, 0.18, 0.18), 0, 0, 0);
  g.userData.head = head;
  addEyes(head, g, 0, 0.02, 0.14, 0.07, col, true);
  const ant = plugAntenna(col, 'ring');
  add(head, ant, 0, 0.16, 0);
  g.userData.tail = ant;
  return { head, jaw: null };
}

function buildBuddy(id) {
  const def = CREW[id] || CREW.voltbot;
  const g = new THREE.Group();
  const kind = def.kind;
  const col = def.color;
  const body = new THREE.Group();
  g.add(body);
  g.userData.body = body;
  const sh = mesh(GEO.sphere, 0x0b1530, 0.7, 0.08, 0.45, { transparent: true, opacity: 0.22 });
  add(g, sh, 0, 0.04, 0);
  let parts;
  if (kind === 'volt') parts = buildVolt(body, col, g);
  else if (kind === 'amp') parts = buildAmp(body, col, g);
  else if (kind === 'spark') parts = buildSpark(body, col, g);
  else if (kind === 'coil') parts = buildCoil(body, col, g);
  else if (kind === 'plug') parts = buildPlug(body, col, g);
  else parts = buildGlow(body, col, g);
  return finishBuddy(g, body, id || 'voltbot', kind, col, parts && parts.head, parts && parts.jaw);
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
    ctx.fillStyle = '#E6F1FF';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(16, 8, w - 32, 44, 12);
    else ctx.rect(16, 8, w - 32, 44);
    ctx.fill();
    ctx.fillStyle = '#0B1530';
    ctx.font = 'bold 42px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(stall.plugLabel || '', w / 2, 30);
    ctx.font = 'bold 22px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#F4F7FB';
    ctx.fillText('Live status coming soon', w / 2, 70);
  }, 320, 96);
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 0.36), new THREE.MeshBasicMaterial({ map: label, transparent: true }));
  add(g, plane, 0, 0.28, 0.62);
  plane.rotation.x = -0.28;
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
  const peek = buildBuddy('voltbot');
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
    const pop = buildBuddy('voltbot');
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
    const waveBuddy = buildBuddy('voltbot');
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
  m.state.waveT = 1;
  m.state.idleAt = now;
  setBuddyFace(buddy, 'blink');
  setEyeGlow(buddy, true);
  if (buddy.userData.hopSpark) buddy.userData.hopSpark.visible = true;
  if (buddy.userData.faceSpark) buddy.userData.faceSpark.visible = true;
  setTimeout(() => {
    if (buddy.userData.hopSpark) buddy.userData.hopSpark.visible = false;
    if (buddy.userData.faceSpark) buddy.userData.faceSpark.visible = false;
    setEyeGlow(buddy, false);
    if (buddy.userData.face !== 'sleepy') setBuddyFace(buddy, 'happy');
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
    const buddy = buildBuddy(opts.id || 'voltbot');
    m.scene.add(buddy);
    m.camera.position.set(2.15, 1.35, 3.35);
    m.camera.lookAt(0, 0.9, 0);
    m.camera.fov = 30;
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
        triggerRoar(m, buddy);
      },
    });
    m.update = (dt, now) => {
      if (m.state.auto && !m.state.dragging && !m.still && !m.state.vel) {
        m.state.yaw = 0.18 + 0.16 * Math.sin((now - t0) / 2500);
      }
      spinUpdate(m, buddy, dt, now);
      if (m.still) {
        setBuddyFace(buddy, 'happy');
        setEyeGlow(buddy, false);
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
        if (buddy.userData.wheel) buddy.userData.wheel.rotation.x = 0;
        if (buddy.userData.hover) buddy.userData.hover.rotation.y = 0;
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
        buddy.userData.tail.rotation.z = Math.sin(now / 450) * 0.18;
      }
      // idle wheel roll; hover base spins slowly
      if (buddy.userData.wheel) buddy.userData.wheel.rotation.x += dt * 2.4;
      if (buddy.userData.hover) buddy.userData.hover.rotation.y += dt * 0.7;
      // wave on tap (waveT) or periodically
      const wavePhase = ((now / 1000) % 7);
      const waving = (m.state.waveT > 0 || wavePhase < 0.9) && buddy.userData.face !== 'sleepy';
      if (m.state.waveT > 0) m.state.waveT = Math.max(0, m.state.waveT - dt * 2);
      if (buddy.userData.arm) {
        buddy.userData.arm.rotation.z = waving ? Math.sin(now / 90) * 0.9 : 0;
      }
      const glowOn = m.state.roarUntil && now < m.state.roarUntil;
      setEyeGlow(buddy, !!glowOn);
      // hop + idle bob
      const bob = 0.045 * Math.sin(now / 700);
      if (m.state.hopT > 0) {
        m.state.hopT = Math.max(0, m.state.hopT - dt * 3.2);
        buddy.position.y = bob + Math.sin((1 - m.state.hopT) * Math.PI) * 0.22 * m.state.hopT * 2;
      } else buddy.position.y = bob;
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
      return { paint: s.paint || '#E8453C', body: s.body || 'sedan', avatar: s.profileAvatar || 'dino', buddyId: (window.loadProf && window.loadProf().buddyId) || 'voltbot' };
    }
  } catch (e) {}
  return { paint: '#E8453C', body: 'sedan', avatar: 'dino', buddyId: 'voltbot' };
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
    chg.scale.set(0.62, 0.62, 0.62);
    chg.position.set(-1.2, 0, 0);
    root.add(chg);
    const car = buildCar(opts.body, opts.paint);
    car.scale.set(0.86, 0.86, 0.86);
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
    const pad = mesh(GEO.cyl, 0x152445, 2.8, 0.04, 1.6);
    add(root, pad, 0, 0.02, 0);
    try { m.renderer.setClearColor(0x0b1530, 1); } catch (e) {}
    // Pull back and drop the camera so the whole car and charger fit with padding
    m.camera.position.set(0.35, 1.35, 7.2);
    m.camera.lookAt(0, 0.55, 0);
    m.camera.fov = 26;
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

function placeStationDock(root, dock) {
  if (!root || !dock) return;
  const hdr = root.querySelector(':scope > .hdr');
  const find = document.getElementById('stfind');
  // Sit under the header (and search, if present). Do not fight #stfind for
  // the slot immediately after .hdr — that retriggered cardAll in a loop.
  const anchor = (find && find.parentNode === root) ? find : hdr;
  if (anchor) {
    if (dock.previousElementSibling !== anchor) anchor.after(dock);
  } else if (dock.parentNode !== root) {
    root.insertBefore(dock, root.firstChild);
  }
}

function ensureSheetDock(root) {
  // The 3D charging scene stays off the Map tab and out of #sheet.
  if (!root || root.id === 'sheet' || (root.closest && root.closest('#s-map'))) return null;
  const dockId = 'c1-3d-dock-station';
  let dock = document.getElementById(dockId);
  if (dock && (dock.closest('#s-map, #sheet, .c1more') || (dock.parentNode !== root))) {
    dock.remove();
    dock = null;
  }
  if (!dock) {
    dock = document.createElement('div');
    dock.id = dockId;
    dock.className = 'c1-3d-dock c1-3d-card notr';
    dock.innerHTML = '<div class="c1-3d-charge" style="height:200px;min-height:200px;max-height:200px;margin:6px 0 4px"></div>'
      + '<div class="c1-3d-play"><button type="button" class="chip c1-lights-btn" aria-pressed="true">Charger lights on</button></div>'
      + '<div class="c1-3d-lot" style="min-height:100px;margin:4px 0 0"></div>'
      + '<div class="c1-3d-lot-cap muted" style="font-size:11px;text-align:center;margin:0 0 4px">Live status coming soon</div>';
  }
  // Sit at the top of the Station tab, just under the header, on an opaque card.
  placeStationDock(root, dock);
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
    height: 200,
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


function ensureChargeDock() {
  const chx = document.getElementById('chx');
  if (!chx) return null;
  let dock = document.getElementById('c1-3d-dock-charge');
  if (dock && !chx.contains(dock)) {
    dock.remove();
    dock = null;
  }
  if (dock && dock.isConnected) return dock;
  dock = document.createElement('div');
  dock.id = 'c1-3d-dock-charge';
  dock.className = 'c1-3d-dock c1-3d-card notr';
  dock.innerHTML = '<div class="c1-3d-charge" style="height:200px;min-height:200px;max-height:200px;margin:6px 0 4px"></div>'
    + '<div class="c1-3d-play"><button type="button" class="chip c1-lights-btn" aria-pressed="true">Charger lights on</button></div>';
  const chh = chx.querySelector('.chh');
  const chcar = document.getElementById('chcar');
  if (chh && chh.nextSibling) chx.insertBefore(dock, chh.nextSibling);
  else if (chcar) chx.insertBefore(dock, chcar);
  else chx.insertBefore(dock, chx.firstChild);
  return dock;
}

function fillChargeDock(root, set, s) {
  if (!root) return;
  const dock = ensureChargeDock();
  if (!dock) return;
  mountChargeScene(dock.querySelector('.c1-3d-charge'), {
    plugs: (s && s.plugs) || [],
    userPlug: userPlug(),
    body: set.body,
    paint: set.paint,
    height: 200,
    lightsBtn: dock.querySelector('.c1-lights-btn'),
  });
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
  // Never leave a 3D dock on the Map tab / sheet (it covered the map)
  document.querySelectorAll('#s-map .c1-3d-dock, #sheet .c1-3d-dock').forEach((d) => d.remove());
  const s = window.c1GuideStation || window.cur;
  const station = document.getElementById('s-station');
  if (station && s) fillStationDock(station, set, s);
  const charge = document.getElementById('s-charge');
  if (charge && s) fillChargeDock(charge, set, s);
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
    if (root.id === 'sheet' || root.id === 's-map') {
      root.querySelectorAll('.c1-3d-dock').forEach((d) => d.remove());
      return;
    }
    const dock = root.querySelector('.c1-3d-dock, #c1-3d-dock-station');
    if (dock && root.id === 's-station') placeStationDock(root, dock);
  });
  // cardInto() tucks any non-.c1h sibling into hidden .c1more — keep the dock.
  if (typeof window.cardInto === 'function' && !window.cardInto._c1dockkeep) {
    const prevCI = window.cardInto;
    window.cardInto = function (root, where, keep) {
      const k = [keep, '.c1-3d-dock', '#c1-3d-dock-station'].filter(Boolean).join(',');
      const r = prevCI.call(this, root, where, k);
      if (root && root.id === 's-station') {
        const dock = root.querySelector('#c1-3d-dock-station, :scope > .c1-3d-dock');
        if (dock) placeStationDock(root, dock);
      }
      return r;
    };
    window.cardInto._c1dockkeep = 1;
  }
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
