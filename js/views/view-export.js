import { el, downloadBlob, openModal, toast } from '../dom.js';
import * as store from '../state.js';
import { gesamtSumme, fmtEuro } from '../calc.js';
import { erzeugeAuszahlungslistePdf } from '../pdf-export.js';
import { createSignaturePad } from '../signature.js';

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

  const btn = el('button', {}, 'Auszahlungsliste als PDF');

  async function erzeugePdf() {
    btn.disabled = true;
    status.textContent = 'PDF wird erzeugt …';
    try {
      const blob = await erzeugeAuszahlungslistePdf(store.getProject());
      const name = (p.veranstaltung.name || 'auszahlungsliste')
        .replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'auszahlungsliste';
      downloadBlob(blob, `${new Date().toISOString().slice(0, 10)}_Auszahlungsliste_${name}.pdf`);
      status.textContent = 'PDF erstellt.';
    } catch (err) {
      status.textContent = 'Fehler: ' + err.message;
    } finally { btn.disabled = false; }
  }

  function prueferSigModal(onDone) {
    const name = (store.getProject().pruefer.name || '').trim();
    openModal((box, close) => {
      box.append(
        el('h3', {}, 'Gegenzeichnung'),
        el('p', {}, el('strong', {}, name), ' bestätigt die Prüfung der Auszahlungsliste.'),
      );
      const canvas = el('canvas', { class: 'sigpad' });
      box.append(canvas);
      const pad = createSignaturePad(canvas);
      const vorhanden = store.getProject().pruefer.unterschrift?.pngDataUrl;
      if (vorhanden) setTimeout(() => pad.setFromDataURL(vorhanden), 30);
      box.append(el('div', { class: 'modal-actions' },
        el('button', { class: 'ghost', onclick: () => pad.clear() }, 'Löschen'),
        el('span', { class: 'grow' }),
        el('button', { class: 'secondary', onclick: () => { pad.destroy(); close(); } }, 'Abbrechen'),
        el('button', {
          onclick: () => {
            const dataUrl = pad.toDataURL();
            if (!dataUrl) { alert('Bitte unterschreiben.'); return; }
            pad.destroy();
            // patch statt update: hält die aktuelle Ansicht am Leben, damit ein
            // direkt anschließender PDF-Export (onDone) nicht auf verwaiste Knoten trifft.
            store.patch(pp => {
              pp.pruefer.unterschrift = { pngDataUrl: dataUrl, zeitpunkt: new Date().toISOString() };
            });
            close();
            if (onDone) onDone();
            else store.update(() => {}); // ohne Folgeaktion: Panel neu zeichnen (Status/Button)
          },
        }, 'Übernehmen'),
      ));
    });
  }

  function signGateUndExport() {
    const pr = store.getProject().pruefer;
    if (!(pr.name || '').trim()) {
      toast('Bitte zuerst unter „Veranstaltung" die verantwortliche Person bei „Geprüft durch" eintragen.',
        { error: true });
      return;
    }
    if (pr.unterschrift?.pngDataUrl) erzeugePdf();
    else prueferSigModal(erzeugePdf);
  }
  btn.onclick = signGateUndExport;

  const pr = p.pruefer || { name: '', unterschrift: null };
  const gezeichnet = !!pr.unterschrift?.pngDataUrl;
  const prueferZeile = pr.name?.trim()
    ? (gezeichnet
        ? el('p', { class: 'msg ok' }, `Gegengezeichnet von ${pr.name.trim()}.`)
        : el('p', { class: 'msg warn' }, `${pr.name.trim()} hat noch nicht gegengezeichnet – erfolgt beim Erzeugen des PDF.`))
    : el('p', { class: 'msg warn' }, 'Keine verantwortliche Person hinterlegt – Tab „Veranstaltung" → „Geprüft durch".');

  host.append(el('div', { class: 'panel stack' },
    el('h3', {}, 'Auszahlungsliste (PDF)'),
    el('p', { class: 'hint' },
      'Erzeugt die Liste mit Beträgen, Summe und den erfassten Unterschriften. ' +
      'Vor dem Erzeugen zeichnet die verantwortliche Person die Prüfung digital gegen.'),
    prueferZeile,
    el('div', { class: 'row' },
      btn,
      gezeichnet
        ? el('button', { class: 'secondary', onclick: () => prueferSigModal() }, 'Gegenzeichnung ändern')
        : null,
    ),
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
