/* Virtual Pops — ponte com o app de iPhone.
   O app injeta este arquivo antes da página carregar. Ele troca o que o navegador do iPhone
   não tem (vibração, tela acesa, OBD2) por versões feitas pelo próprio app. */
(() => {
  'use strict';
  const H = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.ronco;
  if (!H) return;
  const post = (m) => { try { H.postMessage(m); } catch (e) {} };
  const def = (obj, k, v) => { try { Object.defineProperty(obj, k, { value: v, configurable: true, writable: true }); } catch (e) {} };

  // vibração: pipoco grande e entrada do VTEC viram toque do motor de vibração do iPhone
  def(navigator, 'vibrate', (p) => {
    const ms = Array.isArray(p) ? (+p[0] || 0) : (+p || 0);
    if (ms > 0) post({ t: 'haptic', ms });
    return true;
  });

  // tela acesa enquanto o motor está ligado (mesma interface do navigator.wakeLock do navegador)
  def(navigator, 'wakeLock', {
    request: async () => {
      post({ t: 'awake', on: true });
      const fns = [];
      const s = {
        type: 'screen', released: false, onrelease: null,
        addEventListener: (ev, fn) => { if (ev === 'release') fns.push(fn); },
        removeEventListener: (ev, fn) => { const i = fns.indexOf(fn); if (i >= 0) fns.splice(i, 1); },
        release: async () => {
          if (s.released) return;
          s.released = true;
          post({ t: 'awake', on: false });
          for (const f of fns) { try { f(); } catch (e) {} }
        }
      };
      return s;
    }
  });

  // modo painel: o app esconde a barra de status e o traço de início
  document.addEventListener('DOMContentLoaded', () => {
    let last = null;
    const sync = () => {
      const on = document.body.classList.contains('cockpit');
      if (on !== last) { last = on; post({ t: 'cockpit', on }); }
    };
    new MutationObserver(sync).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    sync();
  });

  // OBD2 pelo iPhone: o app abre a conexão (Wi-Fi ou Bluetooth BLE) e entrega um canal de texto
  // igual ao do Web Serial / Web Bluetooth do computador: { write, close, onData, onLost }
  const pend = new Map(), links = new Map();
  let seq = 0;
  window.roncoNative = {
    ios: true,
    open(kind) {
      return new Promise((resolve, reject) => {
        const id = ++seq;
        pend.set(id, { resolve, reject, kind });
        post({ t: 'obdOpen', id, kind });
      });
    },
    _opened(id, err) {
      const p = pend.get(id);
      pend.delete(id);
      if (!p) return;
      if (err) { const e = new Error(err.message || 'erro'); e.name = err.name || 'Error'; p.reject(e); return; }
      const t = {
        kind: p.kind, onData: null, onLost: null,
        write: (s) => { post({ t: 'obdWrite', id, data: s }); return Promise.resolve(); },
        close: async () => { if (!links.has(id)) return; links.delete(id); post({ t: 'obdClose', id }); }
      };
      links.set(id, t);
      p.resolve(t);
    },
    _data(id, s) { const t = links.get(id); if (t && t.onData) t.onData(s); },
    _lost(id) {
      const t = links.get(id);
      if (!t) return;
      links.delete(id);
      if (t.onLost) t.onLost();
    }
  };

  // avisos e erros da página vão pro log do Xcode (e uma linha de diagnóstico do áudio na abertura)
  addEventListener('load', () => post({ t: 'log', lv: 'info', msg: 'contexto seguro: ' + window.isSecureContext + ', AudioWorklet: ' + (typeof AudioWorkletNode !== 'undefined') }));
  for (const lv of ['warn', 'error']) {
    const o = console[lv];
    console[lv] = function (...a) { post({ t: 'log', lv, msg: a.map(String).join(' ') }); return o.apply(this, a); };
  }
  addEventListener('error', (e) => post({ t: 'log', lv: 'error', msg: String(e.message) + ' @' + e.filename + ':' + e.lineno }));
})();
