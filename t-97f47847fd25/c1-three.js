/**
 * Kilolane mock 3D scenes — three.js 0.187.0 (vendored).
 * Falls back to the existing SVG/CSS visuals if WebGL is missing.
 * Light for older iPhones: shared unit geometry, Lambert, no shadows, DPR cap, pause offscreen.
 */
import * as THREE from './vendor/three-0.187.0.module.min.js?v=20261113q10';

const THREE_VERSION = '0.187.0';
const C1_ASSET_V = '20261113q10';
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
    #s-charge:has(#c1-3d-dock-charge) #chcar{display:none}
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


/* ---------- isometric station lot (DOE stall count, pending live status) ---------- */
const LOT_SCENE_CAP = 24;
const STALL_W = 2.5, STALL_L = 5.0, STALL_GAP = 0.28, AISLE = 1.6;
const LOT_BG = 0xeef1f4;
const STALL_LIGHT = { unknown: 0x9aa3b5, available: 0x22c55e, busy: 0xe11d2e, out_of_order: 0xf5a524 };
const pendingStallStatusProvider = {
  id: 'pending',
  getStatus() { return 'unknown'; },
};
let activeStallStatusProvider = pendingStallStatusProvider;
function setStallStatusProvider(provider) {
  activeStallStatusProvider = provider || pendingStallStatusProvider;
}
function getStallStatusProvider() { return activeStallStatusProvider; }
function readStallStatus(query) {
  try {
    const status = getStallStatusProvider().getStatus(query || {});
    if (status === 'available' || status === 'busy' || status === 'out_of_order') return status;
  } catch (e) {}
  return 'unknown';
}
function stallLightColor(status) { return STALL_LIGHT[status] || STALL_LIGHT.unknown; }
function stallPowerKw(kind, maxKw) {
  if (kind !== 'dc' || maxKw == null || !isFinite(maxKw) || maxKw <= 0) return null;
  return Math.round(maxKw);
}

