// Armazenamento: Firestore (sincroniza os dois iPhones) ou local (só este aparelho).
import { firebaseConfig } from './firebase-config.js';

const FB = 'https://www.gstatic.com/firebasejs/10.12.2';
const LOCAL_KEY = 'lal:data';
const NET_MSG = 'Não deu para conectar ao servidor. Confira a internet e tente de novo.';

export const PEOPLE = ['andre', 'ivie'];

export function defaultData() {
  return {
    people: {
      andre: { name: 'André', color: 'sky', level: 5, streak: 0, painFlag: false, runPace: 7.5, walkPace: 11 },
      ivie:  { name: 'Ivie',  color: 'rose', level: 5, streak: 0, painFlag: false, runPace: 7.5, walkPace: 11 },
    },
    settings: { weeklyTarget: 3 },
    events: {
      srun2026: {
        id: 'srun2026', name: 'S-Run Novo Hamburgo', date: '2026-12-13', time: '',
        distanceKm: 5, goal: 'runwalk', location: 'Novo Hamburgo', url: '',
        notes: 'Teste piloto. Horário a confirmar.', results: {},
      },
    },
    sessions: {},
  };
}

export const cloudEnabled = !!(firebaseConfig && firebaseConfig.projectId);

export function newCoupleCode() {
  const abc = 'abcdefghjkmnpqrstuvwxyz23456789';
  const r = crypto.getRandomValues(new Uint8Array(20));
  return Array.from(r, b => abc[b % abc.length]).join('');
}

// Interface comum: { mode, data, subscribe(fn), updatePerson, updateSettings, saveEvent, deleteEvent, saveSession, deleteSession, replaceAll }
export async function openStore(coupleCode, { create = false } = {}) {
  if (cloudEnabled && coupleCode) return openCloud(coupleCode, create);
  return openLocal();
}

function emitter() {
  const fns = new Set();
  return { on: f => (fns.add(f), () => fns.delete(f)), emit: d => fns.forEach(f => f(d)) };
}

// ---------- local ----------
function openLocal() {
  let data;
  try { data = JSON.parse(localStorage.getItem(LOCAL_KEY)); } catch { data = null; }
  if (!data) data = defaultData();
  const ev = emitter();
  const save = () => { try { localStorage.setItem(LOCAL_KEY, JSON.stringify(data)); } catch {} ev.emit(data); };
  return {
    mode: 'local', status: 'local',
    get data() { return data; },
    subscribe: ev.on,
    async updatePerson(id, patch) { data.people[id] = { ...data.people[id], ...patch }; save(); },
    async updateSettings(patch) { data.settings = { ...data.settings, ...patch }; save(); },
    async saveEvent(e) { data.events[e.id] = e; save(); },
    async deleteEvent(id) { delete data.events[id]; save(); },
    async saveSession(s) { data.sessions[s.id] = s; save(); },
    async deleteSession(id) { delete data.sessions[id]; save(); },
    async replaceAll(d) { data = d; save(); },
  };
}

// ---------- nuvem ----------
async function openCloud(code, create) {
  const { initializeApp } = await import(`${FB}/firebase-app.js`);
  const fs = await import(`${FB}/firebase-firestore.js`);
  const app = initializeApp(firebaseConfig);
  let db;
  try { db = fs.initializeFirestore(app, { localCache: fs.persistentLocalCache() }); }
  catch { db = fs.getFirestore(app); }

  const root = fs.doc(db, 'couples', code);
  const evCol = fs.collection(root, 'events');
  const seCol = fs.collection(root, 'sessions');

  let snap;
  try { snap = await fs.getDoc(root); }
  catch (e) { throw new Error(NET_MSG); }
  if (!snap.exists()) {
    if (!create) throw new Error('Código não encontrado. Confira com quem criou.');
    const d = defaultData();
    await fs.setDoc(root, { people: d.people, settings: d.settings, createdAt: Date.now() });
    for (const e of Object.values(d.events)) await fs.setDoc(fs.doc(evCol, e.id), e);
  }

  const data = { people: {}, settings: {}, events: {}, sessions: {} };
  const ev = emitter();
  let ready = 0;
  const api = {
    mode: 'cloud', status: 'sincronizando',
    get data() { return data; },
    subscribe: ev.on,
  };
  const tick = (meta) => {
    api.status = meta?.fromCache ? 'offline' : 'sincronizado';
    if (ready >= 3) ev.emit(data);
  };
  fs.onSnapshot(root, { includeMetadataChanges: true }, s => {
    const v = s.data() || {};
    data.people = v.people || {}; data.settings = v.settings || {};
    if (!api._r1) { api._r1 = 1; ready++; }
    tick(s.metadata);
  }, () => { api._err = 1; });
  fs.onSnapshot(evCol, { includeMetadataChanges: true }, s => {
    data.events = {}; s.forEach(d => { data.events[d.id] = d.data(); });
    if (!api._r2) { api._r2 = 1; ready++; }
    tick(s.metadata);
  }, () => { api._err = 1; });
  fs.onSnapshot(seCol, { includeMetadataChanges: true }, s => {
    data.sessions = {}; s.forEach(d => { data.sessions[d.id] = d.data(); });
    if (!api._r3) { api._r3 = 1; ready++; }
    tick(s.metadata);
  }, () => { api._err = 1; });
  await new Promise((res, rej) => {
    const t0 = Date.now();
    const t = setInterval(() => {
      if (ready >= 3) { clearInterval(t); res(); }
      else if (api._err || Date.now() - t0 > 20000) { clearInterval(t); rej(new Error(NET_MSG)); }
    }, 50);
  });

  Object.assign(api, {
    async updatePerson(id, patch) { await fs.setDoc(root, { people: { [id]: patch } }, { merge: true }); },
    async updateSettings(patch) { await fs.setDoc(root, { settings: patch }, { merge: true }); },
    async saveEvent(e) { await fs.setDoc(fs.doc(evCol, e.id), e); },
    async deleteEvent(id) { await fs.deleteDoc(fs.doc(evCol, id)); },
    async saveSession(s) { await fs.setDoc(fs.doc(seCol, s.id), s); },
    async deleteSession(id) { await fs.deleteDoc(fs.doc(seCol, id)); },
    async replaceAll(d) {
      await fs.setDoc(root, { people: d.people, settings: d.settings });
      for (const e of Object.values(d.events || {})) await fs.setDoc(fs.doc(evCol, e.id), e);
      for (const s of Object.values(d.sessions || {})) await fs.setDoc(fs.doc(seCol, s.id), s);
    },
  });
  return api;
}
