// Cronômetro de intervalos com avisos por voz e bipe. Baseado em timestamps:
// se o iPhone pausar o JS, o tempo continua certo quando a tela volta.
import { totalSec, fmtClock } from './plan.js';

const PREFS_KEY = 'lal:alerts';
export const DEFAULT_ALERTS = {
  voice: true, beep: true, bigCount: true, countdown: true, halfway: true, voiceRate: 1.05, volume: 0.9,
};
export function loadAlerts() {
  try { return { ...DEFAULT_ALERTS, ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') }; }
  catch { return { ...DEFAULT_ALERTS }; }
}
export function saveAlerts(a) { try { localStorage.setItem(PREFS_KEY, JSON.stringify(a)); } catch {} }

// ---------- som ----------
let ctx;
export function unlockAudio() {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    const b = ctx.createBuffer(1, 1, 22050); const s = ctx.createBufferSource();
    s.buffer = b; s.connect(ctx.destination); s.start(0);
  } catch {}
  try { if ('speechSynthesis' in window) { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } } catch {}
}
export function beep({ freq = 880, dur = 0.16, times = 1, gap = 0.12, volume = 0.9 } = {}) {
  if (!ctx) return;
  const t0 = ctx.currentTime + 0.02;
  for (let i = 0; i < times; i++) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'square'; o.frequency.value = freq;
    const st = t0 + i * (dur + gap);
    g.gain.setValueAtTime(0.0001, st);
    g.gain.exponentialRampToValueAtTime(0.35 * volume, st + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, st + dur);
    o.connect(g).connect(ctx.destination); o.start(st); o.stop(st + dur + 0.02);
  }
}
let voice;
function pickVoice() {
  if (voice || !('speechSynthesis' in window)) return voice;
  const vs = speechSynthesis.getVoices();
  voice = vs.find(v => v.lang === 'pt-BR' && /luciana/i.test(v.name)) || vs.find(v => v.lang === 'pt-BR') || vs.find(v => v.lang?.startsWith('pt'));
  return voice;
}
if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = () => { voice = null; pickVoice(); };
export function say(text, alerts) {
  if (!alerts.voice || !('speechSynthesis' in window)) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'pt-BR'; u.rate = alerts.voiceRate; u.volume = alerts.volume;
    const v = pickVoice(); if (v) u.voice = v;
    speechSynthesis.speak(u);
  } catch {}
}

// ---------- frases ----------
const KIND = {
  warm: { word: 'Aquece', speak: 'Aquecimento. Caminhada leve' },
  run:  { word: 'Corre', speak: 'Corre' },
  walk: { word: 'Caminha', speak: 'Caminha' },
  cool: { word: 'Desaquece', speak: 'Desaquecimento. Caminhada leve' },
  done: { word: 'Fim', speak: 'Treino concluído' },
};
export const kindWord = k => KIND[k]?.word || k;
function durWords(sec) {
  if (sec >= 60) {
    const whole = Math.floor(sec / 60), rest = sec - whole * 60;
    const unit = whole === 1 ? 'minuto' : 'minutos';
    if (rest === 30) return `${whole} ${unit} e meio`;
    const m = Math.round(sec / 60);
    return `${m} ${m === 1 ? 'minuto' : 'minutos'}`;
  }
  return `${Math.round(sec)} segundos`;
}

// ---------- motor ----------
// lanes: { [personId]: { name, segs } }
export function locate(segs, t) {
  let acc = 0;
  for (let i = 0; i < segs.length; i++) {
    if (t < acc + segs[i].s) return { i, seg: segs[i], left: acc + segs[i].s - t, into: t - acc };
    acc += segs[i].s;
  }
  return { i: segs.length, seg: { k: 'done', s: 0 }, left: 0, into: 0 };
}

