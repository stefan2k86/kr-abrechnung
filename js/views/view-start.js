import { el } from '../dom.js';
import * as store from '../state.js';
import * as archiv from '../archiv.js';
import { confirmDialog } from '../dom.js';

export function viewStart(host, { goto }) {
  const p = store.getProject();
  const hatDaten = p.personen.length || p.abschnitte.length;

  host.append(
    el('img', { src: 'assets/logo.png', alt: 'USV TU Dresden', width: 227, height: 200,
      style: 'display:block;height:100px;width:auto;margin:.5rem auto 1rem' }),
    el('div', { class: 'panel stack' },
      el('h2', {}, 'Abrechnung starten'),
      el('p', { class: 'hint' },
        'Diese App erzeugt aus der Kampfrichter-Meldung (CSV) und dem Meldeergebnis-PDF die ' +
        'Auszahlungsliste. Alles bleibt auf diesem Gerät; zur Weitergabe an eine Vertretung ' +
        'wird eine Projektdatei gespeichert.'),
      el('div', { class: 'row' },
        el('button', {
          onclick: () => {
            // Annahme: nur eine tatsächlich befüllte Abrechnung (hatDaten) wird
            // archiviert — eine leere/unbenutzte Abrechnung erzeugt keinen
            // Archiveintrag (siehe Spec/Task 3 der Archiv-Karte).
            if (hatDaten) confirmDialog(
              'Aktuelle Abrechnung archivieren und neu beginnen?',
              () => { archiv.archiviere(p); store.verwerfeAutosave(); store.neuesProjekt(); goto('veranstaltung'); },
              { danger: false, jaText: 'Neu beginnen' });
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

  const archivListe = archiv.listeArchiv();
  if (archivListe.length) {
    host.append(
      el('div', { class: 'panel stack' },
        el('h3', {}, 'Archiv'),
        ...archivListe.map(eintrag => el('div', {
          class: 'row', style: 'justify-content:space-between;align-items:center',
        },
          el('div', {},
            el('p', {}, el('strong', {}, eintrag.veranstaltungName || '(ohne Namen)')),
            el('p', { class: 'hint' }, `${eintrag.datumVon || '?'} – ${eintrag.datumBis || '?'}`),
          ),
          el('button', {
            class: 'secondary',
            onclick: () => { store.setProject(archiv.ladeAusArchiv(eintrag.id)); goto('personen'); },
          }, 'Laden'),
        )),
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
