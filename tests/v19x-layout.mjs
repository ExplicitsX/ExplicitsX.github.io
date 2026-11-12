/**
 * v19x layout checks for the Voltlane demo.
 * Static checks always run. Browser checks need Chrome and puppeteer-core:
 *   NODE_PATH=/tmp/v19x-test/node_modules node tests/v19x-layout.mjs
 */
import {readFileSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const htmlPath = join(root, 't-97f47847fd25', 'index.html');
const html = readFileSync(htmlPath, 'utf8');
const fails = [];
function check(cond, msg) { if (!cond) fails.push(msg); }

const v19x = html.slice(html.indexOf('id="v19x"'));
check(html.includes('<title>Voltlane mock v20a</title>'), 'title is v20a');
check(html.includes('content="noindex,nofollow"'), 'noindex stays');
check(html.includes('Voltlane'), 'working name Voltlane stays');
check(html.includes('Every charger. One app.'), 'h1 tagline stays');
check(html.includes('Every charge. ⚡ One lane.'), 'menu tagline stays');
check(html.includes('const PPX_Z=15'), 'price pins still start at zoom 15');
check(html.includes('Price not listed'), 'Price not listed fallback stays');
check(html.includes("if(/^free\\b/i.test(t))return 0"), 'Free listed-price parser stays');
check(/Tesla:"#0072B2"/.test(html) && html.includes('ChargePoint:"#E69F00"') && html.includes('"Electrify America":"#CC79A7"'), 'colorblind-safe pin colors stay');
check(v19x.includes("find.appendChild($('clo'))"), 'Closest list is moved onto Station');
check(v19x.includes("top.appendChild(srch)") && v19x.includes("near.appendChild($('nfbtn'))"), 'search and nearest control move with Closest');
check(v19x.includes('find.appendChild(cloh)'), 'map peek control is taken off the map');
check(!/maplibre|mapbox-gl|cesium|SceneView|rotateX\(|perspective:/.test(v19x), 'no 3D renderer migration and no CSS tilt');
check(!/type="password"|type="tel"|autocomplete="cc-/.test(v19x), 'no new secret or payment fields');

if (fails.length) {
  console.error(fails.map(f => 'FAIL ' + f).join('\n'));
  process.exit(1);
}
console.log('static checks ok');

if (process.argv.includes('--static')) process.exit(0);

let puppeteer;
const puppeteerPaths = [process.env.PUPPETEER || '', 'puppeteer-core', '/tmp/v19x-test/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js'];
for (const p of puppeteerPaths) {
  if (!p) continue;
  try { puppeteer = await import(p); break; } catch (e) {}
}
if (!puppeteer) {
  console.error('puppeteer-core is not installed; static checks passed');
  process.exit(1);
}

const chrome = process.env.CHROME || '/usr/bin/google-chrome';
const shots = process.env.SHOTS || '/opt/cursor/artifacts';
const port = 8765;
const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], {cwd: root, stdio: 'ignore'});
await new Promise(r => setTimeout(r, 400));

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: process.env.HEADED ? false : 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=420,900']
});

async function boot(page, width, height) {
  await page.setViewport({width, height, deviceScaleFactor: 1, isMobile: width < 500, hasTouch: width < 500});
  await page.emulateMediaFeatures([{name: 'prefers-reduced-motion', value: 'reduce'}]);
  await page.evaluateOnNewDocument(() => {
    try { sessionStorage.setItem('c1_intro', '1'); localStorage.setItem('c1_lang', 'en'); localStorage.setItem('c1_onboard', '1'); localStorage.setItem('c1_nmap', '0'); localStorage.removeItem('c1_myplug'); } catch (e) {}
    const deny = {code: 1, message: 'denied'};
    const geo = {getCurrentPosition: (_ok, fail) => fail && fail(deny), watchPosition: (_ok, fail) => { fail && fail(deny); return 0; }, clearWatch() {}};
    try { Object.defineProperty(navigator, 'geolocation', {configurable: true, get: () => geo}); } catch (e) {}
  });
  const errors = [];
  page.on('pageerror', err => errors.push(String(err)));
  await page.goto(`http://127.0.0.1:${port}/t-97f47847fd25/?night=0`, {waitUntil: 'domcontentloaded', timeout: 60000});
  await page.waitForFunction(() => document.body.classList.contains('v19x') && document.querySelector('#s-station #stsearch') && document.querySelector('#s-station #clo .clr'), {timeout: 20000});
  await page.waitForFunction(() => document.querySelectorAll('#map canvas').length < 2 || window.__v19xLifted === 1, {timeout: 12000});
  await new Promise(r => setTimeout(r, 400));
  return errors;
}

