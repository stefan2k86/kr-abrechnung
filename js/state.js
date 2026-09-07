// Zentraler Zustand: Projektmodell, Mutationen, Autosave, Import-Anwendung, Datei-I/O.
import { defaultSaetze } from './rates.js';

export const SCHEMA_VERSION = 1;
const LS_KEY = 'kr-abrechnung:autosave:v1';

let project = null;
const listeners = new Set();
let dirty = false;

// ---- Modell -------------------------------------------------------------
export function leeresProjekt() {
  return {
    schemaVersion: SCHEMA_VERSION,
    erstellt: new Date().toISOString(),
    veranstaltung: {
      name: '', ausrichter: '', ort: '',
      datumVon: '', datumBis: '', schiedsrichter: '',
    },
    abschnitte: [],           // {id,nr,datum,wochentag,beginn,ende,quelle}
    saetze: defaultSaetze(),
    personen: [],             // s. addPersonFromCsv / addPersonManuell
    notizen: '',
  };
}

let idCounter = 1;
const uid = (p) => `${p}${Date.now().toString(36)}${(idCounter++).toString(36)}`;

// ---- Store ------------------------------------------------------------
export function getProject() { return project; }
export function isDirty() { return dirty; }
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

function emit(meta = {}) { for (const fn of listeners) fn(project, meta); }

// Strukturelle Änderung -> volle Neudarstellung.
export function update(mutator) {
  mutator(project);
  dirty = true;
  autosave();
  emit({ quiet: false });
}

// Reine Feldbearbeitung (Text-/Zahlen-/Zeit-Eingaben) -> KEINE Neudarstellung,
// damit der Eingabefokus erhalten bleibt.
export function patch(mutator) {
  mutator(project);
  dirty = true;
  autosave();
  emit({ quiet: true });
}

export function setProject(p, { markClean = true } = {}) {
  project = migrate(p);
  dirty = !markClean;
  autosave();
  emit();
}

export function neuesProjekt() { setProject(leeresProjekt(), { markClean: false }); }

// ---- Autosave (localStorage) ---------------------------------------
let saveTimer = null;
function autosave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(project)); } catch (_) {}
  }, 400);
}
export function ladeAutosave() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? migrate(JSON.parse(raw)) : null;
  } catch (_) { return null; }
}
export function verwerfeAutosave() { try { localStorage.removeItem(LS_KEY); } catch (_) {} }
export function markiereGespeichert() { dirty = false; emit(); }

// ---- Migration ----------------------------------------------------
function migrate(p) {
  if (!p || typeof p !== 'object') return leeresProjekt();
  p.schemaVersion = SCHEMA_VERSION;
  p.veranstaltung = { ...leeresProjekt().veranstaltung, ...(p.veranstaltung || {}) };
  p.saetze = { ...defaultSaetze(), ...(p.saetze || {}) };
  p.abschnitte = Array.isArray(p.abschnitte) ? p.abschnitte : [];
  p.personen = Array.isArray(p.personen) ? p.personen : [];
  for (const pe of p.personen) pe.einsaetze = Array.isArray(pe.einsaetze) ? pe.einsaetze : [];
  return p;
}

// ---- Datei-Export / -Import -------------------------------------
export function projektDateiname() {
  const n = (project.veranstaltung.name || 'abrechnung')
    .replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'abrechnung';
  const d = new Date().toISOString().slice(0, 10);
  return `${d}_${n}.krabr.json`;
}

export function exportProjektBlob() {
  return new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
}

export async function importProjektDatei(file) {
  const text = await file.text();
  const data = JSON.parse(text);
  if (!data || typeof data !== 'object' || !('personen' in data))
    throw new Error('Das ist keine gültige Projektdatei.');
  setProject(data, { markClean: true });
}

// ---- Abschnitte ------------------------------------------------
function ensureAbschnitt(p, nr) {
  let a = p.abschnitte.find(x => x.nr === nr);
  if (!a) {
    a = { id: uid('a'), nr, datum: '', wochentag: '', beginn: '', ende: '', quelle: 'auto' };
    p.abschnitte.push(a);
    p.abschnitte.sort((x, y) => x.nr - y.nr);
  }
  return a;
}

