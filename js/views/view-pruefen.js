import { el } from '../dom.js';
import * as store from '../state.js';
import {
  personName, sortPersonen, personBetrag, personTage, personAbschnittsNummern,
  personAufstellung, gesamtSumme, fmtEuro, warnungen,
} from '../calc.js';

export function viewPruefen(host) {
  const p = store.getProject();

  const warns = warnungen(p);
  host.append(el('div', { class: 'panel stack' },
    el('h2', {}, 'Prüfen'),
    warns.length
      ? el('div', {}, ...warns.map(w => el('div', { class: 'msg ' + (w.level === 'err' ? 'err' : 'warn') }, w.text)))
      : el('div', { class: 'msg ok' }, 'Keine Auffälligkeiten.'),
  ));

  const table = el('table');
  table.append(el('thead', {}, el('tr', {},
    el('th', {}, 'Name'), el('th', { class: 'num' }, 'Tage'), el('th', {}, 'Abschnitte'),
    el('th', {}, 'Rolle(n)'), el('th', { class: 'num' }, 'Betrag'), el('th', {}, ''))));
  const tb = el('tbody');

  const personen = sortPersonen(p.personen);
  for (const pe of personen) {
    const auf = personAufstellung(pe, p);
    const rollen = [...new Set(auf.map(x => x.rolleLabel))].join(', ') || '–';
    const betrag = personBetrag(pe, p);
    const detailRow = el('tr', { hidden: true }, el('td', { colspan: 6 },
      el('div', { class: 'hint' },
        pe.keinAnspruch ? 'kein Anspruch' :
        (auf.length
          ? auf.map(x => `Abschnitt ${x.abschnittNr}: ${x.rolleLabel}, ${x.dauerMin} min → ${fmtEuro(x.betrag)}`).join('  ·  ')
          : 'keine aktiven Einsätze'))));
    const mainRow = el('tr', {},
      el('td', {}, personName(pe), pe.status === 'Abgemeldet' ? el('span', { class: 'badge warn', style: 'margin-left:.4rem' }, 'abgemeldet') : null),
      el('td', { class: 'num' }, String(personTage(pe, p) || '')),
      el('td', {}, personAbschnittsNummern(pe, p).join(' | ')),
      el('td', {}, rollen),
      el('td', { class: 'num' }, pe.keinAnspruch ? '–' : fmtEuro(betrag)),
      el('td', {}, el('button', { class: 'ghost', onclick: () => { detailRow.hidden = !detailRow.hidden; } }, 'Details')),
    );
    if (pe.keinAnspruch) mainRow.classList.add('off');
    tb.append(mainRow, detailRow);
  }
  table.append(tb);

  host.append(el('div', { class: 'panel' },
    el('div', { class: 'tablewrap' }, table),
    el('div', { class: 'row', style: 'justify-content:flex-end;margin-top:.8rem' },
      el('div', { class: 'summe' }, 'Gesamtsumme: ' + fmtEuro(gesamtSumme(p)))),
  ));
}
