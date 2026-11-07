/* Virtual Pops — motor de som (síntese procedural)
   A classe roda dentro de um AudioWorklet: ela é serializada com toString()
   e colada no módulo do worklet, então nada aqui pode depender de variáveis
   de fora deste arquivo. */
class EngineDSP {
  static presets() {
    return [
      {
        id: 'v8', cyl: 8, banks: [0, 1, 1, 0, 1, 0, 0, 1],
        idle: 760, lim: 6600, hyst: 230, revUp: 9000, revDown: 4300,
        delays: [5.7, 6.6], fb: -0.48, damp: 0.42, bankGain: [1, 0.82],
        res: [[85, 1.4, 0.55], [260, 1.6, 0.55], [900, 1.2, 0.5]], dry: 0.6,
        tau: 1.8, rise: 0.28, rasp: 0.32, lp: [2200, 5800], drive: [1.4, 3.0], lope: 0.24, cylVar: 0.13, idleWob: 28,
        intake: 0.1, turbo: false, spool: 0, pre: 1, gain: 1, crank: 0.85,
        mass: 1750, tmax: 560, cda: 0.78, gears: [10.6, 6.9, 5.0, 3.9, 3.05, 2.45]
      },
      {
        id: '4t', cyl: 4, banks: [0, 1, 0, 1],
        idle: 820, lim: 6800, hyst: 200, revUp: 12000, revDown: 6200,
        delays: [4.2, 4.5], fb: -0.45, damp: 0.5, bankGain: [1, 0.94],
        res: [[120, 1.2, 0.45], [420, 1.5, 0.6], [1600, 1.3, 0.5]], dry: 0.6,
        tau: 1.3, rise: 0.2, rasp: 0.42, lp: [2400, 6800], drive: [1.3, 2.8], lope: 0.08, cylVar: 0.06, idleWob: 12,
        intake: 0.05, turbo: true, spool: 0.55, pre: 1, gain: 1.1, crank: 0.65,
        mass: 1420, tmax: 390, cda: 0.68, gears: [13.6, 8.1, 5.6, 4.2, 3.3, 2.7]
      },
      {
        id: 'v10', cyl: 10, banks: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
        idle: 950, lim: 8600, hyst: 200, revUp: 13000, revDown: 6500,
        delays: [3.9, 4.3], fb: -0.42, damp: 0.55, bankGain: [1, 0.9],
        res: [[150, 1.2, 0.4], [560, 1.5, 0.6], [2100, 1.4, 0.55]], dry: 0.6,
        tau: 1.1, rise: 0.16, rasp: 0.36, lp: [2800, 8500], drive: [1.3, 2.7], lope: 0.07, cylVar: 0.06, idleWob: 15,
        intake: 0.12, turbo: false, spool: 0, pre: 1, gain: 1, crank: 0.75,
        mass: 1600, tmax: 560, cda: 0.7, gears: [13.0, 8.7, 6.4, 5.0, 4.0, 3.3, 2.8]
      },
      {
        id: 'v8g', cyl: 8, banks: [0, 1, 1, 0, 1, 0, 0, 1],
        idle: 640, lim: 5900, hyst: 260, revUp: 6800, revDown: 3400,
        delays: [8.6, 10.2], fb: -0.45, damp: 0.32, bankGain: [1, 0.76],
        res: [[60, 1.2, 0.6], [180, 1.2, 0.75], [450, 1.0, 0.7]], dry: 0.55,
        tau: 2.0, rise: 0.25, rasp: 0.38, chuff: [0.004, 0.006], lp: [1500, 3600], drive: [2.0, 3.6], lope: 0.42, cylVar: 0.2, idleWob: 40, miss: 0.08,
        intake: 0.06, turbo: false, spool: 0, pre: 1, gain: 0.92, crank: 0.95, bass: 0.6,
        pop: {
          bigAmp: [1.4, 0.7], crkAmp: [0.8, 0.6], bigTau: [0.025, 0.025], crkTau: [0.005, 0.006],
          bigF: [320, 160], crkF: [460, 260], bigSw: 1.0, crkSw: 0.4, bigQ: 0.85, crkQ: 0.85,
          bigPre: 1300, crkPre: 1800, thA: [0.5, 0.2], thF: [78, 24], thTo: 0.65, thT: 0.06, thTau: 0.04, thD: 3.5,
          crkThA: [0.18, 0.14], crkThF: [130, 50], crkThTau: 0.012, crkThD: 3,
          bigLen: 0.22, crkLen: 0.06, exh: 0.22, byp: 0.75, dir: 0.12, bigP: 0.3, bigPW: 0.3, gain: 5.0, crack: 0.3,
          tailW: 0.1, tailK: 2.2, rev: 0.3
        },
        mass: 1850, tmax: 650, cda: 0.85, gears: [9.8, 6.4, 4.7, 3.7, 2.9, 2.3]
      },
      {
        id: 'f1', cyl: 10, banks: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
        idle: 4000, lim: 18800, hyst: 300, revUp: 42000, revDown: 22000,
        delays: [1.25, 1.45], fb: -0.35, damp: 0.6, bankGain: [1, 0.92],
        res: [[420, 1.1, 0.45], [1350, 1.3, 0.7], [3600, 1.3, 0.55]], dry: 0.6,
        tau: 0.6, rise: 0.07, rasp: 0.45, lp: [5000, 12500], drive: [1.6, 3.2], lope: 0.03, cylVar: 0.04, idleWob: 70,
        intake: 0.16, turbo: false, spool: 0, pre: 1, gain: 0.85, crank: 0.5,
        pop: { bigF: [900, 900], crkF: [1500, 1500], thA: [0.25, 0.2], thF: [200, 60], rev: 0.22 },
        mass: 605, tmax: 340, cda: 1.1, gears: [23.0, 17.2, 13.6, 11.0, 9.2, 7.8, 6.6]
      },
      {
        // Honda Civic Type R (EK9), B16B 1.6 VTEC: 4 em linha que gira alto. Acima de 5.800 rpm com
        // o pé embaixo o comando troca pro perfil bravo: admissão gritando, som mais rasgado e mais força.
        // Corte de giro marcado: cai uns 400 giros a cada corte (o "pá-pá-pá" no limitador) e, andando
        // com o pé no fundo, encosta no corte antes de trocar de marcha.
        id: 'civic', cyl: 4, banks: [0, 1, 0, 1],
        idle: 850, lim: 8700, hyst: 420, revUp: 11500, revDown: 6400, cut: { shift: 0.5 },
        delays: [3.5, 3.8], fb: -0.5, damp: 0.5, bankGain: [1, 0.92],
        res: [[140, 1.1, 0.35], [520, 1.5, 0.55], [1900, 1.6, 0.55]], dry: 0.55,
        tau: 1.15, rise: 0.17, rasp: 0.4, lp: [2600, 7600], drive: [1.3, 2.6], lope: 0.05, cylVar: 0.05, idleWob: 14,
        intake: 0.07, turbo: false, spool: 0, pre: 1, gain: 1.05, crank: 0.7,
        howl: [6, 2.5, 2.1],
        vtec: { at: 5800, hyst: 300, thrOn: 0.3, thrOff: 0.12, intake: 0.34, howl0: 0.18, rasp: 1.9, lp: 1.48, drive: 1.38, tau: 0.75, tq: 1.16, dip: 0.1, gain: 1.22 },
        pop: {
          bigAmp: [1.2, 0.6], bigTau: [0.01, 0.012], crkTau: [0.0018, 0.003], bigF: [800, 600], crkF: [1300, 1400],
          thA: [0.28, 0.18], thF: [170, 60], rev: 0.22
        },
        mass: 1050, tmax: 160, cda: 0.62, gears: [15.5, 10.1, 7.0, 5.3, 4.06]
      },
      {
        // Porsche 911 GT3 (992), boxer 6 4.0 aspirado: as duas bancadas se alternam (a assimetria dá o
        // rosnado do boxer) e em cima vira um grito limpo até 9.000 rpm, com muita admissão.
        id: 'gt3', cyl: 6, banks: [0, 1, 0, 1, 0, 1],
        idle: 880, lim: 9000, hyst: 160, revUp: 16000, revDown: 8000,
        delays: [3.3, 4.1], fb: -0.4, damp: 0.5, bankGain: [1, 0.82],
        res: [[115, 1.2, 0.4], [650, 1.4, 0.55], [2500, 1.7, 0.6]], dry: 0.58,
        tau: 1.0, rise: 0.15, rasp: 0.4, lp: [3000, 9800], drive: [1.35, 2.6], lope: 0.05, cylVar: 0.06, idleWob: 18,
        intake: 0.15, turbo: false, spool: 0, pre: 1, gain: 1.15, crank: 0.75,
        howl: [3, 2.2, 0.9],
        pop: {
          bigF: [700, 500], crkF: [1200, 1300], thA: [0.35, 0.25], thF: [130, 50], crack: 0.15, tailW: 0.14, rev: 0.28
        },
        mass: 1435, tmax: 470, cda: 0.66, gears: [16.1, 10.2, 7.4, 5.8, 4.8, 4.1, 3.6]
      }
    ];
  }

