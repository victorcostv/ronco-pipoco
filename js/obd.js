/* Ronco & Pipoco — ligação com o ELM327 (Web Serial e Web Bluetooth) */
class ObdLink {
  constructor(t, log) {
    this.t = t; this.log = log || (() => {});
    this.buf = ''; this.wait = null; this.alive = true;
    this.pedalPid = null; this.multi = false; this.count = false; this.sup = [];
    this.raw = { rpm: 0, pedal: 0, speed: 0, speedAt: 0, speedRpm: 0 }; this.version = '';
    this.hasSpeed = false; this.cyc = 0; this.spdFail = 0; this.multiSpeed = true;
    t.onData = (s) => this.onData(s);
  }
  static sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
  static hx(p) { return p.toString(16).toUpperCase().padStart(2, '0'); }
  onData(s) {
    this.buf += s;
    const i = this.buf.indexOf('>');
    if (i < 0) return;
    const resp = this.buf.slice(0, i);
    this.buf = this.buf.slice(i + 1);
    if (this.wait) { const w = this.wait; this.wait = null; w(resp); }
  }
  static clean(r, c) {
    let ls = r.replace(/SEARCHING\.\.\./gi, '\n').split(/[\r\n]+/).map((l) => l.trim()).filter(Boolean);
    if (ls.length && ls[0].replace(/\s/g, '').toUpperCase() === c.toUpperCase()) ls.shift();
    ls = ls.filter((l) => !/^BUS INIT/i.test(l));
    return ls.join('\n').toUpperCase();
  }
  cmd(c, ms, quiet) {
    return new Promise((resolve, reject) => {
      if (!this.alive) { reject(new Error('fechado')); return; }
      this.buf = '';
      const timer = setTimeout(() => { this.wait = null; this.log(c + ' → sem resposta'); reject(new Error('sem resposta para ' + c)); }, ms || 1200);
      this.wait = (r) => { clearTimeout(timer); const out = ObdLink.clean(r, c); if (!quiet) this.log(c + ' → ' + (out.replace(/\n/g, ' | ') || '(vazio)')); resolve(out); };
      Promise.resolve().then(() => this.t.write(c + '\r')).catch((e) => { clearTimeout(timer); this.wait = null; reject(e); });
    });
  }
  static bits(r, base) {
    const h = r.replace(/[^0-9A-F]/g, '');
    const i = h.indexOf('41' + base);
    if (i < 0 || h.length < i + 12) return null;
    const w = parseInt(h.substr(i + 4, 8), 16), b0 = parseInt(base, 16), out = [];
    for (let n = 1; n <= 32; n++) if ((w >>> (32 - n)) & 1) out.push(b0 + n);
    return out;
  }
  static parse(r, pid) {
    const o = { rpm: null, pedal: null, speed: null };
    if (!r || /NO DATA|ERROR|STOPPED|UNABLE|\?/.test(r)) return o;
    const pp = pid != null ? ObdLink.hx(pid) : null;
    for (const line of r.split('\n')) {
      const h = line.replace(/[^0-9A-F]/g, '');
      for (let i = h.indexOf('41'); i >= 0; i = h.indexOf('41', i + 1)) {
        let j = i + 2, hit = false;
        while (j + 2 <= h.length) {
          const p = h.substr(j, 2);
          if (p === '0C' && j + 6 <= h.length) { o.rpm = parseInt(h.substr(j + 2, 4), 16) / 4; j += 6; hit = true; }
          else if (pp && p === pp && j + 4 <= h.length) { o.pedal = parseInt(h.substr(j + 2, 2), 16) * 100 / 255; j += 4; hit = true; }
          else if (p === '0D' && j + 4 <= h.length) { o.speed = parseInt(h.substr(j + 2, 2), 16); j += 4; hit = true; }
          else break;
        }
        if (hit) break;
      }
      if (o.rpm !== null && (o.pedal !== null || !pp)) break;
    }
    return o;
  }
  async init(status) {
    status('Falando com o ELM327…');
    let r = '';
    for (let k = 0; k < 2; k++) {
      try { r = await this.cmd('ATZ', 3500); break; } catch (e) { if (k === 1) throw e; await ObdLink.sleep(400); }
    }
    this.version = (r.match(/ELM327\s*V?[\d.]+/) || ['ELM327'])[0];
    await ObdLink.sleep(150);
    for (const c of ['ATE0', 'ATL0', 'ATS0', 'ATH0', 'ATAT2', 'ATSP0']) { try { await this.cmd(c, 1500); } catch (e) {} }
    status('Procurando o protocolo do carro (pode levar uns segundos)…');
    let s1 = null;
    for (let k = 0; k < 2 && !s1; k++) {
      try { r = await this.cmd('0100', 12000); s1 = ObdLink.bits(r, '00'); } catch (e) { r = 'sem resposta'; }
    }
    if (!s1) throw new Error('carro:' + r.replace(/\n/g, ' ').slice(0, 60));
    let sup = s1;
    for (const base of ['20', '40']) {
      if (!sup.includes(parseInt(base, 16))) break;
      try { const b = ObdLink.bits(await this.cmd('01' + base, 2500), base); if (!b) break; sup = sup.concat(b); } catch (e) { break; }
    }
    this.sup = sup;
    if (!sup.includes(0x0C)) throw new Error('semrpm');
    this.hasSpeed = sup.includes(0x0D);
    this.pedalPid = [0x49, 0x5A, 0x11, 0x45].find((p) => sup.includes(p));
    if (this.pedalPid === undefined) this.pedalPid = null;
    status('Testando a velocidade de leitura…');
    const pp = this.pedalPid != null ? ObdLink.hx(this.pedalPid) : null;
    if (pp) {
      for (const cnt of [true, false]) {
        try {
          const v = ObdLink.parse(await this.cmd('010C' + pp + (cnt ? '1' : ''), 1500), this.pedalPid);
          if (v.rpm !== null && v.pedal !== null) { this.multi = true; this.count = cnt; break; }
        } catch (e) {}
      }
    }
    if (!this.multi) {
      try { this.count = ObdLink.parse(await this.cmd('010C1', 1500), null).rpm !== null; } catch (e) { this.count = false; }
    }
    this.log('modo: ' + (this.multi ? 'rpm e pedal na mesma pergunta' : 'rpm e pedal separados') + (this.count ? ', resposta rápida' : '') + (pp ? ', pedal pelo PID ' + pp : ', sem PID de pedal'));
  }
  gotSpeed(kmh, rpm) { this.raw.speed = kmh; this.raw.speedRpm = rpm; this.raw.speedAt++; }
  async read(verbose) {
    const pp = this.pedalPid != null ? ObdLink.hx(this.pedalPid) : null, c1 = this.count ? '1' : '';
    this.cyc = (this.cyc + 1) % 3;
    const spd = this.hasSpeed && this.cyc === 0;
    if (this.multi) {
      const both = spd && this.multiSpeed;
      const v = ObdLink.parse(await this.cmd('010C' + (both ? '0D' : pp) + c1, 1000, !verbose), this.pedalPid);
      if (v.rpm !== null) this.raw.rpm = v.rpm;
      if (v.pedal !== null) this.raw.pedal = v.pedal;
      if (both) {
        if (v.speed !== null) { this.spdFail = 0; this.gotSpeed(v.speed, this.raw.rpm); }
        else if (++this.spdFail > 3) this.multiSpeed = false;
      } else if (spd) {
        const s = ObdLink.parse(await this.cmd('010D' + c1, 1000, !verbose), null);
        if (s.speed !== null) this.gotSpeed(s.speed, this.raw.rpm);
      }
      return v.rpm !== null;
    }
    const a = ObdLink.parse(await this.cmd('010C' + c1, 1000, !verbose), null);
    if (a.rpm !== null) this.raw.rpm = a.rpm;
    const q = spd ? '010D' : pp ? '01' + pp : null;
    if (q) {
      const b = ObdLink.parse(await this.cmd(q + c1, 1000, !verbose), this.pedalPid);
      if (b.pedal !== null) this.raw.pedal = b.pedal;
      if (b.speed !== null) this.gotSpeed(b.speed, this.raw.rpm);
    }
    return a.rpm !== null;
  }
}

