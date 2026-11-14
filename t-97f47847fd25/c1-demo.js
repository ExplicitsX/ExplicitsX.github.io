/* Demo mode for testers: bundled LA stations, no GPS, 5-step tour. */
(function () {
  const ORIGIN = { lat: 34.0522, lng: -118.2437, label: 'Downtown Los Angeles, CA' };
  const DEST = 'San Diego';
  const STATION_SEL = () => (typeof S !== 'undefined' && S.find && (S.find(s => String(s.id) === '333264' || s.name && /City National Plaza/i.test(s.name)) || S[0]));
  const L = (en, es) => (typeof LANG !== 'undefined' && LANG === 'es' ? es : en);
  const store = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } };
  window.c1DemoOn = () => store('c1_demo') === '1';

  function banner(on) {
    let el = document.getElementById('c1-demo-banner');
    if (!on) { if (el) el.remove(); return; }
    if (!el) {
      el = document.createElement('div');
      el.id = 'c1-demo-banner';
      el.style.cssText = 'position:absolute;left:12px;right:12px;top:8px;z-index:2000;background:#0B1530;color:#F4F7FB;border:1px solid #3B7BFF;border-radius:12px;padding:8px 12px;font-size:13px;';
      (document.querySelector('.phone') || document.body).appendChild(el);
    }
    el.textContent = L('Demo: bundled real DOE stations around Los Angeles. No GPS needed.', 'Demo: estaciones reales del DOE alrededor de Los Ángeles. No se necesita GPS.');
  }

  function prefillTrip() {
    const dest = document.getElementById('tdest');
    const orig = document.getElementById('torig');
    if (orig) orig.textContent = ORIGIN.label;
    if (dest && !dest.value) dest.value = DEST;
    try { if (typeof pickDest === 'function') pickDest(DEST); } catch (e) {}
  }

  const STEPS = [
    { title: () => L('Map pins', 'Pines del mapa'), body: () => L('These Demo pins are real DOE station records around Los Angeles. Tap one to open its card.', 'Estos pines Demo son registros reales del DOE alrededor de Los Ángeles. Toca uno para ver su ficha.'), go: () => { try { go('map'); } catch (e) {} } },
    { title: () => L('Station card', 'Ficha de la estación'), body: () => L('This is a Demo station card. You can leave a Demo check-in here yourself. Lot status stays “Live status coming soon.”', 'Esta es una ficha Demo. Puedes dejar un registro Demo. El lote sigue diciendo “Estado en vivo pronto.”'), go: () => { const s = STATION_SEL(); try { if (s && typeof pick === 'function') pick(s); go('station'); } catch (e) {} } },
    { title: () => L('Trip', 'Viaje'), body: () => L('A Demo trip from Los Angeles to San Diego is prefilled. Plan it to see stops from bundled stations.', 'Hay un viaje Demo de Los Ángeles a San Diego. Planéalo para ver paradas de las estaciones guardadas.'), go: () => { prefillTrip(); try { go('trip'); } catch (e) {} } },
    { title: () => L('Ask your buddy', 'Pregúntale a tu compañero'), body: () => L('The chips answer from bundled sample data. Everything here is labeled Demo.', 'Las opciones responden con datos de muestra. Todo está marcado como Demo.'), go: () => { try { go('ask'); } catch (e) {} } },
    { title: () => L('Your robot', 'Tu robot'), body: () => L('Tap your robot buddy on Profile. That’s the last Demo step.', 'Toca tu robot compañero en Perfil. Ese es el último paso Demo.'), go: () => { try { go('profile'); } catch (e) {} } },
  ];

  let step = 0;
  function tour(n) {
    step = n;
    let el = document.getElementById('c1-demo-tour');
    if (!n) { if (el) el.remove(); return; }
    const s = STEPS[n - 1];
    if (s && s.go) s.go();
    if (!el) {
      el = document.createElement('div');
      el.id = 'c1-demo-tour';
      el.style.cssText = 'position:absolute;left:10px;right:10px;bottom:120px;z-index:2000;background:#122044;color:#F4F7FB;border-radius:16px;padding:12px 14px;border:1px solid #3B7BFF;';
      (document.querySelector('.phone') || document.body).appendChild(el);
    }
    el.innerHTML = '<div class="muted" style="color:#9CC2FF">Demo · ' + L('Step', 'Paso') + ' ' + n + ' ' + L('of', 'de') + ' 5</div>'
      + '<b style="display:block;margin-top:4px">' + s.title() + '</b>'
      + '<div style="margin-top:4px">' + s.body() + '</div>'
      + '<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;align-items:center">'
      + (n > 1 ? '<button type="button" class="btn" id="c1-demo-back">' + L('Back', 'Atrás') + '</button>' : '')
      + '<button type="button" class="lnk" id="c1-demo-skip">' + L('Skip tour', 'Saltar recorrido') + '</button>'
      + '<span style="flex:1"></span>'
      + '<button type="button" class="btn g" id="c1-demo-next">' + (n >= 5 ? L('Done', 'Listo') : L('Next', 'Siguiente')) + '</button></div>';
    el.querySelector('#c1-demo-next').onclick = () => tour(n >= 5 ? 0 : n + 1);
    const sk = el.querySelector('#c1-demo-skip'); if (sk) sk.onclick = () => tour(0);
    const bk = el.querySelector('#c1-demo-back'); if (bk) bk.onclick = () => tour(n - 1);
  }

  function apply() {
    const on = window.c1DemoOn();
    banner(on);
    document.querySelectorAll('.c1-demo-badge').forEach(b => b.hidden = !on);
    if (on) {
      try {
        if (window.map && map.setView) map.setView([34.05, -118.27], 11, { animate: false });
        if (typeof draw === 'function') draw();
        if (typeof drawClusters === 'function') drawClusters();
      } catch (e) {}
      const src = document.getElementById('datasrc');
      if (src) src.textContent = L('Demo: bundled real DOE stations around Los Angeles.', 'Demo: estaciones reales del DOE alrededor de Los Ángeles.');
      prefillTrip();
    }
  }

  window.c1SetDemo = function (on) {
    store('c1_demo', on ? '1' : '0');
    store('c1_demo_prompted', '1');
    apply();
    if (on) tour(1); else tour(0);
  };

  function mountToggle() {
    const root = document.getElementById('c1profile');
    if (!root || document.getElementById('c1-demo-toggle')) return;
    const card = document.createElement('div');
    card.className = 'card';
    card.id = 'c1-demo-toggle';
    card.innerHTML = '<div class="row"><b>' + L('Demo mode', 'Modo Demo') + '</b>'
      + '<button type="button" class="chip" id="c1-demo-sw" aria-pressed="false">' + L('Demo', 'Demo') + '</button></div>'
      + '<div class="muted">' + L('Load bundled real LA stations around Downtown Los Angeles. No GPS required.', 'Carga estaciones reales de LA alrededor del centro de Los Ángeles. No se necesita GPS.') + '</div>';
    root.appendChild(card);
    const sw = document.getElementById('c1-demo-sw');
    const sync = () => { if (sw) { sw.setAttribute('aria-pressed', window.c1DemoOn() ? 'true' : 'false'); sw.classList.toggle('on', window.c1DemoOn()); } };
    if (sw) sw.onclick = () => { window.c1SetDemo(!window.c1DemoOn()); sync(); };
    sync();
  }

  function hookWelcome() {
    const w = document.getElementById('welcome');
    if (!w || document.getElementById('c1-demo-try')) return;
    const btn = document.createElement('button');
    btn.id = 'c1-demo-try';
    btn.className = 'btn g';
    btn.type = 'button';
    btn.textContent = L('Try the demo', 'Probar la demo');
    btn.onclick = () => { w.classList.remove('on'); window.c1SetDemo(true); try { go('map'); } catch (e) {} };
    const guest = w.querySelector('button.btn:not(.g)');
    if (guest) w.insertBefore(btn, guest);
    else w.appendChild(btn);
  }

  function hookProfile() {
    const prev = window.renderProfileV23;
    if (typeof prev === 'function' && !prev._c1demo) {
      const wrap = function () { const r = prev.apply(this, arguments); try { mountToggle(); } catch (e) {} return r; };
      wrap._c1demo = 1;
      window.renderProfileV23 = wrap;
    }
    mountToggle();
  }

  document.addEventListener('DOMContentLoaded', () => { hookWelcome(); hookProfile(); apply(); });
  setTimeout(() => { hookWelcome(); hookProfile(); apply(); }, 0);
  setTimeout(() => { hookWelcome(); hookProfile(); apply(); }, 400);
})();
