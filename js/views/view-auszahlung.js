import { el, openModal } from '../dom.js';
import * as store from '../state.js';
import { personName, personBetrag, personAbschnittsNummern, abzurechnendePersonen, fmtEuro } from '../calc.js';
import { createSignaturePad } from '../signature.js';

let nurEinAbschnitt = false;
let nurOffen = false;

export function viewAuszahlung(host) {
  const p = store.getProject();

  host.append(el('div', { class: 'panel stack' },
    el('h2', {}, 'Auszahlung & Unterschrift'),
    el('p', { class: 'hint' },
      'Personen mit nur einem Abschnitt dürfen direkt nach diesem Abschnitt ausgezahlt werden, ' +
      'alle anderen nach Wettkampfende.'),
    el('div', { class: 'row' },
      toggle('Nur 1‑Abschnitt‑Personen', nurEinAbschnitt, (v) => { nurEinAbschnitt = v; store.update(() => {}); }),
      toggle('Nur noch offene', nurOffen, (v) => { nurOffen = v; store.update(() => {}); }),
    ),
  ));

  let personen = abzurechnendePersonen(p);
  if (nurEinAbschnitt) personen = personen.filter(pe => personAbschnittsNummern(pe, p).length === 1);
  if (nurOffen) personen = personen.filter(pe => !pe.unterschrift);

  const table = el('table');
  table.append(el('thead', {}, el('tr', {},
    el('th', {}, 'Name'), el('th', {}, 'Abschnitte'), el('th', { class: 'num' }, 'Betrag'),
    el('th', {}, 'Unterschrift'), el('th', {}, 'Status'))));
  const tb = el('tbody');
  for (const pe of personen) tb.append(row(pe));
  table.append(tb);

  host.append(el('div', { class: 'panel' }, el('div', { class: 'tablewrap' }, table)));

  const alle = abzurechnendePersonen(p);
  const offen = alle.filter(pe => !pe.unterschrift).length;
  host.append(el('p', { class: 'hint' }, `${offen} von ${alle.length} Personen noch ohne Unterschrift.`));

  function row(pe) {
    const betrag = personBetrag(pe, p);
    const sig = pe.unterschrift?.pngDataUrl;
    const tr = el('tr', {},
      el('td', {}, personName(pe)),
      el('td', {}, personAbschnittsNummern(pe, p).join(' | ') || '–'),
      el('td', { class: 'num' }, fmtEuro(betrag)),
      el('td', {}, sig
        ? el('img', { src: sig, alt: 'Unterschrift', style: 'height:34px;background:#fff;border:1px solid var(--line);border-radius:4px' })
        : el('span', { class: 'hint' }, '—')),
      el('td', {},
        el('button', { class: sig ? 'secondary' : '', onclick: () => sigModal(pe) }, sig ? 'ändern' : 'unterschreiben'),
        sig ? el('button', { class: 'ghost danger', onclick: () => store.update(pp => {
          const x = pp.personen.find(z => z.id === pe.id); if (x) { x.unterschrift = null; x.ausgezahlt = false; }
        }) }, '✕') : null,
      ),
    );
    return tr;
  }

  function sigModal(pe) {
    openModal((box, close) => {
      box.append(
        el('h3', {}, 'Unterschrift'),
        el('p', {}, el('strong', {}, personName(pe)), ' — ', fmtEuro(personBetrag(pe, p))),
      );
      const canvas = el('canvas', { class: 'sigpad' });
      box.append(canvas);
      const pad = createSignaturePad(canvas);
      if (pe.unterschrift?.pngDataUrl) setTimeout(() => pad.setFromDataURL(pe.unterschrift.pngDataUrl), 30);
      box.append(el('div', { class: 'modal-actions' },
        el('button', { class: 'ghost', onclick: () => pad.clear() }, 'Löschen'),
        el('span', { class: 'grow' }),
        el('button', { class: 'secondary', onclick: () => { pad.destroy(); close(); } }, 'Abbrechen'),
        el('button', {
          onclick: () => {
            const dataUrl = pad.toDataURL();
            if (!dataUrl) { alert('Bitte unterschreiben.'); return; }
            pad.destroy();
            store.update(pp => {
              const x = pp.personen.find(z => z.id === pe.id);
              if (x) { x.unterschrift = { pngDataUrl: dataUrl, zeitpunkt: new Date().toISOString() }; x.ausgezahlt = true; }
            });
            close();
          },
        }, 'Übernehmen'),
      ));
    });
  }
}

function toggle(label, value, onchange) {
  return el('label', { style: 'display:flex;gap:.4rem;align-items:center' },
    el('input', { type: 'checkbox', checked: value, style: 'width:auto;min-height:auto', onchange: (e) => onchange(e.target.checked) }),
    label);
}
