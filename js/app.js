/* Ronco & Pipoco — interface, pedais, garagem e OBD2 */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const PRESETS = EngineDSP.presets();
  // mesma ordem dos presets do motor (engine.js)
  const CARS = [
    { skin: 'camaro', name: 'Camaro SS', engine: 'V8 6.2 LT1', power: '461 cv', spdMax: 320, redFrom: 6500, img: 'img/camaro.webp', line: 'Chevrolet Camaro SS · V8 6.2 aspirado' },
    { skin: 'gti', name: 'Golf GTI', engine: '2.0 TSI turbo', power: '230 cv', spdMax: 280, redFrom: 6500, img: 'img/gti.webp', line: 'Volkswagen Golf GTI · 2.0 TSI turbo' },
    { skin: 'huracan', name: 'Huracán', engine: 'V10 5.2', power: '610 cv', spdMax: 325, redFrom: 8500, img: 'img/huracan.webp', line: 'Lamborghini Huracán LP610-4 · V10 5.2' },
    { skin: 'maverick', name: 'Maverick GT', engine: 'V8 302', power: '199 cv', spdMax: 200, redFrom: 5500, img: 'img/maverick.webp', line: 'Ford Maverick GT 1975 · V8 302' },
    { skin: 'f1', name: 'Fórmula 1', engine: 'V10 3.0', power: '900 cv', spdMax: 370, redFrom: 18000, img: 'img/f1.webp', line: 'Fórmula 1 anos 2000 · V10 3.0' },
    { skin: 'civic', name: 'Civic Type R', engine: '1.6 VTEC', power: '185 cv', spdMax: 240, redFrom: 8400, img: 'img/civic.webp', line: 'Honda Civic Type R (EK9) · 1.6 VTEC aspirado' },
    { skin: 'gt3', name: '911 GT3', engine: 'Boxer 6 4.0', power: '510 cv', spdMax: 340, redFrom: 9000, img: 'img/gt3.webp', line: 'Porsche 911 GT3 (992) · boxer 6 4.0 aspirado' }
  ];
  const ORDER = [0, 3, 1, 5, 6, 2, 4];
  const reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- preferências salvas ----------
  const CFG_KEY = 'ronco.cfg.v2';
  let cfg = {};
  try { cfg = JSON.parse(localStorage.getItem(CFG_KEY)) || {}; } catch (e) { cfg = {}; }
  const num = (v, d, lo, hi) => (typeof v === 'number' && v >= lo && v <= hi ? v : d);
  let preset = num(cfg.car, 0, 0, CARS.length - 1) | 0, mode = num(cfg.mode, 0, 0, 1) | 0;
  let popAmt = num(cfg.pop, 0.7, 0, 1), exh = num(cfg.exh, 0.5, 0, 1), vol = num(cfg.vol, 0.8, 0, 1);
  let odoKm = num(cfg.odo, 0, 0, 1e7), odoSavedAt = 0;
  let saveT = 0;
  function save() {
    clearTimeout(saveT);
    saveT = setTimeout(() => {
      try { localStorage.setItem(CFG_KEY, JSON.stringify({ car: preset, mode, pop: popAmt, exh, vol, odo: Math.round(odoKm * 10) / 10 })); } catch (e) {}
    }, 400);
  }

  let on = false, audio = null, cluster = null, cockpit = false;
  let S = { rpm: 0, thr: 0, gear: 1, kmh: 0, boost: 0, pops: 0, big: 0, state: 0, cut: false, mode: 0 };
  let lastPops = 0, lastBig = 0, flash = 0, lastBuzz = 0, sweepT0 = -1, dispRpm = 0, dispKmh = 0, lastT = 0, shiftFlash = false, lastVtec = 0;
  const obd = { link: null, busy: false, rate: 0, pedalName: null };
  const clusterEl = $('cluster'), shiftGlow = $('shiftGlow'), themeMeta = document.querySelector('meta[name="theme-color"]');

  const status = (msg, err) => { const n = $('status'); n.textContent = msg; n.classList.toggle('err', !!err); };
  const send = (m) => { if (audio && audio.send) audio.send(m); };

  // ---------- áudio ----------
  const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

  async function buildEngine(ctx, master) {
    if (ctx.audioWorklet && typeof AudioWorkletNode !== 'undefined') {
      try {
        const code = EngineDSP.toString() + WORKLET_TAIL;
        const url = URL.createObjectURL(new Blob([code], { type: 'application/javascript' }));
        try { await withTimeout(ctx.audioWorklet.addModule(url), 3000); }
        catch (e1) { await withTimeout(ctx.audioWorklet.addModule('data:text/javascript;charset=utf-8,' + encodeURIComponent(code)), 3000); }
        URL.revokeObjectURL(url);
        const node = new AudioWorkletNode(ctx, 'ronco-engine', { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2] });
        node.port.onmessage = (e) => onReport(e.data);
        node.connect(master);
        audio.node = node;
        return (m) => node.port.postMessage(m);
      } catch (e) {
        console.warn('AudioWorklet indisponível; usando ScriptProcessor.', e);
      }
    }
    const dsp = new EngineDSP(ctx.sampleRate);
    dsp.onReport = onReport;
    const sp = ctx.createScriptProcessor(1024, 1, 2);
    sp.onaudioprocess = (e) => {
      const ob = e.outputBuffer;
      dsp.render(ob.getChannelData(0), ob.getChannelData(1), ob.length);
    };
    sp.connect(master);
    audio.sp = sp;
    return (m) => dsp.handle(m);
  }

  function ensureAudio() {
    if (audio) {
      if (audio.ctx.state !== 'running') audio.ctx.resume().catch(() => {});
      return audio.ready;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { status('Este navegador não tem áudio web. Abra no Chrome ou no Safari.', true); return Promise.resolve(false); }
    let ctx;
    try { ctx = new AC({ latencyHint: 'interactive' }); } catch (e) { ctx = new AC(); }
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    const resumed = ctx.resume ? ctx.resume() : Promise.resolve();
    try {
      const b = ctx.createBuffer(1, 1, ctx.sampleRate), s = ctx.createBufferSource();
      s.buffer = b; s.connect(ctx.destination); s.start(0);
    } catch (e) {}
    const master = ctx.createGain();
    master.gain.value = Math.pow(vol, 1.3);
    master.connect(ctx.destination);
    audio = { ctx, master, send: null, ready: null };
    audio.ready = Promise.resolve(resumed).catch(() => {}).then(() => buildEngine(ctx, master)).then((fn) => {
      audio.send = fn;
      syncAll();
      return true;
    }).catch((e) => {
      console.error(e);
      status('Não deu pra iniciar o áudio. Toque em START de novo.', true);
      audio = null;
      return false;
    });
    return audio.ready;
  }

  function syncAll() { send({ preset, mode, pop: popAmt, exh, pedal: gas.get(), brake: brake.get() }); }

  function onReport(r) {
    if (r.pops > lastPops) {
      const big = r.big > lastBig;
      flash = Math.min(1, flash + (big ? 0.9 : 0.4));
      const now = performance.now();
      if (big && now - lastBuzz > 140 && navigator.vibrate) { try { navigator.vibrate(14); } catch (e) {} lastBuzz = now; }
    }
    lastPops = r.pops; lastBig = r.big;
    // VTEC entrando: um tranco no celular junto com a troca de comando
    if ((r.vtecN || 0) > lastVtec && navigator.vibrate) { try { navigator.vibrate(22); } catch (e) {} }
    lastVtec = r.vtecN || 0;
    S = r;
  }

  // ---------- manter a tela acesa ----------
  let wakeLock = null;
  async function keepAwake(want) {
    try {
      if (want && !wakeLock && navigator.wakeLock && document.visibilityState === 'visible') {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => { wakeLock = null; });
      } else if (!want && wakeLock) {
        const w = wakeLock; wakeLock = null;
        await w.release();
      }
    } catch (e) { wakeLock = null; }
  }

  async function startEngine() {
    if (on) return;
    on = true; renderPower();
    if (!reduced) sweepT0 = performance.now();
    const ok = await ensureAudio();
    if (!ok) { on = false; renderPower(); return; }
    send({ cmd: 'start' });
    keepAwake(true);
  }
  function stopEngine() {
    if (!on) return;
    if (obd.link) obdStop('OBD2 desconectado.');
    on = false; renderPower();
    gas.set(0); brake.set(0);
    send({ cmd: 'stop' });
    if (!cockpit) keepAwake(false);
  }
  function renderPower() {
    const b = $('power');
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    b.setAttribute('aria-label', on ? 'Desligar motor' : 'Ligar motor');
    $('powerTxt').textContent = on ? 'STOP' : 'START';
  }
  $('power').addEventListener('click', () => (on ? stopEngine() : startEngine()));

  // clique com mouse/dedo tira o foco do botão, pra barra de espaço continuar acelerando
  document.addEventListener('click', (e) => {
    const b = e.target instanceof Element ? e.target.closest('button') : null;
    if (b && e.detail > 0) b.blur();
  });

  // ---------- painel ----------
  function buildCluster() {
    document.body.dataset.car = CARS[preset].skin;
    $('carLine').textContent = CARS[preset].line;
    cluster = Cluster.mount(clusterEl, CARS[preset], PRESETS[preset]);
    fitCockpit();
    if (Cluster.dense(clusterEl) !== cluster.dense) cluster = Cluster.mount(clusterEl, CARS[preset], PRESETS[preset]);
    shiftFlash = false;
    if (themeMeta) {
      const bg = getComputedStyle(document.body).getPropertyValue('--bg').trim();
      if (bg) themeMeta.setAttribute('content', bg);
    }
  }
  let rzT = 0;
  addEventListener('resize', () => {
    clearTimeout(rzT);
    rzT = setTimeout(() => {
      fitCockpit();
      if (cluster && Cluster.dense(clusterEl) !== cluster.dense) buildCluster();
    }, 200);
  });

  function gearInfo() {
    const g = { gearTxt: '', gearChar: '-', quad: 'N', gearNum: 0, sub: '', msg: '' };
    if (S.state === 1) g.msg = 'Dando partida…';
    else if (S.state === 3) g.msg = 'Desligando';
    else if (S.state !== 2) g.msg = obd.link ? 'Ligue o motor do carro' : 'Motor desligado';
    else if (obd.link) {
      if (obd.link.hasSpeed) {
        const gr = gearSt.gear;
        g.gearNum = gr || 0;
        g.gearTxt = gr == null ? '–' : gr === 0 ? 'N' : gr + 'ª';
        g.gearChar = gr ? String(gr) : 'N';
        g.quad = gr ? 'D' : 'N';
      } else { g.gearTxt = 'OBD'; g.quad = 'D'; }
      g.sub = obd.rate ? Math.round(obd.rate) + ' leituras/s' : '';
    } else if (mode === 0) { g.gearTxt = 'N'; g.gearChar = 'N'; g.quad = 'N'; }
    else { g.gearNum = S.gear; g.gearTxt = 'D' + S.gear; g.gearChar = String(S.gear); g.quad = 'D'; }
    return g;
  }

  function frame(now) {
    const dt = lastT ? Math.min(0.1, Math.max(0, (now - lastT) / 1000)) : 0;
    lastT = now;
    let tRpm = S.rpm || 0;
    let tKmh = obd.link ? (obd.link.raw.speed || 0) : (S.kmh || 0);
    if (sweepT0 >= 0) {
      const t = Math.max(0, (now - sweepT0) / 1100);
      if (t >= 1) sweepT0 = -1;
      else {
        const k = Math.pow(Math.sin(Math.PI * t), 1.4);
        tRpm = Math.max(tRpm, cluster.max.rpm * k);
        tKmh = Math.max(tKmh, cluster.max.kmh * k);
      }
    }
    const sweeping = sweepT0 >= 0;
    // suavização por tempo (igual em 30, 60 ou 120 quadros por segundo)
    dispRpm += (tRpm - dispRpm) * (1 - Math.exp(-dt / (sweeping ? 0.025 : 0.04)));
    dispKmh += (tKmh - dispKmh) * (1 - Math.exp(-dt / (sweeping ? 0.025 : obd.link ? 0.2 : 0.05)));
    if (!(dispRpm >= 1)) dispRpm = 0;
    if (!(dispKmh >= 0.3)) dispKmh = 0;
    if (S.state === 2 && !sweeping && dispKmh > 0.5) {
      odoKm += dispKmh * dt / 3600;
      if (now - odoSavedAt > 15000) { odoSavedAt = now; save(); }
    }
    flash *= Math.exp(-dt / 0.11);
    $('backfire').style.opacity = (flash * 0.9).toFixed(3);

    // aviso de troca: aceso perto do limitador, piscando em cima dele
    const lim = PRESETS[preset].lim;
    let shift = 0;
    if (S.state === 2 && !sweeping) {
      if ((S.cut && !obd.link) || dispRpm >= lim * 0.955) shift = 2;
      else if (dispRpm >= lim * 0.88) shift = 1;
    }
    const blink = now % 180 < 90;
    const flashOn = shift === 2 && blink;
    if (flashOn !== shiftFlash) {
      shiftFlash = flashOn;
      shiftGlow.classList.toggle('on', flashOn);
      clusterEl.classList.toggle('shift-on', flashOn);
    }

    const g = gearInfo();
    cluster.update({
      rpm: dispRpm, kmh: dispKmh, lim, state: S.state, cut: !!S.cut && S.state === 2,
      obd: !!obd.link, flash, boost: S.boost || 0, mode, pops: S.pops || 0, now, odoKm, shift, blink, vtec: !!S.vtec,
      gearTxt: g.gearTxt, gearChar: g.gearChar, quad: g.quad, gearNum: g.gearNum, sub: g.sub, msg: g.msg
    });
    requestAnimationFrame(frame);
  }

  // ---------- pedais ----------
  function makePad(el, key, isGas) {
    const pct = el.querySelector('.pct');
    let pid = null, v = 0;
    function show(d) {
      v = d;
      el.style.setProperty('--d', d.toFixed(3));
      el.style.setProperty('--y', (0.08 + d * 0.84).toFixed(3));
      el.dataset.on = d > 0 ? '1' : '0';
      pct.textContent = Math.round(d * 100) + '%';
      el.setAttribute('aria-valuenow', String(Math.round(d * 100)));
    }
    function set(d) { show(d); if (!obd.link) send({ [key]: d }); }
    const depth = (e) => {
      const r = el.getBoundingClientRect();
      if (!r.height) return 0;
      return Math.max(0, Math.min(1, ((e.clientY - r.top) / r.height - 0.08) / 0.84));
    };
    el.addEventListener('pointerdown', (e) => {
      if (pid !== null || obd.link) return;
      pid = e.pointerId;
      try { el.setPointerCapture(pid); } catch (err) {}
      e.preventDefault();
      if (isGas && !on) startEngine(); else ensureAudio();
      set(depth(e));
    });
    el.addEventListener('pointermove', (e) => { if (e.pointerId === pid) set(depth(e)); });
    const end = (e) => { if (e.pointerId !== pid) return; pid = null; set(0); };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('lostpointercapture', end);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    return { set, show, get: () => v };
  }
  const gas = makePad($('gas'), 'pedal', true);
  const brake = makePad($('brake'), 'brake', false);

  const GAS_KEYS = ['ArrowUp', 'KeyW', 'Space'], BRAKE_KEYS = ['ArrowDown', 'KeyS'];
  addEventListener('keydown', (e) => {
    const isGas = GAS_KEYS.includes(e.code), isBrake = BRAKE_KEYS.includes(e.code);
    if (!isGas && !isBrake) return;
    if (obd.link) return;
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT') return;
    if (tag === 'BUTTON' && e.code === 'Space') return;
    e.preventDefault();
    if (e.repeat) return;
    if (isGas) { if (!on) startEngine(); gas.set(1); }
    else if (mode === 1) { ensureAudio(); brake.set(1); }
  });
  addEventListener('keyup', (e) => {
    if (obd.link) return;
    if (GAS_KEYS.includes(e.code)) gas.set(0);
    else if (BRAKE_KEYS.includes(e.code)) brake.set(0);
  });
  addEventListener('blur', () => { if (!obd.link) { gas.set(0); brake.set(0); } });

  // ---------- garagem e ajustes ----------
  function buildGarage() {
    const root = $('segEngine');
    root.innerHTML = '';
    for (const i of ORDER) {
      const c = CARS[i];
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'car'; b.dataset.v = i;
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', i === preset ? 'true' : 'false');
      b.setAttribute('aria-label', c.line);
      b.innerHTML = `<img src="${c.img}" alt="" width="720" height="480" decoding="async"><span class="meta"><b>${c.name}</b><span>${c.engine}</span><em>${c.power}</em></span>`;
      root.appendChild(b);
    }
    requestAnimationFrame(() => {
      const sel = root.querySelector('[aria-checked="true"]');
      if (!sel || root.scrollWidth <= root.clientWidth) return;
      root.scrollLeft += sel.getBoundingClientRect().left - root.getBoundingClientRect().left - 16;
    });
  }
  function bindSeg(id, onPick) {
    const root = $(id);
    root.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b || !root.contains(b)) return;
      root.querySelectorAll('button').forEach((x) => x.setAttribute('aria-checked', x === b ? 'true' : 'false'));
      onPick(+b.dataset.v);
    });
  }
  bindSeg('segEngine', (v) => {
    if (v === preset) return;
    preset = v;
    buildCluster();
    send({ preset });
    save();
  });
  function applyMode() {
    $('segMode').querySelectorAll('button').forEach((x) => x.setAttribute('aria-checked', +x.dataset.v === mode ? 'true' : 'false'));
    $('brake').hidden = mode !== 1 || !!obd.link;
    $('hint').hidden = mode === 1 && !obd.link;
    $('pedals').classList.toggle('one', $('brake').hidden);
  }
  bindSeg('segMode', (v) => {
    mode = v;
    applyMode();
    if (mode !== 1) brake.set(0);
    send({ mode });
    save();
  });
  function bindSlider(id, outId, get, set, fmt) {
    const inp = $(id), out = $(outId);
    inp.value = String(Math.round(get() * 100));
    out.textContent = fmt(inp.value);
    inp.addEventListener('input', () => { set(inp.value / 100); out.textContent = fmt(inp.value); save(); });
  }
  const pct = (v) => v + '%';
  bindSlider('pop', 'popOut', () => popAmt, (v) => { popAmt = v; send({ pop: popAmt }); }, pct);
  bindSlider('exh', 'exhOut', () => exh, (v) => { exh = v; send({ exh }); }, (v) => (v < 20 ? 'original' : v > 80 ? 'aberto' : v + '%'));
  bindSlider('vol', 'volOut', () => vol, (v) => {
    vol = v;
    if (audio) audio.master.gain.setTargetAtTime(Math.pow(vol, 1.3), audio.ctx.currentTime, 0.03);
  }, pct);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      gas.set(0); brake.set(0);
      if (audio && !obd.link) audio.ctx.suspend().catch(() => {});
    } else {
      if (audio && on) audio.ctx.resume().catch(() => {});
      if (on || obd.link || cockpit) keepAwake(true);
    }
  });

  // ---------- modo painel: tela cheia só com os relógios ----------
  const fsBtn = $('fsBtn'), docEl = document.documentElement, wrap = $('clusterWrap');
  const fsElement = () => document.fullscreenElement || document.webkitFullscreenElement || null;
  function fitCockpit() {
    if (!cockpit) { wrap.style.width = ''; return; }
    const portrait = innerHeight > innerWidth;
    const topH = document.querySelector('.top').offsetHeight;
    const availH = Math.max(140, portrait ? innerHeight - topH - (obd.link ? 0 : 178) - 32 : innerHeight - 16);
    wrap.style.width = '';
    const full = wrap.offsetWidth;
    let w = full;
    for (let i = 0; i < 3; i++) {
      const ratio = clusterEl.offsetWidth / Math.max(1, clusterEl.offsetHeight);
      const want = Math.min(full, Math.max(180, availH * ratio));
      if (i > 0 && Math.abs(want - w) < 2) break;
      w = want;
      wrap.style.width = Math.round(w) + 'px';
    }
  }
  function setCockpit(v) {
    cockpit = v;
    document.body.classList.toggle('cockpit', cockpit);
    fsBtn.setAttribute('aria-pressed', cockpit ? 'true' : 'false');
    const label = cockpit ? 'Sair do modo painel' : 'Modo painel: tela cheia só com os relógios';
    fsBtn.setAttribute('aria-label', label);
    fsBtn.title = label;
    try {
      const fsEl = fsElement();
      if (cockpit && !fsEl) {
        const req = docEl.requestFullscreen || docEl.webkitRequestFullscreen;
        if (req) { const p = req.call(docEl); if (p && p.catch) p.catch(() => {}); }
      } else if (!cockpit && fsEl) {
        const ex = document.exitFullscreen || document.webkitExitFullscreen;
        if (ex) { const p = ex.call(document); if (p && p.catch) p.catch(() => {}); }
      }
    } catch (e) {}
    fitCockpit();
    setTimeout(() => {
      fitCockpit();
      if (Cluster.dense(clusterEl) !== cluster.dense) buildCluster();
    }, 350);
    if (cockpit) keepAwake(true); else if (!on && !obd.link) keepAwake(false);
  }
  fsBtn.addEventListener('click', () => setCockpit(!cockpit));
  const onFs = () => { if (!fsElement() && cockpit) setCockpit(false); else fitCockpit(); };
  document.addEventListener('fullscreenchange', onFs);
  document.addEventListener('webkitfullscreenchange', onFs);
  addEventListener('keydown', (e) => { if (e.code === 'Escape' && cockpit && !fsElement()) setCockpit(false); });

  // ---------- OBD2 ----------
  const obdBtn = $('obdBtn'), obdBle = $('obdBle'), obdMsgEl = $('obdMsg'), obdLog = $('obdLog');
  // no app de iPhone o próprio app fala com o ELM327 (Wi-Fi ou Bluetooth BLE) e entrega a conexão pronta
  const native = window.roncoNative || null;
  const hasSerial = native ? true : 'serial' in navigator, hasBle = native ? true : 'bluetooth' in navigator;
  if (native) obdBle.textContent = 'Adaptador Bluetooth BLE';
  const cal = { lo: null, hi: null };
  const obdMsg = (t, err) => { obdMsgEl.textContent = t; obdMsgEl.classList.toggle('err', !!err); };
  const logLine = (t) => { const ls = obdLog.textContent ? obdLog.textContent.split('\n') : []; ls.push(t); obdLog.textContent = ls.slice(-40).join('\n'); };
  // rpm por km/h em cada marcha do Kwid 1.0 (relações 3,769 / 2,048 / 1,290 / 0,949 / 0,791, diferencial 4,214, pneu 165/70 R14)
  const GEARS_KEY = 'ronco.marchas.v1';
  const gearK = (() => {
    try { const g = JSON.parse(localStorage.getItem(GEARS_KEY)); if (Array.isArray(g) && g.length === 5 && g.every((x) => x > 5 && x < 400)) return g; } catch (e) {}
    return [147, 80, 50.3, 37, 30.9];
  })();
  const gearSt = { hist: [], gear: null, seen: 0, saved: 0, okAt: 0 };
  function gearUpdate(rpm, kmh, now) {
    if (kmh < 3) { gearSt.hist.length = 0; gearSt.gear = 0; return; }
    if (!(rpm > 600)) return;
    if (now - gearSt.okAt > 1500 && rpm < 1150) gearSt.gear = 0;   // giro de marcha lenta sem casar com nenhuma marcha: ponto morto
    const h = gearSt.hist;
    h.push({ k: rpm / kmh, t: now });
    while (h.length && now - h[0].t > 900) h.shift();
    if (h.length < 3) return;
    let mn = Infinity, mx = 0, sum = 0;
    for (const e of h) { mn = Math.min(mn, e.k); mx = Math.max(mx, e.k); sum += e.k; }
    if ((mx - mn) / mn > 0.05 + 0.6 / kmh) return;            // embreagem apertada ou trocando
    const km = sum / h.length;
    let best = 0, bd = Infinity;
    gearK.forEach((g, i) => { const dd = Math.abs(Math.log(km / g)); if (dd < bd) { bd = dd; best = i; } });
    if (bd < Math.log(1.12)) {
      gearSt.gear = best + 1; gearSt.okAt = now;
      gearK[best] += (km - gearK[best]) * 0.03;
      if (now - gearSt.saved > 5000) { gearSt.saved = now; try { localStorage.setItem(GEARS_KEY, JSON.stringify(gearK.map((x) => +x.toFixed(2)))); } catch (e) {} }
    } else if (km < gearK[gearK.length - 1] * 0.75) gearSt.gear = 0;   // giro baixo pra velocidade: ponto morto
  }
  const real = { idle: 850, max: 6000 };
  function mapRpm(r) {
    const P = PRESETS[preset];
    if (r <= real.idle) return r * P.idle / real.idle;
    return P.idle + (r - real.idle) * (P.lim - P.idle) / (real.max - real.idle);
  }
  function pedalNorm(raw) {
    if (cal.lo === null || raw < cal.lo) cal.lo = raw;
    if (cal.hi === null || raw > cal.hi) cal.hi = raw;
    const span = Math.max(cal.hi - cal.lo, 30);
    return Math.max(0, Math.min(1, (raw - cal.lo - 1.5) / (span - 1.5)));
  }
  function setObdUi(st) {
    obdBtn.textContent = st === 'on' ? 'Desconectar OBD2' : st === 'busy' ? 'Conectando…' : native ? 'Conectar OBD2 Wi-Fi' : 'Conectar OBD2';
    obdBtn.setAttribute('aria-pressed', st === 'on' ? 'true' : 'false');
    obdBtn.disabled = st === 'busy' || !hasSerial;
    obdBle.hidden = st !== 'idle' || !hasBle;
    $('hintObd').hidden = st !== 'on';
    $('hintSim').hidden = st === 'on';
    $('obd').classList.toggle('live', st === 'on');
    document.body.classList.toggle('obd-live', st === 'on');
    applyMode();
    fitCockpit();
  }
  function obdErrText(e) {
    const m = String((e && (e.message || e.name)) || e), n = e && e.name;
    if (n === 'NotFoundError') return 'Nenhum aparelho escolhido.';
    if (/^wifi/.test(m)) return 'Não achei o ELM327 no Wi-Fi. Ligue a ignição, entre na rede Wi-Fi do adaptador (algo como "WiFi_OBDII") nos Ajustes do iPhone e tente de novo.';
    if (/^ble-desligado/.test(m)) return 'O Bluetooth do iPhone está desligado. Ligue e tente de novo.';
    if (/^ble-negado/.test(m)) return 'O app não tem permissão pra usar o Bluetooth. Libere em Ajustes > Privacidade e Segurança > Bluetooth.';
    if (/^ble-nenhum/.test(m)) return 'Não achei nenhum adaptador Bluetooth BLE por perto. Ligue a ignição e confira se o seu ELM327 é BLE (4.0); os Bluetooth comuns não falam com o iPhone, aí use um Wi-Fi.';
    if (/^ble-conexao/.test(m)) return 'Não deu pra conectar no adaptador Bluetooth. Chegue perto do carro e tente de novo.';
    if (n === 'SecurityError') return 'O navegador bloqueou o acesso ao aparelho. Abra a página direto no Chrome.';
    if (/ble-sem-servico/.test(m)) return 'Esse aparelho não tem o canal de dados do ELM327 por BLE. Use o botão Conectar OBD2.';
    if (n === 'NetworkError' || n === 'InvalidStateError' || /Failed to open/i.test(m)) return 'Não deu pra abrir a porta. Feche outros apps que usem o ELM327 e tente de novo.';
    if (/^carro:/.test(m)) return 'O ELM327 respondeu, mas o carro não. Ligue a ignição ou o motor e tente de novo. Resposta: ' + m.slice(6);
    if (/semrpm/.test(m)) return 'O carro não informa o rpm pelo OBD2.';
    if (/sem resposta/.test(m)) return 'O ELM327 não respondeu. Confira se escolheu a porta certa e se a ignição está ligada.';
    return 'Erro na conexão: ' + m;
  }
  function obdStart(kind) {
    if (obd.busy) return;
    if (obd.link) { obdStop('OBD2 desconectado.'); return; }
    const audioReady = ensureAudio();
    let pick;
    try { pick = native ? native.open(kind === 'ble' ? 'ble' : 'wifi') : kind === 'ble' ? openBle() : openSerial(); } catch (e) { pick = Promise.reject(e); }
    obdRun(audioReady, pick);
  }
  async function obdRun(audioReady, pick) {
    obd.busy = true; setObdUi('busy'); obdMsg('Abrindo a conexão…');
    let t;
    try { t = await pick; } catch (e) { obd.busy = false; setObdUi('idle'); obdMsg(obdErrText(e), !e || e.name !== 'NotFoundError'); return; }
    obdLog.textContent = '';
    const link = new ObdLink(t, logLine);
    try { await link.init((m) => obdMsg(m)); }
    catch (e) { link.alive = false; try { await t.close(); } catch (x) {} obd.busy = false; setObdUi('idle'); obdMsg(obdErrText(e), true); return; }
    const ok = await audioReady;
    if (!ok) { link.alive = false; try { await t.close(); } catch (x) {} obd.busy = false; setObdUi('idle'); return; }
    t.onLost = () => { if (obd.link === link) obdStop('A conexão com o OBD2 caiu. Toque em Conectar OBD2 de novo.', true); };
    cal.lo = cal.hi = null; obd.rate = 0;
    gearSt.hist.length = 0; gearSt.gear = null; real.idle = 850;
    obd.pedalName = link.pedalPid === 0x11 || link.pedalPid === 0x45 ? 'borboleta' : link.pedalPid != null ? 'pedal' : null;
    obd.link = link; obd.busy = false;
    setObdUi('on');
    on = true; renderPower();
    keepAwake(true);
    obdMsg('Conectado ao ' + link.version + '. Lendo rpm' + (obd.pedalName ? ' e ' + obd.pedalName : '; o carro não informa o pedal') + (link.hasSpeed ? ' e velocidade' : '') + '.');
    obdLoop(link);
  }
  function obdStop(msg, err) {
    const link = obd.link;
    obd.link = null; obd.rate = 0;
    if (link) { link.alive = false; try { link.t.close(); } catch (e) {} }
    send({ ext: null }); send({ pedal: 0 }); gas.show(0);
    setObdUi('idle');
    if (msg) obdMsg(msg, err);
    if (!on && !cockpit) keepAwake(false);
  }
  async function obdLoop(link) {
    let fails = 0, n = 0, t0 = performance.now(), verbose = 3;
    while (obd.link === link) {
      try {
        const got = await link.read(verbose-- > 0);
        if (got) {
          fails = 0; n++;
          const p = link.pedalPid != null ? pedalNorm(link.raw.pedal) : 0, R = link.raw;
          if (p < 0.02 && R.rpm > 600 && R.rpm < 1400 && !(R.speed > 3)) real.idle += (R.rpm - real.idle) * 0.02;
          if (R.speedAt && R.speedAt !== gearSt.seen) { gearSt.seen = R.speedAt; gearUpdate(R.speedRpm, R.speed, performance.now()); }
          send({ ext: { rpm: mapRpm(R.rpm), pedal: p } });
          gas.show(p);
        } else if (++fails > 20) { obdStop('O carro parou de responder. Toque em Conectar OBD2 de novo.', true); return; }
      } catch (e) {
        if (obd.link !== link) return;
        if (++fails > 8) { obdStop('A conexão com o OBD2 caiu. Toque em Conectar OBD2 de novo.', true); return; }
        await ObdLink.sleep(120);
      }
      const now = performance.now();
      if (now - t0 >= 1000 && obd.link === link) {
        obd.rate = n * 1000 / (now - t0); n = 0; t0 = now;
        obdMsg('Conectado: ' + Math.round(obd.rate) + ' leituras por segundo de rpm' + (obd.pedalName ? ' e ' + obd.pedalName : '') + '.');
      }
    }
  }
  obdBtn.addEventListener('click', () => obdStart('serial'));
  obdBle.addEventListener('click', () => obdStart('ble'));

  // ---------- início ----------
  buildGarage();
  applyMode();
  setObdUi('idle');
  if (native) obdMsg('No iPhone: adaptador ELM327 Wi-Fi (entre na rede Wi-Fi dele antes) ou Bluetooth BLE (4.0).');
  else if (!hasSerial && !hasBle) obdMsg('Pra ligar no OBD2, abra esta página no Chrome ou no Edge do computador, ou no Chrome do Android com adaptador BLE.', true);
  else if (!hasSerial) obdMsg('Este navegador só fala com adaptadores Bluetooth BLE. Pra ELM327 Bluetooth comum, use o Chrome no computador.');
  else obdMsg('Conecte o ELM327 e escolha a porta dele na lista do Chrome.');
  buildCluster();
  renderPower();
  status('Fica bem melhor com fone ou no som do carro.');
  requestAnimationFrame(frame);

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
  }
})();