export class Workout {
  constructor({ lanes, alerts, onTick, onDone, saved }) {
    this.lanes = lanes; this.alerts = alerts;
    this.onTick = onTick; this.onDone = onDone;
    this.total = Math.max(...Object.values(lanes).map(l => totalSec(l.segs)));
    this.startedAt = saved?.startedAt || Date.now();
    this.pausedMs = saved?.pausedMs || 0;
    this.pausedAt = saved?.pausedAt || null;
    this.offset = saved?.offset || 0; // segundos pulados
    this.last = {}; this.lastCount = null; this.halfSaid = !!saved; this.finished = false;
    Object.keys(lanes).forEach(id => { this.last[id] = saved ? locate(lanes[id].segs, this.elapsed()).i : -1; });
  }
  elapsed() {
    const now = this.pausedAt || Date.now();
    return Math.max(0, (now - this.startedAt - this.pausedMs) / 1000 + this.offset);
  }
  start() {
    this.loop = setInterval(() => this.tick(), 200);
    this.tick();
    this.wake();
    document.addEventListener('visibilitychange', this._vis = () => { if (!document.hidden) { this.wake(); this.tick(); } });
  }
  async wake() {
    try { if ('wakeLock' in navigator && !this.pausedAt) this.lock = await navigator.wakeLock.request('screen'); } catch {}
  }
  pause() {
    if (this.pausedAt) return;
    this.pausedAt = Date.now(); this.persist();
    say('Pausado', this.alerts); this.tick();
  }
  resume() {
    if (!this.pausedAt) return;
    this.pausedMs += Date.now() - this.pausedAt; this.pausedAt = null; this.persist();
    say('Continuando', this.alerts); this.wake(); this.tick();
  }
  skip() {
    // pula para o próximo segmento da primeira pista
    const id = Object.keys(this.lanes)[0];
    const pos = locate(this.lanes[id].segs, this.elapsed());
    this.offset += pos.left + 0.05; this.persist(); this.tick();
  }
  persist() {
    try {
      localStorage.setItem('lal:active', JSON.stringify({
        startedAt: this.startedAt, pausedMs: this.pausedMs, pausedAt: this.pausedAt, offset: this.offset,
      }));
    } catch {}
  }
  stop() {
    clearInterval(this.loop);
    document.removeEventListener('visibilitychange', this._vis);
    try { this.lock?.release(); } catch {}
    try { localStorage.removeItem('lal:active'); } catch {}
  }
  tick() {
    const t = this.elapsed();
    const ids = Object.keys(this.lanes);
    const pos = {}; ids.forEach(id => { pos[id] = locate(this.lanes[id].segs, t); });

    // mudanças de fase
    const changed = ids.filter(id => pos[id].i !== this.last[id]);
    if (changed.length && !this.pausedAt) {
      const same = ids.length > 1 && ids.every(id => pos[id].seg.k === pos[ids[0]].seg.k);
      if (ids.length === 1 || same) {
        const p = pos[ids[0]];
        if (p.seg.k === 'done') say(KIND.done.speak, this.alerts);
        else say(`${KIND[p.seg.k].speak}. ${durWords(p.seg.s)}`, this.alerts);
      } else {
        const parts = changed.map(id => {
          const p = pos[id];
          return p.seg.k === 'done' ? `${this.lanes[id].name}, terminou` : `${this.lanes[id].name}, ${KIND[p.seg.k].speak.toLowerCase()}`;
        });
        say(parts.join('. '), this.alerts);
      }
      if (this.alerts.beep && Object.values(this.last).some(v => v >= 0)) {
        const k = pos[changed[0]].seg.k;
        beep({ freq: k === 'run' ? 1046 : 660, times: k === 'run' ? 2 : 1, volume: this.alerts.volume });
      }
      changed.forEach(id => { this.last[id] = pos[id].i; });
    }

    // contagem 3-2-1
    if (this.alerts.countdown && this.alerts.beep && !this.pausedAt) {
      const minLeft = Math.min(...ids.map(id => pos[id].seg.k === 'done' ? Infinity : pos[id].left));
      const c = Math.ceil(minLeft);
      if (c <= 3 && c >= 1 && c !== this.lastCount && minLeft > 0.15) { beep({ freq: 523, dur: 0.08, volume: this.alerts.volume }); }
      this.lastCount = c;
    }

    // metade
    if (this.alerts.halfway && !this.halfSaid && t >= this.total / 2 && !this.pausedAt) {
      this.halfSaid = true;
      setTimeout(() => say(`Metade do treino. Faltam ${Math.round((this.total - t) / 60)} minutos`, this.alerts), 2500);
    }

    this.onTick?.({ t, pos, total: this.total, paused: !!this.pausedAt });

    if (ids.every(id => pos[id].seg.k === 'done') && !this.finished) {
      this.finished = true;
      if (this.alerts.beep) beep({ freq: 1046, times: 3, volume: this.alerts.volume });
      this.stop();
      this.onDone?.({ t });
    }
  }
}

export { fmtClock };
