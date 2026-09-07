import { el } from '../dom.js';
import * as store from '../state.js';
import { confirmDialog } from '../dom.js';

export function viewStart(host, { goto }) {
  const p = store.getProject();
  const hatDaten = p.personen.length || p.abschnitte.length;

  host.append(
    el('div', { class: 'panel stack' },
      el('h2', {}, 'Abrechnung starten'),
      el('p', { class: 'hint' },
        'Diese App erzeugt aus der Kampfrichter-Meldung (CSV) und dem Meldeergebnis-PDF die ' +
        'Auszahlungsliste. Alles bleibt auf diesem Gerät; zur Weitergabe an eine Vertretung ' +
        'wird eine Projektdatei gespeichert.'),
      el('div', { class: 'row' },
        el('button', {
          onclick: () => {
            if (hatDaten) confirmDialog(
              'Aktuelle Abrechnung verwerfen und neu beginnen?',
              () => { store.verwerfeAutosave(); store.neuesProjekt(); goto('veranstaltung'); },
              { danger: true, jaText: 'Neu beginnen' });
            else { store.neuesProjekt(); goto('veranstaltung'); }
          },
        }, 'Neue Abrechnung'),
        fileButton('Projektdatei laden', '.json,application/json', async (file) => {
          try { await store.importProjektDatei(file); goto('personen'); }
          catch (e) { alert('Konnte nicht geladen werden: ' + e.message); }
        }, true),
      ),
    ),
  );

  if (hatDaten) {
    host.append(
      el('div', { class: 'panel stack' },
        el('h3', {}, 'Aktuelle Abrechnung'),
        el('p', {}, el('strong', {}, p.veranstaltung.name || '(ohne Namen)')),
        el('p', { class: 'hint' },
          `${p.abschnitte.length} Abschnitt(e) · ${p.personen.length} Person(en) · ` +
          `${p.personen.filter(x => x.unterschrift).length} unterschrieben`),
        el('div', { class: 'row' },
          el('button', { class: 'secondary', onclick: () => goto('personen') }, 'Weiter bearbeiten'),
        ),
      ),
    );
  }
}

function fileButton(label, accept, onfile, secondary) {
  const inp = el('input', {
    type: 'file', accept,
    onchange: (e) => { const f = e.target.files[0]; if (f) onfile(f); e.target.value = ''; },
  });
  return el('label', { class: 'btn filebtn' + (secondary ? ' secondary' : '') }, label, inp);
}
