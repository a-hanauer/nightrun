import * as P from './plan.js';
import { openStore, cloudEnabled, newCoupleCode, newPerson, hasLocalData } from './store.js';
import { Workout, loadAlerts, saveAlerts, unlockAudio, beep, say, locate, kindWord } from './timer.js';

const VERSION = '1.1.0';
const $ = s => document.querySelector(s);
const app = $('#app'), tabsEl = $('#tabs'), sheetEl = $('#sheet'), timerEl = $('#timer'), toastEl = $('#toast');

const COLORS = { sky: '#5BB8FF', rose: '#FF7BAC', violet: '#A78BFA', sand: '#E8C9A0', ice: '#C9D6EA' };
const EFFORT = ['', 'Fácil demais', 'Confortável', 'Na medida', 'Puxado', 'No limite'];
const PAIN = ['Nada', 'Leve', 'Incomodou'];
const DONE = { full: 'Completo', partial: 'Parcial', no: 'Não deu' };
const WD = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const WD_LONG = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const MON = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MON_LONG = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

const ls = {
  get(k, d = null) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};

const STANDALONE = navigator.standalone === true || window.matchMedia?.('(display-mode: standalone)').matches;
const SHARE_ICON = '<svg width="16" height="18" viewBox="0 0 16 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><path d="M8 11V1M4.5 4.5L8 1l3.5 3.5M5 7H2.5v9.5h11V7H11"/></svg>';

const S = {
  store: null, me: ls.get('lal:me'), code: ls.get('lal:code'),
  route: 'hoje', mode: ls.get('lal:mode', 'together'), forceType: null,
  planWho: null, sheet: null, alerts: loadAlerts(), workout: null, onboarding: null,
};

// ---------- utilidades ----------
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const today = () => new Date();
const D = () => S.store.data;
// Pessoas do casal, na ordem cadastrada (atualizado a cada render).
const PEOPLE = [];
function syncPeople() {
  const ps = S.store?.data?.people || {};
  const ids = Object.keys(ps).sort((a, b) => (ps[a].order ?? 9) - (ps[b].order ?? 9) || a.localeCompare(b));
  PEOPLE.splice(0, PEOPLE.length, ...ids);
}
const person = id => D().people[id] || newPerson('?', 0);
const pname = id => person(id).name;
const pcolor = id => COLORS[person(id).color] || COLORS.sky;
const other = id => PEOPLE.find(p => p !== id);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const dShort = d => `${WD[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`;
const dLong = d => `${WD_LONG[d.getDay()]}, ${d.getDate()} de ${MON_LONG[d.getMonth()]}`;
const cvar = id => `--c:${pcolor(id)}`;

function toast(msg) {
  toastEl.textContent = msg; toastEl.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => toastEl.classList.remove('show'), 2400);
}

const ICON = {
  today: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="14.5" cy="4.5" r="2"/><path d="M8 21l3-6 3 2v4M6 12l3-3.5 4 1 2.5 3.5 3 1"/></svg>',
  plan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 6h3M4 12h3M4 18h3M10 6h10M10 12h10M10 18h6"/></svg>',
  race: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4M5 4h13l-2.5 4L18 12H5"/></svg>',
  us: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="8.5" cy="8" r="3"/><circle cx="16.5" cy="9" r="2.5"/><path d="M3 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5M14.5 14.6c.6-.2 1.3-.3 2-.3 2.6 0 4.5 1.8 4.5 4.5"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  chev: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg>',
};

// ---------- dados derivados ----------
function sessionsSorted() {
  return Object.values(D().sessions || {}).sort((a, b) => (a.date + (a.startedAt || '')).localeCompare(b.date + (b.startedAt || '')));
}
function sessionsOf(id) { return sessionsSorted().filter(s => s.checkin?.[id]); }
function activeEvent() {
  const t = P.ymd(today());
  return Object.values(D().events || {}).filter(e => e.date >= t).sort((a, b) => a.date.localeCompare(b.date))[0] || null;
}
function weekCountOf(id, ref = today()) {
  const ws = P.ymd(P.weekStart(ref)), we = P.ymd(P.addDays(P.weekStart(ref), 6));
  return sessionsOf(id).filter(s => s.date >= ws && s.date <= we && s.type !== 'race').length;
}
function ctxOf(id) {
  const list = sessionsOf(id);
  const last = list[list.length - 1];
  return {
    p: { ...person(id), lastDate: last?.date || null },
    ctx: { today: today(), event: activeEvent(), weeklyTarget: D().settings?.weeklyTarget || 3, weekCount: weekCountOf(id) },
  };
}
function nextFor(id, forceType) {
  const { p, ctx } = ctxOf(id);
  return P.nextSession(p, { ...ctx, forceType });
}
function participants() {
  return S.mode === 'together' ? [S.me, other(S.me)] : [S.me];
}
function currentPlans() {
  const ids = participants();
  const first = nextFor(S.me, S.forceType);
  const plans = { [S.me]: first };
  if (ids.length > 1) {
    const o = other(S.me);
    plans[o] = nextFor(o, first.type);
  }
  return P.alignPlans(plans);
}
function startLevelFor(ev, id) { return ev?.startLevels?.[id] ?? person(id).level; }
function readiness(ev, id) {
  const p = person(id), t = P.targetLevel(ev), s = startLevelFor(ev, id);
  if (!t) return 0;
  if (p.level >= t) return 1;
  const span = Math.max(1, t - Math.min(s, p.level));
  const { ctx } = ctxOf(id);
  const h = P.holdFor(p.level, t, P.buildSessionsLeft(ctx.today, ev, ctx.weeklyTarget, ctx.weekCount));
  const frac = Math.min(0.9, (p.streak || 0) / (h === Infinity ? 2 : h));
  return Math.max(0, Math.min(1, (p.level - Math.min(s, p.level) + frac) / span));
}

// ---------- rotas ----------
function setRoute(r) { S.route = r; window.scrollTo(0, 0); render(); }

function render() {
  if (!S.store) return;
  syncPeople();
  if (!PEOPLE.includes(S.me)) { S.onboarding = { step: 'pick' }; renderOnboarding(); return; }
  PEOPLE.forEach((id, i) => document.documentElement.style.setProperty(`--p${i}`, pcolor(id)));
  const views = { hoje: viewToday, plano: viewPlan, provas: viewRaces, nos: viewUs, ajustes: viewSettings };
  app.className = 'app';
  app.innerHTML = (views[S.route] || viewToday)();
  renderTabs();
}

function renderTabs() {
  const items = [['hoje', 'Hoje', ICON.today], ['plano', 'Plano', ICON.plan], ['provas', 'Provas', ICON.race], ['nos', 'Nós', ICON.us], ['ajustes', 'Ajustes', ICON.gear]];
  tabsEl.hidden = false;
  tabsEl.innerHTML = `<div class="wrap">${items.map(([r, l, i]) =>
    `<button class="tab" data-a="route" data-r="${r}" ${S.route === r ? 'aria-current="page"' : ''}>${i}<span>${l}</span></button>`).join('')}</div>`;
}

function topBar(kicker, title) {
  return `<header class="top">
    <div style="flex:1;min-width:0">${kicker ? `<p class="kicker">${kicker}</p>` : ''}<h1>${title}</h1></div>
  </header>`;
}

// ---------- componentes ----------
function trackHero(ev) {
  if (!ev) return `<div class="note"><span class="dot"></span><div><b>Sem prova marcada.</b> Cadastre uma em Provas para o plano ter um alvo. Até lá ele evolui no seu ritmo.</div></div>`;
  const d = P.parseYmd(ev.date);
  const days = P.daysBetween(today(), d);
  const t = P.targetLevel(ev);
  const lane = id => {
    const pct = readiness(ev, id);
    return `<div class="lane" style="${cvar(id)}">
      <div class="fill" style="width:calc(${(pct * 100).toFixed(1)}% )"></div>
      <div class="runner" style="left:max(31px, ${(pct * 100).toFixed(1)}%)">${esc(pname(id)[0])}</div>
      <div class="lvl" style="left:max(31px, ${(pct * 100).toFixed(1)}%)">${pct < 0.72 ? P.ratioLabel(person(id).level) : ''}</div>
    </div>`;
  };
  return `<section class="race-hero card">
    <div class="row">
      <div><h2 class="name">${esc(ev.name)}</h2><p class="when">${dLong(d)}${ev.time ? `, ${esc(ev.time)}` : ''}</p></div>
      <div class="days num">${days === 0 ? 'Hoje' : days}${days ? `<small>${days === 1 ? 'dia' : 'dias'}</small>` : ''}</div>
    </div>
    <div class="track">${PEOPLE.map(lane).join('')}<div class="finish" aria-hidden="true"></div></div>
    <div class="track-foot"><span>Onde cada um está</span><span>Meta ${P.ratioLabel(t)}</span></div>
  </section>`;
}

function strip(segs, cls = 'strip') {
  const tot = P.totalSec(segs);
  return `<div class="${cls}">${segs.map(s => `<i class="k-${s.k}" style="flex:${(s.s / tot).toFixed(4)}"></i>`).join('')}</div>`;
}

function whoRow(id, plan) {
  const segs = P.buildSegments(plan);
  const runs = P.runCount(segs);
  const desc = plan.runSec ? `${P.ratioLabel(plan.level)}, ${runs} ${runs === 1 ? 'corrida' : 'corridas'}` : `${Math.round(plan.mainSec / 60)} min correndo`;
  const flags = [...(plan.notes || [])];
  return `<div class="who" style="${cvar(id)}">
    <div class="who-row"><span class="bar"></span>
      <div><div class="nm">${esc(pname(id))}</div><div class="meta">${desc}</div></div>
      <div class="mins num">${Math.round(P.totalSec(segs) / 60)}<small>min</small></div>
    </div>
    ${strip(segs)}
    ${flags.map(f => `<div class="flag">${esc(f)}</div>`).join('')}
  </div>`;
}