  static popDef() {
    return {
      bigAmp: [1.5, 0.8], crkAmp: [0.7, 0.8], bigTau: [0.012, 0.016], crkTau: [0.002, 0.0035],
      bigF: [600, 600], crkF: [900, 1100], bigSw: 1.8, crkSw: 0.3, bigQ: 1.0, crkQ: 0.75,
      bigPre: 2200, crkPre: 3000, thA: [0.45, 0.3], thF: [140, 50], thTo: 0.45, thT: 0.045, thTau: 0.028,
      thD: 0, crkThA: [0, 0], crkThF: [140, 50], crkThTau: 0.028, crkThD: 0,
      bigLen: 0.12, crkLen: 0.03, exh: 0.3, byp: 0.6, dir: 0.15, bigP: 0.12, bigPW: 0.25, gain: 3.4, crack: 0,
      tailW: 0.12, tailK: 2.5, rev: 0.26
    };
  }

  static sat(x) {
    if (x > 3) return 1;
    if (x < -3) return -1;
    const x2 = x * x;
    return x * (27 + x2) / (27 + 9 * x2);
  }

  static ss(a, b, x) {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }

  constructor(sr) {
    this.sr = sr;
    this.seed = ((Math.random() * 2147483646) | 0) + 1;
    this.BLK = 128; this.blkLeft = 0; this.dt = 128 / sr;
    const k = (t) => 1 - Math.exp(-1 / (t * sr));
    this.kR = k(0.003); this.kL = k(0.015); this.kC = k(0.006); this.kS = k(0.03);
    this.popAtk = 1 / (0.0006 * sr);
    this.kPopSw = Math.exp(-1 / (0.003 * sr));
    this.kSweep = Math.exp(Math.log(0.45) / (0.045 * sr));
    this.kThump = Math.exp(-1 / (0.028 * sr));
    this.aN = Math.exp(-1 / (0.0018 * sr));
    this.bovK = Math.exp(-1 / (0.42 * sr));
    this.bovAtk = 1 / (0.01 * sr);
    this.dcR = Math.exp(-2 * Math.PI * 22 / sr);
    this.kCk = Math.exp(-1 / (0.0009 * sr));
    this.kThL = 1 - Math.exp(-2 * Math.PI * 900 / sr);
    this.kBR = Math.exp(-1 / (0.04 * sr)); this.bEnv = 0;
    this.pedal = 0; this.brakeIn = 0; this.popAmt = 0.7; this.mode = 0; this.exh = 0.5;
    this.state = 0; this.stateT = 0; this.time = 0;
    this.rpm = 0; this.thr = 0; this.load = 0; this.combust = 0; this.starter = 0;
    this.fuelCut = false; this.hyst = 200; this.flare = 0; this.wob = 0; this.idleT = 800;
    this.boost = 0; this.v = 0; this.gear = 1; this.thrMem = 0; this.shiftCut = 0; this.shiftCool = 0; this.blipT = 0; this.limT = 0;
    this.popWin = 0; this.popRate = 0; this.armLift = 0; this.popCount = 0; this.bigCount = 0;
    this.bovEnv = 0; this.bovAmp = 0; this.bovA = 0; this.ia = 0;
    this.ext = false; this.extRpm = 0; this.extT = 0; this.extSlope = 0; this.extPred = 0;
    this.offPed = true;
    this.kFade = Math.exp(-1 / (0.012 * sr));
    const rv = (ms) => new Float32Array(Math.max(16, Math.round(ms * 0.001 * sr)));
    this.rvC = [rv(29.7), rv(37.1), rv(41.1), rv(43.7)]; this.rvCi = [0, 0, 0, 0]; this.rvCl = [0, 0, 0, 0];
    this.rvA = [rv(5.0), rv(1.7), rv(5.3), rv(1.9)]; this.rvAi = [0, 0, 0, 0];
    this.rvLp = 0; this.rvHp = 0;
    this.kRvLp = 1 - Math.exp(-2 * Math.PI * 3200 / sr); this.kRvHp = 1 - Math.exp(-2 * Math.PI * 90 / sr);
    this.rpmS = 0; this.loadS = 0; this.combS = 0; this.thrS = 0; this.boostS = 0; this.starterS = 0;
    this.cyc = 0; this.pNorm = 1; this.kD = k(0.05); this.ampComp = 1; this.drv = 1.5; this.mk = 0.8;
    this.MASK = 4095; this.dl = [new Float32Array(4096), new Float32Array(4096)]; this.dw = 0;
    this.pd = [0, 0]; this.pr = [0, 0]; this.aD = 0.99; this.aR = 0.9; this.heat = 0; this.Dc = [100, 100]; this.Dt = [100, 100]; this.exc = [0, 0]; this.nEnv = [0, 0]; this.cLP = [0, 0];
    this.res = [new Float64Array(7), new Float64Array(7), new Float64Array(7)];
    this.lpf = new Float64Array(7); this.inBP = new Float64Array(7);
    this.hisBP = new Float64Array(7); this.bovBP = new Float64Array(7);
    this.bassLP = new Float64Array(7); this.bassBP = new Float64Array(7);
    this.howlBP = new Float64Array(7); this.hw = 0; this.gN = 1;
    this.vt = 0; this.vtS = 0; this.vtecN = 0;
    this.dcX = 0; this.dcY = 0; this.whPh = 0; this.stPh = 0;
    this.NV = 32; this.pv = [];
    for (let i = 0; i < this.NV; i++) {
      this.pv.push({ on: false, d: 0, t: 0, len: 0, amp: 0, env: 0, a: 0, atk: 0, big: false, n1: 0, kp: 0.3, lo: 0, bd: 0, f0: 0.1, fx: 0, sw: 0, q: 1, thA: 0, thF: 0, thPh: 0, thEnv: 0, pan: 0, g: 3.4, ck: 0, ckE: 0, thK: 0.99, thS: 1, thD: 0, thL: 0, fd: 1, e2: 0, a2: 0.99, w2: 0, rs: 1 });
    }
    this.repT = 0; this.onReport = null;
    this.setPreset(0);
  }

