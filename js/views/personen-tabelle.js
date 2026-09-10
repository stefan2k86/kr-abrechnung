// Wiederverwendbare Personen-Tabelle mit Aufschlüsselung je Abschnitt.
// Genutzt im Tab „Prüfen" (alle Personen) und in der Vorschau vor der
// Gegenzeichnung im Tab „Export" (nur die abzurechnenden Personen).
import { el } from '../dom.js';
import {
  personName, personBetrag, personTage, personAbschnittsNummern,
  personAufstellung, fmtEuro,
} from '../calc.js';

export function personenPruefTabelle(project, personen) {
  const table = el('table');
  table.append(el('thead', {}, el('tr', {},
    el('th', {}, 'Name'), el('th', { class: 'num' }, 'Tage'), el('th', {}, 'Abschnitte'),
    el('th', {}, 'Rolle(n)'), el('th', { class: 'num' }, 'Betrag'), el('th', {}, ''))));
  const tb = el('tbody');
  for (const pe of personen) tb.append(...personZeilen(project, pe));
  table.append(tb);
  return el('div', { class: 'tablewrap' }, table);
}

// [Hauptzeile, ausklappbare Detailzeile] für eine Person
function personZeilen(project, pe) {
  const auf = personAufstellung(pe, project);
  const rollen = [...new Set(auf.map(x => x.rolleLabel))].join(', ') || '–';

  const detailRow = el('tr', { hidden: true }, el('td', { colspan: 6 },
    el('div', { class: 'hint' },
      pe.keinAnspruch ? 'kein Anspruch' :
      (auf.length
        ? auf.map(x => x.text || `Abschnitt ${x.abschnittNr}: ${x.rolleLabel}, ${x.dauerMin} min → ${fmtEuro(x.betrag)}`).join('  ·  ')
        : 'keine aktiven Einsätze'))));

  const mainRow = el('tr', {},
    el('td', {}, personName(pe), pe.status === 'Abgemeldet'
      ? el('span', { class: 'badge warn', style: 'margin-left:.4rem' }, 'abgemeldet') : null),
    el('td', { class: 'num' }, String(personTage(pe, project) || '')),
    el('td', {}, personAbschnittsNummern(pe, project).join(' | ')),
    el('td', {}, rollen),
    el('td', { class: 'num' }, pe.keinAnspruch ? '–' : fmtEuro(personBetrag(pe, project))),
    el('td', {}, el('button', { class: 'ghost', onclick: () => { detailRow.hidden = !detailRow.hidden; } }, 'Details')),
  );
  if (pe.keinAnspruch) mainRow.classList.add('off');

  return [mainRow, detailRow];
}
