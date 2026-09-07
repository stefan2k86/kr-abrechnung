import { el, fileButton, confirmDialog, openModal } from '../dom.js';
import * as store from '../state.js';
import { parseMeldelisteFile } from '../import-csv.js';
import { ROLLEN, GRUPPEN } from '../rates.js';
import { personName, sortPersonen } from '../calc.js';

export function viewPersonen(host) {
  const p = store.getProject();

  host.append(el('div', { class: 'panel stack' },
    el('h2', {}, 'Personen & Rollen'),
    el('div', { class: 'row' },
      fileButton('Meldeliste-CSV einlesen', '.csv,text/csv', async (file) => {
        try {
          const parsed = await parseMeldelisteFile(file);
          store.applyMeldeliste(parsed);
        } catch (e) { alert('Fehler beim Einlesen: ' + e.message); }
      }),
      el('button', { class: 'secondary', onclick: personModal }, '+ Person (Orga / Läufer)'),
    ),
    el('p', { class: 'hint' },
      'Häkchen = im Einsatz. Rolle je Abschnitt wählen. Abgemeldete sind vorab abgehakt. ' +
      'CSV erneut einlesen ersetzt die CSV-Personen, manuell erfasste bleiben erhalten.'),
  ));

  if (!p.abschnitte.length) {
    host.append(el('div', { class: 'msg warn' },
      'Noch keine Abschnitte. Zuerst unter „Veranstaltung" das Meldeergebnis oder die CSV einlesen.'));
    return;
  }

  const rollenOptions = (selected) => {
    const opts = [el('option', { value: '', selected: !selected }, '— Rolle —')];
    for (const gk of Object.keys(GRUPPEN)) {
      const grp = el('optgroup', { label: GRUPPEN[gk] });
      for (const r of ROLLEN.filter(x => x.gruppe === gk))
        grp.append(el('option', { value: r.key, selected: r.key === selected }, r.label));
      opts.push(grp);
    }
    return opts;
  };

  const table = el('table', { class: 'matrix' });
  const headRow = el('tr', {}, el('th', {}, 'Person'), el('th', {}, ''));
  for (const a of p.abschnitte) {
    headRow.append(el('th', {},
      el('div', {}, `Abschnitt ${a.nr}`),
      el('select', {
        style: 'margin-top:.3rem;min-height:34px',
        onchange: (e) => {
          const rk = e.target.value; e.target.value = '';
          if (!rk) return;
          store.update(pp => {
            for (const pe of pp.personen) {
              const es = pe.einsaetze.find(x => x.abschnittId === a.id);
              if (es && es.imEinsatz && !es.rolleKey) es.rolleKey = rk;
            }
          });
        },
      }, el('option', { value: '' }, 'leere → Rolle …'),
        ...ROLLEN.map(r => el('option', { value: r.key }, r.label))),
    ));
  }
  table.append(el('thead', {}, headRow));

  const tbody = el('tbody');
  for (const pe of sortPersonen(p.personen)) tbody.append(personRow(pe));
  table.append(tbody);

  host.append(el('div', { class: 'panel' }, el('div', { class: 'tablewrap' }, table)));

  function personRow(pe) {
    const tr = el('tr', {});
    const nmeldung = pe.status === 'Abgemeldet' ? el('span', { class: 'badge warn' }, 'abgemeldet') : null;
    tr.append(el('td', {},
      el('div', {}, el('strong', {}, personName(pe)), ' ', nmeldung),
      el('div', { class: 'hint' }, pe.verein || (pe.quelle === 'manuell' ? 'manuell erfasst' : '')),
      el('label', { style: 'display:flex;gap:.4rem;align-items:center;margin-top:.3rem;font-size:.82rem' },
        el('input', {
          type: 'checkbox', checked: !!pe.keinAnspruch, style: 'width:auto;min-height:auto',
          onchange: (e) => {
            store.patch(pp => {
              const x = pp.personen.find(z => z.id === pe.id); if (x) x.keinAnspruch = e.target.checked;
            });
            tr.classList.toggle('off', e.target.checked);
          },
        }), 'kein Anspruch'),
    ));

    tr.append(el('td', {},
      el('button', { class: 'ghost', title: 'Erste gesetzte Rolle auf alle Abschnitte dieser Person übernehmen',
        onclick: () => store.update(pp => {
          const x = pp.personen.find(z => z.id === pe.id); if (!x) return;
          const rk = x.einsaetze.find(e => e.rolleKey)?.rolleKey;
          if (rk) for (const e of x.einsaetze) if (e.imEinsatz && !e.rolleKey) e.rolleKey = rk;
        }) }, '↳ Rolle'),
      pe.quelle === 'manuell'
        ? el('button', { class: 'ghost danger', onclick: () =>
            confirmDialog(`${personName(pe)} löschen?`, () => store.personLoeschen(pe.id)) }, '✕')
        : null,
    ));

    for (const a of p.abschnitte) {
      const es = pe.einsaetze.find(x => x.abschnittId === a.id);
      if (!es) {
        tr.append(el('td', { class: 'cell-inaktiv' },
          el('button', { class: 'ghost', onclick: () => store.einsatzToggle(pe.id, a.id, true) }, '+ Einsatz')));
        continue;
      }
      const sel = el('select', {
        style: 'margin-top:.25rem', disabled: !es.imEinsatz,
        onchange: (e) => store.patch(pp => {
          const x = pp.personen.find(z => z.id === pe.id)?.einsaetze.find(y => y.abschnittId === a.id);
          if (x) x.rolleKey = e.target.value || null;
        }),
      }, rollenOptions(es.rolleKey));
      const cb = el('input', {
        type: 'checkbox', checked: !!es.imEinsatz, style: 'width:auto;min-height:auto',
        onchange: (e) => {
          store.patch(pp => {
            const x = pp.personen.find(z => z.id === pe.id)?.einsaetze.find(y => y.abschnittId === a.id);
            if (x) x.imEinsatz = e.target.checked;
          });
          sel.disabled = !e.target.checked;
        },
      });
      tr.append(el('td', {},
        el('label', { style: 'display:flex;gap:.35rem;align-items:center;font-size:.82rem' }, cb, 'im Einsatz'),
        sel,
        pe.quelle === 'manuell'
          ? el('button', { class: 'ghost', style: 'font-size:.75rem', onclick: () => store.einsatzToggle(pe.id, a.id, false) }, 'entfernen')
          : null,
      ));
    }
    if (pe.keinAnspruch) tr.classList.add('off');
    return tr;
  }

  function personModal() {
    openModal((box, close) => {
      const f = {};
      const field = (key, label) => el('div', { class: 'grow' },
        el('label', {}, label),
        el('input', { type: 'text', oninput: (e) => f[key] = e.target.value }));
      box.append(
        el('h3', {}, 'Person hinzufügen'),
        el('div', { class: 'row' }, field('nachname', 'Nachname'), field('vorname', 'Vorname')),
        el('div', { class: 'row' }, field('verein', 'Verein / Hinweis')),
        el('p', { class: 'hint' }, 'Danach in der Tabelle „+ Einsatz" je Abschnitt und Rolle wählen.'),
        el('div', { class: 'modal-actions' },
          el('button', { class: 'secondary', onclick: close }, 'Abbrechen'),
          el('button', {
            onclick: () => {
              if (!f.nachname && !f.vorname) { alert('Bitte einen Namen angeben.'); return; }
              store.personManuellHinzufuegen(f); close();
            },
          }, 'Hinzufügen'),
        ),
      );
    });
  }
}