  rnd() {
    let x = this.seed;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    this.seed = x;
    return (x >>> 0) / 4294967296;
  }

  setBP(s, f, q) {
    const w = 2 * Math.PI * Math.min(f, this.sr * 0.45) / this.sr, al = Math.sin(w) / (2 * q), a0 = 1 + al;
    s[0] = al / a0; s[1] = 0; s[2] = -al / a0; s[3] = -2 * Math.cos(w) / a0; s[4] = (1 - al) / a0;
  }

  setLP(s, f, q) {
    const w = 2 * Math.PI * Math.min(f, this.sr * 0.45) / this.sr, c = Math.cos(w), al = Math.sin(w) / (2 * q), a0 = 1 + al;
    s[0] = (1 - c) / 2 / a0; s[1] = (1 - c) / a0; s[2] = s[0]; s[3] = -2 * c / a0; s[4] = (1 - al) / a0;
  }

  bq(s, x) {
    const y = s[0] * x + s[5];
    s[5] = s[1] * x - s[3] * y + s[6];
    s[6] = s[2] * x - s[4] * y;
    return y;
  }

  ap(n, x) {
    const b = this.rvA[n], k = this.rvAi[n], o = b[k];
    b[k] = x + o * 0.5;
    this.rvAi[n] = k + 1 < b.length ? k + 1 : 0;
    return o - x;
  }

  setPreset(i) {
    const all = EngineDSP.presets();
    const P = all[i] || all[0];
    this.P = P; this.pi = all.indexOf(P);
    this.off = []; this.cg = [];
    for (let k = 0; k < P.cyl; k++) { this.off.push(k / P.cyl); this.cg.push(1 + P.cylVar * (this.rnd() * 2 - 1)); }
    this.D = P.delays.map((ms) => Math.max(8, ms * 0.001 * this.sr));
    this.Dc = this.D.slice(); this.Dt = this.D.slice();
    for (let r = 0; r < 3; r++) this.setBP(this.res[r], P.res[r][0], P.res[r][1]);
    this.setBP(this.inBP, 900, 0.9);
    this.setBP(this.hisBP, 3500, 1.4);
    this.setBP(this.bovBP, 2600, 1.1);
    this.setLP(this.lpf, P.lp[0], 0.8);
    this.setLP(this.bassLP, 150, 0.7);
    this.setBP(this.bassBP, 300, 0.55);
    this.PP = Object.assign(EngineDSP.popDef(), P.pop || {});
    this.setBP(this.howlBP, 1000, P.howl ? P.howl[1] : 1);
    this.hw = 0; this.gN = P.gain; this.vt = 0; this.vtS = 0;
    if (this.gear > P.gears.length) this.gear = P.gears.length;
    if (!P.turbo) { this.boost = 0; this.bovEnv = 0; }
  }

