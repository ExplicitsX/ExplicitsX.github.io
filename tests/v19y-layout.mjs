/**
 * v19y: default map has no station card; pins keep network colors and charger emoji;
 * Closest stays on Station. Chrome + puppeteer-core:
 *   node tests/v19y-layout.mjs
 */
import {readFileSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 't-97f47847fd25', 'index.html'), 'utf8');
const fails = [];
const check = (cond, msg) => { if (!cond) fails.push(msg); };
const v19y = html.slice(html.indexOf('id="v19y"'));
check(html.includes('<title>Voltlane mock v20a</title>'), 'title v20a');
check(html.includes('content="noindex,nofollow"'), 'noindex');
check(html.includes('id="sheet" hidden'), 'sheet starts hidden');
check(v19y.includes("v19yEmoji") && v19y.includes("'⚡'") && v19y.includes("'🔌'"), 'charger emoji helper');
check(/Tesla:"#0072B2"/.test(html), 'Tesla pin color stays');
check(html.includes('const PPX_Z=15'), 'zoom 15 prices stay');
check(html.includes("find.appendChild($('clo'))"), 'Closest list still moved to Station');
check(!/maplibre|mapbox-gl|cesium|rotateX\(/.test(v19y), 'no 3D in this pass');
check(!/type="password"|type="tel"/.test(v19y), 'no new personal fields');
if (fails.length) { console.error(fails.join('\n')); process.exit(1); }
console.log('static checks ok');
if (process.argv.includes('--static')) process.exit(0);

let puppeteer;
for (const p of ['puppeteer-core', '/tmp/v19x-test/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js']) {
  try { puppeteer = await import(p); break; } catch (e) {}
}
if (!puppeteer) { console.error('puppeteer-core missing'); process.exit(1); }
const shots = process.env.SHOTS || '/opt/cursor/artifacts';
const server = spawn('python3', ['-m', 'http.server', '8773', '--bind', '127.0.0.1'], {cwd: root, stdio: 'ignore'});
await new Promise(r => setTimeout(r, 300));
const browser = await puppeteer.launch({executablePath: process.env.CHROME || '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage']});
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 180)));
  await page.setViewport({width: 390, height: 844, isMobile: true, hasTouch: true});
  await page.emulateMediaFeatures([{name: 'prefers-reduced-motion', value: 'reduce'}]);
  await page.evaluateOnNewDocument(() => {
    try { sessionStorage.setItem('c1_intro', '1'); localStorage.setItem('c1_lang', 'en'); localStorage.setItem('c1_onboard', '1'); localStorage.setItem('c1_nmap', '0'); localStorage.removeItem('c1_myplug'); } catch (e) {}
    const deny = {code: 1, message: 'denied'};
    const geo = {getCurrentPosition: (_o, f) => f && f(deny), watchPosition: (_o, f) => { f && f(deny); return 0; }, clearWatch() {}};
    try { Object.defineProperty(navigator, 'geolocation', {configurable: true, get: () => geo}); } catch (e) {}
  });
  await page.goto('http://127.0.0.1:8773/t-97f47847fd25/?night=0', {waitUntil: 'domcontentloaded', timeout: 45000});
  await page.waitForFunction(() => document.body.classList.contains('v19y') && document.querySelector('#s-station #clo .clr'), {timeout: 20000});
  await new Promise(r => setTimeout(r, 600));
  await page.evaluate(() => { const t = document.getElementById('okt'); if (t) t.hidden = true; });
  const opened = await page.evaluate(() => {
    const sheet = document.getElementById('sheet');
    const screen = document.getElementById('s-map');
    const station = document.getElementById('s-station');
    let pins = 0, domPins = document.querySelectorAll('#map .leaflet-marker-icon').length;
    const colors = new Set();
    map.eachLayer(l => {
      if (l.options && l.options.pin === 'teardrop') { pins++; if (l.options.fillColor) colors.add(l.options.fillColor); }
    });
    const mb = document.getElementById('map').getBoundingClientRect();
    return {
      sheetHidden: sheet.hidden,
      closestOnMap: !!screen.querySelector('#clo,#stsearch,#nfbtn') || /Closest to you/.test(screen.innerText),
      closestOnStation: !!station.querySelector('#clo .clcap') && station.querySelector('#clo .clcap').textContent.includes('Closest'),
      searchOnStation: !!station.querySelector('#stsearch'),
      rows: station.querySelectorAll('#clo .clr').length,
      pins, colors: colors.size, domPins,
      mapH: Math.round(mb.height),
      title: document.title
    };
  });
  check(opened.sheetHidden, 'default map hides the station card');
  check(!opened.closestOnMap, 'Closest/search are not on the map');
  check(opened.closestOnStation && opened.searchOnStation && opened.rows >= 5, 'Station still has Closest (' + opened.rows + ')');
  check(opened.pins > 20, 'teardrop pins ' + opened.pins);
  check(opened.colors >= 3, 'distinct pin colors ' + opened.colors);
  check(opened.domPins < 250, 'no huge DOM pin set (' + opened.domPins + ')');
  check(opened.mapH > 400, 'map has the screen (' + opened.mapH + ')');
  check(opened.title === 'Voltlane mock v20a', 'title');
  await page.screenshot({path: join(shots, 'v19y_map_mobile.png')});
  const pin = await page.evaluate(() => {
    const s = S.find(x => x.kw >= 50 && x.name !== cur.name);
    const el = document.getElementById('map');
    map.setView([s.lat, s.lng], 16, {animate: false});
    const pt = map.latLngToContainerPoint([s.lat, s.lng]);
    map.panBy([0, pt.y - Math.round(el.clientHeight * 0.32)], {animate: false});
    const pt2 = map.latLngToContainerPoint([s.lat, s.lng]);
    const mr = el.getBoundingClientRect();
    let marker = null;
    map.eachLayer(l => { if (!marker && l.options && l.options.pin === 'teardrop' && l.getLatLng && Math.abs(l.getLatLng().lat - s.lat) < 1e-4 && Math.abs(l.getLatLng().lng - s.lng) < 1e-4) marker = l; });
    const tip = marker && marker._containsPoint(marker._point);
    const head = marker && marker._containsPoint(L.point(marker._point.x, marker._point.y - marker._radius * 1.5));
    return {name: s.name, x: mr.left + pt2.x, y: mr.top + pt2.y, pin: marker && marker.options.pin, glyph: marker && marker.options.glyph, tip, head};
  });
  check(pin.pin === 'teardrop' && pin.glyph === 'charger' && pin.tip && pin.head, 'pin tip and head are clickable (' + pin.glyph + ')');
  await page.mouse.click(pin.x, pin.y);
  await page.waitForFunction(name => !document.getElementById('sheet').hidden && document.querySelector('#sheet .c1n')?.textContent === name, {timeout: 5000}, pin.name);
  const shown = await page.evaluate(() => {
    const b = document.querySelector('#sheet .v19y-x');
    const r = b.getBoundingClientRect();
    return {label: b.getAttribute('aria-label'), start: document.querySelector('#sheet .c1s').textContent.trim(), w: r.width, h: r.height};
  });
  check(shown.label === 'Close' && shown.w >= 40 && shown.h >= 40, 'dismiss control is clear');
  check(shown.start === 'Start charging', 'Start charging stays on the card');
  await new Promise(r => setTimeout(r, 900));
  await page.screenshot({path: join(shots, 'v19y_pin_card_mobile.png')});
  await page.click('#sheet .v19y-x');
  const closed = await page.evaluate(() => document.getElementById('sheet').hidden);
  check(closed, 'dismiss hides the card');
  await page.click('.tab[data-t="station"]');
  await page.waitForSelector('#s-station.on #clo .clr');
  await page.screenshot({path: join(shots, 'v19y_station_mobile.png')});
  check(errors.length === 0, 'page errors: ' + errors.join(' | '));
} finally {
  await browser.close();
  server.kill();
}
if (fails.length) { console.error(fails.map(f => 'FAIL ' + f).join('\n')); process.exit(1); }
console.log('v19y checks ok');
