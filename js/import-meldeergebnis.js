// Parser für das Meldeergebnis-PDF (Meldeprotokoll).
// Zieht je Abschnitt: Nr, Wochentag, Datum, Beginn, Abschnittsende(ca.).
import * as pdfjsLib from '../lib/pdf.min.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('../lib/pdf.worker.min.mjs', import.meta.url).href;

const RE_ABSCHNITT_HEAD = /^Abschnitt\s+(\d+)\s*[-–]\s*([A-Za-zÄÖÜäöü]+)?\s*(\d{2}\.\d{2}\.\d{4})?/;
const RE_BEGINN = /Beginn:\s*(\d{1,2}:\d{2})\s*Uhr/i;
const RE_ENDE   = /Abschnittsende\s*\(ca\.\s*(\d{1,2}:\d{2})/i;
const RE_CA     = /\(ca\.\s*(\d{1,2}:\d{2})\s*Uhr\)/i;

export async function parseMeldeergebnisFile(file, onProgress) {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;

  const abschnitte = new Map();  // nr -> {nr,wochentag,datum,beginn,ende}
  let name = '';
  let ausrichter = '';
  let expected = 0;              // aus "Abs.1 Abs.2 ..." abgeleitet
  let sawFolge = false;

  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
    if (onProgress) onProgress(pageNo, pdf.numPages);
    const page = await pdf.getPage(pageNo);
    const content = await page.getTextContent();
    const lines = zeilenAusItems(content.items).map(demojibake);

    // Veranstaltungsname: Kopfzeile der Inhaltsseiten
    if (!name && pageNo >= 2) {
      for (const l of lines) {
        if (/^Meldeergebnis$/i.test(l)) continue;
        if (/^\d+(\s|$)/.test(l)) continue;
        if (/^Veranstalter\s*\/\s*Ausrichter/i.test(l)) continue;
        if (l.length > 8 && /[A-Za-zÄÖÜäöü]/.test(l)) {
          name = l.replace(/\s+\d{1,3}\s+\d{2}\.\d{2}\.\d{4}.*$/, '').trim();
          break;
        }
      }
    }
    if (!expected) {
      const head = lines.find(l => /Abs\.1/.test(l) && /Verein/i.test(l));
      if (head) expected = (head.match(/Abs\.\d+/g) || []).length;
    }
    if (!ausrichter) {
      const l = lines.find(x => /Veranstalter\s*\/\s*Ausrichter/i.test(x));
      if (l) ausrichter = l.replace(/.*Veranstalter\s*\/\s*Ausrichter:?\s*/i, '').trim();
    }

    let aktuelle = null;
    for (const line of lines) {
      const mA = RE_ABSCHNITT_HEAD.exec(line);
      if (mA) {
        const nr = parseInt(mA[1], 10);
        aktuelle = abschnitte.get(nr) || { nr, wochentag: '', datum: '', beginn: '', ende: '' };
        if (mA[2]) aktuelle.wochentag = mA[2];
        if (mA[3]) aktuelle.datum = deIso(mA[3]);
        abschnitte.set(nr, aktuelle);
        sawFolge = false;
        continue;
      }
      if (/Wettkampffolge\s+f/i.test(line)) { sawFolge = true; continue; }
      if (!aktuelle) continue;

      const mB = RE_BEGINN.exec(line);
      if (mB && !aktuelle.beginn) aktuelle.beginn = mB[1];
      if (!aktuelle.beginn && sawFolge && !/Beginn:/i.test(line)) {
        const mC = RE_CA.exec(line);
        if (mC) aktuelle.beginn = mC[1];
      }
      const mE = RE_ENDE.exec(line);
      if (mE && !aktuelle.ende) aktuelle.ende = mE[1];
    }

    // sinnvoller früher Abbruch: erwartete Anzahl vollständiger Abschnitte erreicht
    if (expected && abschnitte.size >= expected &&
        [...abschnitte.values()].every(a => a.beginn && a.ende)) break;
  }
  await pdf.destroy?.();

  const list = [...abschnitte.values()].sort((a, b) => a.nr - b.nr);
  const veranstaltung = {
    name: (name || '').replace(/\s+/g, ' ').trim(),
    ausrichter: (ausrichter || '').replace(/\s+/g, ' ').trim(),
  };
  const ds = list.map(a => a.datum).filter(Boolean).sort();
  if (ds.length) { veranstaltung.datumVon = ds[0]; veranstaltung.datumBis = ds[ds.length - 1]; }
  return { veranstaltung, abschnitte: list, seitenGesamt: pdf.numPages };
}

function zeilenAusItems(items) {
  const rows = new Map();
  for (const it of items) {
    if (!it.str || !it.str.trim()) continue;
    const y = Math.round(it.transform[5]);
    let bucket = null;
    for (const key of rows.keys()) if (Math.abs(key - y) <= 2) { bucket = key; break; }
    if (bucket == null) { bucket = y; rows.set(y, []); }
    rows.get(bucket).push({ x: it.transform[4], s: it.str });
  }
  return [...rows.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([, parts]) => parts.sort((a, b) => a.x - b.x).map(p => p.s).join(' ')
      .replace(/\s+/g, ' ').trim());
}

// Häufige Fehlkodierungen aus DSV-PDFs (fehlerhafter CP1252-Textlayer)
function demojibake(s) {
  return s.replace(/‰/g, 'ä').replace(/ˆ/g, 'ö').replace(/¸/g, 'ü').replace(/È/g, 'é');
}

const deIso = (d) => {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(d);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : d;
};