  handle(m) {
    if (!m) return;
    if (m.ext !== undefined) {
      if (!m.ext) { this.ext = false; this.extSlope = 0; }
      else {
        const r = Math.max(0, +m.ext.rpm || 0);
        if (this.ext) {
          const gap = Math.max(0.03, this.time - this.extT);
          this.extSlope += ((r - this.extRpm) / gap - this.extSlope) * 0.5;
        } else this.extSlope = 0;
        this.ext = true; this.extRpm = r; this.extT = this.time;
        this.pedal = Math.max(0, Math.min(1, +m.ext.pedal || 0));
      }
    }
    if (m.pedal !== undefined) this.pedal = Math.max(0, Math.min(1, +m.pedal || 0));
    if (m.brake !== undefined) this.brakeIn = Math.max(0, Math.min(1, +m.brake || 0));
    if (m.pop !== undefined) this.popAmt = Math.max(0, Math.min(1, +m.pop || 0));
    if (m.exh !== undefined) this.exh = Math.max(0, Math.min(1, +m.exh || 0));
    if (m.mode !== undefined) {
      const md = m.mode ? 1 : 0;
      if (md !== this.mode) { this.mode = md; this.v = 0; this.gear = 1; this.shiftCut = 0; this.blipT = 0; }
    }
    if (m.preset !== undefined) this.setPreset(m.preset | 0);
    if (m.cmd === 'start' && (this.state === 0 || this.state === 3)) { this.state = 1; this.stateT = 0; }
    if (m.cmd === 'stop' && (this.state === 1 || this.state === 2)) { this.state = 3; this.stateT = 0; }
  }

  bov(amount) {
    this.bovAmp = Math.min(1, amount); this.bovEnv = 1; this.bovA = 0;
  }

