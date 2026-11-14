/**
 * Kilolane mock 3D scenes — three.js 0.187.0 (vendored).
 * Falls back to the existing SVG/CSS visuals if WebGL is missing.
 * Light for older iPhones: shared unit geometry, Lambert, no shadows, DPR cap, pause offscreen.
 */
import * as THREE from './vendor/three-0.187.0.module.min.js?v=20261113q6';

const THREE_VERSION = '0.187.0';
const C1_ASSET_V = '20261113q6';
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
  hemi: new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 18),
  cylLo: new THREE.CylinderGeometry(1, 1, 1, 12),
  cone: new THREE.ConeGeometry(1, 1, 14),
  torus: new THREE.TorusGeometry(1, 0.14, 10, 22),
};
const STEEL = 0x6d848a;
const STEEL_LT = 0x84969a;
const STEEL_DK = 0x4a6168;
const EYE_BLUE = 0x5eb8f0;
const EYE_CORE = 0xe7fcfd;
const EYE_SOCK = 0x2a3840;
const ANT_BLUE = 0x4aaae6;

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
    #c1profile .c1avatar-wrap, #c1av-preview, #c1ask-tab .c1buddy3d, #c1ask .c1buddy3d, #c1p-buddy{
      overflow:visible;min-height:210px;display:flex;align-items:flex-end;justify-content:flex-start;
    }
    #c1profile .card{overflow:visible}
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
    #s-charge .c1-3d-dock, #s-charge .c1-3d-card{background:#091925!important}
    .c1-chg-svg{display:block;width:100%;height:100%;border-radius:12px}
    @media (prefers-reduced-motion:reduce){
      .c1-chg-svg animate, .c1-chg-svg animateMotion, .c1-chg-svg animateTransform{display:none}
    }
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
  const mid = Math.ceil(eyes.length / 2);
  eyes.forEach((e, i) => { e.visible = !sleepy && !blink && !(winkOn && i >= mid); });
  if (lids) lids.forEach((l, i) => { l.visible = sleepy || blink || (winkOn && i === 1); });
  const halos = g.userData.eyeHalos;
  if (halos) halos.forEach((h, i) => { h.visible = !sleepy && !blink && !(winkOn && i === 1); });
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