function lotLL(en, es) {
  try { if (typeof window.L === 'function') return window.L(en, es); } catch (e) {}
  return en;
}
function stallInspectLabel(stall, maxKw, network) {
  const parts = [(stall && stall.plugLabel) || ''];
  const kw = stallPowerKw(stall && stall.kind, maxKw);
  if (kw != null) parts.push(kw + ' kW');
  else if (stall && stall.kind === 'l2') parts.push('Level 2');
  else if (stall && stall.kind === 'dc') parts.push('DC fast');
  if (network && String(network).trim()) parts.push(String(network).trim());
  return parts.filter(Boolean).join(' · ');
}
const LOT_OSM_RADIUS_M = 80, LOT_OSM_ROAD_RADIUS_M = 120;
const LOT_OSM_CACHE_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
const LOT_OSM_MIN_INTERVAL_MS = 1600;
const LOT_OSM_STORE = 'c1.lot.osm.v1';
const M_PER_DEG = 110574;
function buildLotOverpassQuery(lat, lon) {
  const a = Number(lat).toFixed(6), o = Number(lon).toFixed(6);
  const r = LOT_OSM_RADIUS_M, rr = LOT_OSM_ROAD_RADIUS_M;
  return '[out:json][timeout:20];('
    + 'node["man_made"="charge_point"](around:' + r + ',' + a + ',' + o + ');'
    + 'way["man_made"="charge_point"](around:' + r + ',' + a + ',' + o + ');'
    + 'node["amenity"="charging_station"](around:' + r + ',' + a + ',' + o + ');'
    + 'way["amenity"="charging_station"](around:' + r + ',' + a + ',' + o + ');'
    + 'way["highway"="parking_aisle"](around:' + r + ',' + a + ',' + o + ');'
    + 'way["highway"="service"](around:' + r + ',' + a + ',' + o + ');'
    + 'way["highway"~"^(residential|unclassified|tertiary|secondary|primary|living_street)$"](around:' + rr + ',' + a + ',' + o + ');'
    + 'way["building"](around:' + r + ',' + a + ',' + o + ');'
    + ');out tags geom;';
}
function localMeters(origin, p) {
  const cos = Math.cos(origin.lat * Math.PI / 180);
  return { x: (p.lon - origin.lon) * M_PER_DEG * cos, z: (p.lat - origin.lat) * M_PER_DEG };
}
function wayRing(el) {
  const g = el && el.geometry;
  if (!g || g.length < 2) return [];
  return g.filter(p => isFinite(p.lat) && isFinite(p.lon)).map(p => ({ lat: p.lat, lon: p.lon }));
}
function centroidLL(points) {
  if (!points.length) return null;
  const s = points.reduce((a, p) => ({ lat: a.lat + p.lat, lon: a.lon + p.lon }), { lat: 0, lon: 0 });
  return { lat: s.lat / points.length, lon: s.lon / points.length };
}
function bearingLL(a, b) {
  const R = Math.PI / 180;
  const y = Math.sin((b.lon - a.lon) * R) * Math.cos(b.lat * R);
  const x = Math.cos(a.lat * R) * Math.sin(b.lat * R) - Math.sin(a.lat * R) * Math.cos(b.lat * R) * Math.cos((b.lon - a.lon) * R);
  return Math.atan2(y, x);
}
function buildingHeight(t) {
  const h = parseFloat(t.height);
  if (isFinite(h) && h > 1) return Math.max(3, Math.min(20, h));
  const levels = parseFloat(t['building:levels'] || t.levels);
  if (isFinite(levels) && levels > 0) return Math.max(3, Math.min(20, levels * 3));
  return 6;
}
function nearestBearingPt(p, aisles) {
  let best = null;
  (aisles || []).forEach(aisle => {
    for (let i = 1; i < aisle.points.length; i++) {
      const a = aisle.points[i - 1], b = aisle.points[i];
      const dx = b.x - a.x, dz = b.z - a.z, len2 = dx * dx + dz * dz;
      if (len2 < 0.25) continue;
      let t = ((p.x - a.x) * dx + (p.z - a.z) * dz) / len2;
      t = Math.max(0, Math.min(1, t));
      const d = (p.x - (a.x + t * dx)) ** 2 + (p.z - (a.z + t * dz)) ** 2;
      const br = Math.atan2(dx, dz);
      if (!best || d < best.dist) best = { dist: d, bearing: br };
    }
  });
  return best ? best.bearing : null;
}
function parseOsmLot(data, origin) {
  const elements = (data && data.elements) || [];
  const footprints = [], aisles = [], roads = [], rawPoints = [], rawStations = [];
  elements.forEach(el => {
    const t = el.tags || {};
    if (t.man_made === 'charge_point') rawPoints.push(el);
    else if (t.amenity === 'charging_station' && el.type === 'node') rawStations.push(el);
    if (t.building && t.building !== 'no' && el.type === 'way') {
      const ring = wayRing(el).map(p => localMeters(origin, p));
      if (ring.length >= 3) footprints.push({ id: 'b-' + el.id, ring, h: buildingHeight(t) });
    }
    if (el.type === 'way' && (t.highway === 'parking_aisle' || t.highway === 'service' || /^(residential|unclassified|tertiary|secondary|primary|living_street)$/.test(t.highway || ''))) {
      const points = wayRing(el).map(p => localMeters(origin, p));
      if (points.length >= 2) {
        const row = { points };
        if (t.highway === 'parking_aisle' || t.highway === 'service') aisles.push(row);
        if (t.highway !== 'parking_aisle') roads.push(row);
      }
    }
  });
  const use = rawPoints.length ? rawPoints : (rawStations.length >= 2 ? rawStations : []);
  const chargers = [];
  use.forEach(el => {
    let at = null;
    if (el.type === 'node' && el.lat != null) at = { lat: el.lat, lon: el.lon };
    else {
      const ring = wayRing(el);
      at = ring.length ? centroidLL(ring) : (el.center && isFinite(el.center.lat) ? { lat: el.center.lat, lon: el.center.lon } : null);
    }
    if (!at) return;
    const loc = localMeters(origin, at);
    chargers.push({ id: el.type + '-' + el.id, lat: at.lat, lon: at.lon, x: loc.x, z: loc.z, heading: 0 });
  });
  const unique = [];
  chargers.forEach(p => {
    if (unique.some(q => (p.x - q.x) ** 2 + (p.z - q.z) ** 2 < 1.44)) return;
    unique.push(p);
  });
  const guides = aisles.length ? aisles : roads;
  unique.forEach(c => {
    const along = nearestBearingPt(c, guides);
    if (along != null) c.heading = along + Math.PI / 2;
  });
  const nearestRoadBearing = nearestBearingPt({ x: 0, z: 0 }, roads.length ? roads : aisles);
  return { origin, chargers: unique, footprints, aisles, roads, nearestRoadBearing };
}
function laidStallAt(stall, x, z, heading) {
  const hx = Math.sin(heading), hz = Math.cos(heading);
  const px = Math.sin(heading + Math.PI / 2), pz = Math.cos(heading + Math.PI / 2);
  const halfW = STALL_W / 2, halfL = STALL_L / 2;
  const at = (sx, sz) => ({ x: x + px * sx + hx * sz, z: z + pz * sx + hz * sz });
  const pillarPos = at(0, -(halfL - 0.22));
  const c1 = at(-halfW, -halfL), c2 = at(-halfW, halfL), c3 = at(halfW, -halfL), c4 = at(halfW, halfL);
  const b1 = at(-halfW, halfL), b2 = at(halfW, halfL);
  return {
    stall, x, z, w: STALL_W, d: STALL_L, heading,
    pillar: { x: pillarPos.x, y: 0, z: pillarPos.z },
    lines: [
      { x1: c1.x, z1: c1.z, x2: c2.x, z2: c2.z },
      { x1: c3.x, z1: c3.z, x2: c4.x, z2: c4.z },
      { x1: c2.x, z1: c2.z, x2: c4.x, z2: c4.z },
    ],
    bollards: [{ x: b1.x, y: 0, z: b1.z }, { x: b2.x, y: 0, z: b2.z }],
  };
}
function shiftLayout(source, row, stalls, footprints, aisles) {
  const xs = [], zs = [];
  const add = (x, z) => { xs.push(x); zs.push(z); };
  if (source === 'approximate') {
    stalls.forEach(s => add(s.x, s.z));
  } else {
    (footprints || []).forEach(f => f.ring.forEach(p => add(p.x, p.z)));
    (aisles || []).forEach(a => a.points.forEach(p => add(p.x, p.z)));
    stalls.forEach(s => add(s.x, s.z));
  }
  const padAmt = source === 'approximate' ? 8 : 5;
  const minX = (xs.length ? Math.min.apply(null, xs) : -7) - padAmt;
  const maxX = (xs.length ? Math.max.apply(null, xs) : 7) + padAmt;
  const minZ = (zs.length ? Math.min.apply(null, zs) : -6) - padAmt;
  const maxZ = (zs.length ? Math.max.apply(null, zs) : 6) + padAmt;
  const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
  const sh = (x, z) => ({ x: x - cx, z: z - cz });
  const footprints2 = (footprints || []).map(f => ({ ...f, ring: f.ring.map(p => sh(p.x, p.z)) }));
  const aisles2 = (aisles || []).map(a => ({ points: a.points.map(p => sh(p.x, p.z)) }));
  const stalls2 = stalls.map(s => ({
    ...s,
    x: s.x - cx, z: s.z - cz,
    pillar: { ...s.pillar, x: s.pillar.x - cx, z: s.pillar.z - cz },
    lines: s.lines.map(l => ({ x1: l.x1 - cx, z1: l.z1 - cz, x2: l.x2 - cx, z2: l.z2 - cz })),
    bollards: s.bollards.map(b => ({ ...b, x: b.x - cx, z: b.z - cz })),
  }));
  const base = layoutFromRow({ listed: row.listed, stalls: [], hidden: row.hidden, dcCount: row.dcCount, l2Count: row.l2Count });
  return {
    listed: row.listed, hidden: row.hidden, dcCount: row.dcCount, l2Count: row.l2Count,
    source, footprints: footprints2, aisles: aisles2,
    building: footprints2.length ? null : base.building,
    pad: { w: Math.max(12, maxX - minX), d: Math.max(10, maxZ - minZ), h: 0.18 },
    stalls: stalls2,
  };
}
function layoutLotFromOsm(row, features) {
  row = row || { listed: false, stalls: [], hidden: 0, dcCount: 0, l2Count: 0 };
  const footprints = (features && features.footprints) || [];
  const aisles = (features && features.aisles) || [];
  if (features && features.chargers && features.chargers.length && row.listed) {
    const cap = LOT_SCENE_CAP;
    const n = Math.min(features.chargers.length, cap);
    const stalls = [];
    for (let i = 0; i < n; i++) {
      const ch = features.chargers[i];
      const stall = row.stalls[i % Math.max(1, row.stalls.length)] || row.stalls[0];
      if (!stall) break;
      stalls.push(laidStallAt({ ...stall, key: stall.key + '-osm-' + ch.id }, ch.x, ch.z, ch.heading || 0));
    }
    const hidden = Math.max(0, (row.dcCount + row.l2Count) - n);
    return shiftLayout('osm', { ...row, hidden }, stalls, footprints, aisles);
  }
  if (!row.listed || !row.stalls || !row.stalls.length) {
    const empty = layoutFromRow(row);
    return { ...empty, source: 'approximate', footprints, aisles, building: footprints.length ? null : empty.building };
  }
  const road = (features && features.nearestRoadBearing) || 0;
  const n = row.stalls.length, span = (n - 1) * (STALL_W + STALL_GAP);
  const ax = Math.sin(road), az = Math.cos(road), stallHeading = road + Math.PI / 2;
  const stalls = row.stalls.map((stall, i) => {
    const t = -span / 2 + i * (STALL_W + STALL_GAP);
    return laidStallAt(stall, ax * t, az * t, stallHeading);
  });
  return shiftLayout('approximate', row, stalls, footprints, aisles);
}

