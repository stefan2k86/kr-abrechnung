import { el } from '../dom.js';
import * as store from '../state.js';
import { sortPersonen, gesamtSumme, fmtEuro, warnungen } from '../calc.js';
import { personenPruefTabelle } from './personen-tabelle.js';

export function viewPruefen(host) {
  const p = store.getProject();

  const warns = warnungen(p);
  host.append(el('div', { class: 'panel stack' },
    el('h2', {}, 'Prüfen'),
    warns.length
      ? el('div', {}, ...warns.map(w => el('div', { class: 'msg ' + (w.level === 'err' ? 'err' : 'warn') }, w.text)))
      : el('div', { class: 'msg ok' }, 'Keine Auffälligkeiten.'),
  ));

  host.append(el('div', { class: 'panel' },
    personenPruefTabelle(p, sortPersonen(p.personen)),
    el('div', { class: 'row', style: 'justify-content:flex-end;margin-top:.8rem' },
      el('div', { class: 'summe' }, 'Gesamtsumme: ' + fmtEuro(gesamtSumme(p)))),
  ));
}
