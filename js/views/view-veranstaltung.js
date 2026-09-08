import { el, fileButton, confirmDialog, toast } from '../dom.js';
import * as store from '../state.js';
import { parseMeldeergebnisFile } from '../import-meldeergebnis.js';
import { parseMeldelisteFile } from '../import-csv.js';
import { ROLLEN, GRUPPEN, betragJeAbschnitt, defaultSaetze, faktorText } from '../rates.js';
import { dauerMin, fmtEuro } from '../calc.js';

export function viewVeranstaltung(host) {
  const p = store.getProject();

  // ---- Import ----
  const status = el('div', { class: 'hint' });
  host.append(el('div', { class: 'panel stack' },
    el('h2', {}, 'Veranstaltung & Abschnitte'),
    el('p', { class: 'hint' }, 'Meldeergebnis-PDF und/oder Meldeliste-CSV einlesen. Alle Werte danach frei änderbar.'),
    el('div', { class: 'row' },
      fileButton('Meldeergebnis-PDF einlesen', 'application/pdf,.pdf', importPdf),
      fileButton('Meldeliste-CSV einlesen', '.csv,text/csv', importCsv, { secondary: true }),
    ),
    status,
  ));

  async function importPdf(file) {
    status.textContent = 'PDF wird gelesen …';
    try {
      const parsed = await parseMeldeergebnisFile(file, (n, total) => {
        status.textContent = `PDF wird gelesen … Seite ${n} / ${total}`;
      });
      const n = parsed.abschnitte.length;
      store.applyMeldeergebnis(parsed);
      toast(n ? `${n} Abschnitt(e) aus dem Meldeergebnis übernommen.` : 'Keine Abschnitte im PDF erkannt – bitte manuell erfassen.',
        { error: !n });
    } catch (e) { toast('PDF-Fehler: ' + e.message, { error: true }); status.textContent = ''; }
  }
  async function importCsv(file) {
    try {
      const parsed = await parseMeldelisteFile(file);
      store.applyMeldeliste(parsed);
      toast(`${parsed.personen.length} Personen, ${parsed.abschnitte.length} Abschnitt(e) aus der Meldeliste übernommen.`);
    } catch (e) { toast('CSV-Fehler: ' + e.message, { error: true }); }
  }

  // ---- Veranstaltungsdaten ----
  const v = p.veranstaltung;
  const feld = (key, label, type = 'text') => el('div', { class: 'grow' },
    el('label', {}, label),
    el('input', {
      type, value: v[key] || '',
      oninput: (e) => store.patch(pp => { pp.veranstaltung[key] = e.target.value; }),
    }));
  host.append(el('div', { class: 'panel stack' },
    el('h3', {}, 'Veranstaltungsdaten (für die PDF-Kopfzeile)'),
    el('div', { class: 'row' }, feld('name', 'Name der Veranstaltung')),
    el('div', { class: 'row' },
      feld('ausrichter', 'Ausrichtender Verein'),
      feld('ort', 'Ort / Wettkampfstätte')),
    el('div', { class: 'row' },
      feld('datumVon', 'Einsatz von', 'date'),
      feld('datumBis', 'bis', 'date'),
      feld('schiedsrichter', 'Schiedsrichter (Fußzeile)')),
  ));

  // ---- Abschnitte ----
  const absTable = el('table');
  absTable.append(el('thead', {}, el('tr', {},
    ...['Nr', 'Datum', 'Wochentag', 'Beginn', 'Abschnittsende', 'Dauer', 'Faktor', ''].map(h => el('th', {}, h)))));
  const tb = el('tbody');
  for (const a of p.abschnitte) tb.append(abschnittRow(a));
  absTable.append(tb);

  host.append(el('div', { class: 'panel stack' },
    el('h3', {}, 'Abschnitte'),
    el('div', { class: 'tablewrap' }, absTable),
    el('div', { class: 'row' },
      el('button', { class: 'secondary', onclick: () => store.abschnittHinzufuegen() }, '+ Abschnitt'),
    ),
    el('p', { class: 'hint' }, 'Dauer = Abschnittsende − Beginn (brutto, Siegerehrungspausen bleiben drin).'),
  ));

  function abschnittRow(a) {
    const dauerCell = el('td', { class: 'num' });
    const faktorCell = el('td', {});
    const refresh = () => {
      const cur = store.getProject().abschnitte.find(z => z.id === a.id) || a;
      const d = dauerMin(cur);
      dauerCell.textContent = d ? `${d} min` : '–';
      faktorCell.textContent = faktorText(d);
    };
    refresh();

    const inp = (key, type) => el('input', {
      type, value: a[key] || '',
      oninput: (e) => { store.patch(pp => {
        const x = pp.abschnitte.find(z => z.id === a.id); if (x) x[key] = e.target.value;
      }); refresh(); },
    });
    return el('tr', {},
      el('td', {}, el('input', {
        type: 'number', min: '1', value: a.nr, style: 'width:4rem',
        onchange: (e) => store.update(pp => {
          const x = pp.abschnitte.find(z => z.id === a.id); if (x) x.nr = parseInt(e.target.value, 10) || x.nr;
          pp.abschnitte.sort((m, n) => m.nr - n.nr);
        }),
      })),
      el('td', {}, inp('datum', 'date')),
      el('td', {}, inp('wochentag', 'text')),
      el('td', {}, inp('beginn', 'time')),
      el('td', {}, inp('ende', 'time')),
      dauerCell,
      faktorCell,
      el('td', {}, el('button', { class: 'ghost danger', onclick: () =>
        confirmDialog(`Abschnitt ${a.nr} löschen?`, () => store.abschnittLoeschen(a.id)) }, '✕')),
    );
  }

  // ---- Sätze ----
  const s = p.saetze;
  const satzTable = el('table');
  satzTable.append(el('thead', {}, el('tr', {},
    el('th', {}, 'Rolle'), el('th', { class: 'num' }, 'Grundsatz €'), el('th', { class: 'num' }, 'Maximalsatz €'),
    el('th', { class: 'num' }, '≤120'), el('th', { class: 'num' }, '≤180'), el('th', { class: 'num' }, '≤260'), el('th', { class: 'num' }, '>260'))));
  const stb = el('tbody');
  for (const gk of Object.keys(GRUPPEN)) {
    const rollen = ROLLEN.filter(r => r.gruppe === gk);
    if (!rollen.length) continue;
    stb.append(el('tr', {}, el('td', { colspan: 7, class: 'badge' }, GRUPPEN[gk])));
    for (const r of rollen) stb.append(satzRow(r));
  }
  satzTable.append(stb);

  host.append(el('div', { class: 'panel stack' },
    el('h3', {}, 'Aufwandsentschädigungs-Sätze (je Abschnitt)'),
    el('div', { class: 'row' },
      el('button', { class: 'ghost', onclick: () =>
        confirmDialog('Alle Sätze auf die Standardwerte zurücksetzen?',
          () => store.update(pp => { pp.saetze = defaultSaetze(); }),
          { danger: false, jaText: 'Zurücksetzen' }) }, 'Standardsätze'),
    ),
    el('div', { class: 'tablewrap' }, satzTable),
    el('p', { class: 'hint' }, 'Die Zusatzspalten zeigen den resultierenden Betrag für eine Beispieldauer (≤120 / ≤180 / ≤260 / >260 min).'),
    el('p', { class: 'hint' }, 'Läufer: die Stufe wählst du je Person (nach der Einsatz-Liste des Läufers). ' +
      'Je Abschnitt zählt Grund- (≤120 min) bzw. Maximalsatz (>120 min) – ohne doppelten Grundsatz.'),
  ));

  function satzRow(r) {
    const satz = s[r.key] || { grund: 0, max: 0 };
    const kd = !!r.laeufer;
    const cells = { c120: el('td', { class: 'num hint' }), c180: el('td', { class: 'num hint' }),
                    c260: el('td', { class: 'num hint' }), c300: el('td', { class: 'num hint' }) };
    const refresh = () => {
      const cur = store.getProject().saetze[r.key] || satz;
      cells.c120.textContent = fmtEuro(betragJeAbschnitt(120, cur, { keinDoppelsatz: kd }));
      cells.c180.textContent = fmtEuro(betragJeAbschnitt(180, cur, { keinDoppelsatz: kd }));
      cells.c260.textContent = fmtEuro(betragJeAbschnitt(260, cur, { keinDoppelsatz: kd }));
      cells.c300.textContent = fmtEuro(betragJeAbschnitt(300, cur, { keinDoppelsatz: kd }));
    };
    refresh();
    const num = (which) => el('input', {
      type: 'number', min: '0', step: '0.5', value: satz[which], style: 'width:5rem',
      oninput: (e) => { store.patch(pp => {
        pp.saetze[r.key] = pp.saetze[r.key] || { grund: 0, max: 0 };
        pp.saetze[r.key][which] = parseFloat(e.target.value) || 0;
      }); refresh(); },
    });
    return el('tr', {},
      el('td', {}, r.label),
      el('td', { class: 'num' }, num('grund')),
      el('td', { class: 'num' }, num('max')),
      cells.c120, cells.c180, cells.c260, cells.c300,
    );
  }
}