let lotOsmLastAt = 0;
const lotOsmInflight = new Map();
function lotOsmCacheKey(s) {
  if (s && s.id) return String(s.id);
  const lat = s.lat, lon = s.lon != null ? s.lon : s.lng;
  return Number(lat).toFixed(5) + ',' + Number(lon).toFixed(5);
}
function readLotOsmCache(s, now) {
  try {
    const all = JSON.parse(localStorage.getItem(LOT_OSM_STORE) || '{}');
    const entry = all[lotOsmCacheKey(s)];
    if (!entry || !entry.savedAt || now - entry.savedAt > LOT_OSM_CACHE_MAX_AGE_MS) return null;
    if (!entry.features || !Array.isArray(entry.features.chargers)) return null;
    return entry.features;
  } catch (e) { return null; }
}
function writeLotOsmCache(s, features, now) {
  try {
    const all = JSON.parse(localStorage.getItem(LOT_OSM_STORE) || '{}');
    all[lotOsmCacheKey(s)] = { savedAt: now, features };
    localStorage.setItem(LOT_OSM_STORE, JSON.stringify(all));
  } catch (e) {}
}
async function fetchLotOsm(s) {
  if (!s || s.lat == null) return Promise.resolve(null);
  const lon = s.lon != null ? s.lon : s.lng;
  if (lon == null) return Promise.resolve(null);
  const now = Date.now();
  const cached = readLotOsmCache(s, now);
  if (cached) return Promise.resolve(cached);
  const key = lotOsmCacheKey(s);
  if (lotOsmInflight.has(key)) return lotOsmInflight.get(key);
  const run = (async () => {
    const wait = LOT_OSM_MIN_INTERVAL_MS - (now - lotOsmLastAt);
    if (lotOsmLastAt && wait > 0 && wait < 8000) await new Promise(r => setTimeout(r, wait));
    lotOsmLastAt = Date.now();
    const query = buildLotOverpassQuery(s.lat, lon);
    try {
      let data = null;
      for (const url of ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://overpass.openstreetmap.fr/api/interpreter']) {
        const ac = new AbortController();
        const t = setTimeout(() => ac.abort(), 8000);
        try {
          const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'Accept': 'application/json' }, body: 'data=' + encodeURIComponent(query), signal: ac.signal });
          if (!r.ok) continue;
          data = await r.json();
          break;
        } catch (e) {}
        finally { clearTimeout(t); }
      }
      if (!data) return null;
      const features = parseOsmLot(data, { lat: s.lat, lon });
      writeLotOsmCache(s, features, Date.now());
      return features;
    } catch (e) { return null; }
    finally { lotOsmInflight.delete(key); }
  })();
  lotOsmInflight.set(key, run);
  return run;
}
function updateLotBadge(dock, layout, features) {
  if (!dock) return;
  const cap = dock.querySelector('.c1-3d-lot-cap');
  if (!cap) return;
  const src = layout && layout.source === 'osm'
    ? lotLL('Layout from OpenStreetMap', 'Disposición de OpenStreetMap')
    : lotLL('Approximate layout', 'Disposición aproximada');
  const note = layout && layout.source === 'osm' ? '' : (lotLL('Layout is approximate', 'La disposición es aproximada') + '<br>');
  const attrib = features ? ('<div style="font-size:10px;margin-top:2px">' + lotLL('Data © OpenStreetMap contributors', 'Datos © colaboradores de OpenStreetMap') + '</div>') : '';
  let badge = dock.querySelector('.c1-3d-lot-badge');
  if (!badge) {
    badge = document.createElement('div');
    badge.className = 'c1-3d-lot-badge';
    badge.style.cssText = 'text-align:center;font-size:12px;font-weight:800;color:#F4F7FB;margin:8px 0 0;line-height:16px';
    const lot = dock.querySelector('.c1-3d-lot');
    if (lot && lot.parentNode) lot.parentNode.insertBefore(badge, lot.nextSibling);
    else dock.insertBefore(badge, cap);
  }
  badge.textContent = src;
  cap.innerHTML = note + lotLL('Live status coming soon', 'Estado en vivo próximamente') + attrib;
  cap.hidden = false;
  cap.style.overflow = 'visible';
}
function colsForLot(n) {
  if (n <= 0) return 1;
  if (n <= 4) return n;
  if (n <= 10) return Math.ceil(n / 2);
  return Math.min(6, Math.ceil(n / Math.ceil(n / 6)));
}
function emptyBuilding(padW, padD) {
  const bw = Math.min(10, Math.max(6.5, padW * 0.48));
  const bd = 4.2;
  const bx = -padW / 2 + bw / 2 + 0.6;
  const bz = -padD / 2 + bd / 2 + 0.35;
  return {
    x: bx, z: bz, w: bw, d: bd, h: 3.4,
    annex: { x: bx - bw / 2 - 1.05, z: bz + 0.15, w: 1.9, d: 2.6, h: 2.2 },
    utility: { x: bx - bw / 2 - 2.35, z: bz - 0.4, w: 1.1, d: 1.2, h: 1.5 },
    glass: { x: bx, z: bz + bd / 2 - 0.08, w: bw * 0.92, d: 0.12, h: 2.7 },
    mats: [
      { x: bx - bw * 0.18, z: bz + bd / 2 + 0.85, w: 2.2, d: 1.5 },
      { x: bx + bw * 0.22, z: bz + bd / 2 + 0.85, w: 2.2, d: 1.5 },
    ],
  };
}
function layoutFromRow(row) {
  row = row || { listed: false, stalls: [], hidden: 0, dcCount: 0, l2Count: 0 };
  if (!row.listed || !row.stalls || !row.stalls.length) {
    const pad = { w: 14, d: 12, h: 0.18 };
    return { listed: !!row.listed, hidden: 0, dcCount: row.dcCount || 0, l2Count: row.l2Count || 0, source: "approximate", pad, building: emptyBuilding(pad.w, pad.d), footprints: [], aisles: [], stalls: [] };
  }
  const n = row.stalls.length;
  const cols = colsForLot(n);
  const rows = Math.ceil(n / cols);
  const gridW = cols * STALL_W + (cols - 1) * STALL_GAP;
  const gridD = rows * STALL_L + (rows - 1) * AISLE;
  const court = 5.4;
  const padW = Math.max(14, gridW + 6.4);
  const padD = Math.max(12, gridD + court + 5.2);
  const pad = { w: padW, d: padD, h: 0.18 };
  const building = emptyBuilding(padW, padD);
  const originX = -gridW / 2 + STALL_W / 2 + 1.4;
  const originZ = building.z + building.d / 2 + court / 2 + STALL_L / 2;
  const stalls = row.stalls.map((stall, i) => {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const x = originX + c * (STALL_W + STALL_GAP);
    const z = originZ + r * (STALL_L + AISLE);
    const halfW = STALL_W / 2, halfL = STALL_L / 2;
    return {
      stall, x, z, w: STALL_W, d: STALL_L,
      pillar: { x, y: 0, z: z - halfL + 0.22 },
      lines: [
        { x1: x - halfW, z1: z - halfL, x2: x - halfW, z2: z + halfL },
        { x1: x + halfW, z1: z - halfL, x2: x + halfW, z2: z + halfL },
        { x1: x - halfW, z1: z + halfL, x2: x + halfW, z2: z + halfL },
      ],
      bollards: [
        { x: x - halfW, y: 0, z: z + halfL },
        { x: x + halfW, y: 0, z: z + halfL },
      ],
    };
  });
  return { listed: true, hidden: row.hidden || 0, dcCount: row.dcCount, l2Count: row.l2Count, source: "approximate", pad, building, footprints: [], aisles: [], stalls };
}

