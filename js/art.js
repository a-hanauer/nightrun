// Ilustrações do Nightrun: rua à noite, luz âmbar de poste e os dois corredores em pictograma.
// Tudo em SVG. As peças repetidas (corredor, poste, lua, tênis) ficam em DEFS, injetadas uma vez na página.

const A = 'var(--p0)', B = 'var(--p1)';

export const DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>
<g id="run-a" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round" stroke-linejoin="round">
  <path d="M46 53 L35 68 L19 73" opacity=".72"/><path d="M57 31 L45 39 L37 51" opacity=".72"/>
  <path d="M58 29 L46 53"/><path d="M46 53 L63 60 L57 79 L66 81"/><path d="M57 31 L68 42 L79 35"/>
  <circle cx="64" cy="16" r="8" fill="currentColor" stroke="none"/>
</g>
<g id="run-b" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round" stroke-linejoin="round">
  <path d="M46 53 L37 67 L22 61" opacity=".72"/><path d="M57 31 L46 40 L38 50" opacity=".72"/>
  <path d="M58 29 L46 53"/><path d="M46 53 L59 64 L68 80 L77 79"/><path d="M57 31 L68 41 L77 31"/>
  <circle cx="64" cy="16" r="8" fill="currentColor" stroke="none"/>
</g>
<linearGradient id="nr-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#090E19"/><stop offset="1" stop-color="#162036"/></linearGradient>
<linearGradient id="nr-cone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFB31A" stop-opacity=".42"/><stop offset="1" stop-color="#FFB31A" stop-opacity="0"/></linearGradient>
<radialGradient id="nr-pool"><stop offset="0" stop-color="#FFB31A" stop-opacity=".34"/><stop offset="1" stop-color="#FFB31A" stop-opacity="0"/></radialGradient>
<radialGradient id="nr-halo"><stop offset="0" stop-color="#FFB31A" stop-opacity=".55"/><stop offset="1" stop-color="#FFB31A" stop-opacity="0"/></radialGradient>
<pattern id="nr-chk" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="#EDF1F7"/><rect width="6" height="6" fill="#0F1522"/><rect x="6" y="6" width="6" height="6" fill="#0F1522"/></pattern>
<pattern id="nr-chk-s" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#EDF1F7"/><rect width="3" height="3" fill="#0F1522"/><rect x="3" y="3" width="3" height="3" fill="#0F1522"/></pattern>
<g id="nr-lamp">
  <polygon points="16,-100 -34,0 78,0 28,-100" fill="url(#nr-cone)"/>
  <ellipse cx="22" cy="0" rx="62" ry="9" fill="url(#nr-pool)"/>
  <path d="M0 0 V-96 Q0 -106 10 -106 H20" fill="none" stroke="#2F3C58" stroke-width="3.5" stroke-linecap="round"/>
  <circle cx="22" cy="-102" r="16" fill="url(#nr-halo)"/>
  <rect x="13" y="-107" width="18" height="6" rx="3" fill="#FFB31A"/>
</g>
<g id="nr-stars" fill="#EDF1F7"><circle cx="40" cy="26" r="1.2" opacity=".8"/><circle cx="96" cy="48" r="1" opacity=".5"/><circle cx="150" cy="18" r="1.3" opacity=".7"/><circle cx="212" cy="40" r="1" opacity=".5"/><circle cx="268" cy="22" r="1.2" opacity=".8"/><circle cx="330" cy="52" r="1" opacity=".5"/><circle cx="300" cy="84" r=".9" opacity=".4"/><circle cx="62" cy="80" r=".9" opacity=".4"/></g>
<mask id="nr-cres"><rect x="-30" y="-30" width="60" height="60" fill="#fff"/><circle cx="9" cy="-6" r="19" fill="#000"/></mask>
<g id="nr-moon"><circle r="20" fill="#F2E6C4" mask="url(#nr-cres)"/></g>
<g id="nr-shoe">
  <path d="M2 -6 C2 -20 8 -27 17 -27 L25 -27 C29 -20 36 -15 46 -13 C56 -11 62 -8 62 -3 L62 -2 L2 -2 Z" fill="currentColor"/>
  <path d="M27 -24 l6 5 M32 -21 l6 5 M37 -18 l6 4" stroke="#0F1522" stroke-width="2.2" stroke-linecap="round" opacity=".55"/>
  <rect x="0" y="-4" width="64" height="7" rx="3.5" fill="#EDF1F7"/>
