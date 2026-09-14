// Berechnung: Dauer, Betrag je Person, Tage, Abschnittsliste, Validierung.
import { betragJeAbschnitt, rollenLabel, kuerzelFor, istLaeuferRolle } from './rates.js';

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

// Zusatzvergütung „Sachbearbeiter Meldeverfahren": 12 € je Abschnitt des Wettkampfs,
// für genau die eine benannte Person – zusätzlich zu ihrer eigentlichen Rolle.
export function sachbearbeiterBonus(person, project) {
  if (!person || !project.sachbearbeiterPersonId) return 0;
  if (person.keinAnspruch || person.id !== project.sachbearbeiterPersonId) return 0;
  return (Number(project.saetze.sachbearbeiterProAbschnitt) || 0) * (project.abschnitte?.length || 0);
}

export function personBetrag(person, project) {
  if (person.keinAnspruch) return 0;
  let sum = 0;
  for (const { e, ab } of aktiveEinsaetze(person, project)) {
    if (!e.rolleKey) continue;
    const satz = project.saetze[e.rolleKey];
    if (!satz) continue;
    sum += betragJeAbschnitt(dauerMin(ab), satz, { keinDoppelsatz: istLaeuferRolle(e.rolleKey) });
  }
  sum += sachbearbeiterBonus(person, project);
  return Math.round(sum * 100) / 100;
}

// Aufschlüsselung je Abschnitt für die Prüfansicht
export function personAufstellung(person, project) {
  const zeilen = aktiveEinsaetze(person, project)
    .sort((a, b) => (a.ab.nr || 0) - (b.ab.nr || 0))
    .map(({ e, ab }) => {
      const d = dauerMin(ab);
      const satz = e.rolleKey ? project.saetze[e.rolleKey] : null;
      const betrag = satz ? betragJeAbschnitt(d, satz, { keinDoppelsatz: istLaeuferRolle(e.rolleKey) }) : 0;
      return {
        abschnittNr: ab.nr, dauerMin: d, rolleKey: e.rolleKey,
        rolleLabel: rollenLabel(e.rolleKey), kuerzel: kuerzelFor(e.rolleKey), betrag,
      };
    });
  const bonus = sachbearbeiterBonus(person, project);
  if (bonus) zeilen.push({
    abschnittNr: null, dauerMin: 0, rolleKey: 'sachbearbeiter',
    rolleLabel: 'Sachbearbeiter Meldeverfahren', kuerzel: kuerzelFor('sachbearbeiter'),
    text: `Sachbearbeiter Meldeverfahren: ${project.abschnitte.length} Abschnitte × ${fmtEuro(project.saetze.sachbearbeiterProAbschnitt)} → ${fmtEuro(bonus)}`,
    betrag: bonus,
  });
  return zeilen;
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

// Kommt die Person auf die Auszahlungsliste? (Anspruch + aktiver Einsatz ODER Sachbearbeiter)
export function istAbzurechnen(person, project) {
  if (person.keinAnspruch) return false;
  if (person.id === project.sachbearbeiterPersonId) return true;
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
  // Eingeteilte Rollen ohne vollständigen Satz -> Beträge werden 0
  const genutzteRollen = new Set();
  for (const p of project.personen) {
    if (p.keinAnspruch) continue;
    for (const e of (p.einsaetze || [])) if (e.imEinsatz && e.rolleKey) genutzteRollen.add(e.rolleKey);
  }
  for (const rk of genutzteRollen) {
    const s = project.saetze[rk] || {};
    const hasValidGrundMax = Number(s.grund) > 0 && Number(s.max) > 0;
    const hasPauschale = Number(s.pauschale) > 0;
    if (!hasValidGrundMax && !hasPauschale) {
      out.push({ level: 'warn', text: `${rollenLabel(rk)} ist eingeteilt, aber der Satz ist unvollständig (Grund-/Max-Satz oder Pauschale 0 €).` });
    }
  }
  if (project.sachbearbeiterPersonId) {
    const sb = project.personen.find(p => p.id === project.sachbearbeiterPersonId);
    if (!sb) out.push({ level: 'warn', text: 'Sachbearbeiter Meldeverfahren: die gewählte Person ist nicht mehr in der Liste.' });
    else if (sb.keinAnspruch) out.push({ level: 'warn', text: `Sachbearbeiter Meldeverfahren: ${personName(sb)} ist auf „kein Anspruch" gesetzt – die 12 €/Abschnitt fallen weg.` });
    if (!(Number(project.saetze.sachbearbeiterProAbschnitt) > 0))
      out.push({ level: 'warn', text: 'Sachbearbeiter Meldeverfahren ist gesetzt, aber der Satz ist 0 €.' });
  }
  for (const p of project.personen) {
    if (p.keinAnspruch) continue;
    const aktiv = (p.einsaetze || []).filter(e => e.imEinsatz);
    if (aktiv.length === 0) continue;
    if (aktiv.some(e => !e.rolleKey)) out.push({ level: 'warn', text: `${personName(p)}: Rolle in mindestens einem Abschnitt fehlt.` });
    if (p.quelle === 'csv' && p.status === 'Abgemeldet' && aktiv.length)
      out.push({ level: 'warn', text: `${personName(p)}: in der Meldeliste abgemeldet, hier aber als "im Einsatz" markiert.` });
  }
  // Leere Werte, die erst im PDF auffallen würden
  for (const p of abzurechnendePersonen(project)) {
    if (personBetrag(p, project) > 0) continue;
    out.push({ level: 'err', text: `${personName(p)}: Betrag 0,00 € – Rolle oder Abschnittszeiten fehlen.` });
  }
  const v = project.veranstaltung || {};
  const fehlendeKopfdaten = [
    ['name', 'Name der Veranstaltung'],
    ['ausrichter', 'Ausrichtender Verein'],
    ['datumVon', 'Einsatz von'],
    ['datumBis', 'Einsatz bis'],
  ].filter(([k]) => !String(v[k] || '').trim()).map(([, label]) => label);
  if (fehlendeKopfdaten.length)
    out.push({ level: 'warn', text: `Veranstaltungsdaten fehlen: ${fehlendeKopfdaten.join(', ')} – bleibt im PDF-Kopf leer.` });
  if (!String(project.pruefer?.name || '').trim())
    out.push({ level: 'warn', text: 'Verantwortliche Person („Geprüft durch") ist nicht eingetragen.' });
  return out;
}

export function hatFehler(warns) {
  return (warns || []).some(w => w.level === 'err');
}
