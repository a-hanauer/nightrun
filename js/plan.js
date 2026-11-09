// Lógica de treino: níveis, metas por prova, próxima sessão, adaptação e projeção.
// Tudo puro (sem DOM) para poder ser testado isoladamente.

// Escada de níveis. run/walk em segundos; base/long = minutos do bloco principal.
export const LEVELS = [
  null,
  { run: 60,   walk: 90, base: 20, long: 24 }, // 1
  { run: 90,   walk: 90, base: 21, long: 27 }, // 2
  { run: 120,  walk: 60, base: 21, long: 27 }, // 3
  { run: 180,  walk: 60, base: 24, long: 30 }, // 4
  { run: 240,  walk: 60, base: 25, long: 32 }, // 5
  { run: 300,  walk: 60, base: 24, long: 36 }, // 6
  { run: 360,  walk: 60, base: 28, long: 38 }, // 7
  { run: 480,  walk: 60, base: 27, long: 40 }, // 8
  { run: 600,  walk: 60, base: 30, long: 44 }, // 9
  { run: 720,  walk: 60, base: 30, long: 46 }, // 10
  { run: 900,  walk: 60, base: 32, long: 48 }, // 11
  { run: 1200, walk: 60, base: 32, long: 50 }, // 12
  { run: 0,    walk: 0,  base: 25, long: 40 }, // 13 contínuo
  { run: 0,    walk: 0,  base: 30, long: 45 }, // 14 contínuo
  { run: 0,    walk: 0,  base: 35, long: 50 }, // 15 contínuo
];
export const MAX_LEVEL = LEVELS.length - 1;
export const WARM = 300;
export const COOL = 300;

export const START_OPTIONS = [
  { level: 1,  label: 'Ainda não corro' },
  { level: 2,  label: '1 a 3 min sem parar' },
  { level: 4,  label: 'Uns 5 min sem parar' },
  { level: 5,  label: 'Uns 10 min sem parar' },
  { level: 9,  label: 'Uns 20 min sem parar' },
  { level: 13, label: '30 min ou mais' },
];

export const GOALS = {
  finish:     { label: 'Completar', hint: 'Caminhar quando precisar, sem meta de ritmo' },
  runwalk:    { label: 'Corre e caminha', hint: 'Intervalos longos de corrida com pausas curtas' },
  continuous: { label: 'Correr sem parar', hint: 'A prova inteira correndo' },
};

export const TYPE_NAMES = {
  base: 'Base', long: 'Longão', easy: 'Leve', taper: 'Polimento', race: 'Prova', free: 'Livre',
};
export const TYPE_HINTS = {
  base: 'Intervalos no seu degrau. É aqui que o plano evolui.',
  long: 'Mesmo ritmo, mais tempo. Constrói resistência para a distância da prova.',
  easy: 'Mais curto e mais leve. Para recuperar sem parar.',
  taper: 'Semana da prova: treino curto para chegar descansado.',
  race: 'Estratégia de prova no seu degrau atual.',
  free: 'Treino feito por conta própria.',
};

const CYCLES = {
  2: ['base', 'long'],
  3: ['base', 'base', 'long'],
  4: ['base', 'easy', 'base', 'long'],
};