</g>
</defs></svg>`;

const svg = (h, body, label) => `<svg class="art" viewBox="0 0 360 ${h}" role="img" aria-label="${label}" preserveAspectRatio="xMidYMid slice">${body}</svg>`;
const sky = h => `<rect width="360" height="${h}" fill="url(#nr-sky)"/><use href="#nr-stars"/>`;
const runner = (pose, x, y, s, color, extra = '') => `<g transform="translate(${x} ${y}) scale(${s})" style="color:${color}" ${extra}><use href="#run-${pose}"/></g>`;

// Dois correndo sob o poste: entrada do app.
export function largada(colors = [A, B]) {
  return svg(230, `${sky(230)}<use href="#nr-moon" x="300" y="44"/>
  <path d="M0 180 V150 h22 v-14 h18 v22 h26 v-30 h16 v30 h30 v-12 h20 v12 h44 v-24 h14 v24 h36 v-16 h24 v16 h30 v-28 h18 v28 h42 v32 Z" fill="#111A2B"/>
  <rect y="180" width="360" height="50" fill="#0B111D"/>
  <path d="M0 205 H360" stroke="#26324B" stroke-width="2" stroke-dasharray="16 14"/>
  <use href="#nr-lamp" opacity=".5" transform="translate(40 182) scale(.7)"/>
  <use href="#nr-lamp" x="150" y="186"/>
  <use href="#nr-lamp" opacity=".5" transform="translate(276 182) scale(.7)"/>
  <ellipse cx="172" cy="189" rx="20" ry="3.5" fill="#05080F" opacity=".7"/><ellipse cx="214" cy="191" rx="20" ry="3.5" fill="#05080F" opacity=".7"/>
  ${runner('a', 140, 134, .64, colors[0])}${runner('b', 180, 136, .64, colors[1])}`, 'Duas pessoas correndo à noite sob um poste');
}

// Pórtico de chegada. Com corredores: dia de prova e conquistas. Sem: lugar vazio em Provas.
export function chegada({ runners = [A, B], confetti = true, h = 230 } = {}) {
  const dy = h - 230;
  return svg(h, `${sky(h)}<g transform="translate(0 ${dy})">
  <rect y="182" width="360" height="48" fill="#0B111D"/>
  <path d="M0 208 H360" stroke="#26324B" stroke-width="2" stroke-dasharray="16 14"/>
  <circle cx="180" cy="120" r="120" fill="url(#nr-halo)" opacity=".35"/>
  <path d="M96 184 V62 M264 184 V62" stroke="#3A4868" stroke-width="7" stroke-linecap="round"/>
  <rect x="86" y="50" width="188" height="40" rx="6" fill="#FFB31A"/><rect x="96" y="58" width="168" height="24" rx="2" fill="url(#nr-chk)"/>
  ${runners.length ? `<ellipse cx="150" cy="191" rx="20" ry="3.5" fill="#05080F" opacity=".7"/>${runner('b', 118, 134, .66, runners[0])}` : ''}
  ${runners.length > 1 ? `<ellipse cx="208" cy="193" rx="20" ry="3.5" fill="#05080F" opacity=".7"/>${runner('a', 176, 136, .66, runners[1])}` : ''}
  ${confetti ? `<g fill="#FFB31A"><circle cx="60" cy="96" r="3"/><circle cx="302" cy="110" r="3"/><rect x="40" y="130" width="6" height="6" rx="1" transform="rotate(20 43 133)"/><rect x="316" y="70" width="6" height="6" rx="1" transform="rotate(-18 319 73)"/></g>
  <g fill="${A}"><circle cx="48" cy="64" r="2.5"/><rect x="298" y="140" width="5" height="5" rx="1"/></g><g fill="${B}"><circle cx="318" cy="96" r="2.5"/><rect x="66" y="150" width="5" height="5" rx="1"/></g>` : ''}
  </g>`, 'Pórtico de chegada à noite');
}

// Lua e tênis descansando sob o poste: treino feito ou dia de descanso.
export function descanso(colors = [A], h = 170) {
  const g = h - 36;
  return svg(h, `${sky(h)}<use href="#nr-moon" transform="translate(70 ${Math.round(h * .33)}) scale(1.6)"/>
  <rect y="${g}" width="360" height="36" fill="#0B111D"/><use href="#nr-lamp" transform="translate(250 ${g + 2}) scale(.86)"/>
  <ellipse cx="262" cy="${g + 5}" rx="70" ry="4" fill="#05080F" opacity=".6"/>
  <g transform="translate(${colors.length > 1 ? 172 : 200} ${g + 1})" style="color:${colors[0]}"><use href="#nr-shoe"/></g>
  ${colors.length > 1 ? `<g transform="translate(246 ${g + 1})" style="color:${colors[1]}"><use href="#nr-shoe"/></g>` : ''}`, 'Tênis descansando sob um poste, com a lua no céu');
}

// Relógio com as fases do treino.
export function pulso(h = 190) {
  return svg(h, `${sky(h)}<g transform="translate(0 ${Math.round(h / 2 - 109)})">
  <circle cx="180" cy="110" r="78" fill="url(#nr-halo)" opacity=".35"/>
  <rect x="158" y="34" width="44" height="34" rx="8" fill="#1F2A40"/><rect x="158" y="150" width="44" height="34" rx="8" fill="#1F2A40"/>
  <rect x="140" y="60" width="80" height="98" rx="24" fill="#0B111D" stroke="#3A4868" stroke-width="4"/>
  <rect x="220" y="92" width="7" height="18" rx="3.5" fill="#3A4868"/>
  <g transform="translate(150 70)">
    <rect x="6" y="10" width="48" height="7" rx="3.5" fill="#6F7C98" opacity=".6"/>
    <rect x="6" y="24" width="48" height="9" rx="4.5" fill="#FFB31A"/><rect x="6" y="38" width="22" height="9" rx="4.5" fill="#46C9B0"/>
    <rect x="6" y="52" width="48" height="9" rx="4.5" fill="#FFB31A"/><rect x="6" y="66" width="22" height="9" rx="4.5" fill="#46C9B0"/>
  </g>
  <path d="M244 84 q10 6 10 20 t-10 20 M258 74 q16 10 16 30 t-16 30" fill="none" stroke="#FFB31A" stroke-width="3" stroke-linecap="round" opacity=".7"/>
  <path d="M116 84 q-10 6 -10 20 t10 20 M102 74 q-16 10 -16 30 t16 30" fill="none" stroke="#FFB31A" stroke-width="3" stroke-linecap="round" opacity=".7"/>
  </g>`, 'Relógio vibrando com as fases do treino');
}

// Um correndo e o lugar do outro esperando: convite.
export function convite(mine = A, theirs = B, h = 200) {
  const dy = h - 230;
  return svg(h, `${sky(h)}<g transform="translate(0 ${dy})">
  <rect y="184" width="360" height="46" fill="#0B111D"/>
  <path d="M0 208 H360" stroke="#26324B" stroke-width="2" stroke-dasharray="16 14"/>
  <use href="#nr-lamp" x="96" y="186"/>
  <ellipse cx="118" cy="190" rx="20" ry="3.5" fill="#05080F" opacity=".7"/>
  ${runner('a', 86, 134, .64, mine)}
  <ellipse cx="236" cy="190" rx="26" ry="5" fill="none" stroke="${theirs}" stroke-width="2" stroke-dasharray="5 5" opacity=".8"/>
  ${runner('b', 204, 134, .64, theirs, 'opacity=".32"')}
  <circle cx="270" cy="128" r="13" fill="#FFB31A"/><path d="M270 122 v12 M264 128 h12" stroke="#241800" stroke-width="3" stroke-linecap="round"/>
  </g>`, 'Uma pessoa correndo e o lugar da outra esperando');
}

// Escada de degraus. steps: [{ label, target }], people: [{ color, step, name }] (step = índice do degrau).
export function escada(steps, people, { flag = true, focus = null } = {}) {
  const n = steps.length, W = 330, w = W / n, H = 124, base = 26, rise = n > 1 ? Math.min(18, (H - base - 44) / (n - 1)) : 0;
  const top = i => H - base - i * rise;
  const shade = i => { const t = n > 1 ? i / (n - 1) : 0; const c = (a, b) => Math.round(a + (b - a) * t); return `rgb(${c(29, 42)},${c(40, 57)},${c(64, 89)})`; };
  const blocks = steps.map((s, i) => `<rect x="${(i * w).toFixed(1)}" y="${top(i).toFixed(1)}" width="${w.toFixed(1)}" height="${(H - top(i) + 6).toFixed(1)}" rx="5" fill="${shade(i)}"/>`).join('');
  const labels = steps.map((s, i) => `<text x="${(i * w + w / 2).toFixed(1)}" y="${H - 8}" fill="${s.target ? '#FFB31A' : focus === i ? '#EDF1F7' : '#8C97AD'}">${s.label}</text>`).join('');
  const sc = Math.min(.47, (w + 14) / 100);
  const byStep = {};
  people.forEach(p => { (byStep[p.step] ||= []).push(p); });
  const runners = Object.entries(byStep).map(([i, list]) => list.map((p, k) => {
    const off = Math.min(13, w / 4);
    const cx = i * w + w / 2 + (list.length > 1 ? (k ? off : -off) : 0);
    return runner(k ? 'b' : 'a', (cx - 50 * sc).toFixed(1), (top(+i) - 82 * sc).toFixed(1), sc, p.color);
  }).join('')).join('');
  const fx = W - w / 2 + 8;
  return `<svg class="art-stairs" viewBox="0 0 ${W} ${H}" role="img" aria-label="${people.map(p => `${p.name} no degrau ${steps[p.step]?.label}`).join(', ')}">
    ${blocks}<g font-family="inherit" font-weight="700" font-size="12" text-anchor="middle">${labels}</g>
    ${flag ? `<path d="M${fx} ${top(n - 1)} V${top(n - 1) - 22}" stroke="#EDF1F7" stroke-width="2.4" stroke-linecap="round"/><rect x="${fx - 17}" y="${top(n - 1) - 22}" width="17" height="12" rx="1.5" fill="url(#nr-chk-s)"/>` : ''}
    ${runners}</svg>`;
}
