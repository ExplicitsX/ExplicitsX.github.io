/**
 * v20 preview: openings, Zapsaurus faces, Point your phone.
 *   NODE_PATH=/tmp/v19x-test/node_modules node tests/v20-preview.mjs
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
check(html.includes('C1_OPENINGS={plugIn:1,findTheLane:1,nightDrive:1}'), 'three openings');
check(html.includes("Don't use while driving. Pull over or let a passenger use this."), 'driving notice copy');
check(html.includes("I'm not driving"), 'ack button copy');
check(html.includes('Paused while moving. Pull over to use Point your phone.'), 'speed-lock copy');
check(html.includes('Every charge. One lane.'), 'opening tagline');
check(html.includes('getUserMedia'), 'camera preview hook');
check(html.includes('DeviceOrientationEvent.requestPermission'), 'iOS compass permission');
check(html.includes('webkit-playsinline'), 'Safari playsinline');
check(html.includes('c1_ar_driving_ack'), 'ack stored in localStorage');
check(html.includes('id="arbtn"') && html.includes('Point your phone'), 'finder button');
check(html.includes('function zapSvg'), 'Zapsaurus faces');
check(html.includes('#3B7BFF') && html.includes('#1E4FD8'), 'blue Zapsaurus skin');

const art = html.slice(html.indexOf('function c1OpeningArt'), html.indexOf('function c1IntroRun'));
const zap = html.slice(html.indexOf('function zapSvg'), html.indexOf('function youPos'));
check(!/#00ff9d/i.test(art) && !/#00ff9d/i.test(zap), 'new openings and Zapsaurus are not green');
check(!/MediaRecorder|captureStream|mediaRecorder/.test(html.slice(html.indexOf('Point your phone preview'))), 'camera is not recorded');

const v20css = html.slice(html.indexOf('/* v20: Kilolane openings'), html.indexOf('/* v20 openings:'));
const v20intro = html.slice(html.indexOf('/* v20 openings:'), html.indexOf('function c1IntroRun') + 800);
const v20ar = html.slice(html.indexOf('/* v20: Zapsaurus faces'));
const added = v20css + v20intro + v20ar;
check(!/type="password"|type="tel"|autocomplete="cc-/.test(added), 'no payment or PIN fields in v20');
check(!/every network/i.test(added) && !/\bbest [a-z]/i.test(added), 'no best / every network claims in v20');

if (fails.length) { console.error(fails.map(f => 'FAIL ' + f).join('\n')); process.exit(1); }
console.log('static checks ok');
if (process.argv.includes('--static')) process.exit(0);

let puppeteer;
for (const p of [process.env.PUPPETEER || '', 'puppeteer-core', '/tmp/v19x-test/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js']) {
  if (!p) continue;
  try { puppeteer = await import(p); break; } catch (e) {}
}
if (!puppeteer) { console.error('puppeteer-core missing'); process.exit(1); }

const shots = process.env.SHOTS || '/tmp/kl-web-patch/shots';
const port = 8776;
const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], {cwd: root, stdio: 'ignore'});
await new Promise(r => setTimeout(r, 400));
const browser = await puppeteer.launch({
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
      if (cfg.ack) localStorage.setItem('c1_ar_driving_ack', '1');
    } catch (e) {}
    if (cfg.denyGeo !== false) {
      const deny = {code: 1, message: 'denied'};
      const geo = {getCurrentPosition: (_o, f) => f && f(deny), watchPosition: (_o, f) => { f && f(deny); return 0; }, clearWatch() {}};
      try { Object.defineProperty(navigator, 'geolocation', {configurable: true, get: () => geo}); } catch (e) {}
    }
    if (cfg.denyCam !== false) {
      const md = navigator.mediaDevices;
      const fake = {getUserMedia: () => Promise.reject(new DOMException('denied', 'NotAllowedError'))};
      try { Object.defineProperty(navigator, 'mediaDevices', {configurable: true, get: () => Object.assign({}, md, fake)}); } catch (e) {}
    }
  }, {
    skipIntro: !!opts.skipIntro,
    opening: opts.opening || '',
    ack: !!opts.ack,
    denyGeo: opts.denyGeo !== false,
    denyCam: opts.denyCam !== false
  });
  const q = opts.query || '?night=0';
  await page.goto(`http://127.0.0.1:${port}/t-97f47847fd25/${q}`, {waitUntil: 'domcontentloaded', timeout: 45000});
  return {page, errors};
}

try {
  // 1) Existing map / pins / Station still work (intro skipped like other tests)
  const a = await boot({skipIntro: true, motion: 'reduce'});
  await a.page.waitForFunction(() => document.body.classList.contains('v19y') && document.querySelectorAll('#map .leaflet-interactive').length > 5, {timeout: 20000});
  await new Promise(r => setTimeout(r, 800));
  const mapState = await a.page.evaluate(() => ({
    title: document.title,
    intro: !!document.getElementById('intro'),
    arbtn: (document.getElementById('arbtn') || {}).textContent || '',
    pins: document.querySelectorAll('#map .leaflet-interactive').length,
    tears: document.querySelectorAll('#map .leaflet-marker-icon, #map .leaflet-interactive').length,
    sheetHidden: document.getElementById('sheet').hidden,
    mapOn: document.getElementById('s-map').classList.contains('on'),
    you: !!document.querySelector('#map .c1you'),
    face: typeof c1MascotFace === 'function' ? c1MascotFace() : ''
  }));
  check(mapState.title === 'Kilolane mock v19z2', 'title live');
  check(!mapState.intro, 'intro skipped when c1_intro=1');
  check(mapState.arbtn.includes('Point your phone'), 'AR button visible');
  check(mapState.pins > 5 && mapState.mapOn && mapState.sheetHidden, 'map and pins still work');
  check(mapState.you && mapState.face === 'happy', 'Zapsaurus happy on day map (no GPS)');
  await a.page.evaluate(() => { if (typeof c1PlaceYouMascot === 'function') c1PlaceYouMascot(); });

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
  await a.page.waitForFunction(() => !document.getElementById('sheet').hidden, {timeout: 5000});
  const stationOk = await a.page.evaluate(() => {
    const sh = document.getElementById('sheet');
    return {shown: !sh.hidden, text: sh.textContent.slice(0, 200)};
  });
  check(stationOk.shown, 'Station / pin card still opens');

  await a.page.click('nav .tabs [data-t="station"], nav .tab[data-t="station"]');
  await a.page.waitForFunction(() => document.getElementById('s-station').classList.contains('on'), {timeout: 5000});
  check(await a.page.evaluate(() => !!document.querySelector('#s-station #st-name, #s-station #clo')), 'Station screen still works');
  await a.page.click('nav .tab[data-t="map"]');

  // Menu opening picker
  await a.page.evaluate(() => openMenu());
  const menu = await a.page.evaluate(() => {
    const b = document.getElementById('menubox');
    const t = b ? b.textContent : '';
    return {
      opening: t.includes('Opening scene'),
      find: t.includes('Find the lane'),
      plug: t.includes('Plug in'),
      night: t.includes('Night drive'),
      old: t.includes('Try intros') || t.includes('Power core') || /\bZap\b/.test(t)
    };
  });
  check(menu.opening && menu.find && menu.plug && menu.night, 'settings menu has opening picker');
  check(!menu.old, 'old green intro chips are not shown');

  // Point your phone: notice, then fallback list
  await a.page.evaluate(() => { const m = document.getElementById('menum'); if (m) m.classList.remove('on'); });
  await a.page.click('#arbtn');
  await a.page.waitForFunction(() => document.getElementById('c1ar') && !document.getElementById('c1ar').hidden, {timeout: 5000});
  const notice = await a.page.evaluate(() => document.getElementById('c1ar').textContent);
  check(notice.includes("Don't use while driving. Pull over or let a passenger use this."), 'first-open notice');
  check(notice.includes("I'm not driving"), 'not-driving button');
  await a.page.click('#c1ar-ack');
  await a.page.waitForFunction(() => document.getElementById('c1ar') && document.getElementById('c1ar').textContent.includes('AR needs a camera and compass'), {timeout: 5000});
  const fb = await a.page.evaluate(() => {
    const t = document.getElementById('c1ar').textContent;
    return {
      needs: t.includes('AR needs a camera and compass'),
      fallback: t.includes('Nothing is recorded or uploaded'),
      rows: document.querySelectorAll('#c1ar .c1ar-row').length,
      ack: localStorage.getItem('c1_ar_driving_ack')
    };
  });
  check(fb.needs && fb.fallback, 'camera/compass fallback copy');
  check(fb.rows >= 1 && fb.rows <= 5, 'fallback lists up to 5 chargers (' + fb.rows + ')');
  check(fb.ack === '1', 'ack persisted');

  // Speed lock math + UI
  const math = await a.page.evaluate(() => {
    const n = c1NextSpeedLock;
    const a = n({paused: false, overMs: 0}, 5, 1000);
    const b = n(a, 5, 2000);
    const c = n(b, 4.5, 100);
    const d = n({paused: true, overMs: 3000}, null, 1000);
    const e = n({paused: false, overMs: 0}, null, 1000);
    const f = n({paused: false, overMs: 0}, -1, 4000);
    return {a, b, c, d, e, f};
  });
  check(!math.a.paused && math.a.overMs === 1000, 'speed lock accumulates');
  check(math.b.paused && math.b.overMs === 3000, 'speed lock trips after 3s above 4.5');
  check(!math.c.paused, 'resumes at 4.5 immediately');
  check(math.d.paused, 'stays paused when speed is missing');
  check(!math.e.paused && !math.f.paused, 'null/negative speed does not start a lock');

  await a.page.evaluate(() => c1SetArSpeed(8));
  await new Promise(r => setTimeout(r, 3500));
  const paused = await a.page.evaluate(() => document.getElementById('c1ar').textContent);
  check(paused.includes('Paused while moving. Pull over to use Point your phone.'), 'paused UI copy');
  await a.page.evaluate(() => c1SetArSpeed(3));
  await new Promise(r => setTimeout(r, 400));
  const resumed = await a.page.evaluate(() => document.getElementById('c1ar').textContent);
  check(!resumed.includes('Paused while moving'), 'resumes when slow');
  await a.page.evaluate(() => closeAR());
  check(a.errors.length === 0, 'no page errors (skip-intro pass): ' + a.errors.join(' | '));
  try { await a.page.screenshot({path: join(shots, 'v20_map_mobile.png')}); } catch (e) {}
  await a.page.close();

  // 2) Opening plays once per load, skippable, still frame under reduced motion
  const b = await boot({skipIntro: false, motion: 'reduce', opening: 'findTheLane'});
  await b.page.waitForFunction(() => document.getElementById('intro'), {timeout: 8000});
  const intro = await b.page.evaluate(() => {
    const e = document.getElementById('intro');
    return {
      id: e && e.id,
      cls: e && e.className,
      name: e && e.querySelector('.c1nm') && e.querySelector('.c1nm').textContent,
      tag: e && e.querySelector('.c1tg') && e.querySelector('.c1tg').textContent,
      rm: e && e.classList.contains('rm'),
      lanes: e ? e.querySelectorAll('.c1lane').length : 0
    };
  });
  check(intro.rm && intro.name === 'Kilolane' && intro.tag === 'Every charge. One lane.', 'reduced-motion still opening');
  check(intro.lanes >= 1, 'Find the lane art present');
  await b.page.click('#intro');
  await b.page.waitForFunction(() => !document.getElementById('intro') || document.getElementById('intro').classList.contains('out'), {timeout: 4000});
  await new Promise(r => setTimeout(r, 500));
  check(await b.page.evaluate(() => !document.getElementById('intro')), 'opening is skippable');
  check(b.errors.length === 0, 'no page errors (intro pass): ' + b.errors.join(' | '));
  await b.page.close();

  // 3) Night map shows sleepy face
  const c = await boot({skipIntro: true, motion: 'reduce', query: '?night=1'});
  await c.page.waitForFunction(() => document.body.classList.contains('night') && typeof c1MascotFace === 'function', {timeout: 20000});
  await new Promise(r => setTimeout(r, 900));
  const night = await c.page.evaluate(() => {
    if (typeof c1PlaceYouMascot === 'function') c1PlaceYouMascot();
    return {face: c1MascotFace(), night: document.body.classList.contains('night'), z: !!document.querySelector('#map .c1you'), zzz: !!(document.querySelector('#map .c1you') && /[zZ]/.test(document.querySelector('#map .c1you').textContent))};
  });
  check(night.night && night.face === 'sleepy' && night.z && night.zzz, 'sleepy Zapsaurus on night map');
  check(c.errors.length === 0, 'no page errors (night pass): ' + c.errors.join(' | '));
  try { await c.page.screenshot({path: join(shots, 'v20_night_mobile.png')}); } catch (e) {}
  await c.page.close();

  // 4) Other scenes load via ?intro=
  for (const [id, needle] of [['plugIn', 'c1plug'], ['nightDrive', 'c1beam']]) {
    const d = await boot({skipIntro: false, motion: 'reduce', query: '?night=0&intro=' + id});
    await d.page.waitForFunction(() => document.getElementById('intro'), {timeout: 8000});
    const ok = await d.page.evaluate((sel) => {
      const e = document.getElementById('intro');
      return !!(e && e.classList.contains('v-' + document.location.search.match(/intro=([a-zA-Z]+)/)[1]) && e.querySelector('.' + sel));
    }, needle).catch(() => false);
    const has = await d.page.evaluate((sel) => !!document.querySelector('#intro .' + sel), needle);
    check(has, id + ' opening art');
    check(d.errors.length === 0, 'no page errors (' + id + '): ' + d.errors.join(' | '));
    await d.page.close();
  }
} finally {
  await browser.close();
  server.kill();
}
if (fails.length) { console.error(fails.map(f => 'FAIL ' + f).join('\n')); process.exit(1); }
console.log('v20 preview checks ok');