  step() {
    const P = this.P, dt = this.dt, lim = P.lim;
    this.time += dt;
    if (this.shiftCool > 0) this.shiftCool -= dt;
    let blip = 0;
    if (this.blipT > 0) { this.blipT -= dt; blip = 0.45; }
    const tp = this.state === 2 ? Math.max(this.pedal, blip) : 0;
    const tau = tp > this.thr ? 0.045 : 0.028;
    this.thr += (tp - this.thr) * (1 - Math.exp(-dt / tau));
    const thr = this.thr;
    // VTEC: troca pro comando bravo acima do giro de entrada com o pé embaixo; volta com histerese ou pé solto
    if (P.vtec) {
      const V = P.vtec, run = this.state === 2;
      const vOn = run && (this.vt ? this.rpm > V.at - V.hyst && thr > V.thrOff : this.rpm > V.at && thr > V.thrOn);
      if (vOn && !this.vt) this.vtecN++;
      this.vt = vOn ? 1 : 0;
      this.vtS += (this.vt - this.vtS) * (1 - Math.exp(-dt / 0.02));
    }
    this.starter = 0;
    this.repT += dt;
    if (this.repT >= 0.033) { this.repT = 0; this.report(); }

    if (this.ext) {
      this.extPred = Math.max(0, this.extRpm + this.extSlope * Math.min(this.time - this.extT, 0.15));
      if (this.extPred > 300 && this.state !== 2) { this.state = 2; this.stateT = 0; this.rpm = Math.max(this.rpm, this.extPred); this.flare = 0; this.fuelCut = false; }
      else if (this.state === 2 && this.extRpm < 200) { this.state = 3; this.stateT = 0; }
    }

    if (this.state === 0) {
      this.rpm = 0; this.combust = 0; this.load = 0; this.popRate = 0; this.boost = 0; this.v = 0;
      return;
    }
    if (this.state === 1) {
      this.stateT += dt;
      const target = 200 + 45 * Math.sin(this.stateT * 26);
      this.rpm += (target - this.rpm) * Math.min(1, dt * 10);
      this.combust = 0; this.load = 0; this.starter = 1; this.popRate = 0;
      if (this.stateT > P.crank) {
        this.state = 2; this.stateT = 0; this.flare = 1; this.fuelCut = false;
        this.rpm = Math.max(this.rpm, 380);
      }
      return;
    }
    if (this.state === 3) {
      this.stateT += dt;
      this.combust = 0; this.load = 0; this.popRate = 0;
      this.rpm -= (650 + this.rpm * 1.1) * dt;
      this.boost *= Math.exp(-dt / 0.4);
      this.v *= Math.exp(-dt / 2);
      if (this.rpm <= 0) { this.rpm = 0; this.state = 0; this.v = 0; this.gear = 1; }
      return;
    }

    // ---- motor funcionando ----
    this.flare = Math.max(0, this.flare - dt * 0.8);
    this.wob += ((this.rnd() * 2 - 1) * P.idleWob - this.wob) * Math.min(1, dt * 3);
    const RR = lim - P.idle;
    const idleT = P.idle + this.flare * 0.12 * RR + this.wob;
    this.idleT = idleT;

    if (P.turbo) {
      let bt = thr > 0.2 ? EngineDSP.ss(1700, 3600, this.rpm) * Math.min(1, (thr - 0.2) / 0.55) : 0;
      if (this.mode === 0 && !this.ext) bt *= 0.7;
      const tb = bt > this.boost ? P.spool * (1.7 - Math.min(1, this.rpm / lim)) : 0.3;
      this.boost += (bt - this.boost) * (1 - Math.exp(-dt / Math.max(0.08, tb)));
    }

    let tq = 0.78 + 0.22 * Math.sin(Math.PI * Math.min(1, this.rpm / lim));
    if (P.vtec) {
      // no comando manso a força cai um pouco antes da troca; no bravo ela volta com sobra
      const V = P.vtec;
      tq *= (1 - V.dip * EngineDSP.ss(V.at - 1800, V.at, this.rpm) * (1 - this.vtS)) * (1 + (V.tq - 1) * this.vtS);
    }
    const bF = P.turbo ? 0.5 + 0.5 * this.boost : 1;
    let cutNow = false;

    if (this.ext) {
      const before = this.rpm;
      this.rpm += (this.extPred - this.rpm) * (1 - Math.exp(-dt / 0.06));
      this.fuelCut = false;
      const accN = Math.max(0, Math.min(1, (this.rpm - before) / dt / P.revUp));
      this.load = Math.min(1, Math.pow(thr, 0.75) * (0.85 + 0.15 * accN) * (P.turbo ? 0.75 + 0.25 * this.boost : 1) + 0.1 * accN);
    } else if (this.mode === 0) {
      const tgt = idleT + (lim + 0.077 * RR - idleT) * Math.pow(thr, 0.85);
      const rise = P.revUp * (0.18 + 0.82 * thr) * tq * (P.turbo ? 0.7 + 0.3 * this.boost : 1);
      const fall = P.revDown * (0.45 + 0.55 * this.rpm / lim);
      let d = (tgt - this.rpm) * 7.5;
      if (d > rise) d = rise; else if (d < -fall) d = -fall;
      if (this.rpm >= lim) { this.fuelCut = true; this.hyst = P.hyst * (0.75 + 0.5 * this.rnd()); }
      else if (this.fuelCut && this.rpm < lim - this.hyst) this.fuelCut = false;
      if (this.fuelCut) d = -P.revDown * 1.3;
      this.rpm += d * dt;
      if (this.rpm < 250) this.rpm = 250;
      const accN = Math.max(0, Math.min(1, d / P.revUp));
      this.load = Math.min(1, Math.pow(thr, 0.75) * (0.8 + 0.2 * accN) * (P.turbo ? 0.75 + 0.25 * this.boost : 1) + 0.1 * accN);
    } else {
      const G = P.gears, rw = 0.32, m = P.mass;
      if (this.gear > G.length) this.gear = G.length;
      const Rg = G[this.gear - 1];
      const wheel = this.v / (2 * Math.PI * rw) * 60 * Rg;
      if (this.shiftCut > 0) this.shiftCut -= dt;
      cutNow = this.shiftCut > 0;
      if (this.rpm >= lim) { this.fuelCut = true; this.hyst = P.cut ? P.hyst * 0.4 : 60; }
      else if (this.fuelCut && this.rpm < lim - this.hyst) this.fuelCut = false;
      let Te = P.tmax * tq * Math.pow(thr, 0.9) * bF;
      if (this.fuelCut || cutNow) Te = 0;
      // corte de giro marcado: sem combustão o motor segura o carro mesmo com o pé no fundo
      const Tb = (18 + 0.011 * this.rpm) * (P.cut && this.fuelCut ? 1 : 1 - thr);
      const launch = this.gear === 1 ? idleT + thr * 0.36 * RR : idleT;
      const tgt = Math.max(wheel, launch);
      const slip = tgt > wheel + 30;
      let dr = (tgt - this.rpm) * 20;
      const rl = RR / 5840;
      if (dr > 15000 * rl) dr = 15000 * rl; else if (dr < -12000 * rl) dr = -12000 * rl;
      this.rpm += dr * dt;
      let F;
      if (slip) {
        const sr = Math.max(0, Math.min(1, wheel / Math.max(1, this.rpm)));
        F = Math.max(0, Te * (1 + 0.8 * (1 - sr))) * Rg * 0.9 / rw;
      } else {
        F = (Te - Tb) * Rg * 0.9 / rw;
      }
      if (F > m * 9.81 * 0.75) F = m * 9.81 * 0.75;
      const v = this.v;
      const Fr = 0.5 * 1.2 * P.cda * v * v + (v > 0.05 ? m * 9.81 * 0.012 : 0) + this.brakeIn * m * 9.81 * 0.9;
      this.v = Math.max(0, v + (F - Fr) / m * dt);

      this.thrMem = Math.max(thr, this.thrMem * Math.exp(-dt / 2.5));
      // pé no fundo num carro de corte marcado: encosta no corte, bate algumas vezes e só então troca
      const hold = !!P.cut && thr > 0.9;
      if (hold && this.rpm >= lim - 0.5 * P.hyst) this.limT += dt;
      else if (!hold || this.rpm < lim - 2 * P.hyst) this.limT = 0;
      if (!cutNow && this.shiftCool <= 0) {
        const upLo = P.idle + 0.3 * RR, dnLo = P.idle + 0.084 * RR;
        const upAt = thr < 0.1 ? lim - 0.06 * RR : upLo + (lim - 0.031 * RR - upLo) * Math.pow(Math.max(thr, this.thrMem * 0.9), 1.3);
        const dnAt = this.brakeIn > 0.15 ? P.idle + 0.265 * RR : dnLo + (Math.min(P.idle + 0.486 * RR, upAt * 0.55) - dnLo) * thr;
        if (this.gear < G.length && (hold ? this.limT >= P.cut.shift : this.rpm > upAt) && !slip) {
          this.gear++; this.shiftCool = 0.55; this.limT = 0;
          if (thr > 0.35) {
            this.shiftCut = 0.09 + 0.05 * thr;
            if (thr > 0.6 && this.popAmt > 0.05 && this.rnd() < 0.35 + 0.6 * this.popAmt) {
              this.spawnPop(true, Math.floor((0.02 + 0.04 * this.rnd()) * this.sr), 1, false);
            }
            if (P.turbo && this.boost > 0.4) { this.bov(this.boost * 0.55); this.boost *= 0.75; }
          }
        } else if (this.gear > 1) {
          const lower = this.v / (2 * Math.PI * rw) * 60 * G[this.gear - 2];
          if (wheel < dnAt && lower < lim - 0.12 * RR) {
            this.gear--; this.shiftCool = 0.45;
            if (thr < 0.1 && this.rpm > P.idle + 0.058 * RR) { this.blipT = 0.13; this.popWin = Math.max(this.popWin, 0.75); }
          }
        }
      }
      this.load = Math.min(1, Math.pow(thr, 0.8) * (P.turbo ? 0.65 + 0.35 * this.boost : 1));
    }

    if (thr < 0.04) this.offPed = true; else if (thr > 0.08) this.offPed = false;
    let comb = 1;
    if (this.fuelCut || cutNow) comb = 0;
    if (this.offPed && this.rpm > (this.ext ? Math.max(P.idle + 0.144 * RR, idleT + 0.077 * RR) : idleT + 0.077 * RR)) comb = 0;
    this.combust = comb;

    // pipoco: detecção de alívio do pedal
    if (thr > 0.28 && this.rpm > P.idle + 0.178 * RR) this.armLift = Math.min(1, this.armLift + dt * 5);
    else if (thr >= 0.08) this.armLift = Math.max(0, this.armLift - dt * 0.5);
    if (this.armLift > 0.2 && thr < 0.08) {
      const st = EngineDSP.ss(P.idle + 0.127 * RR, P.idle + 0.64 * RR, this.rpm);
      this.popWin = Math.max(this.popWin, 0.35 + 0.65 * st);
      if (this.popAmt > 0.02 && this.rpm > P.idle + 0.161 * RR && this.rnd() < 0.55 + 0.45 * this.popAmt) {
        this.spawnPop(true, Math.floor((0.035 + 0.09 * this.rnd()) * this.sr), 1, false);
      }
      if (P.turbo && this.boost > 0.25) { this.bov(this.boost * 1.3); this.boost *= 0.35; }
      this.armLift = 0;
    }
    this.popWin *= Math.exp(-dt / (this.mode === 1 ? 2.2 : 1.3));
    const over = this.offPed ? EngineDSP.ss(P.idle + 0.11 * RR, P.idle + 0.315 * RR, this.rpm) : 0;
    let rate = this.popAmt * over * (1.2 + 20 * this.popWin);
    if (this.mode === 1) rate += this.popAmt * over * 2.5 * EngineDSP.ss(P.idle + 0.264 * RR, P.idle + 0.589 * RR, this.rpm);
    if (this.fuelCut && (this.mode === 0 || P.cut)) rate += this.popAmt * 8;
    if (cutNow) rate += this.popAmt * 12;
    this.popRate = rate;
  }