function lotSceneSvg(layout, opts) {
  opts = opts || {};
  const W = 480, H = 250;
  const pad = layout.pad;
  const span = Math.max(pad.w, pad.d, 8);
  const yaw = 0.58, pitch = 0.66, scale = 210 / span * (opts.zoom || 1);
  const tgt = { x: 0.3, y: 0.2, z: 0.4 };
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  function proj(x, y, z) {
    const tx = x - tgt.x, ty = y - tgt.y, tz = z - tgt.z;
    const x1 = tx * cy + tz * sy;
    const z1 = -tx * sy + tz * cy;
    const y2 = ty * cp - z1 * sp;
    const z2 = ty * sp + z1 * cp;
    return { x: W / 2 + x1 * scale, y: H * 0.64 - y2 * scale, d: z2 };
  }
  function box(x, y, z, w, h, dpth, top, side, front, key) {
    const hx = w / 2, hd = dpth / 2;
    const c = [
      [x - hx, y, z - hd], [x + hx, y, z - hd], [x + hx, y, z + hd], [x - hx, y, z + hd],
      [x - hx, y + h, z - hd], [x + hx, y + h, z - hd], [x + hx, y + h, z + hd], [x - hx, y + h, z + hd],
    ].map(p => proj(p[0], p[1], p[2]));
    const sides = [
      { i: [4, 5, 6, 7], f: top },
      { i: [0, 1, 5, 4], f: side },
      { i: [1, 2, 6, 5], f: front },
      { i: [2, 3, 7, 6], f: side },
      { i: [3, 0, 4, 7], f: front },
    ];
    return sides.map(s => {
      const pts = s.i.map(i => c[i]);
      const depth = s.i.reduce((a, i) => a + c[i].d, 0) / s.i.length;
      const d = 'M' + pts.map(p => p.x.toFixed(1) + ' ' + p.y.toFixed(1)).join('L') + 'Z';
      return `<path d="${d}" fill="${s.f}" stroke="#b0b6be" stroke-width="0.6" stroke-linejoin="round"${key ? ' data-stall="' + key + '"' : ''}/>`;
    }).map((html, idx) => ({ html, d: sides[idx].i.reduce((a, i) => a + c[i].d, 0) / sides[idx].i.length }));
  }
  const faces = [];
  faces.push(...box(0, -pad.h, 0, pad.w, pad.h, pad.d, '#C5CAD1', '#A8AEB6', '#B0B6BE'));
  const b = layout.building;
  if (b) {
    faces.push(...box(b.x, 0, b.z, b.w, b.h, b.d, '#D5D8DD', '#9EA4AC', '#B8BDC4'));
    if (!opts.lowEnd) {
      faces.push(...box(b.annex.x, 0, b.annex.z, b.annex.w, b.annex.h, b.annex.d, '#D9D3C8', '#C4BDB0', '#D9D3C8'));
      faces.push(...box(b.utility.x, 0, b.utility.z, b.utility.w, b.utility.h, b.utility.d, '#A8ADB5', '#9EA4AC', '#A8ADB5'));
      b.mats.forEach(m => faces.push(...box(m.x, 0.02, m.z, m.w, 0.03, m.d, '#1E3A6E', '#1E3A6E', '#1E3A6E')));
    }
    faces.push(...box(b.glass.x, 0.35, b.glass.z, b.glass.w, b.glass.h, 0.14, '#1E6C74', '#1E6C74', '#3AA0A8'));
  }
  (layout.footprints || []).forEach(fp => {
    const xs = fp.ring.map(pt => pt.x), zs = fp.ring.map(pt => pt.z);
    const minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs);
    const minZ = Math.min.apply(null, zs), maxZ = Math.max.apply(null, zs);
    faces.push(...box((minX + maxX) / 2, 0, (minZ + maxZ) / 2, Math.max(1, maxX - minX), fp.h || 6, Math.max(1, maxZ - minZ), '#D5D8DD', '#9EA4AC', '#B8BDC4'));
  });
  (layout.stalls || []).forEach(st => {
    st.lines.forEach(ln => {
      const a = proj(ln.x1, 0.04, ln.z1), c = proj(ln.x2, 0.04, ln.z2);
      faces.push({ html: `<path d="M${a.x.toFixed(1)} ${a.y.toFixed(1)}L${c.x.toFixed(1)} ${c.y.toFixed(1)}" stroke="#F7F8FA" stroke-width="2" fill="none"/>`, d: (a.d + c.d) / 2 - 0.01 });
    });
    if (!opts.lowEnd) {
      st.bollards.forEach(bol => faces.push(...box(bol.x, 0, bol.z, 0.12, 0.7, 0.12, '#E8A317', '#C4840C', '#E8A317')));
    }
    const p = st.pillar, key = st.stall.key;
    faces.push(...box(p.x, 0, p.z, 0.46, 1.55, 0.32, '#E8EAED', '#C9CDD4', '#E8EAED', key));
    faces.push(...box(p.x, 0.55, p.z + 0.15, 0.3, 0.7, 0.06, '#5B6570', '#5B6570', '#5B6570', key));
    faces.push(...box(p.x, 1.15, p.z + 0.16, 0.2, 0.16, 0.04, '#9EC9DC', '#9EC9DC', '#9EC9DC', key));
    const lamp = proj(p.x, 1.66, p.z);
    const status = readStallStatus({ stationId: opts.stationId, stallKey: key });
    const col = '#' + stallLightColor(status).toString(16).padStart(6, '0');
    faces.push({ html: `<circle cx="${lamp.x.toFixed(1)}" cy="${lamp.y.toFixed(1)}" r="4.2" fill="${col}" stroke="#fff" stroke-width="0.8" data-stall="${key}"/>`, d: lamp.d + 0.2 });
  });
  faces.sort((a, b) => a.d - b.d);
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 250" width="100%" height="100%" role="img" aria-label="Station lot layout"><rect width="480" height="250" fill="#EEF1F4"/>' + faces.map(f => f.html).join('') + '</svg>';
}

