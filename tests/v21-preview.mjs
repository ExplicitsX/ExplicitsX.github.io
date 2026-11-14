/**
 * v21 preview: openings rotate, charger, wallet, profile, Ask your buddy.
 * Does not replace v19x/y/z or v20 tests.
 *   NODE_PATH=/tmp/v19x-test/node_modules node tests/v21-preview.mjs
 */
import {readFileSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 't-97f47847fd25', 'index.html'), 'utf8');
const fails = [];
const check = (c, m) => { if (!c) fails.push(m); };

check(html.includes('<title>Kilolane mock v19z2</title>'), 'title stays v19z2');
check(html.includes('C1_OPENINGS={plugIn:1,findTheLane:1,nightDrive:1}'), 'v20 openings string kept');
check(html.includes('laneLights') && html.includes('zapHello'), 'two new openings');
check(html.includes("return 'rotate'"), 'opening default is rotate');
check(html.includes('c1_opening_last'), 'last opening is stored');
check(html.includes('Find it in AR') || html.includes("L('Find it in AR'"), 'Find it in AR');
check(html.includes('c1chturn') && html.includes('#3B7BFF'), 'charger turn and blue lamps');
check(html.includes('c1fast-pulse'), 'fast-pin pulse');
check(html.includes('c1_myrep') && html.includes('ownWorkedAt') || html.includes('c1OwnWorkedAt'), 'wink uses own reports');
check(html.includes('Ask your buddy'), 'ask your buddy');
check(html.includes('Near me') && html.includes('On my trip') && html.includes('Fastest nearby') && html.includes('Near my destination'), 'four buddy chips');
check(html.includes('Clear my data'), 'clear my data');
check(html.includes('Ready to roll?') && html.includes('Where to today?') && html.includes("Let's find a lane."), 'profile greetings');
check(html.includes('trips planned') && html.includes('check-ins'), 'plain profile counts');
check(html.includes('SAMPLE') && html.includes('My networks') && html.includes('Coming soon.'), 'wallet preview');
check(html.includes('Pick your buddy'), 'pick your buddy');
check(!html.includes('Sparkback') && !html.includes('Skywatt'), 'no unofficial buddy names');
check(html.includes('#F2EEE6') && html.includes('#E69F00') && html.includes('#8A94A8') && html.includes('#CC79A7') && html.includes('#1FA39A') && html.includes('#1E4FD8'), 'locked buddy colors');
const v21 = html.slice(html.indexOf('/* v21: station charger'));
check(v21.length > 100, 'v21 block present');
check(!/type="password"|type="tel"|autocomplete="cc-/.test(v21), 'no payment or PIN fields in v21');
check(!/every network/i.test(v21) && !/\bbest [a-z]/i.test(v21), 'no best / every network claims in v21');
check(!/#00ff9d/i.test(v21), 'v21 is not green');
check(!/MediaRecorder|captureStream|mediaRecorder/.test(v21), 'camera is not recorded');
check(html.includes("Voice input isn't available on this phone") || html.includes("Typing is paused while you're moving"), 'moving pauses typing');
check(html.includes('speechSynthesis'), 'reads answers aloud on the phone');

check(html.includes('Fully charged?') && html.includes('Need a spark?') && html.includes("Let's plug in."), 'energy greetings');
check(html.includes('Stegowatt') && html.includes('Voltatops') && html.includes('Pterowatt') && html.includes('Honkwatt') && html.includes('Tankamp'), 'confirmed crew names');
check(!html.includes('Sparkback') && !html.includes('Skywatt'), 'old unofficial names stay out');
check(html.includes('data-t="ask"') && html.includes('id="s-ask"'), 'ask your buddy has its own tab');
check(html.includes('c1ExactFit') || html.includes('#3B7BFF'), 'fit pins can be blue');
check(html.includes('3D dino') && html.includes('3D car') && html.includes('c1_settings'), 'profile 3D avatar choice is saved');
check(html.includes('Live status coming soon') && html.includes('Charger count not listed'), 'lot row status copy');
check(html.includes('LOT_CAP=12') || html.includes('LOT_STALL_CAP') || html.includes('cap==null?LOT_CAP'), 'lot row caps visible stalls');
check(!/taken|parked car/i.test(html.slice(html.indexOf('/* v23: profile avatar'))), 'v23 lot row does not show taken or a parked car');
check(html.includes('c1-three.js') && html.includes('three-0.187.0'), 'three.js 0.187.0 is pinned and hooked');
const threeSrc = readFileSync(join(root, 't-97f47847fd25', 'c1-three.js'), 'utf8');
check(threeSrc.includes("face === 'blink'") && threeSrc.includes('body.scale.set'), 'dino breathes and blinks');
check(threeSrc.includes('userData.wheels') && threeSrc.includes('w.rotation.z'), 'car wheels roll');
check(threeSrc.includes('blinkUntil') && threeSrc.includes('Math.sin(now / 550)'), 'headlight blink on tap and suspension bob');
check(html.includes('c1-three.js?v=') && html.includes('three-0.187.0.module.min.js?v='), 'three.js assets are cache-busted');
check(threeSrc.includes('Motion is off (Reduce Motion)') && threeSrc.includes('revealMounts'), 'hidden-tab reveal and reduced-motion note');
check(threeSrc.includes('function buildRex') && threeSrc.includes('crestBolt') && !threeSrc.includes('Gold map-pin backing'), 'Zapsaurus is a full-body T-rex, not a map pin');
check(threeSrc.includes('function buildTri') && threeSrc.includes('function buildStego') && threeSrc.includes('function buildAnkylo') && threeSrc.includes('function buildPtero') && threeSrc.includes('function buildPara'), 'all six buddies have species bodies');
check(html.includes('c1p-hi') && html.includes('#E6F1FF') && html.includes('c1p-name') && html.includes('#F4F7FB'), 'profile greeting and name meet contrast on the dark card');
check(threeSrc.includes('mountChargeScene') && threeSrc.includes('buildSagCable') && threeSrc.includes('plugInRange'), 'charging scene has a sagging cable and a snappable plug');
check(threeSrc.includes('setChargerLights') && threeSrc.includes('pinchScale') && threeSrc.includes('triggerRoar'), 'play widgets: lights, pinch, roar');

check(!threeSrc.includes('fillStationDock(sheet') && threeSrc.includes('fillChargeDock') && threeSrc.includes('#s-map .c1-3d-dock'), '3D charging scene stays off the Map tab');
check(threeSrc.includes('setClearColor(0x0b1530, 1)') && html.includes('c1-3d-card') || threeSrc.includes('c1-3d-card'), 'charging scene sits on an opaque card');
check(html.includes('-webkit-text-fill-color:#0B1530') && html.includes('select.chip'), 'Any price dropdown meets contrast');
check(html.includes('Live status coming soon') && html.includes('Coming soon') && html.includes('SAMPLE'), 'wallet and lot labels stay');

check(!/webkitSpeechRecognition|SpeechRecognition/.test(v21), 'no cloud speech recognition');


const android = readFileSync(join(root, 't-97f47847fd25', 'android', 'index.html'), 'utf8');
check(android.includes('<title>Kilolane Android tester (preview)</title>'), 'android tester title');
check(/noindex/.test(android), 'android tester is noindex');
check(android.includes('uv2ySIZ3aJ9EhTqiehDyK5ky29GwTNg9MgDONA6I_oI.apk') && android.includes('Install Kilolane'), 'android tester links the current APK');
check(android.includes('<svg') && !/qrserver|chart\.googleapis|api.qrserver/i.test(android), 'android tester QR is a local inline SVG');
check(!/<form/i.test(android) && !/sign-?up|mailchimp|analytics|gtag|googletagmanager/i.test(android), 'android tester has no sign-ups, forms, or tracking');
if (fails.length) { console.error(fails.map(f => 'FAIL ' + f).join('\n')); process.exit(1); }
console.log('v21 static checks ok');

let puppeteer;
for (const p of [process.env.PUPPETEER || '', 'puppeteer-core', '/tmp/v19x-test/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js', '/tmp/kl-pptr/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js']) {
  if (!p) continue;
  try { puppeteer = await import(p); break; } catch (e) {}
}
if (!puppeteer) { console.error('puppeteer-core missing'); process.exit(1); }

const port = 8777;
const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], {cwd: root, stdio: 'ignore'});
await new Promise(r => setTimeout(r, 400));
const browser = await (puppeteer.default || puppeteer).launch({
  executablePath: process.env.CHROME || '/usr/bin/google-chrome',
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage']
});

