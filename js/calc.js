// Berechnung: Dauer, Betrag je Person, Tage, Abschnittsliste, Validierung.
import { betragJeAbschnitt, rollenLabel } from './rates.js';

export function parseHM(hm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec((hm || '').trim());
  if (!m) return null;
  const h = +m[1], min = +m[2];
  if (h > 47 || min > 59) return null;
  return h * 60 + min;
}

// Dauer eines Abschnitts in Minuten (brutto, Beginn -> Abschnittsende). Pausen bleiben drin.
export function dauerMin(abschnitt) {
  const a = parseHM(abschnitt?.beginn);
  const b = parseHM(abschnitt?.ende);
  if (a == null || b == null) return 0;
  return Math.max(0, b - a);
}

export function abschnittById(project, id) {
  return project.abschnitte.find(a => a.id === id) || null;
}

// Alle aktiven Einsätze einer Person (im Einsatz + gültiger Abschnitt)
function aktiveEinsaetze(person, project) {
  return (person.einsaetze || [])
    .filter(e => e.imEinsatz)
    .map(e => ({ e, ab: abschnittById(project, e.abschnittId) }))
    .filter(x => x.ab);
}

export function personBetrag(person, project) {
  if (person.keinAnspruch) return 0;
  let sum = 0;
  for (const { e, ab } of aktiveEinsaetze(person, project)) {
    if (!e.rolleKey) continue;
    if (e.rolleKey === 'laeufer') {
      sum += Number(project.saetze.laeuferProAbschnitt) || 0;
      continue;
    }
    const satz = project.saetze[e.rolleKey];
    if (!satz) continue;
    sum += betragJeAbschnitt(dauerMin(ab), satz);
  }
  return Math.round(sum * 100) / 100;
}

// Aufschlüsselung je Abschnitt für die Prüfansicht
export function personAufstellung(person, project) {
  return aktiveEinsaetze(person, project)
    .sort((a, b) => (a.ab.nr || 0) - (b.ab.nr || 0))
    .map(({ e, ab }) => {
      const d = dauerMin(ab);
      let betrag = 0;
      if (e.rolleKey === 'laeufer') betrag = Number(project.saetze.laeuferProAbschnitt) || 0;
      else if (e.rolleKey && project.saetze[e.rolleKey]) betrag = betragJeAbschnitt(d, project.saetze[e.rolleKey]);
      return { abschnittNr: ab.nr, dauerMin: d, rolleKey: e.rolleKey, rolleLabel: rollenLabel(e.rolleKey), betrag };
    });
}

export function personTage(person, project) {
  const tage = new Set();
  for (const { ab } of aktiveEinsaetze(person, project)) {
    if (ab.datum) tage.add(ab.datum);
  }
  return tage.size;
}

export function personAbschnittsNummern(person, project) {
  return aktiveEinsaetze(person, project)
    .map(x => x.ab.nr)
    .filter(n => n != null)
    .sort((a, b) => a - b);
}

export function personName(p) {
  const zusatz = p.zusatz ? ` (${p.zusatz})` : '';
  return `${p.nachname}, ${p.vorname}${zusatz}`.replace(/,\s*$/, '').trim();
}

export function sortPersonen(personen) {
  return [...personen].sort((a, b) =>
    personName(a).localeCompare(personName(b), 'de', { sensitivity: 'base' }));
}

// Kommt die Person auf die Auszahlungsliste? (Anspruch + mind. ein aktiver Einsatz)
export function istAbzurechnen(person, project) {
  if (person.keinAnspruch) return false;
  return (person.einsaetze || []).some(e =>
    e.imEinsatz && abschnittById(project, e.abschnittId));
}

export function abzurechnendePersonen(project) {
  return sortPersonen(project.personen.filter(p => istAbzurechnen(p, project)));
}

export function gesamtSumme(project) {
  return project.personen.reduce((s, p) => s + personBetrag(p, project), 0);
}

export function fmtEuro(n) {
  return (Number(n) || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

// ---- Validierung ----------------------------------------------------------
export function warnungen(project) {
  const out = [];
  for (const a of project.abschnitte) {
    if (!a.beginn || !a.ende) out.push({ level: 'err', text: `Abschnitt ${a.nr}: Beginn/Ende fehlt – Beträge dieses Abschnitts sind 0.` });
    else if (dauerMin(a) <= 0) out.push({ level: 'err', text: `Abschnitt ${a.nr}: Ende liegt vor Beginn (${a.beginn}–${a.ende}).` });
    if (!a.datum) out.push({ level: 'warn', text: `Abschnitt ${a.nr}: kein Datum – zählt nicht zu den "Tagen".` });
  }
  // max 2 Abschnitte pro Tag
  const proTag = {};
  for (const a of project.abschnitte) if (a.datum) (proTag[a.datum] = proTag[a.datum] || []).push(a.nr);
  for (const [d, nrs] of Object.entries(proTag)) {
    if (nrs.length > 2) out.push({ level: 'warn', text: `${d}: ${nrs.length} Abschnitte – laut Regelwerk max. 2 pro Tag.` });
  }
  if ((Number(project.saetze.laeuferProAbschnitt) || 0) === 0 &&
      project.personen.some(p => (p.einsaetze || []).some(e => e.imEinsatz && e.rolleKey === 'laeufer'))) {
    out.push({ level: 'warn', text: 'Läufer sind eingeteilt, aber der Läufersatz ist 0 €.' });
  }
  for (const p of project.personen) {
    if (p.keinAnspruch) continue;
    const aktiv = (p.einsaetze || []).filter(e => e.imEinsatz);
    if (aktiv.length === 0) continue;
    if (aktiv.some(e => !e.rolleKey)) out.push({ level: 'warn', text: `${personName(p)}: Rolle in mindestens einem Abschnitt fehlt.` });
    if (p.quelle === 'csv' && p.status === 'Abgemeldet' && aktiv.length)
      out.push({ level: 'warn', text: `${personName(p)}: in der Meldeliste abgemeldet, hier aber als "im Einsatz" markiert.` });
  }
  return out;
}