function addLotBox(root, x, y, z, w, h, d, color, extra) {
  const o = mesh(GEO.box, color, w, h, d, extra);
  add(root, o, x, y + h / 2, z);
  return o;
}

function buildLotGroup(layout, opts) {
  opts = opts || {};
  const root = new THREE.Group();
  const low = !!opts.lowEnd;
  const pad = layout.pad;
  addLotBox(root, 0, -pad.h, 0, pad.w, pad.h, pad.d, 0xc5cad1);
  const b = layout.building;
  if (b) {
    addLotBox(root, b.x, 0, b.z, b.w, b.h, b.d, 0xb8bdc4);
    const roof = mesh(GEO.box, 0xd5d8dd, b.w + 0.08, 0.1, b.d + 0.08);
    add(root, roof, b.x, b.h + 0.05, b.z);
    if (!low) {
      addLotBox(root, b.annex.x, 0, b.annex.z, b.annex.w, b.annex.h, b.annex.d, 0xd9d3c8);
      addLotBox(root, b.utility.x, 0, b.utility.z, b.utility.w, b.utility.h, b.utility.d, 0xa8adb5);
      b.mats.forEach(m => addLotBox(root, m.x, 0.02, m.z, m.w, 0.03, m.d, 0x1e3a6e));
    }
    const glass = addLotBox(root, b.glass.x, 0.35, b.glass.z, b.glass.w, b.glass.h, 0.14, 0x2a8a92, { transparent: true, opacity: 0.88, emissive: 0x1e6c74, emissiveIntensity: 0.18 });
    glass.userData.glass = true;
  }
  (layout.footprints || []).forEach(fp => {
    const xs = fp.ring.map(pt => pt.x), zs = fp.ring.map(pt => pt.z);
    const minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs);
    const minZ = Math.min.apply(null, zs), maxZ = Math.max.apply(null, zs);
    const w = Math.max(1, maxX - minX), dpth = Math.max(1, maxZ - minZ), h = fp.h || 6;
    addLotBox(root, (minX + maxX) / 2, 0, (minZ + maxZ) / 2, w, h, dpth, 0xb8bdc4);
    const roof = mesh(GEO.box, 0xd5d8dd, w + 0.06, 0.1, dpth + 0.06);
    add(root, roof, (minX + maxX) / 2, h + 0.05, (minZ + maxZ) / 2);
  });
  if (!low) {
    (layout.aisles || []).forEach(aisle => {
      for (let i = 1; i < aisle.points.length; i++) {
        const a = aisle.points[i - 1], c = aisle.points[i];
        const dx = c.x - a.x, dz = c.z - a.z, len = Math.hypot(dx, dz) || 1;
        const line = mesh(GEO.box, 0xd5d8de, 0.35, 0.03, len);
        line.position.set((a.x + c.x) / 2, 0.03, (a.z + c.z) / 2);
        line.rotation.y = Math.atan2(dx, dz);
        root.add(line);
      }
    });
  }
  const pickables = [];
  (layout.stalls || []).forEach(st => {
    st.lines.forEach(ln => {
      const dx = ln.x2 - ln.x1, dz = ln.z2 - ln.z1, len = Math.hypot(dx, dz) || 1;
      const line = mesh(GEO.box, 0xf7f8fa, 0.07, 0.03, len);
      line.position.set((ln.x1 + ln.x2) / 2, 0.04, (ln.z1 + ln.z2) / 2);
      line.rotation.y = Math.atan2(dx, dz);
      root.add(line);
    });
    if (!low) {
      st.bollards.forEach(bol => {
        const post = mesh(GEO.cyl, 0xe8a317, 0.055, 0.7, 0.055);
        add(root, post, bol.x, 0.35, bol.z);
      });
    }
    const p = st.pillar;
    const body = addLotBox(root, p.x, 0, p.z, 0.46, 1.55, 0.32, st.stall.fits ? 0xe8eaed : 0xe8eaed, st.stall.fits ? { emissive: 0x3b7bff, emissiveIntensity: 0.08 } : undefined);
    body.userData.stall = st;
    const screen = addLotBox(root, p.x, 0.55, p.z + 0.15, 0.3, 0.7, 0.06, 0x5b6570);
    screen.userData.stall = st;
    const disp = addLotBox(root, p.x, 1.15, p.z + 0.16, 0.2, 0.16, 0.04, 0x9ec9dc, { emissive: 0x9ec9dc, emissiveIntensity: 0.2 });
    disp.userData.stall = st;
    const status = readStallStatus({ stationId: opts.stationId, stallKey: st.stall.key });
    const lamp = mesh(GEO.sphereLo, stallLightColor(status), 0.09, 0.09, 0.09, { emissive: stallLightColor(status), emissiveIntensity: 0.35 });
    add(root, lamp, p.x, 1.66, p.z);
    lamp.userData.stall = st;
    pickables.push(body, screen, disp, lamp);
  });
  root.userData.pickables = pickables;
  return root;
}

function showLotInspect(el, text) {
  const host = el && (el.closest && el.closest('.c1-3d-dock, #c1-3d-dock-station, .c1gl-host') || el.parentNode);
  const cap = (host && host.parentNode && host.parentNode.querySelector('.c1-3d-lot-inspect'))
    || (el && el.parentNode && el.parentNode.querySelector('.c1-3d-lot-inspect'))
    || document.querySelector('.c1-3d-lot-inspect');
  if (!cap) return;
  if (text) {
    cap.textContent = text;
    cap.style.display = 'block';
  } else {
    cap.textContent = '';
    cap.style.display = 'none';
  }
}

