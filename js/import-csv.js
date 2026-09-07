// Parser für den DSV-Export "Gemeldete Kampfrichter" (meldungen.csv).
// Format: Semikolon-getrennt, Encoding meist Windows-1252 / ISO-8859-1.
//   Zeile 1: Titel "Gemeldete Kampfrichter der Veranstaltung <Name> am <Datum>, <Ort>, ..."
//   Zeile 2: "Nr.;Name;Verein;Status;Lizenz;"
//   danach je Abschnitt eine Zeile "Abschnitt N;" + Datenzeilen "Nr;Name;Verein;Status;Lizenz;"

export async function parseMeldelisteFile(file) {
  const buf = await file.arrayBuffer();
  let text;
  try { text = new TextDecoder('windows-1252', { fatal: false }).decode(buf); }
  catch (_) { text = new TextDecoder('iso-8859-1').decode(buf); }
  // Falls die Datei doch UTF-8 mit BOM ist:
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  return parseMeldelisteText(text);
}

export function parseMeldelisteText(text) {
  const lines = text.split(/\r\n|\r|\n/).map(l => l.replace(/;+\s*$/, '').trim());
  const result = { veranstaltung: null, abschnitte: [], personen: [] };

  let currentAbschnitt = null;
  const byKey = new Map(); // "nachname|vorname|zusatz" -> person

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    if (i === 0) { result.veranstaltung = parseTitel(line); continue; }

    const cells = line.split(';').map(c => c.trim());
    const first = cells[0];

    if (/^Nr\.?$/i.test(first) && /name/i.test(cells[1] || '')) continue; // Kopfzeile

    const mAb = /^Abschnitt\s+(\d+)/i.exec(first);
    if (mAb) {
      currentAbschnitt = parseInt(mAb[1], 10);
      if (!result.abschnitte.some(a => a.nr === currentAbschnitt)) result.abschnitte.push({ nr: currentAbschnitt });
      continue;
    }

    // Datenzeile: lfd. Nr ; Name ; Verein ; Status ; Lizenz
    if (currentAbschnitt == null) continue;
    if (!/^\d+$/.test(first)) continue;
    const nameRaw = cells[1] || '';
    if (!nameRaw) continue;

    const { nachname, vorname, zusatz } = splitName(nameRaw);
    const verein = cells[2] || '';
    const status = normStatus(cells[3] || '');
    const key = `${nachname}|${vorname}|${zusatz}`.toLowerCase();

    let pe = byKey.get(key);
    if (!pe) {
      pe = { nachname, vorname, zusatz, verein, status, abschnittNummern: [] };
      byKey.set(key, pe);
      result.personen.push(pe);
    }
    // "Abgemeldet" gewinnt für die Anzeige des Status
    if (status === 'Abgemeldet') pe.status = 'Abgemeldet';
    if (!pe.abschnittNummern.includes(currentAbschnitt)) pe.abschnittNummern.push(currentAbschnitt);
  }

  result.abschnitte.sort((a, b) => a.nr - b.nr);
  for (const p of result.personen) p.abschnittNummern.sort((a, b) => a - b);
  return result;
}

function normStatus(s) {
  const t = s.toLowerCase();
  if (t.startsWith('abgemeld')) return 'Abgemeldet';
  if (t.startsWith('best')) return 'Bestätigt';
  return s || '';
}

// "Nachname, Vorname (Zusatz)"  ->  Teile
export function splitName(raw) {
  let zusatz = '';
  let s = raw.trim();
  const mZ = /\(([^)]*)\)\s*$/.exec(s);
  if (mZ) { zusatz = mZ[1].trim(); s = s.slice(0, mZ.index).trim(); }
  const komma = s.indexOf(',');
  if (komma >= 0) {
    return { nachname: s.slice(0, komma).trim(), vorname: s.slice(komma + 1).trim(), zusatz };
  }
  return { nachname: s, vorname: '', zusatz };
}

// Titel: "Gemeldete Kampfrichter der Veranstaltung <NAME> am <DATUM>, <ORT>, <AUSRICHTER>"
function parseTitel(line) {
  const out = { name: '', ort: '', datumVon: '', datumBis: '' };
  let s = line.replace(/^Gemeldete Kampfrichter der Veranstaltung\s*/i, '').trim();
  const mDatum = /\bam\s+([0-9./]+)\s*,?/i.exec(s);
  if (mDatum) {
    const range = parseDatumsBereich(mDatum[1]);
    out.datumVon = range.von; out.datumBis = range.bis;
    out.name = s.slice(0, mDatum.index).trim().replace(/,\s*$/, '');
    const rest = s.slice(mDatum.index + mDatum[0].length).split(',').map(x => x.trim()).filter(Boolean);
    if (rest.length) out.ort = rest.join(', ');
  } else {
    out.name = s;
  }
  return out;
}

// "25./26.04.2026" -> {von:"2026-04-25", bis:"2026-04-26"}; "27.06.2026" -> beide gleich
function parseDatumsBereich(str) {
  const s = str.trim();
  const mRange = /^(\d{1,2})\.(?:\/(\d{1,2})\.)?(\d{1,2})\.(\d{4})$/.exec(s);
  if (mRange) {
    const d1 = mRange[1], d2 = mRange[2] || mRange[1], mon = mRange[3], jahr = mRange[4];
    return { von: iso(jahr, mon, d1), bis: iso(jahr, mon, d2) };
  }
  const mSingle = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(s);
  if (mSingle) { const v = iso(mSingle[3], mSingle[2], mSingle[1]); return { von: v, bis: v }; }
  return { von: '', bis: '' };
}
const iso = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