export function abschnittHinzufuegen() {
  update(p => {
    const nr = (p.abschnitte.reduce((m, a) => Math.max(m, a.nr), 0)) + 1;
    p.abschnitte.push({ id: uid('a'), nr, datum: '', wochentag: '', beginn: '', ende: '', quelle: 'manuell' });
  });
}

export function abschnittLoeschen(id) {
  update(p => {
    p.abschnitte = p.abschnitte.filter(a => a.id !== id);
    for (const pe of p.personen) pe.einsaetze = pe.einsaetze.filter(e => e.abschnittId !== id);
  });
}

// ---- Import: Meldeliste (CSV) --------------------------------
// parsed = { veranstaltung?, abschnitte:[{nr}], personen:[{nachname,vorname,zusatz,verein,status,abschnittNummern:[...]}] }
export function applyMeldeliste(parsed) {
  update(p => {
    if (parsed.veranstaltung) {
      for (const k of ['name', 'ort', 'datumVon', 'datumBis'])
        if (parsed.veranstaltung[k] && !p.veranstaltung[k]) p.veranstaltung[k] = parsed.veranstaltung[k];
    }
    const nummern = new Set(parsed.personen.flatMap(x => x.abschnittNummern));
    for (const nr of [...nummern].sort((a, b) => a - b)) ensureAbschnitt(p, nr);

    // vorhandene CSV-Personen entfernen, manuelle behalten
    p.personen = p.personen.filter(pe => pe.quelle !== 'csv');

    for (const src of parsed.personen) {
      const pe = {
        id: uid('p'),
        quelle: 'csv',
        nachname: src.nachname, vorname: src.vorname, zusatz: src.zusatz || '',
        verein: src.verein || '', status: src.status || '',
        keinAnspruch: false, ausgezahlt: false, unterschrift: null,
        einsaetze: [],
      };
      for (const nr of src.abschnittNummern) {
        const ab = ensureAbschnitt(p, nr);
        pe.einsaetze.push({ abschnittId: ab.id, rolleKey: null, imEinsatz: src.status === 'Bestätigt' });
      }
      p.personen.push(pe);
    }
  });
}

// ---- Import: Meldeergebnis (PDF) --------------------------
// parsed = { veranstaltung?, abschnitte:[{nr,datum,wochentag,beginn,ende}] }
export function applyMeldeergebnis(parsed) {
  update(p => {
    if (parsed.veranstaltung) {
      for (const k of ['name', 'ort', 'ausrichter', 'datumVon', 'datumBis'])
        if (parsed.veranstaltung[k] && !p.veranstaltung[k]) p.veranstaltung[k] = parsed.veranstaltung[k];
    }
    for (const src of parsed.abschnitte) {
      const a = ensureAbschnitt(p, src.nr);
      if (src.datum) a.datum = src.datum;
      if (src.wochentag) a.wochentag = src.wochentag;
      if (src.beginn) a.beginn = src.beginn;
      if (src.ende) a.ende = src.ende;
      a.quelle = 'pdf';
    }
    if (parsed.abschnitte.length) {
      const ds = parsed.abschnitte.map(a => a.datum).filter(Boolean).sort();
      if (ds.length && !p.veranstaltung.datumVon) p.veranstaltung.datumVon = ds[0];
      if (ds.length && !p.veranstaltung.datumBis) p.veranstaltung.datumBis = ds[ds.length - 1];
    }
  });
}

// ---- Personen manuell ------------------------------------
export function personManuellHinzufuegen({ nachname, vorname, zusatz, verein }) {
  update(p => {
    p.personen.push({
      id: uid('p'), quelle: 'manuell',
      nachname: nachname || '', vorname: vorname || '', zusatz: zusatz || '', verein: verein || '',
      status: '', keinAnspruch: false, ausgezahlt: false, unterschrift: null,
      einsaetze: [],
    });
  });
}

export function personLoeschen(id) {
  update(p => { p.personen = p.personen.filter(x => x.id !== id); });
}

// Einsatz einer Person in einem Abschnitt hinzufügen / entfernen
export function einsatzToggle(personId, abschnittId, an) {
  update(p => {
    const pe = p.personen.find(x => x.id === personId); if (!pe) return;
    const idx = pe.einsaetze.findIndex(e => e.abschnittId === abschnittId);
    if (an && idx < 0) pe.einsaetze.push({ abschnittId, rolleKey: null, imEinsatz: true });
    else if (!an && idx >= 0) pe.einsaetze.splice(idx, 1);
  });
}