function attachLotControls(m, layout, opts) {
  const canvas = m.canvas;
  const state = m.state;
  state.yaw = 0.58;
  state.pitch = 0.66;
  state.zoom = 1;
  state.vel = 0;
  if (m.still) return;
  let pid = null, lastX = 0, lastY = 0, moved = 0, startDist = 0, startZoom = 1, pointers = new Map();
  const pt = (ev, i) => {
    const t = ev.touches ? ev.touches[i] : ev;
    return { x: t.clientX, y: t.clientY, id: t.identifier != null ? t.identifier : ev.pointerId };
  };
  const pinchD = () => {
    if (pointers.size < 2) return 0;
    const pts = [...pointers.values()];
    return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  };
  const down = (ev) => {
    if (ev.pointerType !== 'mouse' && ev.preventDefault) ev.preventDefault();
    const p = { x: ev.clientX, y: ev.clientY };
    pointers.set(ev.pointerId != null ? ev.pointerId : 0, p);
    if (pointers.size >= 2) {
      startDist = pinchD();
      startZoom = state.zoom || 1;
      moved = 8;
      return;
    }
    pid = ev.pointerId;
    lastX = ev.clientX; lastY = ev.clientY; moved = 0;
    state.dragging = true; state.vel = 0;
  };
  const move = (ev) => {
    if (pointers.has(ev.pointerId != null ? ev.pointerId : 0)) {
      pointers.set(ev.pointerId != null ? ev.pointerId : 0, { x: ev.clientX, y: ev.clientY });
    }
    if (pointers.size >= 2 && startDist > 0) {
      const d = pinchD();
      state.zoom = pinchScale(startDist, d, startZoom, 0.7, 1.9);
      moved += 4;
      return;
    }
    if (state.dragging) {
      const dx = ev.clientX - lastX, dy = ev.clientY - lastY;
      lastX = ev.clientX; lastY = ev.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      state.yaw += dx * 0.008;
      state.pitch = Math.max(0.35, Math.min(1.15, (state.pitch || 0.66) + dy * 0.005));
    }
  };
  const up = (ev) => {
    pointers.delete(ev.pointerId != null ? ev.pointerId : 0);
    if (pointers.size < 2) startDist = 0;
    if (!state.dragging) return;
    state.dragging = false;
    if (moved > 12) return;
    const rect = canvas.getBoundingClientRect();
    const x = ev.clientX - rect.left, y = ev.clientY - rect.top;
    const ndc = new THREE.Vector2((x / Math.max(rect.width, 1)) * 2 - 1, -(y / Math.max(rect.height, 1)) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, m.camera);
    const hits = ray.intersectObjects(m.root && m.root.userData.pickables || [], true);
    const hit = hits.find(h => h.object && h.object.userData && h.object.userData.stall);
    if (hit) {
      const st = hit.object.userData.stall;
      showLotInspect(m.el, stallInspectLabel(st.stall, opts.maxKw, opts.network));
    } else {
      showLotInspect(m.el, '');
    }
  };
  canvas.style.touchAction = 'none';
  canvas.addEventListener('pointerdown', down);
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
  m._lotOff = () => {
    canvas.removeEventListener('pointerdown', down);
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);
  };
}

function mountLot(el, row, opts) {
  if (!el) return null;
  opts = opts || {};
  if (!row || !row.listed || !row.stalls || !row.stalls.length) {
    el.innerHTML = '<div class="c1lot-missing muted">Charger count not listed</div>';
    return null;
  }
  const low = typeof chargeLowEnd === 'function' ? chargeLowEnd() : false;
  const layout = layoutLotFromOsm(row, opts.features);
  el.innerHTML = lotSceneSvg(layout, { lowEnd: low, stationId: opts.stationId });
  const mounted = startMount('lot', el, opts.height || 220, (m) => {
    const root = buildLotGroup(layout, { lowEnd: low, stationId: opts.stationId });
    m.scene.add(root);
    m.root = root;
    try { m.renderer.setClearColor(LOT_BG, 1); } catch (e) {}
    try { m.scene.background = new THREE.Color(LOT_BG); } catch (e) {}
    const span = Math.max(layout.pad.w, layout.pad.d, 8);
    const baseDist = Math.max(16, span * 1.15);
    m.camera.fov = 30;
    m.camera.near = 0.2;
    m.camera.far = Math.max(400, baseDist * 4);
    m.camera.updateProjectionMatrix();
    m.state.yaw = 0.58;
    m.state.pitch = 0.66;
    m.state.zoom = 1;
    const look = new THREE.Vector3(0.3, 0.4, 0.4);
    const placeCam = () => {
      const yaw = m.still ? 0.58 : m.state.yaw;
      const pitch = m.still ? 0.66 : Math.max(0.35, Math.min(1.15, m.state.pitch || 0.66));
      const dist = baseDist / Math.max(0.7, m.state.zoom || 1);
      m.camera.position.set(
        look.x + dist * Math.sin(yaw) * Math.cos(pitch),
        look.y + dist * Math.sin(pitch),
        look.z + dist * Math.cos(yaw) * Math.cos(pitch),
      );
      m.camera.lookAt(look);
    };
    placeCam();
    attachLotControls(m, layout, opts);
    m.update = () => { placeCam(); };
  });
  if (el.parentNode) {
    let more = el.parentNode.querySelector('.c1lot-more-gl');
    if (row.hidden > 0) {
      if (!more) {
        more = document.createElement('div');
        more.className = 'c1lot-more c1lot-more-gl';
        more.style.cssText = 'color:#3B7BFF;font-weight:800;padding:0 8px';
        el.parentNode.appendChild(more);
      }
      more.textContent = '+' + row.hidden + ' more';
    } else if (more) {
      more.remove();
    }
  }
  return mounted;
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
  add(g, mesh(GEO.box, CHARGE_GRAY, 0.34, 2.2, 0.3, { flatShading: true }), 0, 1.16, 0);
  add(g, mesh(GEO.box, CHARGE_GRAY_DK, 0.4, 0.1, 0.36, { flatShading: true }), 0, 0.05, 0);
  // framed plug/bolt pictogram — not a battery gauge
  add(g, mesh(GEO.box, 0x1a2430, 0.16, 0.28, 0.02, { flatShading: true }), 0, 1.82, 0.165);
  const iconHalo = mesh(GEO.box, CHARGE_TEAL, 0.17, 0.3, 0.015, { emissive: CHARGE_TEAL, emissiveIntensity: 0.55, transparent: true, opacity: 0.4 });
  add(g, iconHalo, 0, 1.82, 0.16);
  const ring = mesh(GEO.box, CHARGE_TEAL, 0.12, 0.22, 0.02, { emissive: CHARGE_TEAL, emissiveIntensity: 0.35, transparent: true, opacity: 0.35 });
  add(g, ring, 0, 1.8, 0.175);
  ;[[0, 0.1, 0.12, 0.018],[0, -0.1, 0.12, 0.018],[0.055, 0, 0.018, 0.2],[-0.055, 0, 0.018, 0.2]].forEach((p) => {
    const edge = mesh(GEO.box, CHARGE_TEAL, p[2], p[3], 0.02, { emissive: CHARGE_TEAL, emissiveIntensity: 0.95 });
    add(g, edge, p[0], 1.8 + p[1], 0.185);
    (g.userData.iconEdges || (g.userData.iconEdges = [])).push(edge);
  });
  const nub = mesh(GEO.box, CHARGE_TEAL, 0.04, 0.045, 0.02, { emissive: CHARGE_TEAL, emissiveIntensity: 0.95 });
  add(g, nub, 0, 1.94, 0.185);
  const boltI = mesh(GEO.box, CHARGE_TEAL, 0.035, 0.1, 0.02, { emissive: CHARGE_TEAL, emissiveIntensity: 1 });
  add(g, boltI, 0, 1.78, 0.19);
  add(g, mesh(GEO.box, 0x1a2430, 0.2, 0.16, 0.04, { flatShading: true }), 0, 1.42, 0.165);
  add(g, mesh(GEO.box, 0x2a3848, 0.16, 0.04, 0.02, { flatShading: true }), 0, 1.42, 0.19);
  g.userData.iconMats = [iconHalo.material, ring.material, nub.material, boltI.material].concat((g.userData.iconEdges || []).map((e) => e.material));
  return g;
}

