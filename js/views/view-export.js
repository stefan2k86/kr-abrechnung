import { el, downloadBlob } from '../dom.js';
import * as store from '../state.js';
import { gesamtSumme, fmtEuro } from '../calc.js';
import { erzeugeAuszahlungslistePdf } from '../pdf-export.js';

export function viewExport(host) {
  const p = store.getProject();
  const status = el('div', { class: 'hint' });

  host.append(el('div', { class: 'panel stack' },
    el('h2', {}, 'Export'),
    el('p', {}, el('strong', {}, p.veranstaltung.name || '(ohne Namen)')),
    el('p', { class: 'hint' },
      `${p.abschnitte.length} Abschnitt(e) · ${p.personen.length} Person(en) · ` +
      `${p.personen.filter(x => x.unterschrift).length} unterschrieben`),
    el('p', { class: 'summe' }, 'Gesamtsumme: ' + fmtEuro(gesamtSumme(p))),
  ));

  host.append(el('div', { class: 'panel stack' },
    el('h3', {}, 'Auszahlungsliste (PDF)'),
    el('p', { class: 'hint' }, 'Erzeugt die Liste im LSV-Layout mit Beträgen, Summe und den erfassten Unterschriften.'),
    el('button', {
      onclick: async (e) => {
        e.target.disabled = true;
        status.textContent = 'PDF wird erzeugt …';
        try {
          const blob = await erzeugeAuszahlungslistePdf(store.getProject());
          const name = (p.veranstaltung.name || 'auszahlungsliste')
            .replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'auszahlungsliste';
          downloadBlob(blob, `${new Date().toISOString().slice(0, 10)}_Auszahlungsliste_${name}.pdf`);
          status.textContent = 'PDF erstellt.';
        } catch (err) {
          status.textContent = 'Fehler: ' + err.message;
        } finally { e.target.disabled = false; }
      },
    }, 'Auszahlungsliste als PDF'),
    status,
  ));

  host.append(el('div', { class: 'panel stack' },
    el('h3', {}, 'Projektdatei'),
    el('p', { class: 'hint' },
      'Speichert den kompletten Stand (inkl. Unterschriften) als Datei – zum Sichern oder zur ' +
      'Weitergabe an eine Vertretung. Wieder laden über „Start → Projektdatei laden".'),
    el('button', { class: 'secondary', onclick: () => {
      downloadBlob(store.exportProjektBlob(), store.projektDateiname());
      store.markiereGespeichert();
    } }, 'Projektdatei speichern'),
  ));
}