  blockUpdate() {
    const P = this.P, sr = this.sr, ex = this.exh, V = P.vtec, vs = V ? this.vtS : 0;
    const r = Math.max(350, this.rpm);
    const td = P.tau * 0.001 * (0.55 + 0.45 * Math.min(2.2, 1000 / r)) * (V ? 1 - (1 - V.tau) * vs : 1);
    const tr = Math.min(td * 0.4, P.rise * 0.001 * (0.7 + 0.3 * Math.min(2, 1000 / r)));
    this.aD = Math.exp(-1 / (td * sr)); this.aR = Math.exp(-1 / (tr * sr));
    const tp = Math.log(td / tr) * tr * td / (td - tr);
    this.pNorm = 1 / (Math.exp(-tp / td) - Math.exp(-tp / tr));
    this.heat += (this.load * Math.min(1, this.rpm / P.lim + 0.3) - this.heat) * (1 - Math.exp(-this.dt / 1.6));
    for (let b = 0; b < 2; b++) this.Dt[b] = this.D[b] * (1 - 0.22 * this.heat);
    this.ampComp = Math.pow(r / 3000, -0.33);
    const ld = this.load;
    // escapamento: 0 = original (mais abafado), 0,5 = padrão, 1 = aberto (mais agudo e rasgado)
    const fc = (P.lp[0] + (P.lp[1] - P.lp[0]) * Math.pow(ld, 1.1)) * (0.85 + 0.35 * Math.min(1.2, r / P.lim)) * (0.7 + 0.6 * ex) * (V ? 1 + (V.lp - 1) * vs : 1);
    this.setLP(this.lpf, fc, 0.8);
    const ch = P.chuff || [0.0018, 0.0024];
    this.aN = Math.exp(-1 / ((ch[0] + ch[1] * (1 - ld)) * sr));
    this.drv = (P.drive[0] + (P.drive[1] - P.drive[0]) * ld) * (0.8 + 0.4 * ex) * (V ? 1 + (V.drive - 1) * vs : 1);
    this.mk = 1 / Math.pow(this.drv, 0.55);
    this.setBP(this.inBP, 450 + r * 0.22, 0.9);
    this.ia = (V ? P.intake + (V.intake - P.intake) * vs : P.intake) * Math.pow(this.thr, 1.4) * (0.35 + 0.65 * Math.min(1, this.rpm / P.lim));
    // uivo: um formante que acompanha o giro (harmônico da explosão), forte nos aspirados de giro alto
    if (P.howl) {
      this.setBP(this.howlBP, Math.max(60, r / 120 * P.cyl * P.howl[0]), P.howl[1]);
      this.hw = P.howl[2] * (0.3 + 0.7 * ld) * EngineDSP.ss(0.2 * P.lim, 0.75 * P.lim, this.rpm) * (0.8 + 0.4 * ex) * (V ? V.howl0 + (1 - V.howl0) * vs : 1);
    }
    this.gN = P.gain * (V ? 1 + (V.gain - 1) * vs : 1);
    if (P.turbo) {
      this.setBP(this.hisBP, 2800 + 4200 * this.boost, 1.4);
      if (this.bovEnv > 0.001) this.setBP(this.bovBP, 1300 + 1900 * this.bovEnv, 1.1);
    }
  }

  report() {
    if (!this.onReport) return;
    this.onReport({
      rpm: this.rpm, thr: this.thr, load: this.load, gear: this.gear, kmh: this.v * 3.6,
      boost: this.boost, pops: this.popCount, big: this.bigCount, state: this.state,
      cut: this.fuelCut, mode: this.mode, preset: this.pi, ext: this.ext, vtec: this.vt, vtecN: this.vtecN
    });
  }

  fire(k) {
    const P = this.P, b = P.banks[k], comb = this.combS, ld = this.loadS;
    let st = comb * (0.42 + 0.58 * ld) + (1 - comb) * 0.11;
    const jit = P.lope * (1 - 0.65 * ld) * (this.rpmS < 1600 ? 1 : 0.55) + (1 - comb) * 0.35;
    st *= this.cg[k] * (1 + jit * (this.rnd() * 2 - 1)) * this.ampComp;
    if (P.miss && ld < 0.25 && this.rnd() < P.miss) st *= 0.35;
    if (st < 0) st = 0;
    this.exc[b] += st;
    const rasp = P.vtec ? P.rasp * (1 + (P.vtec.rasp - 1) * this.vtS) : P.rasp;
    const ne = (st * rasp * (0.45 + 0.55 * ld) * comb + st * 0.05) * (0.8 + 0.4 * this.exh);
    if (ne > this.nEnv[b]) this.nEnv[b] = ne;
    if (this.popRate > 0) {
      const ev = Math.max(1, this.rpmS / 120 * P.cyl);
      if (this.rnd() < this.popRate / ev) {
        const big = this.rnd() < this.PP.bigP + this.PP.bigPW * this.popWin;
        this.spawnPop(big, Math.floor(this.rnd() * 0.004 * this.sr), 1, true);
      }
    }
  }