/** Generic gray coupe-SUV, nose +X, no badge, grille, or brand silhouette. */
function buildChargeCar() {
  const g = new THREE.Group();
  const col = CHARGE_GRAY;
  const flat = { flatShading: true };
  const glassOpt = { transparent: true, opacity: 0.88, flatShading: true };
  // closed liftback hull — one lower body + one sloped cabin, no truck bed
  add(g, mesh(GEO.box, col, 2.0, 0.44, 0.98, flat), 0.0, 0.48, 0);
  add(g, mesh(GEO.sphere, col, 1.02, 0.24, 0.5, flat), 0.02, 0.56, 0);
  add(g, mesh(GEO.sphere, col, 0.3, 0.24, 0.47, flat), 0.92, 0.5, 0);
  add(g, mesh(GEO.box, col, 0.14, 0.48, 0.96, flat), -0.96, 0.54, 0);
  add(g, mesh(GEO.box, CHARGE_GRAY_LT, 0.03, 0.1, 0.24, flat), -1.04, 0.5, 0);
  const cabin = mesh(GEO.box, col, 1.55, 0.4, 0.86, flat);
  cabin.rotation.z = -0.2;
  cabin.position.set(0.06, 0.82, 0);
  g.add(cabin);
  const roofSoft = mesh(GEO.sphere, col, 0.72, 0.2, 0.44, flat);
  roofSoft.position.set(0.1, 0.94, 0);
  g.add(roofSoft);
  const wind = mesh(GEO.box, 0x243240, 0.4, 0.28, 0.8, glassOpt);
  wind.rotation.z = 0.38;
  wind.position.set(0.55, 0.82, 0);
  g.add(wind);
  const rearGlass = mesh(GEO.box, 0x243240, 0.55, 0.24, 0.8, glassOpt);
  rearGlass.rotation.z = -0.32;
  rearGlass.position.set(-0.48, 0.84, 0);
  g.add(rearGlass);
  const tails = [];
  ;[-1, 1].forEach((s) => {
    const lamp = mesh(GEO.box, 0xe01018, 0.04, 0.07, 0.28, { emissive: 0xe01018, emissiveIntensity: 0.95 });
    add(g, lamp, -1.02, 0.7, s * 0.33);
    tails.push(lamp);
  });
  g.userData.tails = tails;
  const port = mesh(GEO.box, CHARGE_GRAY_DK, 0.06, 0.1, 0.08, flat);
  add(g, port, -0.9, 0.64, 0.5);
  const portGlow = mesh(GEO.sphere, CHARGE_TEAL, 0.03, 0.03, 0.03, { emissive: CHARGE_TEAL, emissiveIntensity: 0.7 });
  add(g, portGlow, -0.86, 0.64, 0.5);
  g.userData.port = portGlow;
  [[-0.62, -0.52], [-0.62, 0.52], [0.62, -0.52], [0.62, 0.52]].forEach(([x, z]) => {
    const w = new THREE.Group();
    const tire = mesh(GEO.cyl, 0x1a1f26, 0.22, 0.16, 0.22, flat);
    tire.rotation.x = Math.PI / 2;
    w.add(tire);
    const rim = mesh(GEO.cyl, CHARGE_GRAY_LT, 0.12, 0.17, 0.12, flat);
    rim.rotation.x = Math.PI / 2;
    w.add(rim);
    w.position.set(x, 0.22, z);
    g.add(w);
  });
  return g;
}

