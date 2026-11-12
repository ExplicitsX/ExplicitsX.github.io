/**
 * v20a: night map, plug filter, generic car, deferred trip/chunks, 3-card intro.
 *   node tests/v20a-refresh.mjs
 *
 * Load baseline on v19z (same headless mobile method, 390x844, reduced motion,
 * intro skipped), measured before this pass:
 *   domContentLoaded 526ms, loadEventEnd 2219ms
 *   dc.js requested at ~355ms, CA1.json at ~522ms, markercluster at ~770ms
 */
import {readFileSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 't-97f47847fd25', 'index.html'), 'utf8');
const fails = [];
const check = (c, m) => { if (!c) fails.push(m); };
const v20 = html.slice(html.indexOf('id="v20a"'));
check(html.includes('<title>Voltlane mock v20a</title>'), 'title v20a');
check(html.includes('id="v20a"') && v20.includes('#v20a'), 'v20a blocks');
check(html.includes('content="noindex,nofollow"'), 'noindex');
check(html.includes('Every charger. One app.') && html.includes('Every charge. ⚡ One lane.'), 'taglines stay');
check(html.includes('rel="preconnect" href="https://server.arcgisonline.com"'), 'tile host preconnect stays');
check(v20.includes('World_Dark_Gray') || v20.includes("setStyle(want?'dark':'sat'") || v20.includes("setStyle(next?'dark':'sat'"), 'night map uses the dark style');
check(v20.includes('c1_nmap') && v20.includes('prefers-color-scheme'), 'night choice is saved and defaults to the color scheme');
check(v20.includes('c1_myplug') && v20.includes('CCS') && v20.includes('NACS') && v20.includes('J1772') && v20.includes('CHAdeMO'), 'plug filter');
check(v20.includes('c1_carlook') && ['sedan','hatchback','suv','pickup','van'].every(b => v20.includes(b)), 'generic bodies');
check(v20.includes('c1_onboard') && v20.includes("get('onboard')"), 'onboarding flag and query');
check(v20.includes('prefers-reduced-motion'), 'reduced motion');
check(!/maplibre|mapbox-gl|cesium|rotateX\(/.test(v20), 'no 3D in this pass');
check(!/type="password"|type="tel"|autocomplete="cc-/.test(v20), 'no secret or payment fields');
check(!/\bbest\b|every network/i.test(v20), 'onboarding copy makes no best or every-network claim');
check(!/vin|license plate|logo/i.test(v20), 'no VIN, plate, or logo in the new block');
check(html.includes('v19zCode') && html.includes("pin='teardrop'") || html.includes('pin="teardrop"') || html.includes('pin:"teardrop"') || html.includes('l.options.pin="teardrop"'), 'teardrops stay');
check(!html.includes("addEventListener('load',()=>c1Idle(()=>dcLoad(),300))"), 'trip script is not started from the old load listener');
if (fails.length) { console.error(fails.join('\n')); process.exit(1); }
console.log('static checks ok');
if (process.argv.includes('--static')) process.exit(0);

let puppeteer;
for (const p of ['puppeteer-core', '/tmp/v19x-test/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js', '/tmp/v19x-test/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js']) {
  try { puppeteer = await import(p); break; } catch (e) {}
}
if (!puppeteer) { console.error('puppeteer-core missing'); process.exit(1); }
const shots = process.env.SHOTS || '/opt/cursor/artifacts';
const server = spawn('python3', ['-m', 'http.server', '8782', '--bind', '127.0.0.1'], {cwd: root, stdio: 'ignore'});
await new Promise(r => setTimeout(r, 300));
const browser = await puppeteer.launch({executablePath: process.env.CHROME || '/usr/bin/google-chrome', headless: 'new', protocolTimeout: 60000, args: ['--no-sandbox', '--disable-dev-shm-usage']});

function prep(page, extra) {
  return page.evaluateOnNewDocument(flag => {
    try {
      sessionStorage.setItem('c1_intro', '1');
      localStorage.setItem('c1_lang', 'en');
      if (flag.onboard) localStorage.setItem('c1_onboard', '1'); else localStorage.removeItem('c1_onboard');
      if (flag.nmap) localStorage.setItem('c1_nmap', flag.nmap); else localStorage.removeItem('c1_nmap');
      if (flag.look) localStorage.setItem('c1_carlook', flag.look); else localStorage.removeItem('c1_carlook');
      localStorage.removeItem('c1_myplug');
    } catch (e) {}
    const deny = {code: 1, message: 'denied'};
    const geo = flag.geo
      ? {getCurrentPosition: ok => ok && ok({coords: {latitude: 34.05, longitude: -118.27, accuracy: 20}}), watchPosition: () => 0, clearWatch() {}}
      : {getCurrentPosition: (_o, f) => f && f(deny), watchPosition: (_o, f) => { f && f(deny); return 0; }, clearWatch() {}};
    try { Object.defineProperty(navigator, 'geolocation', {configurable: true, get: () => geo}); } catch (e) {}
  }, extra || {onboard: '1', nmap: '0'});
}

try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 240)));
  const reqs = [];
  page.on('request', r => reqs.push(r.url()));
  await page.setCacheEnabled(false);
  await page.setViewport({width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2});
  await page.emulateMediaFeatures([{name: 'prefers-reduced-motion', value: 'reduce'}, {name: 'prefers-color-scheme', value: 'light'}]);
  await prep(page, {onboard: '1', nmap: '0'});
  const t0 = Date.now();
  await page.goto('http://127.0.0.1:8782/t-97f47847fd25/?night=0&nmap=0', {waitUntil: 'load', timeout: 45000});
  const wallLoad = Date.now() - t0;
  const nav = await page.evaluate(() => {
    const n = performance.getEntriesByType('navigation')[0];
    const res = performance.getEntriesByType('resource').map(r => r.name);
    return {dcl: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd), dc: res.some(u => u.includes('dc.js')), ca: res.some(u => u.includes('CA1.json')), cluster: res.some(u => u.includes('markercluster'))};
  });
  console.log('LOAD after', JSON.stringify({wallLoad, ...nav}));
  check(nav.dcl > 0 && nav.load > 0, 'navigation timing recorded');
  check(!nav.dc && !reqs.some(u => u.includes('dc.js')), 'dc.js stayed deferred through load');
  check(!nav.ca && !nav.cluster, 'state chunks stayed deferred through load');
  await page.waitForFunction(() => document.body.classList.contains('v20a') && document.body.classList.contains('v19y') && map.getZoom() >= 10 && document.querySelector('#s-map .v20plugs') && document.querySelector('#stfind .v20plugs'), {timeout: 15000});

  const base = await page.evaluate(() => {
    const pins = [];
    layer.eachLayer(l => { if (l.options && l.options.pin === 'teardrop') pins.push(l); });
    const sheet = document.getElementById('sheet');
    return {
      pins: pins.length,
      night: document.body.classList.contains('v20night'),
      sheet: sheet.hidden,
      cloMap: !!document.querySelector('#s-map #clo'),
      cloStation: (document.querySelector('#s-station #clo .clcap') || {}).textContent || '',
      plugs: [...document.querySelectorAll('#s-map .v20plugs button')].map(b => b.textContent)
    };
  });
  check(!base.night, 'light scheme and saved off stays day map');
  check(base.pins > 20 && base.sheet && !base.cloMap && base.cloStation.includes('Closest'), 'v19z map/station split stays (' + base.pins + ' pins)');
  check(base.plugs.join(',') === 'CCS,NACS,J1772,CHAdeMO', 'plug chips ' + base.plugs.join(','));

  await page.evaluate(() => v20PlugSet('CCS'));
  const filtered = await page.evaluate(() => {
    const idx = new Map(S.map(s => [s.lat.toFixed(5) + ',' + s.lng.toFixed(5), s]));
    let n = 0, bad = 0;
    layer.eachLayer(l => {
      if (!l.options || l.options.pin !== 'teardrop' || !l.getLatLng) return;
      const ll = l.getLatLng();
      const s = idx.get(ll.lat.toFixed(5) + ',' + ll.lng.toFixed(5));
      if (!s) return;
      n++;
      if (!(s.plugs || []).includes('CCS')) bad++;
    });
    go('station');
    const rows = cloList();
    const rowBad = rows.filter(x => !(x[1].plugs || []).includes('CCS') && !(x[1].plugs || []).includes('ccs')).length;
    return {n, bad, rows: rows.length, rowBad, saved: localStorage.getItem('c1_myplug'), pressed: document.querySelector('#s-map .v20plugs button[aria-pressed="true"]')?.textContent || ''};
  });
  check(filtered.saved === 'CCS' && filtered.pressed === 'CCS', 'CCS chip is the saved plug');
  check(filtered.n > 5 && filtered.bad === 0, 'map pins match CCS (' + filtered.n + ' bad ' + filtered.bad + ')');
  check(filtered.rows > 0 && filtered.rowBad === 0, 'station list matches CCS (' + filtered.rows + ')');
  check(filtered.n < base.pins, 'filter removed incompatible pins (' + base.pins + ' -> ' + filtered.n + ')');
  await page.evaluate(() => { const t = document.getElementById('okt'); if (t) t.hidden = true; go('map'); });
  await new Promise(r => setTimeout(r, 400));
  const plugShot = await page.$('#s-map');
  await plugShot.screenshot({path: join(shots, 'v20a_plug_filter.png')});
  await page.evaluate(() => v20PlugSet('CCS'));
  const cleared = await page.evaluate(() => localStorage.getItem('c1_myplug'));
  check(!cleared, 'tapping the plug again clears it');
  await page.waitForFunction(() => performance.getEntriesByType('resource').some(r => /CA1\.json|nets\.json|markercluster/.test(r.name)), {timeout: 8000});
  check(!reqs.some(u => u.includes('dc.js')), 'dc.js stays unloaded until Trip');

  const night = await browser.newPage();
  const nerr = [];
  night.on('pageerror', e => nerr.push(String(e).slice(0, 200)));
  await night.setViewport({width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2});
  await night.emulateMediaFeatures([{name: 'prefers-reduced-motion', value: 'reduce'}, {name: 'prefers-color-scheme', value: 'dark'}]);
  await prep(night, {onboard: '1'});
  await night.goto('http://127.0.0.1:8782/t-97f47847fd25/?night=0', {waitUntil: 'domcontentloaded', timeout: 45000});
  await night.waitForFunction(() => document.body.classList.contains('v20night') && map.getZoom() >= 10 && map._sty && map._sty[0] && String(map._sty[0]._url).includes('World_Dark_Gray_Base'), {timeout: 15000});
  await night.waitForFunction(() => [...document.querySelectorAll('#map .leaflet-tile')].some(img => img.src.includes('World_Dark_Gray_Base') && img.complete && img.naturalWidth > 0), {timeout: 12000});
  const nightInfo = await night.evaluate(() => {
    let stroke = '', n = 0;
    layer.eachLayer(l => { if (l.options && l.options.pin === 'teardrop') { n++; stroke = l.options.color; } });
    const url = (map._sty && map._sty[0] && map._sty[0]._url) || '';
    return {stroke, n, url, saved: localStorage.getItem('c1_nmap')};
  });
  check(nightInfo.url.includes('World_Dark_Gray_Base'), 'dark scheme uses Esri dark gray tiles');
  check(nightInfo.stroke === '#f8fafc' && nightInfo.n > 10, 'pin stroke is light on the night map (' + nightInfo.stroke + ')');
  check(nightInfo.saved !== '0', 'scheme default is not stored as an explicit off');
  await night.evaluate(() => { const t = document.getElementById('okt'); if (t) t.hidden = true; map.setView([34.05, -118.27], 12, {animate: false}); });
  await night.waitForFunction(() => [...document.querySelectorAll('#map .leaflet-tile')].some(img => img.complete && img.naturalWidth > 0), {timeout: 8000});
  await night.screenshot({path: join(shots, 'v20a_night_map.png')});
  await night.evaluate(() => openMenu());
  await night.waitForSelector('#menubox .v20night button');
  await night.click('#menubox .v20night button');
  const toggled = await night.evaluate(() => ({night: document.body.classList.contains('v20night'), saved: localStorage.getItem('c1_nmap'), label: document.querySelector('#menubox .v20night button').textContent}));
  check(!toggled.night && toggled.saved === '0', 'menu toggle turns night off and remembers it');
  await night.evaluate(() => v20Night());
  const back = await night.evaluate(() => ({night: document.body.classList.contains('v20night'), saved: localStorage.getItem('c1_nmap')}));
  check(back.night && back.saved === '1', 'menu toggle turns night on and remembers it');

  await page.evaluate(() => { openCars(); v20Body('suv'); v20Paint('#3d6b58'); });
  await page.waitForSelector('#carbox .v20bodies button.on');
  const car = await page.evaluate(() => {
    const svg = document.querySelector('#carbox .v20bodies button.on svg');
    const look = JSON.parse(localStorage.getItem('c1_carlook') || '{}');
    return {look, svg: svg ? svg.outerHTML : '', labels: [...document.querySelectorAll('#carbox .v20bodies button span')].map(s => s.textContent)};
  });
  check(car.look.body === 'suv' && car.look.paint === '#3d6b58', 'body and paint saved locally');
  check(car.labels.join(',') === 'Sedan,Hatchback,SUV,Pickup,Van', 'body labels');
  check(/<svg/.test(car.svg) && !/tesla|logo|vin|plate|img/i.test(car.svg), 'picker car is a plain svg');
  await page.evaluate(() => document.querySelector('.v20look').scrollIntoView({block: 'center'}));
  await page.screenshot({path: join(shots, 'v20a_car_picker.png')});
  await page.evaluate(() => { document.getElementById('carm').classList.remove('on'); go('charge'); });
  await page.waitForSelector('#v20chg svg');
  const chg = await page.evaluate(() => {
    const el = document.getElementById('v20chg');
    return {still: el.classList.contains('v20still'), svg: el.querySelector('svg').outerHTML.includes('<path')};
  });
  check(chg.svg && chg.still, 'charging screen shows the still car under reduced motion');

  const located = await browser.newPage();
  await located.setViewport({width: 390, height: 844, isMobile: true, hasTouch: true});
  await located.emulateMediaFeatures([{name: 'prefers-reduced-motion', value: 'reduce'}, {name: 'prefers-color-scheme', value: 'light'}]);
  await prep(located, {onboard: '1', nmap: '0', geo: 1, look: JSON.stringify({body: 'pickup', paint: '#c4b5a0'})});
  await located.goto('http://127.0.0.1:8782/t-97f47847fd25/?night=0&nmap=0', {waitUntil: 'domcontentloaded', timeout: 45000});
  await located.waitForSelector('#map .v20you svg', {timeout: 12000});
  const marker = await located.evaluate(() => {
    const svg = document.querySelector('#map .v20you svg');
    return {car: !!(youMk && youMk._v20car), svg: svg ? svg.outerHTML.slice(0, 80) : ''};
  });
  check(marker.car && /<svg/.test(marker.svg), 'user location uses the generic car');

  const ob = await browser.newPage();
  await ob.setViewport({width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2});
  await ob.emulateMediaFeatures([{name: 'prefers-reduced-motion', value: 'reduce'}]);
  await ob.evaluateOnNewDocument(() => {
    try { sessionStorage.setItem('c1_intro', '1'); localStorage.setItem('c1_lang', 'en'); localStorage.setItem('c1_nmap', '0'); } catch (e) {}
  });
  await ob.goto('http://127.0.0.1:8782/t-97f47847fd25/?onboard=1&night=0&nmap=0', {waitUntil: 'domcontentloaded', timeout: 45000});
  await ob.waitForSelector('#v20ob h2', {timeout: 8000});
  const card1 = await ob.evaluate(() => ({t: document.querySelector('#v20ob h2').textContent, b: document.querySelector('#v20ob .v20body').textContent, k: document.querySelector('#v20ob .v20kicker').textContent}));
  check(card1.t === 'Find chargers' && card1.k === '1 / 3' && !/best|every network/i.test(card1.t + card1.b), 'first onboarding card');
  await ob.evaluate(() => { const t = document.getElementById('okt'); if (t) t.hidden = true; });
  const cardEl = await ob.$('#v20ob .v20card');
  await cardEl.screenshot({path: join(shots, 'v20a_onboarding.png')});
  await ob.click('#v20ob .v20next');
  await ob.click('#v20ob .v20next');
  const card3 = await ob.evaluate(() => document.querySelector('#v20ob h2').textContent);
  check(card3 === 'Plan a trip', 'third card is the trip card');
  await ob.click('#v20ob .v20next');
  const done = await ob.evaluate(() => ({hidden: document.getElementById('v20ob').hidden, flag: localStorage.getItem('c1_onboard')}));
  check(done.hidden && done.flag === '1', 'Done stores the seen flag');
  await ob.goto('http://127.0.0.1:8782/t-97f47847fd25/?night=0&nmap=0', {waitUntil: 'domcontentloaded', timeout: 45000});
  await new Promise(r => setTimeout(r, 900));
  const again = await ob.evaluate(() => !!document.getElementById('v20ob') && !document.getElementById('v20ob').hidden);
  check(!again, 'onboarding stays hidden after it is dismissed');

  check(errors.length === 0, 'page errors: ' + errors.join(' | '));
  check(nerr.length === 0, 'night page errors: ' + nerr.join(' | '));
  if (fails.length) { console.error(fails.join('\n')); process.exit(1); }
  console.log('v20a browser checks ok');
} finally {
  await browser.close();
  server.kill();
}