  spawnPop(big, delay, scale, chain) {
    let v = null, quiet = null, ql = 1e9;
    for (let i = 0; i < this.NV; i++) {
      const p = this.pv[i];
      if (!p.on) { v = p; break; }
      const lv = p.d > 0 ? 1e6 : (p.env + p.w2 * p.e2) * p.amp + p.thEnv * p.thA;
      if (lv < ql) { ql = lv; quiet = p; }
    }
    if (!v) v = quiet;
    const amt = (0.6 + 0.4 * this.popAmt) * (0.85 + 0.3 * this.exh);
    v.on = true; v.d = delay; v.t = 0; v.big = big; v.lo = 0; v.bd = 0; v.env = 1; v.atk = 0;
    const Q = this.PP;
    v.amp = (big ? Q.bigAmp[0] + Q.bigAmp[1] * this.rnd() : Q.crkAmp[0] + Q.crkAmp[1] * this.rnd()) * amt * scale;
    const tau = big ? Q.bigTau[0] + Q.bigTau[1] * this.rnd() : Q.crkTau[0] + Q.crkTau[1] * this.rnd();
    v.a = Math.exp(-1 / (tau * this.sr));
    v.w2 = big ? Q.tailW : Q.tailW * 0.5; v.e2 = 1; v.a2 = Math.exp(-1 / (tau * Q.tailK * this.sr)); v.fd = 1; v.rs = big ? 1 : 0.3;
    const fc = big ? Q.bigF[0] + Q.bigF[1] * this.rnd() : Q.crkF[0] + Q.crkF[1] * this.rnd();
    v.f0 = 2 * Math.sin(Math.PI * fc / this.sr); v.fx = v.f0 * (big ? Q.bigSw : Q.crkSw); v.sw = 1;
    v.q = big ? Q.bigQ : Q.crkQ; v.n1 = 0; v.g = Q.gain;
    v.kp = 1 - Math.exp(-2 * Math.PI * (big ? Q.bigPre : Q.crkPre) / this.sr);
    const tA = big ? Q.thA : Q.crkThA, tF = big ? Q.thF : Q.crkThF;
    v.thA = tA[0] > 0 ? (tA[0] + tA[1] * this.rnd()) * scale : 0;
    v.thF = tF[0] + tF[1] * this.rnd(); v.thPh = 0; v.thEnv = 1; v.thL = 0;
    v.thK = Math.exp(-1 / ((big ? Q.thTau : Q.crkThTau) * this.sr));
    v.thS = Math.exp(Math.log(Q.thTo) / (Q.thT * this.sr)); v.thD = big ? Q.thD : Q.crkThD;
    v.ck = big ? Q.crack * v.amp : 0; v.ckE = 1;
    v.pan = (this.rnd() * 2 - 1) * 0.35;
    v.len = Math.floor(Math.max(big ? Q.bigLen : Q.crkLen, tau * Q.tailK * 5) * this.sr);
    this.popCount++;
    if (big) this.bigCount++;
    if (chain && this.rnd() < 0.45) {
      const nb = 1 + Math.floor(this.rnd() * 3);
      let dd = delay + Math.floor((big ? 0.045 + 0.065 * this.rnd() : 0.01 + 0.025 * this.rnd()) * this.sr);
      for (let j = 0; j < nb; j++) {
        if (j > 0) dd += Math.floor((0.012 + 0.033 * this.rnd()) * this.sr);
        this.spawnPop(false, dd, 0.45 + 0.35 * this.rnd(), false);
      }
    }
  }