function shadeHex(hex, amt) {
  const r = Math.max(0, Math.min(255, ((hex >> 16) & 255) + amt));
  const g = Math.max(0, Math.min(255, ((hex >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (hex & 255) + amt));
  return (r << 16) | (g << 8) | b;
}

function metal(col, extra) {
  return hexMat(col, { flatShading: true, emissive: col, emissiveIntensity: 0.05, ...(extra || {}) });
}

function metalMesh(geo, col, sx, sy, sz, extra) {
  return mesh(geo, metal(col, extra), sx, sy, sz);
}

/** Thin antenna with a glowing blue ball tip, matching the reference. */
function plugAntenna(col, _variant) {
  const g = new THREE.Group();
  add(g, metalMesh(GEO.cyl, 0x3a4245, 0.022, 0.28, 0.022), 0, 0.14, 0);
  const tip = mesh(GEO.sphere, ANT_BLUE, 0.07, 0.07, 0.07, { emissive: ANT_BLUE, emissiveIntensity: 0.55, flatShading: true });
  add(g, tip, 0, 0.32, 0);
  g.userData.tip = tip;
  return g;
}

function makeArm(col, dark, side) {
  const arm = new THREE.Group();
  const s = side;
  // shoulder cap
  add(arm, metalMesh(GEO.sphere, col, 0.12, 0.12, 0.12), 0, 0, 0);
  // upper arm segments
  add(arm, metalMesh(GEO.cyl, dark, 0.04, 0.12, 0.04), s * 0.02, -0.14, 0);
  add(arm, metalMesh(GEO.sphereLo, dark, 0.05, 0.05, 0.05), s * 0.02, -0.22, 0);
  add(arm, metalMesh(GEO.cyl, dark, 0.04, 0.1, 0.04), s * 0.02, -0.3, 0);
  // elbow
  add(arm, metalMesh(GEO.sphereLo, dark, 0.055, 0.055, 0.055), s * 0.02, -0.38, 0);
  // rounded forearm shell
  add(arm, metalMesh(GEO.sphere, col, 0.11, 0.16, 0.1), s * 0.02, -0.54, 0.01);
  // 3-finger claw
  const hand = new THREE.Group();
  add(arm, hand, s * 0.02, -0.7, 0.02);
  ;[-0.045, 0, 0.045].forEach((x, i) => {
    const f = metalMesh(GEO.cyl, dark, 0.018, 0.1, 0.018);
    f.rotation.z = x * 3;
    f.rotation.x = 0.35;
    add(hand, f, x, -0.05, 0.02);
    add(hand, metalMesh(GEO.sphereLo, dark, 0.02, 0.02, 0.02), x + (i - 1) * 0.01, -0.11, 0.04);
  });
  return arm;
}

/**
 * Shared crew body: hemispherical dome head with a rim, large glowing blue
 * eyes in dark sockets, thin blue-ball antenna, egg torso with seams and
 * rivets, segmented arms with claw hands, and a single rubber wheel on a fork.
 * Voltbot uses muted steel blue-gray; the others use their locked colors.
 * No dent. Flat shading, a slight wear look from darker panels.
 */
function buildCrewRobot(body, col, g) {
  const dark = shadeHex(col, -36);
  const mid = shadeHex(col, -16);
  const rimC = shadeHex(col, -48);
  // --- wheel + fork (y=0 at the ground) ---
  const wheel = new THREE.Group();
  const tire = metalMesh(GEO.cyl, 0x1c2125, 0.3, 0.14, 0.3);
  tire.rotation.z = Math.PI / 2;
  add(wheel, tire, 0, 0, 0);
  const hub = metalMesh(GEO.cyl, 0x2a3036, 0.12, 0.16, 0.12);
  hub.rotation.z = Math.PI / 2;
  add(wheel, hub, 0, 0, 0);
  const cap = metalMesh(GEO.cyl, 0x3a424a, 0.05, 0.17, 0.05);
  cap.rotation.z = Math.PI / 2;
  add(wheel, cap, 0, 0, 0);
  add(body, wheel, 0, 0.3, 0);
  g.userData.wheel = wheel;
  // fork struts
  const fork = new THREE.Group();
  ;[-1, 1].forEach((s) => {
    const strut = metalMesh(GEO.cyl, rimC, 0.035, 0.42, 0.035);
    strut.rotation.z = s * 0.12;
    add(fork, strut, s * 0.1, 0.18, 0);
    add(fork, metalMesh(GEO.sphereLo, dark, 0.045, 0.045, 0.045), s * 0.12, -0.02, 0);
  });
  add(body, fork, 0, 0.34, 0);
  // --- egg / capsule torso ---
  add(body, metalMesh(GEO.sphere, col, 0.4, 0.5, 0.36), 0, 0.98, 0);
  // slightly darker lower belly for wear, no dent
  add(body, metalMesh(GEO.sphere, mid, 0.32, 0.28, 0.28), 0, 0.82, 0.02);
  // panel seams
  add(body, metalMesh(GEO.box, dark, 0.012, 0.48, 0.01), 0.05, 0.98, 0.34);
  add(body, metalMesh(GEO.box, dark, 0.42, 0.01, 0.01), 0, 1.08, 0.34);
  add(body, metalMesh(GEO.box, dark, 0.36, 0.01, 0.01), 0, 0.86, 0.33);
  // rivets
  [[-0.16, 1.08, 0.34], [0.16, 1.08, 0.34], [-0.14, 0.86, 0.33], [0.14, 0.86, 0.33],
   [0.05, 1.18, 0.34], [0.05, 0.74, 0.32]].forEach(([x, y, z]) => {
    add(body, metalMesh(GEO.sphereLo, mid, 0.03, 0.03, 0.03), x, y, z);
  });
  // faint wear smudges (darker patches, not a hole)
  add(body, metalMesh(GEO.sphereLo, dark, 0.1, 0.07, 0.04, { transparent: true, opacity: 0.35 }), -0.18, 0.92, 0.3);
  add(body, metalMesh(GEO.sphereLo, dark, 0.08, 0.05, 0.03, { transparent: true, opacity: 0.28 }), 0.16, 1.14, 0.28);
  // --- arms ---
  const armR = makeArm(col, dark, 1);
  add(body, armR, 0.44, 1.18, 0.04);
  g.userData.arm = armR;
  const armL = makeArm(col, dark, -1);
  add(body, armL, -0.44, 1.18, 0.04);
  // --- rim band + hemispherical dome head ---
  add(body, metalMesh(GEO.cyl, rimC, 0.38, 0.12, 0.38), 0, 1.46, 0);
  add(body, metalMesh(GEO.torus, shadeHex(col, -20), 0.38, 0.38, 0.38), 0, 1.52, 0).rotation.x = Math.PI / 2;
  const head = new THREE.Group();
  add(body, head, 0, 1.52, 0);
  add(head, metalMesh(GEO.hemi, col, 0.36, 0.36, 0.36), 0, 0, 0);
  g.userData.head = head;
  // large glowing blue eyes in dark sockets
  const eyes = [];
  const lids = [];
  const halos = [];
  const mats = [];
  ;[-1, 1].forEach((s) => {
    add(head, metalMesh(GEO.sphere, EYE_SOCK, 0.13, 0.13, 0.08), s * 0.135, 0.14, 0.26);
    const glow = mesh(GEO.sphere, EYE_BLUE, 0.1, 0.1, 0.08, { emissive: EYE_BLUE, emissiveIntensity: 0.7, flatShading: false });
    add(head, glow, s * 0.135, 0.14, 0.3);
    const core = mesh(GEO.sphere, EYE_CORE, 0.045, 0.045, 0.04, { emissive: EYE_CORE, emissiveIntensity: 0.85 });
    add(head, core, s * 0.135, 0.155, 0.34);
    const halo = mesh(GEO.sphere, EYE_BLUE, 0.14, 0.14, 0.08, { emissive: EYE_BLUE, emissiveIntensity: 0.2, transparent: true, opacity: 0.2 });
    add(head, halo, s * 0.135, 0.14, 0.28);
    const lid = metalMesh(GEO.box, col, 0.2, 0.04, 0.1);
    add(head, lid, s * 0.135, 0.14, 0.32);
    lid.visible = false;
    eyes.push(glow, core);
    lids.push(lid);
    halos.push(halo);
    mats.push(glow.material);
  });
  g.userData.eyes = eyes;
  g.userData.lids = lids;
  g.userData.eyeHalos = halos;
  g.userData.eyeMats = mats;
  // antenna
  const ant = plugAntenna(col, 'ball');
  add(head, ant, 0, 0.34, 0);
  g.userData.tail = ant;
  g.userData.antennaTip = ant.userData.tip;
  return { head, jaw: null };
}

function buildVolt(body, col, g) { return buildCrewRobot(body, STEEL, g); }
function buildAmp(body, col, g) { return buildCrewRobot(body, col, g); }
function buildSpark(body, col, g) { return buildCrewRobot(body, col, g); }
function buildCoil(body, col, g) { return buildCrewRobot(body, col, g); }
function buildPlug(body, col, g) { return buildCrewRobot(body, col, g); }
function buildGlow(body, col, g) { return buildCrewRobot(body, col, g); }

function buildBuddy(id) {
  const def = CREW[id] || CREW.voltbot;
  const g = new THREE.Group();
  const kind = def.kind;
  const col = kind === 'volt' ? STEEL : def.color;
  const body = new THREE.Group();
  g.add(body);
  g.userData.body = body;
  const sh = mesh(GEO.sphere, 0x0b1530, 0.55, 0.08, 0.4, { transparent: true, opacity: 0.22 });
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
    m.camera.position.set(1.55, 1.2, 4.7);
    m.camera.lookAt(0, 1.1, 0);
    m.camera.fov = 26;
    m.camera.updateProjectionMatrix();
    if (m.host) {
      m.host.style.width = '180px';
      m.host.style.maxWidth = '58%';
      m.host.style.minHeight = (opts.height || 210) + 'px';
      m.host.style.height = (opts.height || 210) + 'px';
      m.host.style.overflow = 'visible';
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
        if (buddy.userData.antennaTip) buddy.userData.antennaTip.material.emissiveIntensity = 0.45;
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
      if (buddy.userData.wheel) buddy.userData.wheel.rotation.x += dt * 1.4;
      if (buddy.userData.antennaTip) {
        buddy.userData.antennaTip.material.emissiveIntensity = 0.4 + 0.45 * (0.5 + 0.5 * Math.sin(now / 480));
      }
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

function chargeLowEnd() {
  try {
    const dpr = window.devicePixelRatio || 1;
    const w = Math.min(screen.width, screen.height);
    return dpr <= 1.5 || w <= 360 || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4 && dpr <= 2);
  } catch (e) { return false; }
}

function chargeSceneSvg(uid) {
  uid = uid || "chg";
  const still = typeof rm === 'function' ? rm() : false;
  const d = 'M 128 154 C 150 154 152 228 204 230 C 252 232 258 168 278 150';
  const pts = [[128,154],[160,200],[204,230],[240,210],[260,170],[278,150]];
  let beads = '';
  if (still) {
    for (let i = 0; i < 4; i++) {
      const p = pts[i];
      beads += `<circle cx="${p[0]}" cy="${p[1]}" r="5" fill="#2EE6D6"/>`;
    }
  } else {
    for (let i = 0; i < 6; i++) {
      beads += `<circle r="5" fill="#2EE6D6"><animateMotion dur="2.8s" begin="${(-i * 2.8 / 6).toFixed(2)}s" repeatCount="indefinite" path="${d}"/></circle>`;
    }
  }
  return `<div class="c1-2d-src"><svg class="c1-chg-svg" viewBox="0 0 480 270" aria-hidden="true"><defs>
    <linearGradient id="c1${uid}Bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#091925"/><stop offset="1" stop-color="#212E3A"/></linearGradient>
    <radialGradient id="c1${uid}Sh" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#000" stop-opacity=".45"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="480" height="270" fill="url(#c1${uid}Bg)"/>
  <ellipse cx="200" cy="232" rx="170" ry="16" fill="url(#c1${uid}Sh)"/>
  <rect x="94" y="68" width="40" height="160" rx="6" fill="#4C5C6A"/>
  <rect x="94" y="220" width="40" height="10" rx="3" fill="#3A4856"/>
  <rect x="106" y="86" width="16" height="26" rx="5" fill="none" stroke="#2EE6D6" stroke-width="2.4"/>
  <rect x="111" y="80" width="6" height="7" rx="2" fill="#2EE6D6"/>
  <path d="M116 96 L111 106 H115 L112 114 L121 102 H116 Z" fill="#2EE6D6"/>
  <rect x="102" y="122" width="24" height="20" rx="3" fill="#1A2430"/>
  <path d="${d}" fill="none" stroke="#1A2430" stroke-width="7" stroke-linecap="round"/>
  ${beads}
  <ellipse cx="332" cy="198" rx="18" ry="18" fill="#1A1F26"/><ellipse cx="332" cy="198" rx="10" ry="10" fill="#6A7A88"/>
  <ellipse cx="412" cy="198" rx="18" ry="18" fill="#1A1F26"/><ellipse cx="412" cy="198" rx="10" ry="10" fill="#6A7A88"/>
  <path d="M268 168 C270 148 300 132 348 128 C392 124 430 132 448 148 C456 156 458 168 452 180 C448 192 430 200 390 204 L300 204 C276 200 266 186 268 168 Z" fill="#4C5C6A"/>
  <path d="M312 164 C322 146 348 138 376 138 C400 138 424 146 434 158 C408 150 376 150 348 154 C328 158 316 162 312 164 Z" fill="#243240"/>
  <rect x="286" y="160" width="36" height="14" rx="3" fill="#6A7A88" opacity=".5"/>
  <rect x="292" y="148" width="28" height="8" rx="3" fill="#E01018"/>
  <rect x="368" y="146" width="26" height="8" rx="3" fill="#E01018"/>
  <rect x="272" y="146" width="10" height="12" rx="2" fill="#1AA8A0"/>
  </svg></div>`;
}

const CHARGE_TEAL = 0x2ee6d6;
const CHARGE_GRAY = 0x4c5c6a;
const CHARGE_GRAY_DK = 0x3a4856;
const CHARGE_GRAY_LT = 0x6a7a88;

function buildChargePillar() {
  const g = new THREE.Group();
  add(g, mesh(GEO.box, CHARGE_GRAY, 0.36, 2.14, 0.32, { flatShading: true }), 0, 1.12, 0);
  add(g, mesh(GEO.box, CHARGE_GRAY_DK, 0.4, 0.1, 0.36, { flatShading: true }), 0, 0.05, 0);
  const iconHalo = mesh(GEO.box, CHARGE_TEAL, 0.18, 0.28, 0.04, { emissive: CHARGE_TEAL, emissiveIntensity: 0.45, transparent: true, opacity: 0.32 });
  add(g, iconHalo, 0, 1.74, 0.18);
  const icon = mesh(GEO.box, CHARGE_TEAL, 0.1, 0.18, 0.03, { emissive: CHARGE_TEAL, emissiveIntensity: 0.8 });
  add(g, icon, 0, 1.72, 0.195);
  const nub = mesh(GEO.box, CHARGE_TEAL, 0.05, 0.05, 0.03, { emissive: CHARGE_TEAL, emissiveIntensity: 0.8 });
  add(g, nub, 0, 1.84, 0.195);
  const boltI = mesh(GEO.box, CHARGE_TEAL, 0.05, 0.1, 0.02, { emissive: CHARGE_TEAL, emissiveIntensity: 0.9 });
  add(g, boltI, 0, 1.7, 0.21);
  add(g, mesh(GEO.box, 0x1a2430, 0.22, 0.18, 0.04, { flatShading: true }), 0, 1.38, 0.17);
  ;[-0.05, 0, 0.05].forEach((x) => add(g, mesh(GEO.sphereLo, 0x3a4856, 0.015, 0.015, 0.015), x, 1.26, 0.19));
  g.userData.iconMats = [iconHalo.material, icon.material, nub.material, boltI.material];
  g.userData.cableDoor = new THREE.Vector3(0.2, 1.08, 0.02);
  return g;
}

/** Generic gray coupe-SUV, nose +X, no badge or grille. */
function buildChargeCar() {
  const g = new THREE.Group();
  const col = CHARGE_GRAY;
  add(g, mesh(GEO.sphere, col, 1.05, 0.38, 0.52, { flatShading: true }), 0.05, 0.52, 0);
  add(g, mesh(GEO.sphere, col, 0.42, 0.32, 0.5, { flatShading: true }), 0.7, 0.5, 0);
  add(g, mesh(GEO.sphere, col, 0.46, 0.36, 0.5, { flatShading: true }), -0.7, 0.52, 0);
  add(g, mesh(GEO.sphere, CHARGE_GRAY_LT, 0.7, 0.2, 0.48, { flatShading: true, transparent: true, opacity: 0.25 }), 0.05, 0.62, 0);
  const glass = { transparent: true, opacity: 0.82, flatShading: true };
  add(g, mesh(GEO.sphere, 0x243240, 0.62, 0.28, 0.42, glass), 0.05, 0.86, 0);
  add(g, mesh(GEO.box, CHARGE_GRAY_DK, 0.04, 0.22, 0.44, { flatShading: true }), 0.1, 0.86, 0);
  add(g, mesh(GEO.box, CHARGE_GRAY_LT, 0.28, 0.1, 0.36, { flatShading: true }), -0.95, 0.72, 0);
  const tails = [];
  ;[-1, 1].forEach((s) => {
    const lamp = mesh(GEO.box, 0xe01018, 0.06, 0.07, 0.2, { emissive: 0xe01018, emissiveIntensity: 0.8 });
    add(g, lamp, -0.98, 0.78, s * 0.28);
    tails.push(lamp);
  });
  g.userData.tails = tails;
  const port = mesh(GEO.box, CHARGE_TEAL, 0.08, 0.1, 0.08, { emissive: CHARGE_TEAL, emissiveIntensity: 0.55 });
  add(g, port, -0.92, 0.72, 0.42);
  g.userData.port = port;
  const wheels = [];
  [[-0.68, -0.5], [-0.68, 0.5], [0.68, -0.5], [0.68, 0.5]].forEach(([x, z]) => {
    const w = new THREE.Group();
    const tire = mesh(GEO.cyl, 0x1a1f26, 0.22, 0.16, 0.22, { flatShading: true });
    tire.rotation.x = Math.PI / 2;
    w.add(tire);
    const rim = mesh(GEO.cyl, CHARGE_GRAY_LT, 0.12, 0.17, 0.12, { flatShading: true });
    rim.rotation.x = Math.PI / 2;
    w.add(rim);
    w.position.set(x, 0.22, z);
    g.add(w);
    wheels.push(w);
  });
  g.userData.wheels = wheels;
  return g;
}

function makeChargeCurve() {
  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.45, 1.08, 0.12),
    new THREE.Vector3(-1.05, 0.55, 0.28),
    new THREE.Vector3(-0.55, 0.12, 0.38),
    new THREE.Vector3(0.05, 0.12, 0.4),
    new THREE.Vector3(0.22, 0.72, 0.42),
  ]);
}