async function boot(opts = {}) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.setViewport({width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1});
  await page.emulateMediaFeatures([{name: 'prefers-reduced-motion', value: opts.motion || 'reduce'}]);
  await page.evaluateOnNewDocument((cfg) => {
    try {
      if (cfg.skipIntro) sessionStorage.setItem('c1_intro', '1');
      localStorage.setItem('c1_lang', 'en');
      if (cfg.opening) localStorage.setItem('c1_opening', cfg.opening);
    } catch (e) {}
  }, { skipIntro: !!opts.skipIntro, opening: opts.opening || '' });
  await page.goto(`http://127.0.0.1:${port}/t-97f47847fd25/${opts.query || ''}`, {waitUntil: 'domcontentloaded', timeout: 45000});
  return {page, errors};
}

try {
  const a = await boot({skipIntro: true, motion: 'reduce'});
  await a.page.waitForFunction(() => document.body.classList.contains('v19y') && document.querySelectorAll('#map .leaflet-interactive').length > 5, {timeout: 20000});
  await new Promise(r => setTimeout(r, 600));
  const state = await a.page.evaluate(() => {
    const chips = [...document.querySelectorAll('.c1askchip')].map(e => e.textContent.trim());
    return {
      title: document.title,
      pins: document.querySelectorAll('#map .leaflet-interactive').length,
      mapOn: document.getElementById('s-map').classList.contains('on'),
      askOnMap: !!document.querySelector('#s-map .c1ask, #c1ask-map'),
      askTab: !!document.querySelector('.tab[data-t="ask"]'),
      chips,
      destChip: chips.includes('Near my destination'),
      profileTab: !!document.querySelector('.tab[data-t="profile"]'),
      wallet: !!document.getElementById('c1wallet'),
      sample: (document.getElementById('c1wallet') || {}).innerText || '',
      plugFilter: /Fits my car|onlyMyPlug|My plug|plug/i.test(document.body.innerText),
    };
  });
  check(state.title === 'Kilolane mock v19z2', 'title live');
  check(state.pins > 5 && state.mapOn, 'map and pins still work');
  check(state.askTab && !state.askOnMap, 'ask your buddy is its own tab, not on the map');
  check(state.profileTab, 'profile tab present');
  check(state.wallet && /SAMPLE/.test(state.sample) && /Coming soon/.test(state.sample), 'wallet preview');

  // Station sheet still opens and gets the charger + Find it in AR
  const pin = await a.page.evaluate(() => {
    const s = S.find(x => x.kw >= 50) || S[0];
    map.setView([s.lat, s.lng], 17, {animate: false});
    const el = document.getElementById('map');
    const pt = map.latLngToContainerPoint([s.lat, s.lng]);
    map.panBy([0, pt.y - Math.round(el.clientHeight * 0.42)], {animate: false});
    const pt2 = map.latLngToContainerPoint([s.lat, s.lng]);
    const mr = el.getBoundingClientRect();
    return {name: s.name, x: mr.left + pt2.x, y: mr.top + pt2.y};
  });
  await a.page.mouse.click(pin.x, pin.y);
  await new Promise(r => setTimeout(r, 400));
  const sheet = await a.page.evaluate(() => ({
    hidden: document.getElementById('sheet').hidden,
    hasCharger: !!document.querySelector('#sheet .c1chg-wrap, #sheet .c1stfx'),
    findAr: !!(document.querySelector('#sheet .c1findar') && /Find it in AR/.test(document.querySelector('#sheet .c1findar').textContent || '')),
    spin: !!document.querySelector('#sheet .c1chg-spin'),
    lot: /Live status coming soon/.test((document.querySelector('#sheet .c1lot, #sheet .c1lot-missing') || document.getElementById('sheet') || {}).innerText || ''),
    lotOk: !/taken|parked|in use|\bfree\b|occupied/i.test((document.querySelector('#sheet .c1lot, #sheet .c1lot-missing') || {}).innerText || ''),
    stall: !!document.querySelector('#sheet .c1stall, #sheet .c1lot-missing'),
  }));
  check(!sheet.hidden, 'station sheet still opens');
  check(sheet.hasCharger, 'charger on the sheet');
  check(sheet.findAr, 'Find it in AR on the sheet');
  check(!sheet.spin, 'charger is still under reduced motion');
  check(sheet.lot && sheet.stall && sheet.lotOk, 'station sheet has a generic lot row with live-status-coming-soon');
  await new Promise(r => setTimeout(r, 400));
  const sheet3 = await a.page.evaluate(() => {
    const canvases = [...document.querySelectorAll('#sheet canvas[data-c1-three], #s-map canvas[data-c1-three]')];
    const lot = (document.querySelector('#sheet .c1lot, #sheet .c1lot-missing') || {}).innerText || '';
    return {
      n: canvases.length,
      lotClean: !/taken|parked|in use|\bfree\b|occupied/i.test(lot),
    };
  });
  check(sheet3.n === 0 && sheet3.lotClean, 'map sheet has no 3D scene covering the map, and no fake stall status');

  await a.page.click('.tab[data-t="station"]');
  await new Promise(r => setTimeout(r, 600));
  const st3 = await a.page.evaluate(() => {
    try { if (window.c1Three && window.c1Three.remount) window.c1Three.remount(); } catch (e) {}
    const canvases = [...document.querySelectorAll('#s-station canvas[data-c1-three]')];
    const lot = (document.querySelector('#s-station .c1lot, #s-station .c1-3d-lot, #c1-3d-dock-station') || {}).innerText || '';
    const dock = document.querySelector('#s-station .c1-3d-card, #s-station .c1-3d-dock');
    return {
      on: document.getElementById('s-station').classList.contains('on'),
      n: canvases.length,
      opaque: !!(dock && /0B1530/i.test((dock.getAttribute('style') || '') + getComputedStyle(dock).backgroundColor)),
      lotClean: !/taken|parked|in use|\bfree\b|occupied/i.test(lot),
    };
  });
  check(st3.on && st3.n >= 1 && st3.lotClean, 'Station tab 3D scene loads on its card without fake stall status');

  await a.page.click('.tab[data-t="ask"]');
  await new Promise(r => setTimeout(r, 250));
  const ask = await a.page.evaluate(() => {
    const chips = [...document.querySelectorAll('#s-ask .c1askchip, #c1ask-tab .c1askchip')].map(e => e.textContent.trim());
    return { on: document.getElementById('s-ask').classList.contains('on'), chips, dest: chips.includes('Near my destination') };
  });
  check(ask.on && ask.dest && ask.chips.includes('Near me') && ask.chips.includes('On my trip') && ask.chips.includes('Fastest nearby'), 'four chips on the ask tab');

  await a.page.click('.tab[data-t="profile"]');
  await new Promise(r => setTimeout(r, 200));
  const prof = await a.page.evaluate(() => {
    const el = document.getElementById('c1profile');
    const t = el ? el.innerText : '';
    return {
      on: document.getElementById('s-profile').classList.contains('on'),
      greet: /Fully charged\?|Need a spark\?|Let's plug in\.|Need a boost\?/.test(t),
      counts: /trips planned/.test(t) && /check-ins/.test(t),
      edit: /Edit/.test(t),
      still: matchMedia('(prefers-reduced-motion: reduce)').matches,
    };
  });
  check(prof.on && prof.greet && prof.counts && prof.edit, 'profile tab content');
  check(prof.still, 'reduced motion is honored');
  await a.page.evaluate(() => { const b = document.getElementById('c1p-edit'); if (b) b.click(); });
  await new Promise(r => setTimeout(r, 200));
  const edit = await a.page.evaluate(() => {
    const t = (document.getElementById('c1edit') || {}).innerText || '';
    return {
      open: !!document.getElementById('c1edit'),
      crew: /Zapsaurus/.test(t) && /Stegowatt/.test(t) && /Voltatops/.test(t) && /Pterowatt/.test(t) && /Tankamp/.test(t) && /Honkwatt/.test(t),
      noOld: !/Sparkback|Skywatt/.test(t),
      clear: /Clear my data/.test(t),
      dino: /3D dino/.test(t),
      car: /3D car/.test(t),
    };
  });
  check(edit.open && edit.crew && edit.noOld && edit.clear, 'profile edit sheet has the confirmed crew and Clear my data');
  check(edit.dino && edit.car, 'profile edit sheet has 3D dino and 3D car');

  const lotFn = await a.page.evaluate(() => {
    const missing = buildLotRow({});
    const row = buildLotRow({dcPorts: 14, l2Ports: 2, plugs: ['CCS'], userPlug: 'CCS1'});
    const blob = JSON.stringify(row).toLowerCase();
    return {
      missing: missing.listed === false && missing.stalls.length === 0,
      cap: row.stalls.length === 12 && row.hidden === 4,
      fits: row.stalls.filter(s => s.kind === 'dc').every(s => s.fits),
      clean: !/taken|free|occupied|parked/.test(blob),
    };
  });
  check(lotFn.missing && lotFn.cap && lotFn.fits && lotFn.clean, 'buildLotRow caps at 12, missing counts, no fake status');

  // three.js scenes (WebGL) with SVG fallback still in the page
  const three = await a.page.evaluate(() => {
    const canvases = [...document.querySelectorAll('canvas[data-c1-three]')];
    const info = window.c1Three || {};
    const wallet = document.getElementById('c1wallet');
    const wt = wallet ? wallet.innerText : '';
    return {
      ready: !!info.ready,
      webgl: !!info.webgl,
      version: info.version || '',
      mounts: info.mounts || 0,
      canvases: canvases.length,
      still: matchMedia('(prefers-reduced-motion: reduce)').matches,
      walletSample: /SAMPLE/.test(wt) && /Coming soon/.test(wt),
      walletFields: /\b(CVV|PIN|balance|rewards|Visa|Mastercard|card number)\b/i.test(wt),
    };
  });
  check(three.ready && three.version === '0.187.0', 'c1Three reports pinned three.js');
  check(three.webgl && three.canvases > 0 && three.mounts > 0, 'three.js canvases created with a WebGL context');
  check(three.still, 'reduced motion still honored with 3D scenes');
  check(three.walletSample && !three.walletFields, 'wallet card stays SAMPLE / Coming soon with no card fields');

  // Near my destination answers from station data, plug fit only, no price/status
  const dest = await a.page.evaluate(() => {
    try { CAR = 'Hyundai Ioniq 5'; } catch (e) {}
    const sm = (typeof CITIES !== 'undefined' && CITIES.find(c => /Santa Monica/.test(c.label))) || null;
    if (sm) { try { DEST = sm; } catch (e) {} }
    const res = c1AnswerAsk({kind: 'nearDestination'}, 'Santa Monica');
    return {
      n: (res.items || []).length,
      sorted: (res.items || []).every((it, i, a) => i === 0 || a[i - 1].miles <= it.miles),
      levels: (res.items || []).every(it => /DC fast|Level 2|Level not listed/.test(it.level)),
      noPrice: !/(\$|price|open|working)/i.test(res.text + JSON.stringify(res.items || [])),
      text: res.text,
    };
  });
  check(dest.n <= 3 && dest.sorted && dest.levels && dest.noPrice, 'near my destination top 3 by distance, no guesses');
  check(/Santa Monica|destination|station data|plug-compatible/i.test(dest.text), 'destination answer uses real data');

  check(!a.errors.length, 'no console errors: ' + a.errors.slice(0, 3).join(' | '));

  if (fails.length) { console.error(fails.map(f => 'FAIL ' + f).join('\n')); process.exit(1); }
  console.log('v21 preview checks ok');
} finally {
  await browser.close();
  server.kill();
}