  render(L, R, n) {
    const sr = this.sr, NV = this.NV, pv = this.pv, M = this.MASK;
    for (let i = 0; i < n; i++) {
      if (this.blkLeft <= 0) { this.step(); this.blockUpdate(); this.blkLeft = this.BLK; }
      this.blkLeft--;
      const P = this.P, PP = this.PP, cyl = P.cyl, off = this.off;
      this.rpmS += (this.rpm - this.rpmS) * this.kR;
      this.loadS += (this.load - this.loadS) * this.kL;
      this.combS += (this.combust - this.combS) * this.kC;
      this.thrS += (this.thr - this.thrS) * this.kL;
      this.boostS += (this.boost - this.boostS) * this.kL;
      this.starterS += (this.starter - this.starterS) * this.kS;

      const prev = this.cyc;
      let c = prev + this.rpmS / (120 * sr), wrap = false;
      if (c >= 1) { c -= 1; wrap = true; }
      this.cyc = c;
      if (this.rpmS > 5) {
        for (let k = 0; k < cyl; k++) {
          const o = off[k];
          if (wrap ? (o > prev || o <= c) : (o > prev && o <= c)) this.fire(k);
        }
      }

      let pIn = 0, pL = 0, pR = 0, rIn = 0;
      for (let j = 0; j < NV; j++) {
        const p = pv[j];
        if (!p.on) continue;
        if (p.d > 0) { p.d--; continue; }
        p.n1 += (this.rnd() * 2 - 1 - p.n1) * p.kp;
        const f = p.f0 + p.fx * p.sw; p.sw *= this.kPopSw;
        p.lo += f * p.bd;
        const hi = p.n1 - p.lo - p.q * p.bd;
        p.bd += f * hi;
        if (p.atk < 1) p.atk += this.popAtk;
        let x = p.bd * p.g * (p.env + p.w2 * p.e2) * p.amp * (p.atk < 1 ? p.atk : 1);
        p.env *= p.a; p.e2 *= p.a2;
        if (p.ck > 1e-4) { x += p.n1 * 3 * p.ck * p.ckE; p.ckE *= this.kCk; if (p.ckE < 1e-3) p.ck = 0; }
        if (p.thA > 0) {
          p.thPh += p.thF / sr; if (p.thPh > 1) p.thPh -= 1;
          p.thF *= p.thS;
          const sn = Math.sin(6.283185307179586 * p.thPh) * p.thEnv;
          if (p.thD > 0) {
            const w = EngineDSP.sat(sn * p.thD);
            p.thL += ((w + 0.2 * w * w) * p.thA * (0.35 + 0.65 * p.thEnv) - p.thL) * this.kThL;
            x += p.thL;
          } else x += sn * p.thA;
          p.thEnv *= p.thK;
        }
        if (++p.t > p.len) { p.fd *= this.kFade; x *= p.fd; if (p.fd < 0.002) p.on = false; }
        pIn += x; pL += x * (1 - p.pan); pR += x * (1 + p.pan); rIn += x * p.rs;
      }

      let eng = 0;
      const dw = this.dw, fb = P.fb, damp = P.damp;
      for (let b = 0; b < 2; b++) {
        const e = this.exc[b]; this.exc[b] = 0;
        this.pd[b] = e + this.aD * this.pd[b];
        this.pr[b] = e + this.aR * this.pr[b];
        let x = (this.pd[b] - this.pr[b]) * this.pNorm + 1e-18;
        const ne = this.nEnv[b];
        if (ne > 1e-5) { x += ne * (this.rnd() * 2 - 1); this.nEnv[b] = ne * this.aN; }
        x += pIn * PP.exh;
        const buf = this.dl[b];
        const Dn = (this.Dc[b] += (this.Dt[b] - this.Dc[b]) * this.kD);
        const di = Dn | 0, fr = Dn - di;
        const rd = buf[(dw - di) & M] * (1 - fr) + buf[(dw - di - 1) & M] * fr;
        this.cLP[b] += (rd - this.cLP[b]) * damp;
        const y = x + fb * this.cLP[b];
        buf[dw] = y;
        eng += y * P.bankGain[b];
      }
      this.dw = (dw + 1) & M;

      eng *= P.pre;
      let s = eng * P.dry + this.bq(this.res[0], eng) * P.res[0][2] + this.bq(this.res[1], eng) * P.res[1][2] + this.bq(this.res[2], eng) * P.res[2][2];
      if (P.howl) s += this.bq(this.howlBP, eng) * this.hw;
      s = this.bq(this.lpf, s);
      s += pIn * PP.byp;
      if (P.bass) {
        const lo = this.bq(this.bassLP, s), al = Math.abs(lo);
        this.bEnv = al > this.bEnv ? al : this.bEnv * this.kBR;
        const ln = lo / (this.bEnv + 1e-4);
        s += this.bq(this.bassBP, (EngineDSP.sat(2.5 * ln) + 0.5 * Math.abs(ln)) * this.bEnv) * P.bass;
      }
      s = EngineDSP.sat(s * this.drv) * this.mk;
      const dcy = s - this.dcX + this.dcR * this.dcY; this.dcX = s; this.dcY = dcy; s = dcy;

      if (this.ia > 1e-4) s += this.bq(this.inBP, this.rnd() * 2 - 1) * this.ia * (0.6 + 0.4 * Math.cos(6.283185307179586 * c * cyl));

      if (P.turbo) {
        const bs = this.boostS;
        if (bs > 0.01) {
          this.whPh += (2000 + 5500 * bs) / sr; if (this.whPh > 1) this.whPh -= 1;
          s += Math.sin(6.283185307179586 * this.whPh) * 0.03 * bs * bs * (0.4 + 0.6 * this.thrS);
          s += this.bq(this.hisBP, this.rnd() * 2 - 1) * 0.07 * bs * (0.3 + 0.7 * this.thrS);
        }
        if (this.bovEnv > 0.0005) {
          if (this.bovA < 1) this.bovA = Math.min(1, this.bovA + this.bovAtk);
          s += this.bq(this.bovBP, this.rnd() * 2 - 1) * 0.6 * this.bovAmp * this.bovEnv * this.bovA;
          this.bovEnv *= this.bovK;
        }
      }

      if (this.starterS > 0.005) {
        this.stPh += 155 / sr; if (this.stPh > 1) this.stPh -= 1;
        const tri = 4 * Math.abs(this.stPh - 0.5) - 1;
        s += tri * 0.07 * this.starterS * (0.6 + 0.4 * Math.cos(6.283185307179586 * c * cyl));
      }

      s *= this.gN;
      let wl = 0, wr = 0;
      if (PP.rev > 0) {
        this.rvLp += (rIn - this.rvLp) * this.kRvLp;
        this.rvHp += (this.rvLp - this.rvHp) * this.kRvHp;
        const ri = (this.rvLp - this.rvHp) * PP.rev * 0.25;
        let cs = 0;
        for (let q = 0; q < 4; q++) {
          const b = this.rvC[q], k = this.rvCi[q], o = b[k];
          this.rvCl[q] = o * 0.7 + this.rvCl[q] * 0.3;
          b[k] = ri + this.rvCl[q] * 0.68;
          this.rvCi[q] = k + 1 < b.length ? k + 1 : 0;
          cs += o;
        }
        wl = this.ap(0, this.ap(1, cs)); wr = this.ap(2, this.ap(3, cs));
      }
      L[i] = EngineDSP.sat(s + pL * PP.dir + wl);
      R[i] = EngineDSP.sat(s + pR * PP.dir + wr);
    }
  }
}

const WORKLET_TAIL = `
class RoncoProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.dsp = new EngineDSP(sampleRate);
    this.dsp.onReport = (r) => this.port.postMessage(r);
    this.port.onmessage = (e) => this.dsp.handle(e.data);
  }
  process(inputs, outputs) {
    const out = outputs[0];
    if (out && out[0]) this.dsp.render(out[0], out[1] || out[0], out[0].length);
    return true;
  }
}
registerProcessor('ronco-engine', RoncoProcessor);
`;

if (typeof module !== 'undefined' && module.exports) module.exports = { EngineDSP, WORKLET_TAIL };