// ---------- datas ----------
export function ymd(d) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}
export function parseYmd(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function addDays(d, n) {
  const x = new Date(d); x.setDate(x.getDate() + n); return x;
}
export function daysBetween(a, b) { // b - a em dias (datas locais)
  const A = parseYmd(ymd(a)), B = parseYmd(ymd(b));
  return Math.round((B - A) / 86400000);
}
export function weekStart(d) {
  const x = parseYmd(ymd(d));
  const dow = (x.getDay() + 6) % 7; // segunda = 0
  return addDays(x, -dow);
}

// ---------- formatação ----------
function fmtMinNum(sec) {
  const m = sec / 60;
  return Number.isInteger(m) ? String(m) : String(Math.round(m * 10) / 10).replace('.', ',');
}
export function ratioLabel(level) {
  const L = LEVELS[level];
  if (!L.run) return 'Contínuo';
  return `${fmtMinNum(L.run)}:${fmtMinNum(L.walk)}`;
}
export function ratioWords(level) {
  const L = LEVELS[level];
  if (!L.run) return 'correr sem parar';
  return `corre ${fmtMinNum(L.run)} min, caminha ${fmtMinNum(L.walk)} min`;
}
export function fmtClock(sec) {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}
export function fmtMinutes(sec) { return `${Math.round(sec / 60)} min`; }

// ---------- metas ----------
export function targetLevel(event) {
  if (!event) return null;
  const km = Number(event.distanceKm) || 5;
  const t = {
    finish:     km <= 3 ? 5 : km <= 5 ? 7 : km <= 10 ? 9 : 11,
    runwalk:    km <= 3 ? 6 : km <= 5 ? 8 : km <= 10 ? 10 : 12,
    continuous: km <= 3 ? 13 : km <= 5 ? 14 : 15,
  }[event.goal || 'runwalk'];
  return Math.min(MAX_LEVEL, t);
}
export function longFactor(event) {
  const km = Number(event?.distanceKm) || 5;
  return km >= 15 ? 1.7 : km >= 10 ? 1.4 : km >= 7 ? 1.2 : 1;
}
// Estimativa de tempo de prova (min) no nível dado.
export function estimateRaceMin(level, km, person) {
  const runPace = person?.runPace || 7.5;   // min/km correndo leve
  const walkPace = person?.walkPace || 11;  // min/km caminhando rápido
  const L = LEVELS[level];
  const vr = 60 / runPace, vw = 60 / walkPace; // km/h
  const v = L.run ? (L.run * vr + L.walk * vw) / (L.run + L.walk) : vr;
  return (km / v) * 60;
}

// Sessões de construção possíveis entre hoje e o início do polimento.
export function buildSessionsLeft(today, event, weeklyTarget, weekCount) {
  if (!event) return Infinity;
  const taperStart = addDays(parseYmd(event.date), -6);
  const days = daysBetween(today, taperStart);
  if (days <= 0) return 0;
  const ws = weekStart(today);
  const daysLeftThisWeek = 7 - daysBetween(ws, today);
  const thisWeek = Math.min(Math.max(0, weeklyTarget - weekCount), Math.ceil(Math.min(days, daysLeftThisWeek) / 2));
  const after = Math.max(0, days - daysLeftThisWeek);
  return thisWeek + Math.floor((after / 7) * weeklyTarget);
}

export function holdFor(level, target, N) {
  if (!target || level >= target) return Infinity;
  if (N === Infinity) return 2;
  return Math.max(2, Math.min(3, Math.floor((N - 1) / (target - level))));
}

// ---------- próxima sessão ----------
// p: { level, streak, painFlag, lastDate }  ctx: { today, event, weeklyTarget, weekCount, forceType }
export function nextSession(p, ctx) {
  const { today, event, weeklyTarget = 3, weekCount = 0, forceType } = ctx;
  const notes = [];
  let type;
  const dRace = event ? daysBetween(today, parseYmd(event.date)) : null;

  if (dRace === 0) type = 'race';
  else if (dRace !== null && dRace > 0 && dRace <= 6) type = 'taper';
  else {
    const cycle = CYCLES[weeklyTarget] || CYCLES[3];
    type = weekCount >= cycle.length ? 'easy' : cycle[weekCount];
  }
  if (forceType) type = forceType;

  // Queda por inatividade
  let base = p.level;
  if (p.lastDate) {
    const gap = daysBetween(parseYmd(p.lastDate), today);
    if (gap > 21) { base = Math.max(1, base - 2); notes.push(`${gap} dias sem treinar: voltando dois degraus.`); }
    else if (gap > 10) { base = Math.max(1, base - 1); notes.push(`${gap} dias sem treinar: voltando um degrau.`); }
  }

  const target = event ? targetLevel(event) : null;
  const N = buildSessionsLeft(today, event, weeklyTarget, weekCount);
  const h = holdFor(base, target ?? MAX_LEVEL, N);

  let level = base, attempt = false, mainSec;
  if (type === 'base') {
    if (p.painFlag) notes.push('Teve dor no último treino: mantendo o degrau.');
    else if (base < (target ?? MAX_LEVEL) && (p.streak || 0) >= h) {
      level = base + 1; attempt = true; notes.push(`Novo degrau: ${ratioLabel(level)}.`);
    }
    mainSec = LEVELS[level].base * 60;
  } else if (type === 'long') {
    mainSec = Math.round(LEVELS[level].long * longFactor(event)) * 60;
  } else if (type === 'easy') {
    level = Math.max(1, base - 2); mainSec = 20 * 60;
  } else if (type === 'taper') {
    mainSec = (dRace <= 3 ? 15 : 20) * 60;
  } else if (type === 'race') {
    const est = estimateRaceMin(level, Number(event?.distanceKm) || 5, p);
    mainSec = Math.ceil(est * 1.25) * 60;
  } else {
    mainSec = LEVELS[level].base * 60;
  }

  const L = LEVELS[level];
  return {
    type, level, attempt,
    runSec: L.run, walkSec: L.walk,
    warmSec: type === 'race' ? 0 : WARM,
    coolSec: type === 'race' ? 0 : COOL,
    mainSec, notes, hold: h, target, buildLeft: N,
  };
}

// ---------- segmentos do cronômetro ----------
// Séries inteiras de corre+caminha, para bater 1:1 com um treino montado no Apple Watch.
export function repsOf(plan) {
  if (!plan.runSec) return 0;
  return Math.max(1, Math.round(plan.mainSec / (plan.runSec + plan.walkSec)));
}
export function buildSegments(plan) {
  const segs = [];
  if (plan.warmSec) segs.push({ k: 'warm', s: plan.warmSec });
  if (!plan.runSec) segs.push({ k: 'run', s: plan.mainSec });
  else for (let i = 0; i < repsOf(plan); i++) { segs.push({ k: 'run', s: plan.runSec }); segs.push({ k: 'walk', s: plan.walkSec }); }
  if (plan.coolSec) segs.push({ k: 'cool', s: plan.coolSec });
  return segs;
}
// Receita para o app Exercício do Apple Watch.
export function watchRecipe(plan) {
  const reps = repsOf(plan);
  const name = plan.runSec ? `Nightrun ${ratioLabel(plan.level)} x${reps}` : `Nightrun ${Math.round(plan.mainSec / 60)} min`;
  return { name, key: name, warmSec: plan.warmSec, coolSec: plan.coolSec, runSec: plan.runSec || plan.mainSec, walkSec: plan.walkSec, reps: reps || 1, continuous: !plan.runSec };
}
export function totalSec(segs) { return segs.reduce((a, b) => a + b.s, 0); }
export function runCount(segs) { return segs.filter(s => s.k === 'run').length; }

// Para treinar juntos: iguala o bloco principal dos dois (o maior manda).
export function alignPlans(plans) {
  const keys = Object.keys(plans);
  if (keys.length < 2) return plans;
  const main = Math.max(...keys.map(k => plans[k].mainSec));
  const out = {};
  keys.forEach(k => { out[k] = { ...plans[k], mainSec: main }; });
  return out;
}

// ---------- adaptação ----------
// checkin: { completed: 'full'|'partial'|'no', effort: 1..5, pain: 0|1|2 }
export function applyCheckin(p, plan, c) {
  const before = { level: p.level, streak: p.streak || 0, painFlag: !!p.painFlag };
  let { level, streak, painFlag } = before;
  let msg;
  const ok = c.completed === 'full' && c.effort <= 4 && c.pain < 2;
  const smooth = c.completed === 'full' && c.effort <= 2 && c.pain === 0;
  const counts = plan.type === 'base' || plan.type === 'long';

  painFlag = c.pain === 2;

  if (!counts) {
    msg = painFlag ? 'Dor registrada. O próximo treino segura o degrau.' : 'Registrado. Degrau mantido.';
    if (c.completed === 'no' && plan.type !== 'race') { streak = 0; msg = 'Não deu hoje. O próximo treino segura o degrau.'; }
    return { after: { level, streak, painFlag }, before, msg };
  }

  if (painFlag) {
    streak = 0;
    if (c.completed === 'no') level = Math.max(1, plan.level - 1);
    else level = Math.min(level, plan.level);
    msg = 'Dor registrada: o plano segura o degrau. Se persistir, descanse alguns dias.';
  } else if (plan.attempt) {
    if (ok && c.effort <= 3) { level = plan.level; streak = smooth ? 2 : 1; msg = `Degrau conquistado: ${ratioLabel(level)}.`; }
    else if (ok) { level = plan.level; streak = 0; msg = `Degrau feito, mas puxado. Repete ${ratioLabel(level)} antes de subir.`; }
    else { streak = 0; msg = `Ainda não. Volta para ${ratioLabel(level)} e tenta de novo depois.`; }
  } else {
    if (c.completed === 'no' || c.effort === 5) {
      level = Math.max(1, plan.level - 1); streak = 0;
      msg = `Pesado demais. Desce para ${ratioLabel(level)}.`;
    } else if (ok && c.effort <= 3) {
      level = plan.level; streak = (level === before.level ? streak : 0) + (smooth ? 2 : 1);
      msg = smooth ? 'Fácil. Conta em dobro para o próximo degrau.' : 'Na medida. Um passo mais perto do próximo degrau.';
    } else {
      level = plan.level;
      msg = 'Puxado. Mantém o degrau até ficar confortável.';
    }
  }
  return { after: { level, streak, painFlag }, before, msg };
}

// ---------- projeção ----------
// Dias sugeridos (segunda = 0). Os dias são flexíveis; isto só desenha a projeção.
const SUGGEST = { 2: [1, 5], 3: [1, 3, 5], 4: [0, 2, 4, 6] };

// Simula o plano até a prova assumindo que cada treino sai "na medida".
export function projectPlan(p, { today, event, weeklyTarget = 3, weekCount = 0 }) {
  if (!event) return { weeks: [], reachLevel: p.level, target: null };
  const t0 = parseYmd(ymd(today));
  const raceDate = parseYmd(event.date);
  const taperStart = addDays(raceDate, -6);
  const taperDays = [ymd(addDays(raceDate, -5)), ymd(addDays(raceDate, -2))];
  let state = { level: p.level, streak: p.streak || 0, painFlag: !!p.painFlag };
  const weeks = [];

  for (let ws = weekStart(t0); daysBetween(ws, raceDate) >= 0; ws = addDays(ws, 7)) {
    const isFirst = daysBetween(ws, t0) >= 0 && daysBetween(ws, t0) < 7;
    let wc = isFirst ? weekCount : 0;
    const need = Math.max(0, weeklyTarget - wc);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(ws, i);
      if (daysBetween(t0, d) < 0 || daysBetween(d, raceDate) < 0) continue;
      days.push(d);
    }
    const build = days.filter(d => daysBetween(d, taperStart) > 0);
    // escolhe dias de construção: sugeridos primeiro, depois espaçados
    const sug = build.filter(d => SUGGEST[weeklyTarget]?.includes((d.getDay() + 6) % 7));
    let chosen = sug.slice(0, need);
    if (chosen.length < need) {
      const rest = build.filter(d => !chosen.includes(d));
      for (const d of rest) {
        if (chosen.length >= need) break;
        if (chosen.every(c => Math.abs(daysBetween(c, d)) >= 2)) chosen.push(d);
      }
      for (const d of rest) { if (chosen.length >= need) break; if (!chosen.includes(d)) chosen.push(d); }
    }
    const picks = new Set(chosen.map(ymd));
    days.forEach(d => {
      const k = ymd(d);
      if (taperDays.includes(k) || daysBetween(d, raceDate) === 0) picks.add(k);
    });

    const week = { start: ws, sessions: [] };
    days.filter(d => picks.has(ymd(d))).forEach(d => {
      const plan = nextSession(state, { today: d, event, weeklyTarget, weekCount: wc });
      week.sessions.push({ date: d, plan });
      state = applyCheckin(state, plan, { completed: 'full', effort: 3, pain: 0 }).after;
      wc++;
    });
    weeks.push(week);
  }
  return { weeks, reachLevel: state.level, target: targetLevel(event) };
}