async function openSerial() {
  const port = await navigator.serial.requestPort();
  await port.open({ baudRate: 38400 });
  const enc = new TextEncoder(), dec = new TextDecoder();
  const writer = port.writable.getWriter(), reader = port.readable.getReader();
  let closed = false;
  const t = {
    kind: 'serial', onData: null, onLost: null,
    write: (s) => writer.write(enc.encode(s)),
    close: async () => {
      if (closed) return;
      closed = true;
      try { await reader.cancel(); } catch (e) {}
      try { reader.releaseLock(); } catch (e) {}
      try { writer.releaseLock(); } catch (e) {}
      try { await port.close(); } catch (e) {}
    }
  };
  (async () => {
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value && t.onData) t.onData(dec.decode(value, { stream: true }));
      }
    } catch (e) {}
    if (!closed && t.onLost) t.onLost();
  })();
  return t;
}

async function openBle() {
  const SV = [0xfff0, 0xffe0, 0x18f0, 'e7810a71-73ae-499d-8c15-faa9aef0c3f2'];
  const dev = await navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: SV });
  const gatt = await dev.gatt.connect();
  let rx = null, tx = null;
  for (const s of SV) {
    let svc;
    try { svc = await gatt.getPrimaryService(s); } catch (e) { continue; }
    let rc = null, tc = null;
    for (const c of await svc.getCharacteristics()) {
      if (!rc && (c.properties.notify || c.properties.indicate)) rc = c;
      if (!tc && (c.properties.write || c.properties.writeWithoutResponse)) tc = c;
    }
    if (rc && tc) { rx = rc; tx = tc; break; }
  }
  if (!rx) { try { gatt.disconnect(); } catch (e) {} throw new Error('ble-sem-servico'); }
  const enc = new TextEncoder(), dec = new TextDecoder();
  let closed = false;
  const t = {
    kind: 'ble', onData: null, onLost: null,
    write: (s) => (tx.properties.writeWithoutResponse && tx.writeValueWithoutResponse ? tx.writeValueWithoutResponse(enc.encode(s)) : tx.writeValue(enc.encode(s))),
    close: async () => { closed = true; try { gatt.disconnect(); } catch (e) {} }
  };
  rx.addEventListener('characteristicvaluechanged', (e) => { if (t.onData) t.onData(dec.decode(e.target.value)); });
  await rx.startNotifications();
  dev.addEventListener('gattserverdisconnected', () => { if (!closed && t.onLost) t.onLost(); });
  return t;
}