function makeChargeCurve() {
  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.38, 1.05, 0.28),
    new THREE.Vector3(-1.05, 0.45, 0.38),
    new THREE.Vector3(-0.55, 0.1, 0.48),
    new THREE.Vector3(-0.05, 0.1, 0.52),
    new THREE.Vector3(0.12, 0.64, 0.5),
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
      if (o.isAmbientLight) o.intensity = 0.28;
      if (o.isDirectionalLight) o.intensity *= 0.38;
    });
    try { m.scene.background = new THREE.Color(0x0b1b28); } catch (e) {}
    if (!low) {
      const bgMat = new THREE.ShaderMaterial({
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: 'varying vec2 vUv; void main(){ vec3 a = vec3(0.035, 0.10, 0.145); vec3 b = vec3(0.13, 0.18, 0.227); gl_FragColor = vec4(mix(a, b, vUv.y), 1.0); }',
        depthWrite: false,
      });
      const bg = new THREE.Mesh(new THREE.PlaneGeometry(28, 16), bgMat);
      bg.position.set(-0.2, 1.3, -6);
      root.add(bg);
    }
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 10), new THREE.MeshBasicMaterial({ color: 0x1a2733 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0.1, 0, 0.2);
    root.add(floor);
    const shadow = mesh(GEO.sphere, 0x000000, 2.1, 0.06, 0.8, { transparent: true, opacity: 0.28 });
    add(root, shadow, 0.15, 0.04, 0.05);

    const pillar = buildChargePillar();
    pillar.position.set(-1.58, 0, 0.12);
    pillar.rotation.y = 0.42;
    root.add(pillar);
    const car = buildChargeCar();
    car.position.set(1.02, 0, 0);
    root.add(car);

    const curve = makeChargeCurve();
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, low ? 16 : 32, 0.028, 8, false),
      hexMat(0x1a2430)
    );
    root.add(tube);
    const beadN = low ? 3 : 6;
    const beads = [];
    for (let i = 0; i < beadN; i++) {
      const b = mesh(GEO.sphere, CHARGE_TEAL, 0.045, 0.045, 0.045, { emissive: CHARGE_TEAL, emissiveIntensity: 1 });
      root.add(b);
      beads.push(b);
      b.position.copy(curve.getPoint(i / beadN));
    }

    const basePos = new THREE.Vector3(-2.35, 1.62, 3.95);
    const look = new THREE.Vector3(0.15, 0.78, 0.05);
    m.camera.position.copy(basePos);
    m.camera.lookAt(look);
    m.camera.fov = 32;
    m.camera.updateProjectionMatrix();

    m.update = (_dt, now) => {
      const still = m.still;
      const icon = still ? 0.75 : 0.5 + 0.5 * (0.5 + 0.5 * Math.sin(now / 420));
      (pillar.userData.iconMats || []).forEach((mat) => { mat.emissiveIntensity = icon; });
      const tail = still ? 0.9 : 0.75 + 0.35 * (0.5 + 0.5 * Math.sin(now / 640));
      (car.userData.tails || []).forEach((lamp) => { lamp.material.emissiveIntensity = tail; });
      const period = 2800;
      const base = still ? 0 : ((now % period) / period);
      beads.forEach((b, i) => {
        b.position.copy(curve.getPoint((base + i / beadN) % 1));
      });
      if (still || low) {
        m.camera.position.copy(basePos);
      } else {
        m.camera.position.set(
          basePos.x + 0.1 * Math.sin(now / 1800),
          basePos.y + 0.04 * Math.sin(now / 2200),
          basePos.z + 0.08 * Math.cos(now / 2000)
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
      + '<div class="c1-3d-lot" style="height:220px;min-height:220px;margin:4px 0 0;background:#EEF1F4;border-radius:12px;overflow:hidden"></div>'
      + '<div class="c1-3d-lot-inspect" style="display:none;font-size:13px;font-weight:800;text-align:center;margin:6px 0 0;color:#F4F7FB"></div>'
      + '<div class="c1-3d-lot-cap muted" style="font-size:11px;text-align:center;margin:4px 0 2px;line-height:15px">Approximate layout<br>Layout is approximate<br>Live status coming soon</div>'
      + '<div class="c1-3d-lot-legend muted" style="font-size:11px;text-align:center;margin:0 0 6px;line-height:15px">When live status arrives: <span style="color:#22C55E">● Available</span> · <span style="color:#E11D2E">● Busy</span> · <span style="color:#F5A524">▲ Out of order</span></div>';
  }
  // Sit at the top of the Station tab, just under the header, on an opaque card.
  placeStationDock(root, dock);
  return dock;
}

function lotCountsFromStation(s) {
  s = s || {};
  let dc = s.dcPorts, l2 = s.l2Ports;
  const tot = Number(s.total);
  const dcN = Number(dc), l2N = Number(l2);
  if (Number.isFinite(tot) && tot > 0 && tot <= 80) {
    const cur = (Number.isFinite(dcN) ? dcN : 0) + (Number.isFinite(l2N) ? l2N : 0);
    if (cur >= 0 && tot >= cur) {
      if ((dcN > 0 && !(l2N > 0)) || (s.kw >= 50 && !(l2N > 0))) dc = tot, l2 = 0;
      else if ((l2N > 0 && !(dcN > 0)) || (s.kw > 0 && s.kw < 50)) l2 = tot, dc = 0;
    }
  }
  return { dcPorts: dc, l2Ports: l2, portsListed: s.portsListed };
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
    const row = window.buildLotRow(Object.assign({ plugs: s.plugs, userPlug: userPlug(), cap: LOT_SCENE_CAP }, lotCountsFromStation(s)));
    const legend = dock.querySelector('.c1-3d-lot-legend');
    const inspect = dock.querySelector('.c1-3d-lot-inspect');
    if (!row.listed) {
      lotHost.innerHTML = '<div class="c1lot-missing muted">Charger count not listed</div>';
      if (cap) cap.hidden = true;
      if (legend) legend.hidden = true;
      if (inspect) inspect.style.display = 'none';
    } else {
      if (cap) cap.hidden = false;
      if (legend) legend.hidden = false;
      const opts = { stationId: s.id, maxKw: s.maxKw || s.kw, height: 220, network: s.network || s.net };
      const cached = readLotOsmCache(s, Date.now());
      mountLot(lotHost, row, Object.assign({ features: cached }, opts));
      updateLotBadge(dock, layoutLotFromOsm(row, cached), cached);
      const token = (s.id || '') + ':' + s.lat + ',' + (s.lon != null ? s.lon : s.lng);
      dock.setAttribute('data-lot-token', token);
      dock.setAttribute('data-lot-ready', cached ? (layoutLotFromOsm(row, cached).source || 'approximate') : 'pending');
      Promise.resolve(fetchLotOsm(s)).then(features => {
        if (dock.getAttribute('data-lot-token') !== token) return;
        if (features) {
          mountLot(lotHost, row, Object.assign({ features: features }, opts));
          updateLotBadge(dock, layoutLotFromOsm(row, features), features);
        }
        const laid = layoutLotFromOsm(row, features || cached);
        dock.setAttribute('data-lot-ready', (laid && laid.source) || 'approximate');
      }).catch(function () {
        if (dock.getAttribute('data-lot-token') === token) dock.setAttribute('data-lot-ready', 'approximate');
      });
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
  if (charge) fillChargeDock(charge, set, s);
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

window.mountLotScene = mountLot;
window.layoutFromRow = layoutFromRow;
window.layoutLotFromOsm = layoutLotFromOsm;
window.parseOsmLot = parseOsmLot;
window.fetchLotOsm = fetchLotOsm;
window.buildLotOverpassQuery = buildLotOverpassQuery;
window.lotSceneSvg = lotSceneSvg;
window.pendingStallStatusProvider = pendingStallStatusProvider;
window.setStallStatusProvider = setStallStatusProvider;
window.getStallStatusProvider = getStallStatusProvider;
window.readStallStatus = readStallStatus;
window.c1Three = { webgl: webglAvailable(), version: THREE_VERSION, revision: THREE.REVISION, asset: C1_ASSET_V, ready: false, remount: remountAll, webglAvailable, mountLot };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