/**
 * 3/4-rear charging scene on an opaque card: slim pillar, teal plug icon,
 * curved cable with flowing beads, generic gray coupe-SUV, red taillights,
 * and a slight camera drift. No battery fill or progress. Still when reduced
 * motion is on or the tab is hidden.
 */
function mountChargeScene(el, opts) {
  if (!el) return null;
  const low = chargeLowEnd();
  return startMount('charge', el, opts.height || 226, (m) => {
    const root = new THREE.Group();
    m.scene.add(root);
    try { m.renderer.setClearColor(0x091925, 1); } catch (e) {}
    m.scene.traverse((o) => {
      if (o.isAmbientLight) o.intensity = 0.32;
      if (o.isDirectionalLight) o.intensity *= 0.42;
    });
    if (!low) {
      const c = document.createElement('canvas');
      c.width = 8; c.height = 128;
      const ctx = c.getContext('2d');
      const gr = ctx.createLinearGradient(0, 0, 0, 128);
      gr.addColorStop(0, '#091925');
      gr.addColorStop(1, '#212E3A');
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, 8, 128);
      const tex = new THREE.CanvasTexture(c);
      const bg = new THREE.Mesh(new THREE.PlaneGeometry(16, 8), new THREE.MeshBasicMaterial({ map: tex }));
      bg.position.set(0.2, 1.1, -4.2);
      root.add(bg);
    }
    const floor = mesh(GEO.cyl, 0x1a2733, 3.4, 0.03, 2.2, { flatShading: true });
    add(root, floor, 0.2, 0.01, 0.1);
    const shadow = mesh(GEO.sphere, 0x000000, 1.9, 0.08, 0.7, { transparent: true, opacity: 0.32 });
    add(root, shadow, 0.3, 0.05, 0);

    const pillar = buildChargePillar();
    pillar.position.set(-1.62, 0, 0.05);
    root.add(pillar);
    const car = buildChargeCar();
    car.position.set(1.12, 0, 0);
    root.add(car);

    const curve = makeChargeCurve();
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, low ? 16 : 28, 0.032, 8, false),
      hexMat(0x1a2430)
    );
    root.add(tube);
    const beadN = low ? 3 : 6;
    const beads = [];
    for (let i = 0; i < beadN; i++) {
      const b = mesh(GEO.sphereLo, CHARGE_TEAL, 0.055, 0.055, 0.055, { emissive: CHARGE_TEAL, emissiveIntensity: 0.95 });
      root.add(b);
      beads.push(b);
      const p = curve.getPoint(i / beadN);
      b.position.copy(p);
    }

    const basePos = new THREE.Vector3(-0.85, 1.32, 4.35);
    const look = new THREE.Vector3(0.15, 0.68, 0);
    m.camera.position.copy(basePos);
    m.camera.lookAt(look);
    m.camera.fov = 28;
    m.camera.updateProjectionMatrix();

    m.update = (_dt, now) => {
      const still = m.still;
      const icon = still ? 0.7 : 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(now / 420));
      (pillar.userData.iconMats || []).forEach((mat) => { mat.emissiveIntensity = icon; });
      const tail = still ? 0.85 : 0.7 + 0.3 * (0.5 + 0.5 * Math.sin(now / 640));
      (car.userData.tails || []).forEach((lamp) => { lamp.material.emissiveIntensity = tail; });
      const period = 2800;
      const base = still ? 0 : ((now % period) / period);
      beads.forEach((b, i) => {
        const t = (base + i / beadN) % 1;
        b.position.copy(curve.getPoint(t));
      });
      if (still || low) {
        m.camera.position.copy(basePos);
      } else {
        m.camera.position.set(
          basePos.x + 0.12 * Math.sin(now / 1800),
          basePos.y + 0.05 * Math.sin(now / 2200),
          basePos.z + 0.1 * Math.cos(now / 2000)
        );
      }
      m.camera.lookAt(look);
    };
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
    dock.innerHTML = '<div class="c1-3d-charge" style="height:226px;min-height:226px;margin:6px 0 4px">' + chargeSceneSvg('station') + '</div>'
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
    height: 226,
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
  dock.innerHTML = '<div class="c1-3d-charge" style="height:226px;min-height:226px;margin:6px 0 4px">' + chargeSceneSvg('charge') + '</div>';
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
    height: 226,
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
    else mountBuddy(hero, { id: set.buddyId, height: 210 });
  }
  // Edit preview
  const prev = document.getElementById('c1av-preview');
  if (prev) {
    if (set.avatar === 'car') mountCar(prev, { body: set.body, paint: set.paint, height: 130 });
    else mountBuddy(prev, { id: set.buddyId, height: 190 });
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
    mountBuddy(el, { id: set.buddyId, height: 200 });
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