function assertLayout(label, info) {
  check(info.searchInStation && info.nearInStation && info.cloInStation, label + ': search, nearest, and Closest are in Station');
  check(!info.searchInMap && !info.nearInMap && !info.cloInMap && !info.clohInMap, label + ': Closest section is not under Map');
  check(!info.tucked, label + ': Closest section is not hidden inside More details');
  check(info.heading === 'Closest to you', label + ': Closest heading stays');
  check(info.rows >= 5, label + ': nearest list has rows (' + info.rows + ')');
  check(info.card && info.start, label + ': compact pin card and Start charging stay');
  check(info.startText === 'Start charging', label + ': Start charging label stays');
  check(info.visibleMap >= 260, label + ': visible map is ' + Math.round(info.visibleMap) + 'px');
  check(info.mapH >= 320, label + ': map box is ' + Math.round(info.mapH) + 'px');
  check(info.noHScroll, label + ': no horizontal overflow');
  check(info.title === 'Voltlane mock v20a', label + ': title');
  check(info.robots.includes('noindex'), label + ': noindex');
  check(info.tagline.includes('Every charger. One app.'), label + ': tagline');
  check(info.colors.Tesla === '#0072B2' && info.colors.EVgo === '#009E73', label + ': live pin colors');
  check(info.ppxOff === false && info.ppxOn === true, label + ': price chips toggle at zoom 15');
  check(info.free.includes('Free (listed price)') && info.missing.includes('Price not listed'), label + ': Free and Price not listed');
}

const layoutFn = () => {
  const q = (sel, root) => !!(root || document).querySelector(sel);
  const screen = document.getElementById('s-map');
  const station = document.getElementById('s-station');
  const more = station.querySelector('.c1more');
  const m = document.getElementById('map').getBoundingClientRect();
  const sh = document.getElementById('sheet').getBoundingClientRect();
  const overlap = (sh.top < m.bottom && sh.bottom > m.top) ? Math.min(m.bottom, sh.bottom) - Math.max(m.top, sh.top) : 0;
  const start = document.querySelector('#sheet .c1s');
  map.setView(map.getCenter(), 14, {animate: false});
  const ppxOff = document.getElementById('map').classList.contains('ppx-on');
  map.setView(map.getCenter(), 15, {animate: false});
  const base = S[0];
  return {
    searchInStation: q('#stsearch', station), nearInStation: q('#nfbtn', station), cloInStation: q('#clo', station),
    searchInMap: q('#stsearch', screen), nearInMap: q('#nfbtn', screen), cloInMap: q('#clo', screen), clohInMap: q('#cloh', screen),
    tucked: !!(more && more.contains(document.getElementById('stfind'))),
    heading: document.querySelector('#clo .clcap')?.textContent || '',
    rows: document.querySelectorAll('#clo .clr').length,
    card: document.querySelector('#sheet .c1n')?.textContent || '',
    start: !!start,
    startText: start ? start.textContent.trim() : '',
    visibleMap: m.height - overlap,
    mapH: m.height,
    noHScroll: document.documentElement.scrollWidth <= window.innerWidth + 1,
    title: document.title,
    robots: document.querySelector('meta[name=robots]')?.content || '',
    tagline: document.querySelector('h1')?.textContent || '',
    colors: {Tesla: NC.Tesla, EVgo: NC.EVgo},
    ppxOff,
    ppxOn: document.getElementById('map').classList.contains('ppx-on'),
    free: infoTxt(Object.assign({}, base, {lp: 'Free'})),
    missing: infoTxt(Object.assign({}, base, {lp: ''}))
  };
};

