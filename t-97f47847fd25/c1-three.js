/**
 * Kilolane mock 3D scenes — three.js 0.187.0 (vendored).
 * Falls back to the existing SVG/CSS visuals if WebGL is missing.
 * Light for older iPhones: shared unit geometry, Lambert, no shadows, DPR cap, pause offscreen.
 */
import * as THREE from './vendor/three-0.187.0.module.min.js?v=20261113p15';

const THREE_VERSION = '0.187.0';
const C1_ASSET_V = '20261113p15';
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
  sphere: new THREE.SphereGeometry(1, 16, 12),
  sphereLo: new THREE.SphereGeometry(1, 12, 10),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 14),
  cone: new THREE.ConeGeometry(1, 1, 10),
};

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
function mesh(geo, color, sx, sy, sz, extra) {
  const o = new THREE.Mesh(geo, typeof color === 'number' ? hexMat(color, extra) : color);
  o.scale.set(sx, sy, sz);
  return o;
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
  const f = new THREE.DirectionalLight(0xc8d8ff, 0.25);
  f.position.set(-2, 1.5, -2);
  scene.add(f);
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
  const cap = mesh(GEO.box, BLUE, 0.86, 0.38, 0.56);
  add(g, cap, 0, 2.05, 0);
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

function buildBuddy(id) {
  const def = CREW[id] || CREW.zapsaurus;
  const g = new THREE.Group();
  const kind = def.kind;
  // Gold map-pin backing (circle + point) so the badge reads like the 2D art
  const pinTop = mesh(GEO.sphere, GOLD, 0.62, 0.62, 0.28);
  add(g, pinTop, 0, 0.08, -0.22);
  const pinTip = mesh(GEO.cone, GOLD, 0.38, 0.7, 0.2);
  pinTip.rotation.x = Math.PI;
  add(g, pinTip, 0, -0.55, -0.22);
  const body = new THREE.Group();
  g.add(body);
  g.userData.body = body;
  const hx = kind === 'ankylo' ? 0.42 : 0.38;
  const hy = kind === 'ankylo' ? 0.32 : 0.36;
  const hz = 0.32;
  const headY = 0.16;
  const headZ = 0.12;
  const head = mesh(GEO.sphere, def.color, hx, hy, hz);
  add(body, head, 0, headY, headZ);
  if (kind === 'rex') {
    add(body, bolt(0.2), 0, headY + hy + 0.08, headZ);
    const crest = mesh(GEO.box, GOLD, 0.28, 0.08, 0.06);
    add(body, crest, 0, headY + hy + 0.02, headZ + 0.02);
  } else if (kind === 'tri') {
    const frill = mesh(GEO.cone, 0xfff3d6, 0.42, 0.28, 0.1);
    frill.rotation.x = -Math.PI / 2;
    add(body, frill, 0, headY + 0.28, headZ - 0.12);
    const h1 = bolt(0.12); h1.rotation.z = 0.4; add(body, h1, -0.16, headY + hy + 0.1, headZ);
    const h2 = bolt(0.12); h2.rotation.z = -0.4; add(body, h2, 0.16, headY + hy + 0.1, headZ);
  } else if (kind === 'stego') {
    [-0.2, -0.07, 0.07, 0.2].forEach((x, i) => {
      const h = 0.16 + (i === 1 || i === 2 ? 0.08 : 0);
      const p = mesh(GEO.cone, GOLD, 0.07, h, 0.06);
      add(body, p, x, headY + hy + h * 0.15, headZ);
    });
  } else if (kind === 'ankylo') {
    const club = mesh(GEO.box, GRAY, 0.22, 0.08, 0.08);
    add(body, club, hx + 0.18, headY, headZ);
    const prong = mesh(GEO.box, NAVY, 0.06, 0.1, 0.05);
    add(body, prong, hx + 0.3, headY, headZ);
  } else if (kind === 'ptero') {
    const wingL = mesh(GEO.box, def.color, 0.42, 0.06, 0.2);
    wingL.rotation.z = 0.4;
    add(body, wingL, -0.38, headY + 0.08, headZ - 0.08);
    const wingR = mesh(GEO.box, 0xffd9a0, 0.34, 0.05, 0.16);
    wingR.rotation.z = -0.3;
    add(body, wingR, 0.32, headY - 0.02, headZ);
    const trail = new THREE.Group();
    trail.add(bolt(0.12), bolt(0.08));
    trail.children[1].position.set(-0.1, -0.12, 0);
    add(body, trail, -0.55, headY + 0.2, headZ);
    trail.visible = false;
    g.userData.trail = trail;
  } else {
    const crest = mesh(GEO.cone, 0xffd9a0, 0.16, 0.34, 0.1);
    crest.rotation.z = 0.7;
    add(body, crest, -0.32, headY + 0.28, headZ);
    const hum = bolt(0.1);
    add(body, hum, -0.42, headY + 0.42, headZ + 0.04);
    g.userData.hum = hum;
    const beak = mesh(GEO.sphere, 0xbfede8, 0.16, 0.1, 0.14);
    add(body, beak, 0.28, headY - 0.04, headZ + hz * 0.55);
  }
  // Eyes sit on the front of the head (not inside the sphere)
  const faceZ = headZ + hz * 0.98;
  const eyeY = headY + 0.06;
  const eyeX = 0.12;
  const eyeL = mesh(GEO.sphereLo, 0xffffff, 0.07, 0.07, 0.05);
  const eyeR = mesh(GEO.sphereLo, 0xffffff, 0.07, 0.07, 0.05);
  add(body, eyeL, -eyeX, eyeY, faceZ);
  add(body, eyeR, eyeX, eyeY, faceZ);
  const puL = mesh(GEO.sphereLo, NAVY, 0.04, 0.04, 0.04);
  const puR = mesh(GEO.sphereLo, NAVY, 0.04, 0.04, 0.04);
  add(body, puL, -eyeX + 0.012, eyeY, faceZ + 0.03);
  add(body, puR, eyeX + 0.012, eyeY, faceZ + 0.03);
  const glL = mesh(GEO.sphereLo, 0xffffff, 0.016, 0.016, 0.016);
  const glR = mesh(GEO.sphereLo, 0xffffff, 0.016, 0.016, 0.016);
  add(body, glL, -eyeX + 0.02, eyeY + 0.015, faceZ + 0.05);
  add(body, glR, eyeX + 0.02, eyeY + 0.015, faceZ + 0.05);
  const lidL = mesh(GEO.box, def.color, 0.14, 0.03, 0.06);
  const lidR = mesh(GEO.box, def.color, 0.14, 0.03, 0.06);
  add(body, lidL, -eyeX, eyeY, faceZ + 0.02);
  add(body, lidR, eyeX, eyeY, faceZ + 0.02);
  lidL.visible = lidR.visible = false;
  const winkBit = mesh(GEO.box, NAVY, 0.13, 0.022, 0.04);
  add(body, winkBit, eyeX, eyeY, faceZ + 0.02);
  winkBit.visible = false;
  const faceSpark = bolt(0.14);
  add(body, faceSpark, 0.36, headY + hy + 0.08, faceZ);
  faceSpark.visible = false;
  const zeds = new THREE.Group();
  const z1 = mesh(GEO.box, 0x5a6680, 0.1, 0.04, 0.04);
  const z2 = mesh(GEO.box, 0x5a6680, 0.07, 0.03, 0.03);
  add(zeds, z1, 0.34, headY + hy + 0.16, faceZ);
  add(zeds, z2, 0.46, headY + hy + 0.3, faceZ);
  zeds.visible = false;
  body.add(zeds);
  g.userData.eyes = [eyeL, eyeR, puL, puR, glL, glR];
  g.userData.lids = [lidL, lidR];
  g.userData.winkBit = winkBit;
  g.userData.faceSpark = faceSpark;
  g.userData.zeds = zeds;
  g.userData.kind = kind;
  g.userData.id = id;
  setBuddyFace(g, 'happy');
  const sparkHop = new THREE.Group();
  sparkHop.add(bolt(0.2), bolt(0.14));
  sparkHop.children[1].position.set(0.14, -0.1, 0);
  sparkHop.visible = false;
  add(g, sparkHop, 0.32, headY + hy + 0.28, faceZ);
  g.userData.hopSpark = sparkHop;
  const tail = mesh(GEO.cone, def.color, 0.1, 0.36, 0.1);
  tail.rotation.x = Math.PI * 0.75;
  add(g, tail, 0.14, -0.38, -0.06);
  g.userData.tail = tail;
  return g;
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

function mountBuddy(el, opts) {
  return startMount('buddy', el, opts.height || 140, (m) => {
    const buddy = buildBuddy(opts.id || 'zapsaurus');
    m.scene.add(buddy);
    m.camera.position.set(0.15, 0.12, 3.15);
    m.camera.lookAt(0, 0.0, 0);
    m.camera.fov = 32;
    m.camera.updateProjectionMatrix();
    if (m.host) {
      m.host.style.width = '148px';
      m.host.style.maxWidth = '48%';
    }
    m.state.waveT = 0;
    m.state.hopT = 0;
    m.state.auto = !m.still;
    const t0 = performance.now();
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
        m.state.yaw = 0.35 * Math.sin((now - t0) / 2500);
      }
      spinUpdate(m, buddy, dt, now);
      if (m.still) {
        setBuddyFace(buddy, 'happy');
        buddy.position.y = 0;
        if (buddy.userData.body) {
          buddy.userData.body.rotation.z = 0;
          buddy.userData.body.rotation.x = 0;
          buddy.userData.body.scale.set(1, 1, 1);
        }
        if (buddy.userData.tail) buddy.userData.tail.rotation.z = 0;
        if (buddy.userData.trail) buddy.userData.trail.visible = false;
        if (buddy.userData.hum) buddy.userData.hum.visible = true;
        return;
      }
      // idle breath + head sway
      const body = buddy.userData.body;
      const p = Math.sin(now / 700);
      if (body) {
        body.scale.set(1 - 0.015 * p, 1 + 0.03 * p, 1);
        body.rotation.x = Math.sin(now / 900) * 0.08;
      }
      if (buddy.userData.tail) {
        buddy.userData.tail.rotation.z = Math.sin(now / 450) * 0.35;
      }
      // wave periodically
      const wavePhase = ((now / 1000) % 7);
      const waving = wavePhase < 0.9 && buddy.userData.face !== 'sleepy';
      if (body) {
        body.rotation.z = waving ? Math.sin(now / 90) * 0.28 : 0;
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
  dock.innerHTML = '<div class="c1-3d-row" style="display:flex;align-items:flex-end;gap:6px;margin:6px 0 4px">'
    + '<div class="c1-3d-chg" style="flex:1;min-height:128px"></div>'
    + '<div class="c1-3d-car" style="flex:1;min-height:116px"></div>'
    + '</div><div class="c1-3d-lot" style="min-height:100px;margin:4px 0 0"></div>'
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
  mountCharger(dock.querySelector('.c1-3d-chg'), { plugs: (s && s.plugs) || [], userPlug: userPlug(), height: 128 });
  mountCar(dock.querySelector('.c1-3d-car'), { body: set.body, paint: set.paint, height: 116 });
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
    else mountBuddy(hero, { id: set.buddyId, height: 140 });
  }
  // Edit preview
  const prev = document.getElementById('c1av-preview');
  if (prev) {
    if (set.avatar === 'car') mountCar(prev, { body: set.body, paint: set.paint, height: 130 });
    else mountBuddy(prev, { id: set.buddyId, height: 130 });
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
    mountBuddy(el, { id: set.buddyId, height: 110 });
  });
  window.c1Three = Object.assign(window.c1Three || {}, {
    webgl: true,
    version: THREE_VERSION,
    revision: THREE.REVISION,
    ready: true,
    mounts: mounts.length,
    remount: remountAll,
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

window.c1Three = { webgl: webglAvailable(), version: THREE_VERSION, revision: THREE.REVISION, ready: false, remount: remountAll, webglAvailable };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
