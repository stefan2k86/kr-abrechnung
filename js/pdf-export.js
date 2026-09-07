// Erzeugt die Auszahlungsliste als PDF im LSV-Sachsen-Layout (pdf-lib, lazy geladen).
import { personName, personBetrag, personTage, personAbschnittsNummern, abzurechnendePersonen, fmtEuro } from './calc.js';

let pdfLibPromise = null;
function ladePdfLib() {
  if (window.PDFLib) return Promise.resolve(window.PDFLib);
  if (pdfLibPromise) return pdfLibPromise;
  pdfLibPromise = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = new URL('../lib/pdf-lib.min.js', import.meta.url).href;
    s.onload = () => res(window.PDFLib);
    s.onerror = () => rej(new Error('pdf-lib konnte nicht geladen werden.'));
    document.head.appendChild(s);
  });
  return pdfLibPromise;
}

// WinAnsi-taugliche Zeichen
function san(s) {
  return String(s ?? '')
    .replace(/–|—/g, '-')
    .replace(/…/g, '...')
    .replace(/ /g, ' ')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"');
}
const deDate = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  return m ? `${m[3]}.${m[2]}.${m[1]}` : (iso || '');
};

export async function erzeugeAuszahlungslistePdf(project) {
  const { PDFDocument, StandardFonts, rgb } = await ladePdfLib();
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontB = await doc.embedFont(StandardFonts.HelveticaBold);

  // vorab Unterschriftsbilder einbetten
  const sigCache = new Map();
  for (const p of project.personen) {
    const url = p.unterschrift?.pngDataUrl;
    if (url && !sigCache.has(url)) {
      try { sigCache.set(url, await doc.embedPng(url)); } catch (_) { sigCache.set(url, null); }
    }
  }

  const A4 = [595.28, 841.89];
  const M = { l: 36, r: 36, t: 44, b: 40 };
  const right = A4[0] - M.r;
  const col = {
    nr:   { x: M.l,  w: 24 },
    name: { x: 74,   w: 176 },
    tage: { x: 258,  w: 26 },
    absc: { x: 290,  w: 82 },
    betr: { x: 374,  w: 68 },
    sig:  { x: 450,  w: right - 450 },
  };
  const ROW_H = 30;

  const v = project.veranstaltung;
  const personen = abzurechnendePersonen(project);
  const summe = personen.reduce((s, p) => s + personBetrag(p, project), 0);
  const erstellt = new Date();
  const stamp = `${deDate(erstellt.toISOString().slice(0,10))} ${erstellt.toTimeString().slice(0,5)}`;

  let page, y, seite = 0;
  const pages = [];

  function neueSeite(withHeader) {
    page = doc.addPage(A4); pages.push(page); seite++;
    y = A4[1] - M.t;
    if (withHeader) kopf();
    tabellenKopf();
  }
  function text(s, x, yy, size = 9, f = font, opt = {}) {
    page.drawText(san(s), { x, y: yy, size, font: f, color: rgb(0.1,0.15,0.2), ...opt });
  }
  function textR(s, xRight, yy, size = 9, f = font) {
    const w = f.widthOfTextAtSize(san(s), size);
    text(s, xRight - w, yy, size, f);
  }
  function line(x1, y1, x2, y2, c = 0.72) {
    page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: 0.7, color: rgb(c, c, c) });
  }

  function kopf() {
    text('Auszahlungsliste', M.l, y, 16, fontB); y -= 22;
    const titel = 'Auszahlungsliste ' + (v.name || '');
    text(titel, M.l, y, 12, fontB); y -= 20;
    const lab = (k, val) => { text(k, M.l, y, 9, fontB); text(val, M.l + 118, y, 9); y -= 14; };
    lab('Veranstaltung:', v.name || '');
    lab('Einsatz als Kampfrichter', `vom ${deDate(v.datumVon)} bis ${deDate(v.datumBis)}`);
    lab('Ausrichtender Verein:', v.ausrichter || '');
    lab('je Tag/Einsatz EURO:', 's. Spalte Betrag');
    y -= 6;
  }

  function tabellenKopf() {
    line(M.l, y, right, y);
    y -= 12;
    text('Nr.', col.nr.x, y, 8, fontB);
    text('Name', col.name.x, y, 8, fontB);
    text('Tage', col.tage.x, y, 8, fontB);
    text('Abschnitte', col.absc.x, y, 8, fontB);
    textR('Betrag', col.betr.x + col.betr.w - 2, y, 8, fontB);
    text('Unterschrift', col.sig.x, y, 8, fontB);
    y -= 6;
    line(M.l, y, right, y);
  }

  function fusszeile() {
    const fy = M.b - 6;
    text(`${stamp}  Auszahlungsliste`, M.l, fy + 8, 7);
    text('LSV Sachsen', A4[0] / 2 - 40, fy + 8, 7);
    if (v.schiedsrichter) text(v.schiedsrichter, A4[0] / 2 - 40, fy - 1, 7);
    textR(`Seite ${seite}`, right, fy + 8, 7);
  }

  function zeile(index, p) {
    const top = y;
    if (p) {
      const rowMidY = top - ROW_H / 2 - 3;
      text(String(index), col.nr.x, rowMidY, 8.5);
      text(kuerzen(personName(p), col.name.w - 4, font, 8.5), col.name.x, rowMidY, 8.5);
      text(String(personTage(p, project) || ''), col.tage.x + 6, rowMidY, 8.5);
      text(personAbschnittsNummern(p, project).join(' | '), col.absc.x, rowMidY, 8.5);
      textR(p.keinAnspruch ? '–' : fmtEuro(personBetrag(p, project)), col.betr.x + col.betr.w - 2, rowMidY, 8.5);
      const sig = p.unterschrift && sigCache.get(p.unterschrift.pngDataUrl);
      if (sig) {
        const maxW = col.sig.w - 6, maxH = ROW_H - 8;
        const sc = Math.min(maxW / sig.width, maxH / sig.height);
        page.drawImage(sig, { x: col.sig.x + 2, y: top - ROW_H + 4, width: sig.width * sc, height: sig.height * sc });
      }
    }
    y -= ROW_H;
    line(M.l, y, right, y);
  }

  function kuerzen(s, maxW, f, size) {
    s = san(s);
    if (f.widthOfTextAtSize(s, size) <= maxW) return s;
    while (s.length > 1 && f.widthOfTextAtSize(s + '…', size) > maxW) s = s.slice(0, -1);
    return s + '…';
  }

  // ---- Seiten füllen ----
  neueSeite(true);
  let lfd = 1;
  for (const p of personen) {
    if (y - ROW_H < M.b + 60) { fusszeile(); neueSeite(false); }
    zeile(lfd++, p);
  }
  // Summenzeile
  if (y - ROW_H < M.b + 60) { fusszeile(); neueSeite(false); }
  y -= 4;
  text('Summe', col.name.x, y - ROW_H / 2 - 3, 9, fontB);
  textR(fmtEuro(summe), col.betr.x + col.betr.w - 2, y - ROW_H / 2 - 3, 9, fontB);
  y -= ROW_H; line(M.l, y, right, y);

  // Leerzeilen bis kurz vor Seitenende
  while (y - ROW_H > M.b + 70) zeile(lfd++, null);

  // Unterschriftsblock unten
  y -= 16;
  text('__________________, den __________', M.l, y, 9);
  text('Für die Richtigkeit', col.sig.x - 40, y, 9);
  y -= 26;
  text('Kampfrichterobmann', M.l, y, 9);
  text('Schiedsrichter', col.sig.x - 40, y, 9);

  fusszeile();

  const bytes = await doc.save();
  return new Blob([bytes], { type: 'application/pdf' });
}