try {
  const page = await browser.newPage();
  const errors = await boot(page, 390, 844);
  const before = await page.evaluate(layoutFn);
  assertLayout('390x844', before);
  const h0 = before.mapH;
  await page.click('.tab[data-t="station"]');
  await page.waitForSelector('#s-station.on');
  await page.evaluate(() => { const t = document.getElementById('okt'); if (t) t.hidden = true; });
  await page.screenshot({path: join(shots, 'stations_closest_mobile.png')});
  const stationInfo = await page.evaluate(() => {
    const station = document.getElementById('s-station');
    const r = station.getBoundingClientRect();
    const search = document.getElementById('stsearch').getBoundingClientRect();
    const list = document.querySelector('#clo .clr').getBoundingClientRect();
    return {
      on: station.classList.contains('on'),
      searchW: search.width,
      searchInside: search.left >= r.left - 1 && search.right <= r.right + 1,
      listInside: list.left >= r.left - 1 && list.right <= r.right + 1,
      placeholder: document.getElementById('stsearch').placeholder
    };
  });
  check(stationInfo.on && stationInfo.searchInside && stationInfo.listInside, 'Station search and list fit the mobile width');
  check(stationInfo.searchW > 280, 'search uses the station width (' + Math.round(stationInfo.searchW) + ')');
  check(stationInfo.placeholder === 'Search a city or station', 'search label stays');
  await page.evaluate(() => setLang('es'));
  const es = await page.evaluate(() => ({
    heading: document.querySelector('#clo .clcap')?.textContent || '',
    placeholder: document.getElementById('stsearch').placeholder,
    near: document.getElementById('nfbtn').textContent
  }));
  check(es.heading.includes('Más cercanos'), 'ES Closest heading: ' + es.heading);
  check(/ciudad|estación/i.test(es.placeholder), 'ES search placeholder: ' + es.placeholder);
  check(/cerca/i.test(es.near), 'ES nearest button: ' + es.near);
  await page.evaluate(() => setLang('en'));
  await page.click('.tab[data-t="map"]');
  await page.waitForFunction(() => document.getElementById('s-map').classList.contains('on'));
  await new Promise(r => setTimeout(r, 250));
  const after = await page.evaluate(layoutFn);
  check(Math.abs(after.mapH - h0) < 20, 'map height stable after leaving and returning (' + Math.round(h0) + ' -> ' + Math.round(after.mapH) + ')');
  await page.evaluate(() => { const t = document.getElementById('okt'); if (t) t.hidden = true; });
  await page.screenshot({path: join(shots, 'map_tab_mobile.png')});

  const pin = await page.evaluate(() => {
    const s = S.find(x => x.name !== cur.name && x.lat);
    const el = document.getElementById('map');
    const h = el.clientHeight;
    map.setView([s.lat, s.lng], 16, {animate: false});
    const pt = map.latLngToContainerPoint([s.lat, s.lng]);
    map.panBy([pt.x - el.clientWidth / 2, pt.y - Math.round(h * 0.28)], {animate: false});
    const pt2 = map.latLngToContainerPoint([s.lat, s.lng]);
    const rect = el.getBoundingClientRect();
    return {name: s.name, x: rect.left + pt2.x, y: rect.top + pt2.y};
  });
  await page.mouse.click(pin.x, pin.y);
  await page.waitForFunction(name => document.querySelector('#sheet .c1n')?.textContent === name, {timeout: 4000}, pin.name);
  const card = await page.evaluate(() => {
    const b = document.querySelector('#sheet .c1s').getBoundingClientRect();
    const s = document.getElementById('sheet').getBoundingClientRect();
    return {name: document.querySelector('#sheet .c1n').textContent, start: document.querySelector('#sheet .c1s').textContent.trim(), inSheet: b.top >= s.top - 1 && b.bottom <= s.bottom + 2, inView: b.top >= 0 && b.bottom <= window.innerHeight};
  });
  check(card.name === pin.name, 'pin click selects ' + pin.name);
  check(card.start === 'Start charging' && card.inSheet && card.inView, 'pin card keeps Start charging on screen');
  await page.evaluate(() => { const t = document.getElementById('okt'); if (t) t.hidden = true; });
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({path: join(shots, 'pin_card_mobile.png')});

  await page.evaluate(() => { CAR = 'Tesla Model 3'; const s = S.find(x => x.net === 'Tesla' && (x.plugs || []).includes('NACS')); pick(s); });
  await page.click('#sheet .c1s');
  await page.waitForSelector('#okm.on', {timeout: 4000});
  const taps = await page.evaluate(() => ({
    confirm: document.getElementById('okm').classList.contains('on'),
    stall: document.getElementById('stm').classList.contains('on'),
    text: document.getElementById('okbox').innerText
  }));
  check(taps.confirm && !taps.stall, 'Start charging opens confirm, not an extra stall step');
  check(/Look at your phone to continue/.test(taps.text), 'confirm step stays the second tap');
  await page.keyboard.press('Escape');

  for (const tab of ['charge', 'trip', 'wallet', 'map']) {
    await page.click(`.tab[data-t="${tab}"]`);
    await page.waitForSelector(`#s-${tab}.on`, {timeout: 8000});
  }
  check(errors.filter(e => !/tile|favicon/i.test(e)).length === 0, 'page errors: ' + errors.join(' | '));

  const narrow = await browser.newPage();
  await boot(narrow, 360, 740);
  const n = await narrow.evaluate(layoutFn);
  assertLayout('360x740', n);
  await narrow.evaluate(() => { const t = document.getElementById('okt'); if (t) t.hidden = true; });
  await narrow.screenshot({path: join(shots, 'map_tab_360.png')});
  await narrow.click('.tab[data-t="station"]');
  await narrow.waitForSelector('#s-station.on');
  const nScroll = await narrow.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  check(nScroll, '360px Station tab does not scroll sideways');
  await narrow.evaluate(() => { const t = document.getElementById('okt'); if (t) t.hidden = true; });
  await narrow.screenshot({path: join(shots, 'stations_closest_360.png')});
} finally {
  await browser.close();
  server.kill();
}

if (fails.length) {
  console.error(fails.map(f => 'FAIL ' + f).join('\n'));
  process.exit(1);
}
console.log('browser checks ok');