function weekBlock() {
  const target = D().settings?.weeklyTarget || 3;
  return `<div class="card week">${PEOPLE.map(id => {
    const n = weekCountOf(id);
    return `<span class="nm">${esc(pname(id))}</span>
      <div class="pips" style="${cvar(id)}">${Array.from({ length: target }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</div>
      <span class="count num">${n}/${target}</span>`;
  }).join('')}</div>`;
}

// ---------- Hoje ----------
function viewToday() {
  const ev = activeEvent();
  const plans = currentPlans();
  const type = plans[S.me].type;
  const t = P.ymd(today());
  const mine = sessionsOf(S.me);
  const doneToday = mine.filter(s => s.date === t);
  const yesterday = P.ymd(P.addDays(today(), -1));
  const notes = [];
  if (doneToday.length) notes.push(`<div class="note"><span class="dot" style="background:var(--walk)"></span><div><b>Treino de hoje feito.</b> O próximo já está ajustado abaixo, para quando vocês voltarem.</div></div>`);
  else if (mine.some(s => s.date === yesterday) && type !== 'race') notes.push(`<div class="note"><span class="dot"></span><div><b>Ontem teve treino.</b> Descansar hoje rende mais. Se quiser se mexer, faça o leve.</div></div>`);
  if (participants().some(id => person(id).painFlag)) notes.push(`<div class="note warn"><span class="dot"></span><div><b>Dor no último treino.</b> Se ainda incomoda, descanse. Dor que piora correndo é sinal para parar.</div></div>`);

  const suggested = nextFor(S.me).type;
  const typeChoices = type === 'race' || type === 'taper' ? [] : ['base', 'long', 'easy'];
  const isRace = type === 'race';
  return `
    ${topBar(WD_LONG[today().getDay()], `${today().getDate()} de ${MON_LONG[today().getMonth()]}`)}
    ${trackHero(ev)}
    ${notes.join('')}
    <section class="card session">
      <div class="session-controls">
        <div class="seg full" role="group" aria-label="Quem treina">
          <button data-a="mode" data-v="together" aria-pressed="${S.mode === 'together'}">Juntos</button>
          <button data-a="mode" data-v="solo" aria-pressed="${S.mode === 'solo'}">Só eu</button>
        </div>
        ${typeChoices.length ? `<div class="seg full" role="group" aria-label="Tipo de treino">${typeChoices.map(k =>
          `<button data-a="force" data-v="${k === suggested ? '' : k}" aria-pressed="${k === type}">${P.TYPE_NAMES[k]}${k === suggested ? '<i class="sugg" aria-label="sugerido"></i>' : ''}</button>`).join('')}</div>` : ''}
      </div>
      <h2 class="session-type">${P.TYPE_NAMES[type]}</h2>
      <p class="session-hint">${P.TYPE_HINTS[type]} ${typeChoices.length ? (type === suggested ? '<span class="sugg-txt">Sugerido para hoje.</span>' : `<span class="sugg-txt">A sugestão era ${P.TYPE_NAMES[suggested]}.</span>`) : ''}</p>
      ${Object.entries(plans).map(([id, pl]) => whoRow(id, pl)).join('')}
      <div class="legend"><span style="--k:var(--lamp)">Corre</span><span style="--k:var(--walk)">Caminha</span><span style="--k:var(--calm)">Aquece e desaquece</span></div>
      <div class="actions">
        <button class="btn" data-a="start">${isRace ? 'Começar cronômetro de prova' : 'Começar treino'}</button>
        <button class="btn ghost" data-a="log">Registrar treino feito sem o app</button>
      </div>
    </section>
    <h2 class="sec">Esta semana</h2>
    ${weekBlock()}
  `;
}

// ---------- Plano ----------
function viewPlan() {
  const id = S.planWho || S.me;
  const ev = activeEvent();
  const { p, ctx } = ctxOf(id);
  const head = `${topBar('', 'Plano')}
    <div class="seg full" role="group" aria-label="De quem">${PEOPLE.map(x =>
      `<button data-a="planwho" data-v="${x}" aria-pressed="${x === id}">${esc(pname(x))}</button>`).join('')}</div>`;
  const explain = `<details class="explain"><summary>Como o plano se adapta</summary><ul>
    <li>Cada degrau é uma proporção corre:caminha. Vocês sobem um degrau por vez, sempre no treino Base.</li>
    <li>Depois de cada treino, cada um diz se completou e como foi o esforço. "Fácil demais" conta em dobro; "Puxado" segura o degrau; "No limite" ou "Não deu" desce um degrau.</li>
    <li>Quanto mais perto a prova, menos treinos ficam em cada degrau, mas sempre pelo menos dois: um para subir e outro para confirmar. Se não der tempo, o plano avisa em vez de forçar.</li>
    <li>O Longão usa o mesmo degrau com mais tempo, para aguentar a distância da prova.</li>
    <li>Mais de 10 dias parado volta um degrau; mais de 21, dois.</li>
    <li>Dor que incomodou segura o degrau e sugere descanso.</li>
    <li>Nos 6 dias antes da prova entra o polimento: dois treinos curtos para chegar descansado.</li>
    <li>Quando os dois treinam juntos, cada um segue a própria proporção pelo mesmo tempo total, e a voz chama cada um pelo nome.</li>
  </ul></details>`;

  if (!ev) return `${head}<div class="note" style="margin-top:14px"><span class="dot"></span><div><b>Sem prova marcada.</b> Sem alvo, o plano sobe um degrau a cada dois treinos que saem na medida.</div></div>
    <div class="goal-grid" style="margin-top:10px"><div class="stat"><div class="v">${P.ratioLabel(p.level)}</div><div class="l">Degrau atual</div></div>
    <div class="stat"><div class="v">${D().settings?.weeklyTarget || 3}×</div><div class="l">Treinos por semana</div></div></div>${explain}`;

  const proj = P.projectPlan(p, ctx);
  const target = proj.target;
  const km = Number(ev.distanceKm) || 5;
  const reachEst = P.estimateRaceMin(proj.reachLevel, km, p);
  const short = proj.reachLevel < target;
  const done = sessionsOf(id).filter(s => s.date >= P.ymd(P.weekStart(today())));

  const weeks = proj.weeks.map((w, wi) => {
    const rows = [];
    if (wi === 0) done.forEach(s => {
      const pl = s.plans?.[id]; if (!pl) return;
      const d = P.parseYmd(s.date);
      rows.push(`<div class="wk-row done"><div class="d">${WD[d.getDay()]}<b>${d.getDate()}</b></div>
        <div><div class="t">${P.TYPE_NAMES[s.type]}<span class="badge">feito</span></div><div class="r">${pl.runSec ? P.ratioLabel(pl.level) : 'Contínuo'}</div></div>
        <div class="m num">${Math.round((s.durationSec || 0) / 60)}′</div></div>`);
    });
    w.sessions.forEach(({ date, plan }) => {
      const segs = P.buildSegments(plan);
      rows.push(`<div class="wk-row"><div class="d">${WD[date.getDay()]}<b>${date.getDate()}</b></div>
        <div><div class="t">${P.TYPE_NAMES[plan.type]}${plan.attempt ? '<span class="up">novo degrau</span>' : ''}</div>
        <div class="r">${plan.type === 'race' ? `${km} km, ${P.ratioWords(plan.level)}` : plan.runSec ? `${P.ratioLabel(plan.level)}, ${P.runCount(segs)} corridas` : `${Math.round(plan.mainSec / 60)} min correndo`}</div></div>
        <div class="m num">${plan.type === 'race' ? '🏁' : Math.round(P.totalSec(segs) / 60) + '′'}</div></div>`);
    });
    if (!rows.length) return '';
    const label = wi === 0 ? 'Esta semana' : `Semana de ${w.start.getDate()} ${MON[w.start.getMonth()]}`;
    return `<div class="wk"><h3>${label}</h3><div class="wk-list">${rows.join('')}</div></div>`;
  }).join('');

  return `${head}
    <h2 class="sec" style="margin-top:22px">Rumo à ${esc(ev.name)}</h2>
    <div class="goal-grid">
      <div class="stat"><div class="v">${P.ratioLabel(p.level)}</div><div class="l">Degrau atual</div></div>
      <div class="stat"><div class="v" style="color:var(--lamp)">${P.ratioLabel(target)}</div><div class="l">Meta para a prova</div></div>
      <div class="stat wide"><div class="v num">${Math.round(reachEst)} min</div><div class="l">Previsão para os ${String(km).replace('.', ',')} km no dia da prova, ${P.ratioWords(proj.reachLevel)}</div></div>
    </div>
    ${short ? `<div class="note warn" style="margin-top:10px"><span class="dot"></span><div><b>Prazo apertado.</b> Com ${ctx.weeklyTarget} treinos por semana, a projeção chega em ${P.ratioLabel(proj.reachLevel)}, não em ${P.ratioLabel(target)}. Dá para completar a prova nessa estratégia; a meta completa fica para a próxima.</div></div>` : ''}
    <p class="small" style="margin:12px 2px 0">Projeção considerando que todo treino sai na medida. Os dias são sugestões: treine quando der, sem dias seguidos.</p>
    ${weeks}
    ${explain}`;
}

// ---------- Provas ----------
function viewRaces() {
  const t = P.ymd(today());
  const all = Object.values(D().events || {});
  const upcoming = all.filter(e => e.date >= t).sort((a, b) => a.date.localeCompare(b.date));
  const past = all.filter(e => e.date < t).sort((a, b) => b.date.localeCompare(a.date));
  const ev = upcoming[0];
  let main = `<div class="card"><p class="sub" style="margin-bottom:14px">Nenhuma prova marcada. Cadastre a próxima para o plano mirar nela.</p><button class="btn" data-a="event-new">Adicionar prova</button></div>`;
  if (ev) {
    const d = P.parseYmd(ev.date), days = P.daysBetween(today(), d);
    main = `<section class="card race-card">
      <p class="sub">${days === 0 ? 'É hoje' : `Em ${days} ${days === 1 ? 'dia' : 'dias'}`}</p>
      <h2 class="name">${esc(ev.name)}</h2>
      <div class="facts">
        <div><span>Data</span>${dLong(d)}</div>
        <div><span>Largada</span>${ev.time ? esc(ev.time) : 'A confirmar'}</div>
        <div><span>Distância</span>${String(ev.distanceKm).replace('.', ',')} km</div>
        <div><span>Meta</span>${P.GOALS[ev.goal]?.label || ''}</div>
        ${ev.location ? `<div style="grid-column:1/-1"><span>Local</span>${esc(ev.location)}</div>` : ''}
        ${ev.notes ? `<div style="grid-column:1/-1"><span>Observações</span>${esc(ev.notes)}</div>` : ''}
      </div>
      <div class="strategy"><p class="small" style="margin:0 0 10px">Se a prova fosse hoje</p>
        ${PEOPLE.map(id => {
          const p = person(id);
          const est = P.estimateRaceMin(p.level, Number(ev.distanceKm) || 5, p);
          return `<div class="who-row" style="${cvar(id)}"><span class="bar" style="width:4px;height:34px;border-radius:2px;background:var(--c)"></span>
            <div><div class="nm" style="font-weight:600">${esc(pname(id))}</div><div class="small">${P.ratioWords(p.level)}</div></div>
            <div class="mins num" style="margin-left:auto;font:700 24px/1 var(--display)">${Math.round(est)}′</div></div>`;
        }).join('')}
      </div>
      <div class="actions" style="display:grid;grid-template-columns:${ev.url ? '1fr 1fr' : '1fr'};gap:8px">
        <button class="btn quiet" data-a="event-edit" data-id="${ev.id}">Editar prova</button>
        ${ev.url ? `<a class="btn quiet" href="${esc(ev.url)}" target="_blank" rel="noopener" style="text-decoration:none">Site da prova</a>` : ''}
      </div>
    </section>`;
  }
  const row = e => {
    const d = P.parseYmd(e.date);
    const res = e.results || {};
    const resTxt = PEOPLE.filter(id => res[id]?.time).map(id => `${esc(pname(id))} ${esc(res[id].time)}`).join(', ');
    return `<button class="list-row" data-a="${e.date < P.ymd(today()) ? 'result' : 'event-edit'}" data-id="${e.id}">
      <div class="grow"><div class="t">${esc(e.name)}</div><div class="s">${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}, ${String(e.distanceKm).replace('.', ',')} km${resTxt ? `. ${resTxt}` : e.date < P.ymd(today()) ? '. Registrar resultado' : ''}</div></div>
      <span class="chev">${ICON.chev}</span></button>`;
  };
  return `${topBar('', 'Provas')}
    ${main}
    ${upcoming.length > 1 ? `<h2 class="sec">Depois dessa</h2><div class="list">${upcoming.slice(1).map(row).join('')}</div>` : ''}
    ${ev ? `<div class="actions"><button class="btn ghost" data-a="event-new">Adicionar outra prova</button></div>` : ''}
    <h2 class="sec">Já corridas</h2>
    ${past.length ? `<div class="list">${past.map(row).join('')}</div>` : `<div class="list"><div class="empty">As provas que passarem ficam aqui, com o tempo de cada um.</div></div>`}`;
}

// ---------- Nós ----------
function weeksStreak() {
  const target = D().settings?.weeklyTarget || 3;
  let n = 0;
  let ws = P.weekStart(today());
  const both = w => PEOPLE.every(id => weekCountOf(id, w) >= target);
  if (!both(ws)) ws = P.addDays(ws, -7);
  for (let i = 0; i < 200 && both(ws); i++) { n++; ws = P.addDays(ws, -7); }
  return n;
}
function viewUs() {
  const all = sessionsSorted();
  const together = all.filter(s => PEOPLE.every(id => s.checkin?.[id])).length;
  const totalSec = all.reduce((a, s) => a + (s.durationSec || 0), 0);
  const km = all.reduce((a, s) => a + PEOPLE.reduce((b, id) => b + (Number(s.checkin?.[id]?.distanceKm) || 0), 0), 0);
  const streak = weeksStreak();

  // calendário: 8 semanas
  const start = P.addDays(P.weekStart(today()), -7 * 7);
  const byDay = {};
  all.forEach(s => { PEOPLE.forEach(id => { if (s.checkin?.[id]) (byDay[s.date] ||= new Set()).add(id); }); });
  const evDays = new Set(Object.values(D().events || {}).map(e => e.date));
  const tStr = P.ymd(today());
  let cells = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map(h => `<div class="h">${h}</div>`).join('');
  for (let i = 0; i < 56; i++) {
    const d = P.addDays(start, i), k = P.ymd(d);
    const set = byDay[k];
    cells += `<div class="c${k > tStr ? ' out' : ''}${k === tStr ? ' today' : ''}${evDays.has(k) ? ' race' : ''}" title="${k}">${set?.has(PEOPLE[0]) ? '<i class="a"></i>' : ''}${set?.has(PEOPLE[1]) ? '<i class="b"></i>' : ''}</div>`;
  }

  const hist = all.slice().reverse().slice(0, 40).map(s => {
    const d = P.parseYmd(s.date);
    const ids = PEOPLE.filter(id => s.checkin?.[id]);
    const eff = ids.map(id => `${esc(pname(id))}: ${EFFORT[s.checkin[id].effort] || DONE[s.checkin[id].completed]}`).join(', ');
    return `<button class="list-row hist" data-a="session" data-id="${s.id}">
      <div class="dots">${ids.map(id => `<i style="${cvar(id)}"></i>`).join('')}</div>
      <div class="grow"><div class="t">${P.TYPE_NAMES[s.type] || 'Treino'}, ${dShort(d)}</div><div class="s">${eff}</div></div>
      <span class="s num" style="color:var(--muted);font-size:14px">${Math.round((s.durationSec || 0) / 60)}′</span></button>`;
  }).join('');

  return `${topBar('', 'Nós')}
    <div class="goal-grid">
      <div class="stat"><div class="v num">${streak}</div><div class="l">${streak === 1 ? 'Semana' : 'Semanas'} seguidas com os dois na meta</div></div>
      <div class="stat"><div class="v num">${together}</div><div class="l">Treinos juntos</div></div>
      <div class="stat"><div class="v num">${(totalSec / 3600).toFixed(1).replace('.', ',')} h</div><div class="l">Em movimento, somando tudo</div></div>
      <div class="stat"><div class="v num">${km ? km.toFixed(1).replace('.', ',') : '–'}</div><div class="l">Km registrados pelos dois</div></div>
    </div>
    <h2 class="sec">Últimas 8 semanas</h2>
    <div class="card"><div class="cal">${cells}</div>
      <div class="cal-legend">${PEOPLE.map(id => `<span style="${cvar(id)}">${esc(pname(id))}</span>`).join('')}<span style="--c:var(--text)">Prova</span></div></div>
    <h2 class="sec">Histórico</h2>
    <div class="list">${hist || '<div class="empty">Nenhum treino ainda. O primeiro aparece aqui assim que vocês salvarem.</div>'}</div>`;
}

// ---------- Ajustes ----------
function viewSettings() {
  const a = S.alerts, s = D().settings || {};
  const tog = (k, label, hint) => `<div class="field row"><div><div class="lbl">${label}</div>${hint ? `<div class="hint">${hint}</div>` : ''}</div>
    <label class="switch"><input type="checkbox" data-a="alert" data-k="${k}" ${a[k] ? 'checked' : ''} aria-label="${label}"><span></span></label></div>`;
  const syncTxt = S.store.mode === 'cloud'
    ? `<div class="field"><div class="lbl">Sincronizado com ${esc(pname(other(S.me)))}</div><div class="hint">Status: ${S.store.status}. Código do casal:</div><div class="code">${esc(S.code)}</div></div>
       <div class="field"><button class="btn quiet" data-a="invite">Copiar link de convite</button><div class="hint" style="margin-top:8px">Mande para ${esc(pname(other(S.me)))}. Abrindo o link no iPhone, o app já entra no mesmo código.</div></div>`
    : `<div class="field"><div class="lbl">Só neste iPhone</div><div class="hint">${cloudEnabled ? 'Sem código do casal. ' : 'O Firebase ainda não foi configurado (veja o README). '}Os dados não sincronizam com ${esc(pname(other(S.me)))}. Exporte de vez em quando para não perder nada.</div></div>
       ${cloudEnabled ? `<div class="field"><button class="btn quiet" data-a="connect">Conectar com ${esc(pname(other(S.me)))}</button></div>` : ''}`;
  const me = S.me, p = person(me), mate = other(me);
  const COLOR_NAMES = { sky: 'Azul', rose: 'Rosa', violet: 'Lilás', sand: 'Areia', ice: 'Gelo' };
  const wt = s.weeklyTarget || 3;
  return `${topBar('', 'Ajustes')}
    <h2 class="sec">Quem usa este aparelho</h2>
    <div class="group choice" role="radiogroup" aria-label="Quem usa este aparelho">${PEOPLE.map(id =>
      `<button class="choice-row" role="radio" aria-checked="${me === id}" data-a="me" data-v="${id}" style="${cvar(id)}">
        <span class="who-dot"></span><span class="grow">${esc(pname(id))}</span><span class="radio" aria-hidden="true"></span></button>`).join('')}</div>
    <p class="small" style="margin:8px 2px 0">As configurações abaixo são de quem estiver marcado aqui.</p>

    <h2 class="sec">Seu perfil</h2>
    <div class="group" style="${cvar(me)}">
      <div class="field"><label class="f" style="margin:0"><span>Nome</span><input class="input" data-a="pname" data-id="${me}" value="${esc(p.name)}" maxlength="24" autocomplete="off"></label></div>
      <div class="field"><div class="lbl">Sua cor</div><div class="hint">Aparece na pista, no calendário e nos treinos.</div>
        <div class="swatches" role="radiogroup" aria-label="Sua cor">${Object.entries(COLORS).map(([k, v]) => {
          const taken = person(mate)?.color === k;
          return `<button class="swatch" role="radio" style="--c:${v}" data-a="color" data-id="${me}" data-v="${k}" aria-checked="${p.color === k}" aria-label="${COLOR_NAMES[k]}${taken ? `, usada por ${esc(pname(mate))}` : ''}" ${taken ? 'disabled' : ''}><i></i></button>`;
        }).join('')}</div></div>
      <div class="field row"><div><div class="lbl">Degrau atual</div><div class="hint">${P.ratioWords(p.level)}</div></div>
        <div class="stepper"><button data-a="lvl" data-id="${me}" data-v="-1" aria-label="Descer degrau" ${p.level <= 1 ? 'disabled' : ''}>−</button><output class="num">${P.ratioLabel(p.level)}</output><button data-a="lvl" data-id="${me}" data-v="1" aria-label="Subir degrau" ${p.level >= P.MAX_LEVEL ? 'disabled' : ''}>+</button></div></div>
      <div class="field two">
        <label class="f" style="margin:0"><span>Ritmo correndo leve (min/km)</span><input class="input num" inputmode="decimal" data-a="pace" data-id="${me}" data-k="runPace" value="${String(p.runPace).replace('.', ',')}"></label>
        <label class="f" style="margin:0"><span>Ritmo caminhando (min/km)</span><input class="input num" inputmode="decimal" data-a="pace" data-id="${me}" data-k="walkPace" value="${String(p.walkPace).replace('.', ',')}"></label>
      </div>
      <div class="field"><div class="hint">Os ritmos servem só para estimar o tempo de prova. O degrau muda sozinho com os check-ins; ajuste aqui só se o plano estiver fácil ou difícil demais.</div></div>
    </div>

    <h2 class="sec">Dupla</h2>
    <div class="group">
      <div class="field row"><div><div class="lbl">Treinos por semana</div><div class="hint">Vale para os dois. Com 4, o extra é um Leve.</div></div>
        <div class="stepper"><button data-a="weekly" data-v="${Math.max(2, wt - 1)}" aria-label="Menos treinos" ${wt <= 2 ? 'disabled' : ''}>−</button><output class="num" style="min-width:44px">${wt}</output><button data-a="weekly" data-v="${Math.min(4, wt + 1)}" aria-label="Mais treinos" ${wt >= 4 ? 'disabled' : ''}>+</button></div></div>
      ${syncTxt}
    </div>

    <h2 class="sec">Avisos no treino</h2>
    <p class="small" style="margin:-4px 2px 10px">Valem só para este aparelho.</p>
    <div class="group">
      ${tog('voice', 'Voz', 'Fala a troca de fase. Com fone, toca por cima da música.')}
      ${tog('beep', 'Bipe', 'Dois bipes para correr, um para caminhar.')}
      ${tog('countdown', 'Contagem 3, 2, 1', 'Bipes curtos nos últimos 3 segundos de cada fase.')}
      ${tog('halfway', 'Aviso de metade', 'Avisa quando passar da metade do treino.')}
      ${tog('bigCount', 'Cronômetro grande', 'Números enormes para ler correndo.')}
      <div class="field"><div class="lbl">Velocidade da voz</div><input type="range" min="0.8" max="1.3" step="0.05" value="${a.voiceRate}" data-a="alert-range" data-k="voiceRate" aria-label="Velocidade da voz"></div>
      <div class="field"><div class="lbl">Volume dos avisos</div><input type="range" min="0.2" max="1" step="0.05" value="${a.volume}" data-a="alert-range" data-k="volume" aria-label="Volume"></div>
      <div class="field"><button class="btn quiet" data-a="test-alerts">Testar avisos</button>
      <div class="hint" style="margin-top:8px">No iPhone, deixe o botão lateral fora do silencioso para ouvir o bipe. Mantenha a tela ligada durante o treino: com ela bloqueada, o iOS pausa os avisos.</div></div>
    </div>
    <h2 class="sec">Dados</h2>
    <div class="group">
      <div class="field"><button class="btn quiet" data-a="export">Exportar backup</button></div>
      <div class="field"><label class="btn quiet" style="cursor:pointer">Importar backup<input type="file" accept="application/json" data-a="import" hidden></label></div>
      ${S.store.mode === 'cloud' ? `<div class="field"><button class="btn danger" data-a="leave">Desconectar este iPhone</button></div>` : ''}
    </div>
    <p class="small" style="text-align:center;margin-top:24px">Nightrun ${VERSION}</p>`;
}

// ---------- folhas ----------
function openSheet(sh) { S.sheet = sh; renderSheet(true); }
function closeSheet() { S.sheet = null; sheetEl.hidden = true; sheetEl.innerHTML = ''; }
function renderSheet(enter = false) {
  const sh = S.sheet; if (!sh) return closeSheet();
  const body = { checkin: sheetCheckin, result: sheetSaved, event: sheetEvent, raceResult: sheetRaceResult, session: sheetSession, connect: sheetConnect }[sh.kind]();
  const scroll = sheetEl.querySelector('.sheet')?.scrollTop || 0;
  sheetEl.hidden = false;
  sheetEl.innerHTML = `<div class="sheet${enter ? ' enter' : ''}" role="dialog" aria-modal="true"><div class="grab"></div>${body}</div>`;
  sheetEl.querySelector('.sheet').scrollTop = scroll;
}

function sheetCheckin() {
  const sh = S.sheet;
  const blocks = sh.ids.map(id => {
    const c = sh.c[id];
    return `<div class="block" style="${cvar(id)}">
      <div class="block-name">${esc(pname(id))}</div>
      <div class="f" style="margin-top:14px"><span class="flabel">Completou?</span><div class="opts" role="radiogroup">${Object.entries(DONE).map(([k, l]) =>
        `<button data-a="ck" data-id="${id}" data-k="completed" data-v="${k}" aria-pressed="${c.completed === k}">${l}</button>`).join('')}</div></div>
      <div class="f" style="margin-top:14px"><span class="flabel">Esforço</span><div class="opts effort" role="radiogroup">${[1, 2, 3, 4, 5].map(n =>
        `<button data-a="ck" data-id="${id}" data-k="effort" data-v="${n}" aria-pressed="${c.effort === n}" aria-label="${EFFORT[n]}">${n}</button>`).join('')}</div>
        <div class="effort-label">${c.effort ? EFFORT[c.effort] : '1 fácil demais, 5 no limite'}</div></div>
      <div class="f" style="margin-top:10px"><span class="flabel">Alguma dor?</span><div class="opts" role="radiogroup">${PAIN.map((l, i) =>
        `<button data-a="ck" data-id="${id}" data-k="pain" data-v="${i}" aria-pressed="${c.pain === i}">${l}</button>`).join('')}</div></div>
      <div class="two">
        <label class="f"><span>Distância (km, opcional)</span><input class="input num" inputmode="decimal" data-bind="c.${id}.distanceKm" value="${esc(c.distanceKm || '')}" placeholder="0,0"></label>
        <label class="f"><span>Observação</span><input class="input" data-bind="c.${id}.note" value="${esc(c.note || '')}" placeholder="Opcional"></label>
      </div>
    </div>`;
  }).join('');
  const ready = sh.ids.every(id => sh.c[id].completed && sh.c[id].effort && sh.c[id].pain !== undefined);
  return `<div class="s-head"><h2>${sh.manual ? 'Registrar treino' : 'Como foi?'}</h2><button class="close" data-a="sheet-cancel">${sh.armCancel ? 'Toque de novo para descartar' : sh.manual ? 'Cancelar' : 'Descartar'}</button></div>
    ${sh.manual ? `<div class="two">
      <label class="f"><span>Dia</span><input class="input" type="date" data-bind="date" value="${sh.date}" max="${P.ymd(today())}"></label>
      <label class="f"><span>Duração (min)</span><input class="input num" inputmode="numeric" data-bind="minutes" value="${esc(sh.minutes || '')}"></label>
    </div>
    <div class="f" style="margin-top:14px"><span class="flabel">Quem treinou</span><div class="opts" role="radiogroup">
      <button data-a="ck-who" data-v="both" aria-pressed="${sh.ids.length === 2}">Os dois</button>
      ${PEOPLE.map(id => `<button data-a="ck-who" data-v="${id}" aria-pressed="${sh.ids.length === 1 && sh.ids[0] === id}">${esc(pname(id))}</button>`).join('')}</div></div>
    <p class="small" style="margin-top:10px">Conta como o treino ${P.TYPE_NAMES[sh.plans[sh.ids[0]].type]} sugerido para hoje.</p>` : `<p class="sub" style="margin-top:6px">${P.TYPE_NAMES[sh.type]}, ${P.fmtClock(sh.durationSec)} de treino. Isso ajusta o próximo treino de cada um.</p>`}
    <div style="margin-top:6px">${blocks}</div>
    <div class="actions"><button class="btn" data-a="ck-save" ${ready ? '' : 'disabled'}>Salvar treino</button></div>`;
}

function sheetSaved() {
  const sh = S.sheet;
  return `<div class="s-head"><h2>Treino salvo</h2></div>
    <div style="margin-top:10px">${sh.lines.map(([id, msg, plan]) => `<div class="result-line" style="${cvar(id)}"><span class="bar"></span>
      <div><div style="font-weight:600">${esc(pname(id))}</div><div class="sub" style="color:var(--text)">${esc(msg)}</div>
      <div class="small" style="margin-top:4px">Próximo: ${P.TYPE_NAMES[plan.type]}, ${plan.runSec ? P.ratioLabel(plan.level) : 'contínuo'}</div></div></div>`).join('')}</div>
    <div class="actions"><button class="btn" data-a="sheet-close">Fechar</button></div>`;
}

function sheetEvent() {
  const e = S.sheet.e;
  const kms = [3, 5, 10, 21.1];
  return `<div class="s-head"><h2>${S.sheet.isNew ? 'Nova prova' : 'Editar prova'}</h2><button class="close" data-a="sheet-close">Cancelar</button></div>
    <label class="f"><span>Nome</span><input class="input" data-bind="e.name" value="${esc(e.name)}" placeholder="Ex.: Night Run Novo Hamburgo"></label>
    <div class="two">
      <label class="f"><span>Data</span><input class="input" type="date" data-bind="e.date" value="${esc(e.date)}"></label>
      <label class="f"><span>Largada</span><input class="input" type="time" data-bind="e.time" value="${esc(e.time)}"></label>
    </div>
    <div class="f" style="margin-top:16px"><span class="flabel">Distância</span><div class="chips">${kms.map(k =>
      `<button class="chip" data-a="ev-km" data-v="${k}" aria-pressed="${Number(e.distanceKm) === k}">${String(k).replace('.', ',')} km</button>`).join('')}
      <input class="input num" style="width:96px;height:30px;border-radius:15px;font-size:13px;padding:0 12px" inputmode="decimal" placeholder="Outra" data-bind="e.distanceKm" value="${kms.includes(Number(e.distanceKm)) ? '' : esc(e.distanceKm)}"></div></div>
    <div class="f" style="margin-top:16px"><span class="flabel">Meta</span><div class="group" style="background:var(--bg)">${Object.entries(P.GOALS).map(([k, g]) =>
      `<button class="list-row" data-a="ev-goal" data-v="${k}"><div class="grow"><div class="t">${g.label}</div><div class="s">${g.hint}</div></div>
        <span style="width:20px;height:20px;border-radius:50%;border:2px solid ${e.goal === k ? 'var(--lamp)' : 'var(--line)'};display:grid;place-items:center">${e.goal === k ? '<i style="width:10px;height:10px;border-radius:50%;background:var(--lamp)"></i>' : ''}</span></button>`).join('')}</div></div>
    <label class="f"><span>Local</span><input class="input" data-bind="e.location" value="${esc(e.location)}"></label>
    <label class="f"><span>Link da prova</span><input class="input" type="url" inputmode="url" data-bind="e.url" value="${esc(e.url)}" placeholder="https://"></label>
    <label class="f"><span>Observações</span><textarea class="input" data-bind="e.notes">${esc(e.notes)}</textarea></label>
    <div class="actions"><button class="btn" data-a="ev-save">Salvar prova</button>
      ${S.sheet.isNew ? '' : `<button class="btn danger" data-a="ev-del">${S.sheet.armDel ? 'Toque de novo para excluir' : 'Excluir prova'}</button>`}</div>`;
}

function sheetRaceResult() {
  const e = S.sheet.e;
  return `<div class="s-head"><h2>${esc(e.name)}</h2><button class="close" data-a="sheet-close">Fechar</button></div>
    <p class="sub" style="margin-top:6px">${dLong(P.parseYmd(e.date))}, ${String(e.distanceKm).replace('.', ',')} km</p>
    ${PEOPLE.map(id => `<div class="block" style="${cvar(id)};margin-top:18px"><div class="block-name">${esc(pname(id))}</div>
      <div class="two"><label class="f"><span>Tempo (h:mm:ss)</span><input class="input num" inputmode="numeric" data-bind="e.results.${id}.time" value="${esc(e.results?.[id]?.time || '')}" placeholder="0:42:10"></label>
      <label class="f"><span>Observação</span><input class="input" data-bind="e.results.${id}.note" value="${esc(e.results?.[id]?.note || '')}"></label></div></div>`).join('')}
    <div class="actions"><button class="btn" data-a="ev-save">Salvar resultado</button>
    <button class="btn ghost" data-a="ev-open-edit">Editar dados da prova</button></div>`;
}

function sheetSession() {
  const s = D().sessions[S.sheet.id];
  if (!s) return '<p class="sub">Treino não encontrado.</p>';
  const d = P.parseYmd(s.date);
  const ids = PEOPLE.filter(id => s.checkin?.[id]);
  return `<div class="s-head"><h2>${P.TYPE_NAMES[s.type] || 'Treino'}</h2><button class="close" data-a="sheet-close">Fechar</button></div>
    <p class="sub" style="margin-top:6px">${dLong(d)}. ${Math.round((s.durationSec || 0) / 60)} min de treino.</p>
    ${ids.map(id => {
      const c = s.checkin[id], pl = s.plans?.[id], r = s.results?.[id];
      return `<div class="block" style="${cvar(id)};margin-top:18px"><div class="block-name">${esc(pname(id))}</div>
        <div class="facts" style="margin-bottom:0">
          <div><span>Degrau</span>${pl ? (pl.runSec ? P.ratioLabel(pl.level) : 'Contínuo') : '–'}</div>
          <div><span>Completou</span>${DONE[c.completed]}</div>
          <div><span>Esforço</span>${EFFORT[c.effort]}</div>
          <div><span>Dor</span>${PAIN[c.pain]}</div>
          ${c.distanceKm ? `<div><span>Distância</span>${esc(String(c.distanceKm).replace('.', ','))} km</div>` : ''}
          ${c.note ? `<div style="grid-column:1/-1"><span>Observação</span>${esc(c.note)}</div>` : ''}
          ${r?.msg ? `<div style="grid-column:1/-1"><span>Ajuste</span>${esc(r.msg)}</div>` : ''}
        </div></div>`;
    }).join('')}
    <div class="actions"><button class="btn danger" data-a="session-del">${S.sheet.armDel ? 'Toque de novo para excluir' : 'Excluir treino'}</button>
    <p class="small" style="text-align:center;margin:4px 0 0">Se for o último treino, o degrau volta ao que era antes dele.</p></div>`;
}

function sheetConnect() {
  const sh = S.sheet;
  return `<div class="s-head"><h2>Conectar</h2><button class="close" data-a="sheet-close">Cancelar</button></div>
    <p class="sub" style="margin-top:6px">Um de vocês cria o código e manda o link para o outro.</p>
    <div class="actions"><button class="btn" data-a="code-create">Criar código do casal</button></div>
    <label class="f"><span>Ou cole o código que recebeu</span><input class="input" data-bind="code" value="${esc(sh.code || '')}" autocapitalize="off" autocorrect="off" spellcheck="false"></label>
    <div class="actions"><button class="btn quiet" data-a="code-join">Entrar com este código</button></div>
    ${sh.err ? `<p class="small" style="color:var(--danger)">${esc(sh.err)}</p>` : ''}
    <p class="small" style="margin-top:14px">Os dados que estão só neste iPhone vão junto quando você cria o código.</p>`;
}

function setPath(obj, path, val) {
  const ks = path.split('.'); let o = obj;
  ks.slice(0, -1).forEach(k => { o = (o[k] ||= {}); });
  o[ks[ks.length - 1]] = val;
}

// ---------- treino ----------
function startWorkout(resume) {
  let cfg;
  if (resume) cfg = resume;
  else {
    const plans = currentPlans();
    cfg = { plans, ids: Object.keys(plans), type: plans[S.me].type, date: P.ymd(today()), startedAt: new Date().toISOString() };
    ls.set('lal:activePlan', JSON.stringify(cfg));
  }
  const lanes = {};
  cfg.ids.forEach(id => { lanes[id] = { name: pname(id), segs: P.buildSegments(cfg.plans[id]) }; });
  unlockAudio();
  let saved = null;
  if (resume) { try { saved = JSON.parse(ls.get('lal:active')); } catch {} }
  timerEl.hidden = false;
  timerEl.className = `timer${S.alerts.bigCount ? '' : ' small-count'}`;
  timerEl.innerHTML = `
    <div class="t-top"><span id="t-type">${P.TYPE_NAMES[cfg.type]}</span><span id="t-rep"></span></div>
    <div class="t-main" id="t-main"></div>
    <div class="paused-tag" id="t-paused"></div>
    <div class="t-strip" id="t-strip"></div>
    <div class="t-times"><span>Feito <b id="t-el" class="num">0:00</b></span><span>Falta <b id="t-left" class="num">0:00</b></span></div>
    <div class="controls">
      <button class="side" data-a="w-skip">Pular fase</button>
      <button class="main" data-a="w-toggle" aria-label="Pausar">${ICON.pause}</button>
      <button class="side" data-a="w-end">Encerrar</button>
    </div>`;
  // faixa da primeira pista
  const segs0 = lanes[cfg.ids[0]].segs, tot = P.totalSec(segs0);
  $('#t-strip').innerHTML = segs0.map((s, i) => `<i class="k-${s.k}" data-i="${i}" style="flex:${(s.s / tot).toFixed(4)}"></i>`).join('') + '<span class="needle" id="t-needle"></span>';

  let lastKey = '';
  const w = new Workout({
    lanes, alerts: S.alerts, saved,
    onTick: ({ t, pos, total, paused }) => {
      const ids = cfg.ids;
      const p0 = pos[ids[0]];
      timerEl.dataset.k = p0.seg.k;
      const same = ids.length === 1 || ids.every(id => pos[id].seg.k === pos[ids[0]].seg.k && Math.abs(pos[id].left - p0.left) < 1);
      const key = same ? `u${ids.map(id => pos[id].i).join('-')}` : `d${ids.map(id => pos[id].i).join('-')}`;
      const nextTxt = (id, p) => {
        const n = lanes[id].segs[p.i + 1];
        return n ? `Depois: ${kindWord(n.k).toLowerCase()} ${Math.round(n.s / 60) >= 1 ? P.fmtMinutes(n.s) : n.s + ' s'}` : 'Última fase';
      };
      if (key !== lastKey) {
        lastKey = key;
        const pc = k => `var(--${k === 'run' ? 'lamp' : k === 'walk' ? 'walk' : 'calm'})`;
        if (same) {
          $('#t-main').innerHTML = `<div class="phase" style="--pc:${pc(p0.seg.k)}">
            ${ids.length > 1 ? `<div class="names">${ids.map(id => `<span style="${cvar(id)}">${esc(pname(id))}</span>`).join('')}</div>` : ''}
            <div class="word">${kindWord(p0.seg.k)}</div><div class="count" id="c-${ids[0]}">0:00</div><div class="next">${nextTxt(ids[0], p0)}</div></div>`;
        } else {
          $('#t-main').innerHTML = `<div class="duo">${ids.map(id => `<div class="lane-t" style="${cvar(id)};--pc:${pc(pos[id].seg.k)}">
            <div class="nm">${esc(pname(id))}</div><div class="row"><span class="word">${kindWord(pos[id].seg.k)}</span><span class="count" id="c-${id}">0:00</span></div>
            <div class="next">${nextTxt(id, pos[id])}</div></div>`).join('')}</div>`;
        }
        timerEl.querySelectorAll('#t-strip i').forEach((el, i) => { el.className = `k-${segs0[i].k}${i < p0.i ? ' past' : i === p0.i ? ' now' : ''}`; });
        const runs = segs0.filter(s => s.k === 'run').length;
        const ri = segs0.slice(0, p0.i + 1).filter(s => s.k === 'run').length;
        $('#t-rep').textContent = runs > 1 && p0.seg.k !== 'warm' && p0.seg.k !== 'cool' ? `Corrida ${Math.max(1, ri)} de ${runs}` : '';
      }
      (same ? [ids[0]] : ids).forEach(id => { const el = $(`#c-${id}`); if (el) el.textContent = P.fmtClock(Math.ceil(pos[id].left)); });
      $('#t-el').textContent = P.fmtClock(t);
      $('#t-left').textContent = P.fmtClock(total - t);
      $('#t-needle').style.left = `calc(${Math.min(100, (t / tot) * 100)}% - 1px)`;
      $('#t-paused').textContent = paused ? 'Pausado' : '';
      const tg = timerEl.querySelector('[data-a="w-toggle"]');
      const want = paused ? 'play' : 'pause';
      if (tg.dataset.icon !== want) { tg.dataset.icon = want; tg.innerHTML = ICON[want]; tg.setAttribute('aria-label', paused ? 'Continuar' : 'Pausar'); }
    },
    onDone: ({ t }) => finishWorkout(t),
  });
  S.workout = { w, cfg, armEnd: false };
  w.start();
  if (!saved) w.persist();
}

function finishWorkout(t) {
  const { w, cfg } = S.workout;
  w.stop();
  S.workout = null;
  timerEl.hidden = true; timerEl.innerHTML = '';
  ls.del('lal:activePlan');
  const c = {}; cfg.ids.forEach(id => { c[id] = {}; });
  openSheet({ kind: 'checkin', ...cfg, durationSec: Math.round(t), c });
}

async function saveCheckin() {
  const sh = S.sheet;
  const results = {};
  const lines = [];
  const date = sh.manual ? (sh.date || P.ymd(today())) : sh.date;
  const durationSec = sh.manual ? Math.round((Number(String(sh.minutes || '').replace(',', '.')) || 0) * 60) || P.totalSec(P.buildSegments(sh.plans[sh.ids[0]])) : sh.durationSec;
  const checkin = {};
  for (const id of sh.ids) {
    const c = sh.c[id];
    checkin[id] = { completed: c.completed, effort: c.effort, pain: c.pain, distanceKm: c.distanceKm ? Number(String(c.distanceKm).replace(',', '.')) || null : null, note: c.note || '' };
    const r = P.applyCheckin(person(id), sh.plans[id], checkin[id]);
    results[id] = r;
  }
  const session = {
    id: uid(), date, startedAt: sh.startedAt || new Date().toISOString(), type: sh.type || sh.plans[sh.ids[0]].type,
    participants: sh.ids, plans: {}, durationSec, checkin, results,
  };
  sh.ids.forEach(id => { session.plans[id] = sh.plans[id]; });
  await S.store.saveSession(session);
  for (const id of sh.ids) await S.store.updatePerson(id, results[id].after);
  sh.ids.forEach(id => lines.push([id, results[id].msg, nextFor(id)]));
  S.forceType = null;
  openSheet({ kind: 'result', lines });
  render();
}

// ---------- ações ----------
document.addEventListener('click', async ev => {
  const el = ev.target.closest('[data-a]');
  if (!el) {
    if (ev.target === sheetEl && S.sheet && !['checkin'].includes(S.sheet.kind)) closeSheet();
    return;
  }
  const a = el.dataset.a, v = el.dataset.v, id = el.dataset.id;
  switch (a) {
    case 'route': setRoute(el.dataset.r); break;
    case 'mode': S.mode = v; ls.set('lal:mode', v); render(); break;
    case 'force': S.forceType = v || null; render(); break;
    case 'planwho': S.planWho = v; render(); break;
    case 'start': startWorkout(); break;
    case 'log': {
      const plans = currentPlans();
      const ids = Object.keys(plans), c = {}; ids.forEach(i => { c[i] = {}; });
      openSheet({ kind: 'checkin', manual: true, plans, ids, type: plans[S.me].type, date: P.ymd(today()), c });
      break;
    }
    case 'ck': {
      const val = el.dataset.k === 'completed' ? v : Number(v);
      S.sheet.c[id][el.dataset.k] = val; S.sheet.armCancel = false; renderSheet(); break;
    }
    case 'ck-who': {
      const all = currentPlans();
      const ids = v === 'both' ? PEOPLE.slice() : [v];
      const plans = {}; ids.forEach(i => { plans[i] = all[i] || nextFor(i, all[S.me]?.type); });
      ids.forEach(i => { S.sheet.c[i] ||= {}; });
      S.sheet.ids = ids; S.sheet.plans = P.alignPlans(plans); renderSheet(); break;
    }
    case 'ck-save': el.disabled = true; await saveCheckin(); break;
    case 'sheet-cancel':
      if (S.sheet.manual || S.sheet.armCancel) closeSheet();
      else { S.sheet.armCancel = true; renderSheet(); }
      break;
    case 'sheet-close': closeSheet(); break;

    case 'w-toggle': { const w = S.workout?.w; if (!w) break; w.pausedAt ? w.resume() : w.pause(); break; }
    case 'w-skip': S.workout?.w.skip(); break;
    case 'w-end': {
      if (!S.workout) break;
      if (!S.workout.armEnd) { S.workout.armEnd = true; el.textContent = 'Confirmar'; el.classList.add('arm'); setTimeout(() => { if (S.workout) { S.workout.armEnd = false; el.textContent = 'Encerrar'; el.classList.remove('arm'); } }, 3000); break; }
      finishWorkout(S.workout.w.elapsed()); break;
    }

    case 'event-new': {
      openSheet({ kind: 'event', isNew: true, e: { id: uid(), name: '', date: '', time: '', distanceKm: 5, goal: 'runwalk', location: '', url: '', notes: '', results: {} } });
      break;
    }
    case 'event-edit': { const e = D().events[id]; if (e) openSheet({ kind: 'event', e: JSON.parse(JSON.stringify(e)) }); break; }
    case 'result': { const e = D().events[id]; if (e) openSheet({ kind: 'raceResult', e: JSON.parse(JSON.stringify({ results: {}, ...e })) }); break; }
    case 'ev-open-edit': S.sheet.kind = 'event'; renderSheet(); break;
    case 'ev-km': S.sheet.e.distanceKm = Number(v); renderSheet(); break;
    case 'ev-goal': S.sheet.e.goal = v; renderSheet(); break;
    case 'ev-save': {
      const e = S.sheet.e;
      e.distanceKm = Number(String(e.distanceKm).replace(',', '.')) || 5;
      if (!e.name.trim() || !e.date) { toast('Preencha nome e data.'); break; }
      if (!e.startLevels) e.startLevels = Object.fromEntries(PEOPLE.map(p => [p, person(p).level]));
      await S.store.saveEvent(e); closeSheet(); toast('Prova salva.'); render(); break;
    }
    case 'ev-del':
      if (!S.sheet.armDel) { S.sheet.armDel = true; renderSheet(); break; }
      await S.store.deleteEvent(S.sheet.e.id); closeSheet(); toast('Prova excluída.'); render(); break;

    case 'session': openSheet({ kind: 'session', id }); break;
    case 'session-del': {
      if (!S.sheet.armDel) { S.sheet.armDel = true; renderSheet(); break; }
      const s = D().sessions[S.sheet.id];
      if (s) {
        for (const pid of PEOPLE) {
          const list = sessionsOf(pid);
          const r = s.results?.[pid];
          if (r && list[list.length - 1]?.id === s.id && person(pid).level === r.after.level) await S.store.updatePerson(pid, r.before);
        }
        await S.store.deleteSession(s.id);
      }
      closeSheet(); toast('Treino excluído.'); render(); break;
    }

    case 'me': S.me = v; ls.set('lal:me', v); S.planWho = null; render(); break;
    case 'weekly': await S.store.updateSettings({ weeklyTarget: Number(v) }); render(); break;
    case 'lvl': {
      const p = person(id); const n = Math.max(1, Math.min(P.MAX_LEVEL, p.level + Number(v)));
      await S.store.updatePerson(id, { level: n, streak: 0 }); render(); break;
    }
    case 'color': await S.store.updatePerson(id, { color: v }); render(); break;
    case 'test-alerts': unlockAudio(); beep({ freq: 1046, times: 2, volume: S.alerts.volume }); setTimeout(() => say('Corre. 4 minutos', S.alerts), 500); break;
    case 'invite': {
      const url = `${location.origin}${location.pathname}?c=${S.code}`;
      try { if (navigator.share) await navigator.share({ title: 'Nightrun', text: 'Bora treinar no Nightrun? Abra o link, copie o código e instale na tela de início.', url }); else { await navigator.clipboard.writeText(url); toast('Link copiado.'); } }
      catch { try { await navigator.clipboard.writeText(url); toast('Link copiado.'); } catch {} }
      break;
    }
    case 'connect': openSheet({ kind: 'connect', code: '' }); break;
    case 'code-create': await connectCode(newCoupleCode(), true); break;
    case 'code-join': await connectCode((S.sheet.code || '').trim(), false); break;
    case 'leave': ls.del('lal:code'); ls.del('lal:me'); location.href = location.pathname; break;
    case 'export': {
      const blob = new Blob([JSON.stringify(D(), null, 2)], { type: 'application/json' });
      const a2 = document.createElement('a'); a2.href = URL.createObjectURL(blob); a2.download = `nightrun-${P.ymd(today())}.json`; a2.click();
      break;
    }
    case 'ob-go': S.onboarding = { step: v, names: ['', ''], levels: [5, 5], code: S.onboarding?.code || '', browser: S.onboarding?.browser }; renderOnboarding(); break;
    case 'ob-browser': S.onboarding = { step: 'start', browser: true }; renderOnboarding(); break;
    case 'copy-code': {
      const c = S.onboarding.code;
      try { await navigator.clipboard.writeText(c); S.onboarding.copied = true; renderOnboarding(); }
      catch { toast('Não deu para copiar. Toque e segure o código para copiar.'); }
      break;
    }
    case 'paste-code': {
      try {
        const t = (await navigator.clipboard.readText() || '').trim();
        const m = t.match(/[a-z2-9]{20}/);
        if (!m) { toast('A área de transferência não tem um código.'); break; }
        S.onboarding.code = m[0]; S.onboarding.err = ''; renderOnboarding();
      } catch { toast('Toque e segure o campo e escolha Colar.'); }
      break;
    }
    case 'ob-create': await obCreate(); break;
    case 'ob-join': await obJoin(); break;
    case 'ob-pick': S.me = v; ls.set('lal:me', v); S.onboarding = null; history.replaceState(null, '', location.pathname); render(); break;
    case 'retry': boot(); break;
  }
});

document.addEventListener('input', ev => {
  const el = ev.target;
  if (el.dataset.bind) {
    if (S.sheet) setPath(S.sheet, el.dataset.bind, el.value);
    else if (S.onboarding) setPath(S.onboarding, el.dataset.bind, el.value);
    if (el.dataset.bind === 'date' || el.dataset.bind === 'e.distanceKm') { /* sem re-render: mantém o foco */ }
    return;
  }
  if (el.dataset.a === 'alert-range') { S.alerts[el.dataset.k] = Number(el.value); saveAlerts(S.alerts); }
});
document.addEventListener('change', async ev => {
  const el = ev.target;
  if (el.dataset.a === 'alert') { S.alerts[el.dataset.k] = el.checked; saveAlerts(S.alerts); }
  if (el.dataset.a === 'pname') {
    const n = el.value.trim();
    if (n) { await S.store.updatePerson(el.dataset.id, { name: n }); toast('Nome salvo.'); }
    else { toast('O nome não pode ficar vazio.'); render(); }
  }
  if (el.dataset.a === 'pace') {
    const n = Number(String(el.value).replace(',', '.'));
    if (n > 3 && n < 20) await S.store.updatePerson(el.dataset.id, { [el.dataset.k]: n });
    else { toast('Use minutos por km, ex.: 7,5'); render(); }
  }
  if (el.dataset.a === 'import' && el.files?.[0]) {
    try {
      const d = JSON.parse(await el.files[0].text());
      if (!d.people || !d.sessions) throw new Error();
      await S.store.replaceAll(d); toast('Backup importado.'); render();
    } catch { toast('Arquivo inválido. Use um backup exportado pelo app.'); }
  }
});

// ---------- conexão ----------
const friendly = e => /^(Código|Não deu)/.test(e?.message || '') ? e.message : 'Não deu para conectar ao servidor. Confira a internet e tente de novo.';
async function connectCode(code, create) {
  if (code.length < 20) { S.sheet.err = 'O código tem 20 caracteres. Confira se copiou inteiro.'; renderSheet(); return; }
  const local = S.store?.mode === 'local' ? JSON.parse(JSON.stringify(D())) : null;
  try {
    const st = await openStore(code, { create, names: PEOPLE.map(pname) });
    if (create && local && (Object.keys(local.sessions).length || Object.keys(local.events).length)) await st.replaceAll(local);
    S.code = code; ls.set('lal:code', code);
    attach(st); closeSheet(); toast(create ? 'Código criado. Mande o convite.' : 'Conectado.');
  } catch (e) { S.sheet.err = friendly(e); renderSheet(); }
}
async function obCreate() {
  const ob = S.onboarding;
  const names = ob.names.map(n => (n || '').trim());
  if (!names[0] || !names[1]) { ob.err = 'Preencha os dois nomes.'; renderOnboarding(); return; }
  ob.busy = true; ob.err = ''; renderOnboarding();
  try {
    let st;
    if (cloudEnabled) {
      const code = newCoupleCode();
      st = await openStore(code, { create: true, names });
      S.code = code; ls.set('lal:code', code);
    } else {
      st = await openStore(null, { names });
    }
    const lv = (ob.levels || [5, 5]).map(v => Number(v) || 5);
    await st.updatePerson('p1', { level: lv[0] }); await st.updatePerson('p2', { level: lv[1] });
    S.me = 'p1'; ls.set('lal:me', 'p1'); S.onboarding = null;
    attach(st);
    if (cloudEnabled) toast(`Pronto. Em Ajustes, mande o convite para ${names[1]}.`);
  } catch (e) { ob.busy = false; ob.err = friendly(e); renderOnboarding(); }
}
async function obJoin() {
  const ob = S.onboarding;
  const code = (ob.code || '').trim();
  if (code.length < 20) { ob.err = 'O código tem 20 caracteres. Confira se copiou inteiro.'; renderOnboarding(); return; }
  ob.busy = true; ob.err = ''; renderOnboarding();
  try {
    const st = await openStore(code, { create: false });
    S.code = code; ls.set('lal:code', code);
    S.me = null; ls.del('lal:me');
    S.onboarding = { step: 'pick' };
    attach(st);
  } catch (e) { ob.busy = false; ob.err = friendly(e); renderOnboarding(); }
}

function attach(st) {
  S.store = st;
  st.subscribe(() => { if (S.onboarding) { if (S.onboarding.step === 'pick') renderOnboarding(); return; } render(); if (S.sheet && ['session'].includes(S.sheet.kind)) renderSheet(); });
  render();
  // treino em andamento?
  const ap = ls.get('lal:activePlan');
  if (ap && !S.workout && !S.onboarding) { try { startWorkout(JSON.parse(ap)); } catch { ls.del('lal:activePlan'); } }
}

// ---------- entrada ----------
const installSteps = (extra = '') => `<ol class="steps">
  <li><span class="n">1</span><div>No Safari, toque em <b>Compartilhar</b> ${SHARE_ICON}. Nas versões mais novas do iOS, ele fica dentro do menu <b>•••</b>.</div></li>
  <li><span class="n">2</span><div>Escolha <b>Adicionar à Tela de Início</b>.</div></li>
  <li><span class="n">3</span><div>Abra o Nightrun pelo ícone novo${extra}.</div></li>
</ol>`;
function renderOnboarding() {
  tabsEl.hidden = true;
  app.className = 'app bare';
  const ob = S.onboarding || { step: 'start' };
  const err = ob.err ? `<p class="small" style="color:var(--danger);margin-top:12px">${esc(ob.err)}</p>` : '';
  const busy = ob.busy ? 'disabled' : '';
  const art = `<img class="brand-icon" src="icons/icon-192.png" alt="" width="72" height="72">`;
  if (ob.step === 'invite') {
    app.innerHTML = `<section class="welcome">${art}
      <h1 class="wordmark" style="font-size:48px">Você foi<span class="l2">convidado</span></h1>
      <p class="lead">O Nightrun funciona instalado na tela de início. Copie o código antes, para colar no app.</p>
      <div class="code-box"><div class="code">${esc(ob.code)}</div><button class="btn" data-a="copy-code">${ob.copied ? 'Código copiado' : 'Copiar código'}</button></div>
      ${installSteps(', toque em <b>Já tenho um código</b> e depois em <b>Colar</b>')}
      <button class="btn ghost" data-a="ob-go" data-v="join" style="margin-top:8px">Usar aqui no navegador</button>
    </section>`;
    return;
  }
  if (ob.step === 'start' && !STANDALONE && !ob.browser) {
    app.innerHTML = `<section class="welcome">${art}
      <h1 class="wordmark">Night<span class="l2">run</span></h1>
      <p class="lead">Treino de corrida para duas pessoas. Antes de começar, instale na tela de início: os dados do app instalado ficam separados dos do Safari.</p>
      ${installSteps()}
      <button class="btn ghost" data-a="ob-browser" style="margin-top:8px">Continuar no navegador</button>
    </section>`;
    return;
  }
  if (ob.step === 'start') {
    app.innerHTML = `<section class="welcome">${art}
      <h1 class="wordmark">Night<span class="l2">run</span></h1>
      <p class="lead">Treino de corrida para duas pessoas, ajustado a cada treino e mirando a próxima prova.</p>
      <button class="btn" data-a="ob-go" data-v="create">Começar</button>
      ${cloudEnabled ? `<button class="btn ghost" data-a="ob-go" data-v="join" style="margin-top:8px">Já tenho um código</button>` : ''}
    </section>`;
    return;
  }
  if (ob.step === 'create') {
    app.innerHTML = `<section class="welcome">
      <h1 class="wordmark" style="font-size:48px">Quem vai<span class="l2">treinar?</span></h1>
      <p class="lead">${cloudEnabled ? 'Depois você manda um convite para a outra pessoa entrar pelo celular dela.' : 'Os dados ficam só neste aparelho.'}</p>
      <label class="f" style="margin-top:0"><span>Seu nome</span><input class="input" data-bind="names.0" value="${esc(ob.names[0])}" maxlength="24" autocomplete="given-name"></label>
      <label class="f"><span>Quem treina com você</span><input class="input" data-bind="names.1" value="${esc(ob.names[1])}" maxlength="24" autocomplete="off"></label>
      <div>${[0, 1].map(i => `<label class="f"><span>${i ? 'Quanto a outra pessoa corre sem parar hoje' : 'Quanto você corre sem parar hoje'}</span>
        <select class="input" data-bind="levels.${i}">${P.START_OPTIONS.map(o => `<option value="${o.level}" ${Number(ob.levels?.[i] ?? 5) === o.level ? 'selected' : ''}>${o.label}</option>`).join('')}</select></label>`).join('')}</div>
      <p class="small" style="margin-top:8px">Define o ponto de partida do plano. Dá para ajustar depois em Ajustes.</p>
      <div class="actions"><button class="btn" data-a="ob-create" ${busy}>${ob.busy ? 'Criando…' : 'Criar'}</button>
      <button class="btn ghost" data-a="ob-go" data-v="start" style="margin-top:4px">Voltar</button></div>
      ${err}
    </section>`;
    return;
  }
  if (ob.step === 'join') {
    app.innerHTML = `<section class="welcome">
      <h1 class="wordmark" style="font-size:48px">Entrar com<span class="l2">um código</span></h1>
      <p class="lead">Cole o código que a outra pessoa te mandou. Ele aparece em Ajustes no celular dela.</p>
      <label class="f" style="margin-top:0"><span>Código</span>
        <div class="paste-row"><input class="input" data-bind="code" value="${esc(ob.code || '')}" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="20 letras e números">
        ${navigator.clipboard?.readText ? '<button class="btn quiet" data-a="paste-code">Colar</button>' : ''}</div></label>
      <div class="actions"><button class="btn" data-a="ob-join" ${busy}>${ob.busy ? 'Entrando…' : 'Entrar'}</button>
      <button class="btn ghost" data-a="ob-go" data-v="start" style="margin-top:4px">Voltar</button></div>
      ${err}
    </section>`;
    return;
  }
  if (ob.step === 'pick') {
    syncPeople();
    app.innerHTML = `<section class="welcome">${art}
      <h1 class="wordmark" style="font-size:48px">Quem é<span class="l2">você?</span></h1>
      <p class="lead">Escolha uma vez. Fica salvo neste aparelho.</p>
      <div class="pick">${PEOPLE.map(id => `<button data-a="ob-pick" data-v="${id}" style="--c:${pcolor(id)}">${esc(pname(id))}</button>`).join('')}</div>
    </section>`;
    return;
  }
  if (ob.step === 'error') {
    app.innerHTML = `<section class="welcome">
      <h1 class="wordmark" style="font-size:48px">Sem<span class="l2">conexão</span></h1>
      <p class="lead">${esc(ob.err || 'Não deu para carregar os dados.')}</p>
      <button class="btn" data-a="retry">Tentar de novo</button>
    </section>`;
  }
}

async function boot() {
  tabsEl.hidden = true;
  app.className = 'app bare';
  app.innerHTML = '<p class="sub" style="padding-top:40px">Carregando…</p>';
  try {
    const st = await openStore(cloudEnabled ? S.code : null);
    S.onboarding = null;
    attach(st);
  } catch (e) {
    S.onboarding = { step: 'error', err: friendly(e) }; renderOnboarding();
  }
}

// Trava a área segura de baixo no maior valor visto, para a barra de abas não mudar de altura.
function lockSafeArea() {
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;bottom:0;height:0;padding-bottom:env(safe-area-inset-bottom);visibility:hidden';
  document.body.appendChild(probe);
  let max = -1;
  const read = () => {
    const v = parseFloat(getComputedStyle(probe).paddingBottom) || 0;
    if (v > max) { max = v; document.documentElement.style.setProperty('--sab-lock', `${v}px`); }
  };
  read(); window.addEventListener('resize', read); window.visualViewport?.addEventListener('resize', read);
}

function init() {
  lockSafeArea();
  // Sem zoom: o iOS ignora user-scalable=no para pinça, então bloqueia o gesto aqui.
  document.addEventListener('gesturestart', e => e.preventDefault());
  document.addEventListener('touchmove', e => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
  const urlCode = new URLSearchParams(location.search).get('c');
  if (cloudEnabled && urlCode && urlCode !== S.code) {
    S.onboarding = { step: STANDALONE ? 'join' : 'invite', code: urlCode, names: ['', ''] };
    renderOnboarding(); return;
  }
  const ready = cloudEnabled ? !!S.code : hasLocalData();
  if (!ready) { S.onboarding = { step: 'start' }; renderOnboarding(); return; }
  boot();
}
init();
/* Barra de abas flutuante, como no iOS 26: encolhe para uma bolinha com a aba atual ao rolar para baixo e volta
   inteira ao rolar para cima, ao chegar no topo, ao trocar de aba ou ao tocar nela. */
(function () {
  var bar = document.querySelector('#tabs');
  if (!bar) return;
  var last = 0, min = false, trava = 0;
  function poe(v) { if (v === min) return; min = v; bar.classList.toggle('min', v); }
  function topo(e) {
    var t = e && e.target;
    if (t && t.nodeType === 1 && t !== document.documentElement && t !== document.body) return t.scrollTop;
    return window.scrollY || document.documentElement.scrollTop || 0;
  }
  document.addEventListener('scroll', function (e) {
    var t = e && e.target;
    if (t && t.nodeType === 1 && t.closest && t.closest('[role="dialog"], .sheet, .sheet-bg, .cook, .modal')) return;   // folhas por cima não mexem na barra
    var y = topo(e);
    if (Date.now() < trava || bar.hidden) { last = y; return; }
    if (y < 30) poe(false);
    else if (y - last > 6) poe(true);
    else if (last - y > 6) poe(false);
    last = y;
  }, { capture: true, passive: true });
  // tocar na bolinha só abre a barra (não troca de aba)
  bar.addEventListener('click', function (e) {
    if (!min) return;
    e.preventDefault(); e.stopPropagation(); poe(false); trava = Date.now() + 450;
  }, true);
  window.addEventListener('hashchange', function () { poe(false); last = 0; trava = Date.now() + 450; });
})();
/* Vidro da barra de abas (opção "B", 09/11/2026): a aba escolhida só muda para a cor do app; enquanto o dedo está na
   barra aparece uma gota de vidro que cresce, segue o dedo e acende a aba de baixo; ao soltar, encaixa nela e some.
   Arrastar até outra aba e soltar troca de aba, como no iOS 26. */
(function () {
  var bar = document.querySelector('#tabs'), SEL = '.tab';
  if (!bar) return;
  var gota = null, toque = null, ignoraAte = 0;
  var reduz = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function abas() { return [].filter.call(bar.querySelectorAll(SEL), function (a) { return a.offsetWidth > 0; }); }
  function sob(x) {
    var l = abas(), m = null, d = 1e9;
    l.forEach(function (a) { var r = a.getBoundingClientRect(), c = Math.abs(x - (r.left + r.width / 2)); if (c < d) { d = c; m = a; } });
    return m;
  }
  function poe(x, lente) {
    var a = sob(x); if (!a) return null;
    var rb = bar.getBoundingClientRect(), ra = a.getBoundingClientRect(), w = ra.width;
    var cx = lente ? Math.max(rb.left + 4 + w / 2, Math.min(rb.right - 4 - w / 2, x)) : ra.left + w / 2;
    gota.style.width = w + 'px'; gota.style.height = ra.height + 'px'; gota.style.top = (ra.top - rb.top) + 'px';
    gota.style.transform = 'translateX(' + (cx - rb.left - w / 2) + 'px)' + (lente ? ' scale(1.16, 1.1)' : '');
    abas().forEach(function (b) { b.classList.toggle('tb-sob', b === a); });
    return a;
  }
  bar.addEventListener('pointerdown', function (e) {
    if (bar.classList.contains('min') || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if (!gota || gota.parentNode !== bar) { gota = document.createElement('i'); gota.className = 'tb-gota'; gota.setAttribute('aria-hidden', 'true'); bar.appendChild(gota); }
    toque = { x0: e.clientX, mexeu: false, a0: sob(e.clientX) };
    gota.style.transition = 'none'; poe(e.clientX, true);
    void gota.offsetWidth; gota.style.transition = ''; gota.classList.add('on');
  });
  bar.addEventListener('pointermove', function (e) {
    if (!toque) return;
    if (Math.abs(e.clientX - toque.x0) > 8) toque.mexeu = true;
    gota.style.transition = 'opacity .22s'; poe(e.clientX, true);
  });
  function fim(e, cancela) {
    if (!toque) return;
    var t = toque; toque = null;
    gota.style.transition = reduz ? 'opacity .15s' : '';
    var a = poe(cancela ? t.x0 : e.clientX, false);
    gota.classList.remove('on');
    abas().forEach(function (b) { b.classList.remove('tb-sob'); });
    if (!cancela && t.mexeu && a) {               // arrastou até outra aba: troca para ela
      ignoraAte = Date.now() + 600;
      if (!a.matches('[aria-current="page"]')) a.click();
    }
  }
  bar.addEventListener('dragstart', function (e) { e.preventDefault(); });   // links não viram arrasto do navegador
  bar.addEventListener('pointerup', function (e) { fim(e, false); });
  bar.addEventListener('pointercancel', function (e) { fim(e, true); });
  // depois de arrastar, o toque de verdade (no ponto onde começou) não conta
  bar.addEventListener('click', function (e) { if (e.isTrusted && Date.now() < ignoraAte) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
})();
