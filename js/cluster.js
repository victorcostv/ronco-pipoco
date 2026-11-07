/* Virtual Pops — painéis de instrumentos no estilo de cada carro
   Cluster.mount(raiz, carro, preset) monta o painel e devolve { update(estado), max, dense }.
   Cada "skin" desenha o conta-giros e o velocímetro do jeito do carro:
   analógico com ponteiro (Camaro, Maverick, GTI, Civic), conta-giros central (911 GT3)
   ou digital (Huracán, Fórmula 1). */
const Cluster = (() => {
  const NS = 'http://www.w3.org/2000/svg';
  const THREE_COL = 560; // mesma largura do @container clusterbox em css/app.css
  const fx = (n) => String(Math.round(n * 100) / 100);
  function el(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function txt(parent, x, y, cls, s) {
    const t = el('text', { x: fx(x), y: fx(y), class: cls }, parent);
    t.textContent = s;
    return t;
  }
  function div(cls, html) { const d = document.createElement('div'); d.className = cls; if (html) d.innerHTML = html; return d; }
  const polar = (cx, cy, r, deg) => { const a = deg * Math.PI / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
  function arc(cx, cy, r, a0, a1) {
    if (a1 - a0 >= 359.9) a1 = a0 + 359.9;
    const [x0, y0] = polar(cx, cy, r, a0), [x1, y1] = polar(cx, cy, r, a1);
    return `M ${fx(x0)} ${fx(y0)} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${fx(x1)} ${fx(y1)}`;
  }
  function hexPts(cx, cy, r, rot) {
    const p = [];
    for (let i = 0; i < 6; i++) { const [x, y] = polar(cx, cy, r, (rot || 0) + i * 60); p.push(fx(x) + ',' + fx(y)); }
    return p.join(' ');
  }
  const setText = (n, s) => { if (n && n.textContent !== s) n.textContent = s; };
  const setCls = (n, c, on) => { if (n) n.classList.toggle(c, !!on); };
  const isMult = (v, m) => m > 0 && Math.abs(v / m - Math.round(v / m)) < 1e-6;
  const shiftOn = (s) => s.shift === 1 || (s.shift === 2 && s.blink);
  const pedalPct = (s) => Math.round(Math.min(1, Math.max(0, s.thr || 0)) * 100) + '%';

  /* ---------- ponteiros (desenhados apontando para a direita, ângulo 0) ---------- */
  const needles = {
    blade(g, cx, cy, R) {
      const L = R * 0.86, t = 22, w = 3.4;
      el('path', { d: `M ${cx - t} ${cy - w} L ${cx + L} ${cy - 0.9} L ${cx + L} ${cy + 0.9} L ${cx - t} ${cy + w} Z`, class: 'nd' }, g);
    },
    thin(g, cx, cy, R) {
      const L = R * 0.9, t = 30, w = 2.1;
      el('path', { d: `M ${cx - t} ${cy - w * 1.7} L ${cx + L} ${cy - 0.7} L ${cx + L + 2} ${cy} L ${cx + L} ${cy + 0.7} L ${cx - t} ${cy + w * 1.7} Z`, class: 'nd' }, g);
      el('rect', { x: cx - t, y: cy - 4.5, width: 13, height: 9, rx: 2, class: 'ndw' }, g);
    },
    vw(g, cx, cy, R) {
      const L = R * 0.84, t = 16, w = 2.8;
      el('path', { d: `M ${cx - t} ${cy - w} L ${cx + L} ${cy - 1} L ${cx + L} ${cy + 1} L ${cx - t} ${cy + w} Z`, class: 'nd' }, g);
      el('path', { d: `M ${cx + L * 0.5} ${cy - 1.8} L ${cx + L} ${cy - 0.9} L ${cx + L} ${cy + 0.9} L ${cx + L * 0.5} ${cy + 1.8} Z`, class: 'ndtip' }, g);
    }
  };

  /* ---------- mostrador analógico redondo (300 × 300) ---------- */
  function dial(svg, d, st) {
    const cx = 150, cy = 150, R = st.R;
    const ang = (v) => d.a0 + d.sweep * Math.min(1, Math.max(0, v / d.max));
    const g = el('g', { class: 'dial' }, svg);
    if (st.glow) el('circle', { cx, cy, r: R + st.bezel + 3, class: 'glowring' }, g);
    el('circle', { cx, cy, r: R + st.bezel, class: 'bezel' }, g);
    el('circle', { cx, cy, r: R, class: 'face' }, g);
    if (st.deco) st.deco(g, cx, cy, R, d);
    if (st.redBand && d.redFrom < d.max) {
      el('path', { d: arc(cx, cy, R - st.bandIn, ang(d.redFrom), ang(d.max)), class: 'redband', 'stroke-width': st.bandW }, g);
    }
    const tg = el('g', { class: 'ticks' }, g);
    const eps = d.minor * 1e-3;
    for (let v = 0; v <= d.max + eps; v += d.minor) {
      const major = isMult(v, d.major), mid = !major && isMult(v, d.mid || 0);
      const a = ang(v), len = major ? st.majorLen : mid ? st.midLen : st.minorLen;
      const [x0, y0] = polar(cx, cy, R - st.tickIn, a), [x1, y1] = polar(cx, cy, R - st.tickIn - len, a);
      const hot = v >= d.redFrom - eps;
      el('line', { x1: fx(x0), y1: fx(y0), x2: fx(x1), y2: fx(y1), class: 'tick' + (major ? ' major' : mid ? ' mid' : '') + (hot ? ' hot' : '') }, tg);
      if (major && isMult(v, d.label || d.major)) {
        const [tx, ty] = polar(cx, cy, R - st.labelIn, a);
        txt(g, tx, ty, 'num' + (hot ? ' hot' : ''), d.fmt(v));
      }
    }
    if (d.unit) txt(g, cx, cy + st.unitY, 'unit', d.unit);
    if (d.title) txt(g, cx, cy + st.titleY, 'title', d.title);
    if (d.badge) txt(g, cx, cy + st.badgeY, 'badge', d.badge);
    const ng = el('g', { class: 'needle' }, g);
    st.needle(ng, cx, cy, R);
    el('circle', { cx, cy, r: st.hub, class: 'hub' }, g);
    if (st.hubCap) el('circle', { cx, cy, r: st.hubCap, class: 'hubcap' }, g);
    let cur = -1e9;
    return {
      set(v) {
        const a = ang(v);
        if (Math.abs(a - cur) < 0.03) return;
        cur = a;
        ng.setAttribute('transform', `rotate(${fx(a)} ${cx} ${cy})`);
      }
    };
  }

  /* ---------- painel de três partes: giros | centro | velocímetro ---------- */
  function analog(root, skin, c) {
    root.innerHTML = '';
    root.className = 'cl cl-' + skin.id;
    const defs = el('svg', { class: 'cl-defs', width: 0, height: 0, 'aria-hidden': 'true', focusable: 'false' }, root);
    defs.innerHTML = skin.defs;
    const tBox = div('gauge tach'), cBox = div('center', skin.center(c)), sBox = div('gauge speedo');
    root.append(tBox, cBox, sBox);
    const svgT = el('svg', { viewBox: '0 0 300 300', role: 'img', 'aria-label': 'Conta-giros' }, tBox);
    const svgS = el('svg', { viewBox: '0 0 300 300', role: 'img', 'aria-label': 'Velocímetro' }, sBox);
    const tach = dial(svgT, skin.tach(c), skin.style);
    const spd = dial(svgS, skin.speedo(c), skin.style);
    const q = (sel) => cBox.querySelector(sel);
    const gear = q('.gear'), kmh = q('.kmh'), msg = q('.msg'), sh = q('.shift'), vtec = q('.vtec');
    const lCut = q('.lamp.cut'), lObd = q('.lamp.obd'), lPop = q('.lamp.pop');
    const bFill = q('.bfill'), bVal = q('.bval'), gsm = q('.gsmall');
    const quad = cBox.querySelectorAll('.quad span'), odo = cBox.querySelectorAll('.odo i');
    let lastQuad = '';
    return {
      update(s) {
        tach.set(s.rpm); spd.set(s.kmh);
        const running = s.state === 2;
        setText(gear, running ? s.gearTxt : '');
        setText(msg, running ? (s.sub || '') : s.msg);
        setText(kmh, String(Math.round(s.kmh)));
        setCls(lCut, 'on', s.cut); setCls(lObd, 'on', s.obd); setCls(lPop, 'on', s.flash > 0.25);
        setCls(sh, 'on', shiftOn(s)); setCls(sh, 'hot', s.shift === 2);
        setCls(vtec, 'on', s.vtec && running);
        if (bFill) {
          const b = Math.max(0, Math.min(1, s.boost || 0));
          bFill.style.width = (b * 100).toFixed(1) + '%';
          setText(bVal, (b * 1.2).toFixed(1).replace('.', ',') + ' bar');
        }
        if (quad.length) {
          const want = running ? s.quad : '';
          if (want !== lastQuad) { lastQuad = want; quad.forEach((n) => n.classList.toggle('on', n.dataset.g === want)); }
          setText(gsm, running && s.quad === 'D' && s.gearNum > 0 ? String(s.gearNum) + 'ª' : '');
        }
        if (odo.length) {
          const str = String(Math.floor((s.odoKm || 0) * 10)).padStart(odo.length, '0').slice(-odo.length);
          for (let i = 0; i < odo.length; i++) setText(odo[i], str[i]);
        }
      }
    };
  }

  const LAMPS = '<span class="lamps"><span class="lamp cut">LIMITE</span><span class="lamp pop">POP</span><span class="lamp obd">OBD</span></span>';
  const SHIFT = '<span class="shift">SHIFT</span>';
  const SPEED = '<span class="dspd"><b class="kmh">0</b><span>km/h</span></span>';

  /* ---------- Chevrolet Camaro SS: dois relógios com aro cromado, luz azul e ponteiro vermelho ---------- */
  const camaro = {
    id: 'camaro',
    defs: `<defs>
      <radialGradient id="cam-face" cx="50%" cy="42%" r="62%"><stop offset="0" stop-color="#1e2229"/><stop offset=".7" stop-color="#101216"/><stop offset="1" stop-color="#06070a"/></radialGradient>
      <linearGradient id="cam-bezel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e6e9ee"/><stop offset=".3" stop-color="#737a84"/><stop offset=".5" stop-color="#cfd4db"/><stop offset=".72" stop-color="#565c66"/><stop offset="1" stop-color="#b6bcc5"/></linearGradient>
    </defs>`,
    style: {
      R: 131, bezel: 7, tickIn: 7, minorLen: 7, midLen: 11, majorLen: 17, labelIn: 42, glow: true,
      needle: needles.blade, hub: 16, hubCap: 5, unitY: 66
    },
    tach: (c) => ({ max: c.dialMax, minor: 250, mid: 500, major: 1000, redFrom: c.redFrom, a0: 150, sweep: 240, fmt: (v) => String(v / 1000), unit: 'x1000 r/min' }),
    speedo: (c) => ({ max: c.spdMax, minor: 10, major: 20, label: c.dense ? 20 : 40, redFrom: Infinity, a0: 150, sweep: 240, fmt: (v) => String(v), unit: 'km/h' }),
    center: () => `<div class="screen"><div class="row r1"><span class="brandline">CAMARO SS</span>${SHIFT}</div><div class="row r2"><span class="gear"></span>${SPEED}</div><div class="row r3"><span class="msg"></span>${LAMPS}</div></div>`
  };

  /* ---------- Ford Maverick GT: relógios pretos com aro cromado largo, agulha laranja e luz âmbar ---------- */
  const maverick = {
    id: 'maverick',
    defs: `<defs>
      <linearGradient id="mav-chrome" x1="0" y1="0" x2="0.6" y2="1"><stop offset="0" stop-color="#fbfbf7"/><stop offset=".22" stop-color="#8e908c"/><stop offset=".4" stop-color="#e9eae4"/><stop offset=".58" stop-color="#5c5e5b"/><stop offset=".78" stop-color="#d6d7d1"/><stop offset="1" stop-color="#6c6e6a"/></linearGradient>
      <radialGradient id="mav-face" cx="50%" cy="50%" r="60%"><stop offset="0" stop-color="#121110"/><stop offset=".85" stop-color="#070706"/><stop offset="1" stop-color="#000"/></radialGradient>
      <radialGradient id="mav-lamp" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffb257" stop-opacity=".22"/><stop offset="1" stop-color="#ffb257" stop-opacity="0"/></radialGradient>
    </defs>`,
    style: {
      R: 128, bezel: 11, tickIn: 9, minorLen: 7, midLen: 11, majorLen: 15, labelIn: 40, glow: false,
      deco: (g, cx, cy, R) => { el('circle', { cx, cy, r: R, fill: 'url(#mav-lamp)' }, g); el('circle', { cx, cy, r: R - 3, class: 'innerring' }, g); },
      needle: needles.thin, hub: 13, hubCap: 4, unitY: 62, titleY: -46
    },
    tach: (c) => ({ max: c.dialMax, minor: 200, mid: 500, major: 1000, redFrom: c.redFrom, a0: 150, sweep: 240, fmt: (v) => String(v / 100), unit: 'RPM x 100', title: 'TACÔMETRO' }),
    speedo: (c) => ({ max: c.spdMax, minor: 10, major: 20, label: 20, redFrom: Infinity, a0: 150, sweep: 240, fmt: (v) => String(v), unit: 'km/h', title: 'VELOCÍMETRO' }),
    center: () => `<div class="plate"><div class="row r1"><span class="brandline">MAVERICK GT</span>${SHIFT}</div><div class="row r2"><span class="quad"><span data-g="P">P</span><span data-g="R">R</span><span data-g="N">N</span><span data-g="D">D</span><span data-g="2">2</span><span data-g="1">1</span></span><span class="gsmall"></span></div><div class="row r3"><span class="odo"><i>0</i><i>0</i><i>0</i><i>0</i><i>0</i><i class="tenth">0</i><small>km</small></span>${LAMPS}</div><div class="row r4"><span class="msg"></span></div></div>`
  };

  /* ---------- VW Golf GTI (Mk7): fundo preto com colmeia, números brancos, faixa e ponteiros vermelhos ---------- */
  const gti = {
    id: 'gti',
    defs: `<defs>
      <pattern id="gti-honey" width="12" height="20.8" patternUnits="userSpaceOnUse">
        <polygon points="${hexPts(6, 6.93, 6.6, 30)}" fill="none" stroke="#1c1d22" stroke-width="1"/>
        <polygon points="${hexPts(0, 17.32, 6.6, 30)}" fill="none" stroke="#1c1d22" stroke-width="1"/>
        <polygon points="${hexPts(12, 17.32, 6.6, 30)}" fill="none" stroke="#1c1d22" stroke-width="1"/>
      </pattern>
      <radialGradient id="gti-face" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="#15161a"/><stop offset=".8" stop-color="#0a0a0d"/><stop offset="1" stop-color="#050506"/></radialGradient>
      <linearGradient id="gti-bezel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4a4e56"/><stop offset=".5" stop-color="#1e2126"/><stop offset="1" stop-color="#3b3f47"/></linearGradient>
    </defs>`,
    style: {
      R: 133, bezel: 5, tickIn: 6, minorLen: 6, midLen: 9, majorLen: 15, labelIn: 38, glow: false,
      redBand: true, bandIn: 4, bandW: 7,
      deco: (g, cx, cy, R) => { el('circle', { cx, cy, r: R, fill: 'url(#gti-honey)' }, g); el('circle', { cx, cy, r: R - 1.5, class: 'redring' }, g); },
      needle: needles.vw, hub: 14, hubCap: 0, unitY: 64, badgeY: 44
    },
    tach: (c) => ({ max: c.dialMax, minor: 250, mid: 500, major: 1000, redFrom: c.redFrom, a0: 150, sweep: 240, fmt: (v) => String(v / 1000), unit: '1/min x1000', badge: 'GTI' }),
    speedo: (c) => ({ max: c.spdMax, minor: 10, major: 20, label: c.dense ? 20 : 40, redFrom: Infinity, a0: 150, sweep: 240, fmt: (v) => String(v), unit: 'km/h' }),
    center: () => `<div class="mfd"><div class="row r1"><span class="brandline">GTI</span>${SHIFT}</div><div class="row r2"><span class="gear"></span>${SPEED}</div><div class="boost"><span>Turbo</span><i class="bar"><b class="bfill"></b></i><em class="bval">0,0 bar</em></div><div class="row r3"><span class="msg"></span>${LAMPS}</div></div>`
  };

  /* ---------- Honda Civic Type R (EK9): relógios brancos, ponteiros vermelhos e luz do VTEC ---------- */
  const civic = {
    id: 'civic',
    defs: `<defs>
      <radialGradient id="civ-face" cx="50%" cy="38%" r="68%"><stop offset="0" stop-color="#ffffff"/><stop offset=".7" stop-color="#f0f0ea"/><stop offset="1" stop-color="#d4d4cc"/></radialGradient>
      <linearGradient id="civ-bezel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4c4f56"/><stop offset=".45" stop-color="#111215"/><stop offset="1" stop-color="#3a3d44"/></linearGradient>
    </defs>`,
    style: {
      R: 131, bezel: 7, tickIn: 5, minorLen: 7, midLen: 10, majorLen: 16, labelIn: 37, glow: false,
      redBand: true, bandIn: 3, bandW: 10,
      needle: needles.thin, hub: 14, hubCap: 5, unitY: 62, badgeY: 36
    },
    tach: (c) => ({ max: c.dialMax, minor: 250, mid: 500, major: 1000, redFrom: c.redFrom, a0: 150, sweep: 240, fmt: (v) => String(v / 1000), unit: 'x1000r/min', badge: 'TYPE R' }),
    speedo: (c) => ({ max: c.spdMax, minor: 10, major: 20, label: c.dense ? 20 : 40, redFrom: Infinity, a0: 150, sweep: 240, fmt: (v) => String(v), unit: 'km/h' }),
    center: () => `<div class="lcd"><div class="row r1"><span class="brandline">TYPE R</span><span class="vtec">VTEC</span>${SHIFT}</div><div class="row r2"><span class="gear"></span>${SPEED}</div><div class="row r3"><span class="msg"></span>${LAMPS}</div></div>`
  };

  /* ---------- LEDs de troca (Huracán, F1 e 911 GT3) ---------- */
  function ledStrip(svg, n, x0, x1, y, r, colors) {
    const leds = [];
    for (let i = 0; i < n; i++) {
      const x = x0 + (x1 - x0) * (n > 1 ? i / (n - 1) : 0.5);
      leds.push(el('circle', { cx: fx(x), cy: y, r, class: 'led ' + colors(i) }, svg));
    }
    return ledDriver(leds);
  }
  function ledDriver(leds) {
    const n = leds.length;
    let last = -1;
    return {
      set(s, now) {
        let lit = 0;
        if (s.state === 2) {
          const lo = s.lim * 0.62, hi = s.lim * 0.985;
          const q = (s.rpm - lo) / (hi - lo);
          lit = q <= 0 ? 0 : Math.min(n, Math.ceil(q * n));
          if (s.rpm >= hi || s.cut) lit = Math.floor(now / 70) % 2 ? n : 0;
        }
        if (lit === last) return;
        last = lit;
        leds.forEach((l, i) => l.classList.toggle('on', i < lit));
      }
    };
  }

  /* ---------- dígitos de sete segmentos (painel da F1) ---------- */
  const SEG = { '0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc', '5': 'afgcd', '6': 'afgedc', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg', '-': 'g', 'N': 'ceg', ' ': '', 'P': 'abefg', 'R': 'eg', 'E': 'afged', 'L': 'fed', 'O': 'abcdef', 'F': 'afge', 'A': 'abcefg', 'd': 'bcdeg', 'S': 'afgcd' };
  function seg7(parent, x, y, h, cls) {
    const w = h * 0.52, t = h * 0.1, s = t * 0.3;
    const H = (L, R2, cy) => `${fx(L + s)},${fx(cy)} ${fx(L + s + t / 2)},${fx(cy - t / 2)} ${fx(R2 - s - t / 2)},${fx(cy - t / 2)} ${fx(R2 - s)},${fx(cy)} ${fx(R2 - s - t / 2)},${fx(cy + t / 2)} ${fx(L + s + t / 2)},${fx(cy + t / 2)}`;
    const V = (cx, T, B) => `${fx(cx)},${fx(T + s)} ${fx(cx + t / 2)},${fx(T + s + t / 2)} ${fx(cx + t / 2)},${fx(B - s - t / 2)} ${fx(cx)},${fx(B - s)} ${fx(cx - t / 2)},${fx(B - s - t / 2)} ${fx(cx - t / 2)},${fx(T + s + t / 2)}`;
    const pts = {
      a: H(x, x + w, y), g: H(x, x + w, y + h / 2), d: H(x, x + w, y + h),
      b: V(x + w, y, y + h / 2), c: V(x + w, y + h / 2, y + h), f: V(x, y, y + h / 2), e: V(x, y + h / 2, y + h)
    };
    const g = el('g', { class: 'seg7 ' + (cls || '') }, parent);
    const segs = {};
    for (const k of 'abcdefg') segs[k] = el('polygon', { points: pts[k], class: 'sg' }, g);
    let cur = null;
    return {
      width: w,
      set(ch) {
        if (ch === cur) return;
        cur = ch;
        const on = SEG[ch] || '';
        for (const k of 'abcdefg') segs[k].classList.toggle('on', on.includes(k));
      }
    };
  }
  function segNum(parent, x, y, h, n, cls) {
    const w = h * 0.52, gap = h * 0.2, ds = [];
    for (let i = 0; i < n; i++) ds.push(seg7(parent, x + i * (w + gap), y, h, cls));
    return {
      width: n * (w + gap) - gap,
      set(v) {
        let str = String(v);
        str = str.length > n ? str.slice(-n) : str.padStart(n, ' ');
        for (let i = 0; i < n; i++) ds[i].set(str[i]);
      }
    };
  }

  /* ---------- Lamborghini Huracán: painel digital com conta-giros central, hexágonos e velocidade em dígitos ---------- */
  const huracan = {
    id: 'huracan',
    build(root, c) {
      root.innerHTML = '';
      root.className = 'cl cl-huracan';
      const W = 520, H = 420, cx = 260, cy = 224, R = 158, a0 = 135, sw = 270;
      const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Painel digital' }, root);
      svg.innerHTML = `<defs>
        <pattern id="hur-hex" width="20.78" height="36" patternUnits="userSpaceOnUse">
          <polygon points="${hexPts(10.39, 12, 11, 30)}" fill="none" stroke="#17171d" stroke-width="1"/>
          <polygon points="${hexPts(0, 30, 11, 30)}" fill="none" stroke="#17171d" stroke-width="1"/>
          <polygon points="${hexPts(20.78, 30, 11, 30)}" fill="none" stroke="#17171d" stroke-width="1"/>
        </pattern>
        <linearGradient id="hur-heat" gradientUnits="userSpaceOnUse" x1="${cx - R}" y1="0" x2="${cx + R}" y2="0">
          <stop offset="0" stop-color="#f3f3f5"/><stop offset=".5" stop-color="#ffcf5a"/><stop offset=".78" stop-color="#ff8a1f"/><stop offset="1" stop-color="#ff2f2f"/>
        </linearGradient>
        <radialGradient id="hur-face" cx="50%" cy="50%" r="55%"><stop offset="0" stop-color="#15151b"/><stop offset=".75" stop-color="#0a0a0e"/><stop offset="1" stop-color="#050507"/></radialGradient>
      </defs>`;
      el('rect', { x: 0, y: 0, width: W, height: H, rx: 20, class: 'bg' }, svg);
      el('rect', { x: 0, y: 0, width: W, height: H, rx: 20, fill: 'url(#hur-hex)' }, svg);
      el('polygon', { points: hexPts(cx, cy, R + 34, 0), class: 'hexframe' }, svg);
      el('polygon', { points: hexPts(cx, cy, R + 26, 0), class: 'hexframe thin' }, svg);
      el('circle', { cx, cy, r: R + 4, class: 'face' }, svg);
      const ang = (v) => a0 + sw * Math.min(1, Math.max(0, v / c.dialMax));
      el('path', { d: arc(cx, cy, R + 2, ang(c.redFrom), ang(c.dialMax)), class: 'redarc' }, svg);
      el('path', { d: arc(cx, cy, R - 12, a0, a0 + sw), class: 'track' }, svg);
      const prog = el('path', { d: arc(cx, cy, R - 12, a0, a0 + sw), class: 'prog' }, svg);
      let len = 0;
      try { len = prog.getTotalLength(); } catch (e) {}
      if (!len) len = (R - 12) * sw * Math.PI / 180;
      prog.style.strokeDasharray = `${len} ${len}`;
      prog.style.strokeDashoffset = String(len);
      const tg = el('g', { class: 'ticks' }, svg);
      for (let v = 0; v <= c.dialMax; v += 250) {
        const major = isMult(v, 1000), mid = !major && isMult(v, 500);
        const a = ang(v), lenT = major ? 16 : mid ? 10 : 6;
        const [x0, y0] = polar(cx, cy, R - 22, a), [x1, y1] = polar(cx, cy, R - 22 - lenT, a);
        const hot = v >= c.redFrom;
        el('line', { x1: fx(x0), y1: fx(y0), x2: fx(x1), y2: fx(y1), class: 'tick' + (major ? ' major' : '') + (hot ? ' hot' : '') }, tg);
        if (major) { const [tx, ty] = polar(cx, cy, R - 56, a); txt(svg, tx, ty, 'num' + (hot ? ' hot' : ''), String(v / 1000)); }
      }
      const ng = el('g', { class: 'pointer' }, svg);
      el('polygon', { points: `${cx + R - 36},${cy - 2.2} ${cx + R + 2},${cy} ${cx + R - 36},${cy + 2.2}`, class: 'ptr' }, ng);
      const gear = txt(svg, cx, cy - 14, 'hgear', '');
      const spd = txt(svg, cx, cy + 60, 'hspd', '0');
      txt(svg, cx, cy + 84, 'hunit', 'km/h');
      const msg = txt(svg, cx, cy + 108, 'hmsg', '');
      txt(svg, 50, 150, 'hlbl', 'PEDAL');
      const pedal = txt(svg, 50, 178, 'hval', '0%');
      txt(svg, W - 50, 150, 'hlbl', 'RPM');
      const rpmT = txt(svg, W - 50, 178, 'hval', '0');
      const mode = txt(svg, cx, H - 14, 'hmode', 'STRADA');
      const lCut = txt(svg, 104, H - 14, 'hlamp', 'LIMITE');
      const lObd = txt(svg, W - 104, H - 14, 'hlamp', 'OBD');
      const leds = ledStrip(svg, 12, 118, 402, 26, 6.5, (i) => (i < 4 ? 'g' : i < 8 ? 'r' : 'b'));
      const shiftT = txt(svg, cx, 46, 'hshift', 'SHIFT');
      let curOff = -1, curA = -1e9;
      return {
        update(s) {
          const f = Math.min(1, Math.max(0, s.rpm / c.dialMax));
          const off = Math.round(len * (1 - f) * 10) / 10;
          if (off !== curOff) { curOff = off; prog.style.strokeDashoffset = String(off); }
          const a = ang(s.rpm);
          if (Math.abs(a - curA) > 0.03) { curA = a; ng.setAttribute('transform', `rotate(${fx(a)} ${cx} ${cy})`); }
          const running = s.state === 2;
          setText(gear, running ? s.gearTxt : '');
          setText(spd, String(Math.round(s.kmh)));
          setText(msg, running ? (s.sub || '') : s.msg);
          setText(pedal, pedalPct(s));
          setText(rpmT, String(Math.round(s.rpm / 10) * 10));
          setText(mode, s.obd ? 'CORSA' : s.mode === 1 ? 'SPORT' : 'STRADA');
          setCls(lCut, 'on', s.cut); setCls(lObd, 'on', s.obd);
          setCls(gear, 'hot', s.rpm >= c.redFrom);
          setCls(shiftT, 'on', shiftOn(s)); setCls(shiftT, 'hot', s.shift === 2);
          leds.set(s, s.now);
        }
      };
    }
  };

  /* ---------- Fórmula 1: volante com fileira de LEDs e visor LCD de segmentos ---------- */
  const f1 = {
    id: 'f1',
    build(root, c) {
      root.innerHTML = '';
      root.className = 'cl cl-f1';
      const W = 520, H = 300;
      const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Visor do volante' }, root);
      svg.innerHTML = `<defs>
        <pattern id="f1-carbon" width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" fill="#15171a"/><rect width="4" height="4" fill="#1e2125"/><rect x="4" y="4" width="4" height="4" fill="#1e2125"/>
        </pattern>
        <linearGradient id="f1-lcd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b9c6aa"/><stop offset="1" stop-color="#a3b196"/></linearGradient>
      </defs>`;
      el('rect', { x: 0, y: 0, width: W, height: H, rx: 28, fill: 'url(#f1-carbon)', class: 'wheel' }, svg);
      el('rect', { x: 34, y: 56, width: W - 68, height: 216, rx: 9, class: 'lcd' }, svg);
      const leds = ledStrip(svg, 15, 78, 442, 30, 7, (i) => (i < 5 ? 'g' : i < 10 ? 'r' : 'b'));
      txt(svg, 96, 78, 'lbl', 'KM/H');
      const lblGear = txt(svg, 260, 78, 'lbl', 'MARCHA');
      txt(svg, 426, 78, 'lbl', 'RPM');
      const spd = segNum(svg, 96 - (3 * (46 * 0.52 + 46 * 0.2) - 46 * 0.2) / 2, 90, 46, 3);
      const gear = seg7(svg, 260 - 120 * 0.52 / 2, 88, 120);
      const rpm = segNum(svg, 426 - (5 * (32 * 0.52 + 32 * 0.2) - 32 * 0.2) / 2, 96, 32, 5);
      const NB = 24, bx = 52, bw = (W - 104 - (NB - 1) * 3) / NB, bars = [];
      for (let i = 0; i < NB; i++) bars.push(el('rect', { x: fx(bx + i * (bw + 3)), y: 226, width: fx(bw), height: 12, class: 'bar' }, svg));
      const pedal = txt(svg, 52, 258, 'lcdtxt', 'PEDAL 0%');
      const msg = txt(svg, 260, 258, 'lcdtxt c', '');
      const lap = txt(svg, W - 52, 258, 'lcdtxt r', '');
      let lastBars = -1;
      return {
        update(s) {
          const running = s.state === 2;
          leds.set(s, s.now);
          spd.set(Math.round(s.kmh));
          gear.set(running ? (s.gearChar || '-') : ' ');
          rpm.set(Math.round(s.rpm / 10) * 10);
          const lit = running ? Math.round(Math.min(1, s.rpm / c.lim) * NB) : 0;
          if (lit !== lastBars) { lastBars = lit; bars.forEach((b, i) => b.classList.toggle('on', i < lit)); }
          setText(pedal, 'PEDAL ' + pedalPct(s));
          setText(lblGear, s.shift ? 'SHIFT' : 'MARCHA');
          setCls(lblGear, 'shift', s.shift > 0); setCls(lblGear, 'on', shiftOn(s));
          setText(msg, running ? (s.sub || '') : s.msg);
          setText(lap, s.obd ? 'OBD' : s.cut ? 'LIMITE' : s.mode === 1 ? 'PISTA' : 'BOX');
        }
      };
    }
  };

  /* ---------- Porsche 911 GT3 (992): conta-giros central grande, telas dos lados e luzes de troca no arco ---------- */
  const gt3 = {
    id: 'gt3',
    build(root, c) {
      root.innerHTML = '';
      root.className = 'cl cl-gt3';
      const W = 560, H = 300, cx = 280, cy = 151, R = 128, a0 = 135, sw = 270;
      const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Painel com conta-giros central' }, root);
      svg.innerHTML = `<defs>
        <radialGradient id="gt3-face" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="#1c1e23"/><stop offset=".8" stop-color="#0c0d10"/><stop offset="1" stop-color="#050506"/></radialGradient>
        <linearGradient id="gt3-ring" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a3a9b1"/><stop offset=".5" stop-color="#363a40"/><stop offset="1" stop-color="#80868e"/></linearGradient>
        <linearGradient id="gt3-scr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#13161b"/><stop offset="1" stop-color="#08090b"/></linearGradient>
      </defs>`;
      el('rect', { x: 0, y: 0, width: W, height: H, rx: 22, class: 'bg' }, svg);
      // telas dos lados: velocidade e pedal à esquerda, giro e modo à direita
      const SX = [12, W - 144], SW = 132;
      for (const x of SX) el('rect', { x, y: 52, width: SW, height: 196, rx: 16, class: 'scr' }, svg);
      const L = SX[0] + SW / 2, Rx = SX[1] + SW / 2;
      txt(svg, L, 80, 'slbl', 'KM/H');
      const spd = txt(svg, L, 120, 'sval', '0');
      txt(svg, L, 166, 'slbl', 'PEDAL');
      const pedal = txt(svg, L, 190, 'sval sm', '0%');
      const lPop = txt(svg, L - 30, 228, 'slamp pop', 'POP');
      const lCut = txt(svg, L + 22, 228, 'slamp cut', 'LIMITE');
      txt(svg, Rx, 80, 'slbl', 'RPM');
      const rpmT = txt(svg, Rx, 120, 'sval sm', '0');
      const mode = txt(svg, Rx, 170, 'smode', 'NORMAL');
      const lObd = txt(svg, Rx, 228, 'slamp obd', 'OBD');
      // conta-giros
      el('circle', { cx, cy, r: R + 8, class: 'ring' }, svg);
      el('circle', { cx, cy, r: R, class: 'face' }, svg);
      const ang = (v) => a0 + sw * Math.min(1, Math.max(0, v / c.dialMax));
      el('path', { d: arc(cx, cy, R - 4, ang(c.redFrom), ang(c.dialMax)), class: 'redarc' }, svg);
      const tg = el('g', { class: 'ticks' }, svg);
      for (let v = 0; v <= c.dialMax; v += 250) {
        const major = isMult(v, 1000), mid = !major && isMult(v, 500);
        const a = ang(v), lenT = major ? 15 : mid ? 10 : 6;
        const [x0, y0] = polar(cx, cy, R - 9, a), [x1, y1] = polar(cx, cy, R - 9 - lenT, a);
        const hot = v >= c.redFrom;
        el('line', { x1: fx(x0), y1: fx(y0), x2: fx(x1), y2: fx(y1), class: 'tick' + (major ? ' major' : mid ? ' mid' : '') + (hot ? ' hot' : '') }, tg);
        if (major) { const [tx, ty] = polar(cx, cy, R - 40, a); txt(svg, tx, ty, 'num' + (hot ? ' hot' : ''), String(v / 1000)); }
      }
      // luzes de troca em arco, no alto do mostrador: verde, amarelo, vermelho
      const NL = 10, la0 = 229, la1 = 311, lr = R - 62, segs = [];
      for (let i = 0; i < NL; i++) {
        const mid = la0 + (la1 - la0) * (i + 0.5) / NL, half = (la1 - la0) / NL / 2 - 1.4;
        segs.push(el('path', { d: arc(cx, cy, lr, mid - half, mid + half), class: 'sl ' + (i < 4 ? 'g' : i < 7 ? 'y' : 'r') }, svg));
      }
      const leds = ledDriver(segs);
      const shiftT = txt(svg, cx, cy - 36, 'gshift', 'SHIFT');
      txt(svg, cx, cy + 28, 'gunit', '1/min x1000');
      const gear = txt(svg, cx, cy + 60, 'ggear', '');
      const msg = txt(svg, cx, cy + 97, 'gmsg', '');
      const ng = el('g', { class: 'pointer' }, svg);
      el('polygon', { points: `${cx - 24},${cy - 3.4} ${cx + R - 13},${cy - 1} ${cx + R - 13},${cy + 1} ${cx - 24},${cy + 3.4}`, class: 'ptr' }, ng);
      el('circle', { cx, cy, r: 15, class: 'cap' }, svg);
      el('circle', { cx, cy, r: 5, class: 'cap2' }, svg);
      const fmtRpm = (r) => { const v = Math.round(r / 10) * 10; return v >= 1000 ? Math.floor(v / 1000) + '.' + String(v % 1000).padStart(3, '0') : String(v); };
      let curA = -1e9;
      return {
        update(s) {
          const a = ang(s.rpm);
          if (Math.abs(a - curA) > 0.03) { curA = a; ng.setAttribute('transform', `rotate(${fx(a)} ${cx} ${cy})`); }
          const running = s.state === 2;
          setText(gear, running ? (s.gearChar === '-' ? '–' : s.gearChar) : '');
          setText(msg, running ? (s.sub || '') : s.msg);
          setText(spd, String(Math.round(s.kmh)));
          setText(pedal, pedalPct(s));
          setText(rpmT, fmtRpm(s.rpm));
          setText(mode, s.obd ? 'TRACK' : s.mode === 1 ? 'SPORT' : 'NORMAL');
          setCls(lCut, 'on', s.cut); setCls(lObd, 'on', s.obd); setCls(lPop, 'on', s.flash > 0.25);
          setCls(gear, 'hot', running && s.rpm >= c.redFrom);
          setCls(shiftT, 'on', shiftOn(s)); setCls(shiftT, 'hot', s.shift === 2);
          leds.set(s, s.now);
        }
      };
    }
  };

  const SKINS = { camaro, maverick, gti, civic, gt3, huracan, f1 };

  // largura do painel decide o formato (2 × 2 no celular, 3 partes quando cabe) e a densidade dos números
  function layoutOf(root) {
    const box = root.parentElement || root;
    const W = box.clientWidth || 0;
    const three = W >= THREE_COL;
    const gauge = three ? (W - 48) * 0.361 : (W - 26) / 2;
    return { three, dense: gauge >= 290 };
  }

  function mount(root, car, P) {
    const { dense } = layoutOf(root);
    const dialMax = Math.ceil((P.lim + 900) / 1000) * 1000;
    const c = { lim: P.lim, dialMax, redFrom: car.redFrom || P.lim - 100, spdMax: car.spdMax, dense, turbo: !!P.turbo };
    const skin = SKINS[car.skin] || camaro;
    const inst = skin.build ? skin.build(root, c) : analog(root, skin, c);
    return { update: (s) => inst.update(s), max: { rpm: dialMax, kmh: c.spdMax }, dense };
  }

  return { mount, dense: (root) => layoutOf(root).dense };
})();
