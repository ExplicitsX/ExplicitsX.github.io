/**
 * v19z teardrop pins and DOE facility_type mapping.
 * Synthetic fixtures only. Real station files are not modified.
 *   node tests/v19z-layout.mjs
 */
import {readFileSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 't-97f47847fd25', 'index.html'), 'utf8');
const fails = [];
const check = (c, m) => { if (!c) fails.push(m); };
check(html.includes('<title>Voltlane mock v19z</title>'), 'title v19z');
check(html.includes('id="sheet" hidden'), 'card hidden until tap');
check(html.includes('v19zCode') && html.includes('PARKING_GARAGE') && html.includes('HOTEL'), 'documented facility codes');
const real = readFileSync(join(root, 't-97f47847fd25/st/DC.json'), 'utf8');
check(!real.includes('facility_type') && !real.includes('PARKING_GARAGE'), 'real DC file has no facility_type');
if (fails.length) { console.error(fails.join('\n')); process.exit(1); }
console.log('static checks ok');
if (process.argv.includes('--static')) process.exit(0);

let puppeteer;
for (const p of ['puppeteer-core', '/tmp/v19x-test/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js']) {
  try { puppeteer = await import(p); break; } catch (e) {}
}
if (!puppeteer) { console.error('puppeteer-core missing'); process.exit(1); }
const shots = process.env.SHOTS || '/opt/cursor/artifacts';
const server = spawn('python3', ['-m', 'http.server', '8774', '--bind', '127.0.0.1'], {cwd: root, stdio: 'ignore'});
await new Promise(r => setTimeout(r, 300));
const browser = await puppeteer.launch({executablePath: process.env.CHROME || '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage']});
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  await page.setViewport({width: 390, height: 844, isMobile: true, hasTouch: true});
  await page.emulateMediaFeatures([{name: 'prefers-reduced-motion', value: 'reduce'}]);
  await page.evaluateOnNewDocument(() => {
    try { sessionStorage.setItem('c1_intro', '1'); localStorage.setItem('c1_lang', 'en'); } catch (e) {}
    const deny = {code: 1, message: 'denied'};
    const geo = {getCurrentPosition: (_o, f) => f && f(deny), watchPosition: (_o, f) => { f && f(deny); return 0; }, clearWatch() {}};
    try { Object.defineProperty(navigator, 'geolocation', {configurable: true, get: () => geo}); } catch (e) {}
  });
  await page.goto('http://127.0.0.1:8774/t-97f47847fd25/?night=0', {waitUntil: 'domcontentloaded', timeout: 45000});
  await page.waitForFunction(() => document.body.classList.contains('v19y') && typeof v19zGlyph === 'function' && document.querySelector('#s-station #clo .clr'), {timeout: 20000});
  await new Promise(r => setTimeout(r, 500));
  const mapped = await page.evaluate(() => {
    const want = {
      HOTEL: 'hotel', INN: 'hotel', B_AND_B: 'hotel',
      PARKING_GARAGE: 'parking', PARKING_LOT: 'parking', PAY_GARAGE: 'parking', PAY_LOT: 'parking', STREET_PARKING: 'parking',
      SHOPPING_MALL: 'mall', SHOPPING_CENTER: 'mall', GROCERY: 'grocery', RESTAURANT: 'restaurant',
      WORKPLACE: 'workplace', OFFICE_BLDG: 'workplace', SCHOOL: 'school', COLLEGE_CAMPUS: 'school',
      GAS_STATION: 'charger', AIRPORT: 'charger', OTHER: 'charger', HOSPITAL: 'charger'
    };
    const bad = [];
    for (const [code, glyph] of Object.entries(want)) if (v19zGlyph(v19zCode(code)) !== glyph || v19zCode(code) !== code) bad.push(code);
    const rejected = ['Walmart', 'HOTEL LOBBY', 'parking', 'Tesla', '', null, 'CONVENTION CENTER'].filter(v => v19zCode(v) !== '');
    const plain = mkSt(['Fixture Generic', 0, 1, 2, '1 Main', 'Testville', 1, 0, 1, 0]);
    const hotel = mkSt(['Fixture Hotel', 0, 1, 2, '1 Main', 'Testville', 1, 0, 1, 0, '', '', 'HOTEL']);
    const junk = mkSt(['Fixture Name', 0, 1, 2, '1 Main', 'Testville', 1, 0, 1, 0, '', '', 'WALMART']);
    const gas = mkSt(['Fixture Gas', 0, 1, 0, '1 Main', 'Testville', 0, 2, 2, 0, '24 hours', '$0.42 per kWh', 'GAS_STATION']);
    const realFt = S.filter(s => s.ft).length;
    const la = {tears: 0, charger: 0, colors: new Set()};
    layer.eachLayer(l => { if (l.options && l.options.pin === 'teardrop') { la.tears++; if ((l.options.glyph || 'charger') === 'charger') la.charger++; if (l.options.fillColor) la.colors.add(l.options.fillColor); } });
    const fake = {name: 'SYN HOTEL FIXTURE', net: 'Tesla', nf: 'Tesla', lat: 0, lng: 0, kw: 150, dc: 1, plugs: ['NACS'], lp: '', ft: 'HOTEL'};
    const mk = fMk(fake);
    const second = {pin: mk.options.pin, glyph: mk.options.glyph, ft: mk.options.ft, fill: mk.options.fillColor};
    if (mk._map) mk.remove();
    return {bad, rejected, plain: plain.ft, hotel: hotel.ft, junk: junk.ft, gas: gas.ft, gasGlyph: v19zGlyph(gas.ft), realFt, la: {tears: la.tears, charger: la.charger, colors: la.colors.size}, second, dom: document.querySelectorAll('#map .leaflet-marker-icon').length, sheet: document.getElementById('sheet').hidden, closestMap: !!document.querySelector('#s-map #clo'), closestStation: document.querySelector('#s-station #clo .clcap')?.textContent || ''};
  });
  check(mapped.bad.length === 0, 'code map mismatch ' + mapped.bad.join(','));
  check(mapped.rejected.length === 0, 'inferred or prose codes were accepted ' + mapped.rejected.join(','));
  check(mapped.plain === '' && mapped.junk === '' && mapped.hotel === 'HOTEL' && mapped.gas === 'GAS_STATION' && mapped.gasGlyph === 'charger', 'ingest keeps only documented codes');
  check(mapped.realFt === 0, 'real stations were not given facility types (' + mapped.realFt + ')');
  check(mapped.la.tears > 20 && mapped.la.charger === mapped.la.tears && mapped.la.colors >= 3, 'LA pins are generic teardrops in network colors');
  check(mapped.second.pin === 'teardrop' && mapped.second.glyph === 'hotel' && mapped.second.ft === 'HOTEL' && mapped.second.fill === '#0072B2', 'fMk source uses the same teardrop and network color');
  check(mapped.dom < 250, 'DOM pins bounded (' + mapped.dom + ')');
  check(mapped.sheet && !mapped.closestMap && mapped.closestStation.includes('Closest'), 'map-only card and Station Closest stay');
  await page.evaluate(() => { const t = document.getElementById('okt'); if (t) t.hidden = true; });
  await page.screenshot({path: join(shots, 'v19z_map_mobile.png')});
  const pin = await page.evaluate(() => {
    const s = S.find(x => x.kw >= 50);
    map.setView([s.lat, s.lng], 17, {animate: false});
    const el = document.getElementById('map');
    const pt = map.latLngToContainerPoint([s.lat, s.lng]);
    map.panBy([0, pt.y - Math.round(el.clientHeight * 0.42)], {animate: false});
    const pt2 = map.latLngToContainerPoint([s.lat, s.lng]);
    const mr = el.getBoundingClientRect();
    return {name: s.name, x: mr.left + pt2.x, y: mr.top + pt2.y};
  });
  await page.mouse.click(pin.x, pin.y);
  await page.waitForFunction(name => !document.getElementById('sheet').hidden && document.querySelector('#sheet .c1n')?.textContent === name, {timeout: 5000}, pin.name);
  await new Promise(r => setTimeout(r, 700));
  await page.screenshot({path: join(shots, 'v19z_pin_card_mobile.png')});
  await page.click('#sheet .v19y-x');
  check(await page.evaluate(() => document.getElementById('sheet').hidden), 'dismiss hides the card');
  check(errors.length === 0, 'page errors: ' + errors.join(' | '));
} finally {
  await browser.close();
  server.kill();
}
if (fails.length) { console.error(fails.map(f => 'FAIL ' + f).join('\n')); process.exit(1); }
console.log('v19z checks ok');
