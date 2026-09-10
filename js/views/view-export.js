import { el, downloadBlob, openModal, toast } from '../dom.js';
import * as store from '../state.js';
import { gesamtSumme, fmtEuro, warnungen, hatFehler, abzurechnendePersonen } from '../calc.js';
import { erzeugeAuszahlungslistePdf } from '../pdf-export.js';
import { createSignaturePad } from '../signature.js';
import { personenPruefTabelle } from './personen-tabelle.js';

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

  // Gegenzeichnungs-Dialog: Prüfung → Vorschau → Unterschrift.
  // Bei Fehlern ist die Unterschrift erst nach ausdrücklicher Bestätigung möglich.
  function prueferSigModal(onDone) {
    const proj = store.getProject();
    const name = (proj.pruefer.name || '').trim();
    const warns = warnungen(proj);
    const fehler = hatFehler(warns);
    const personen = abzurechnendePersonen(proj);

    openModal((box, close) => {
      box.append(
        el('h3', {}, 'Gegenzeichnung'),
        el('p', {}, el('strong', {}, name), ' bestätigt die Prüfung der Auszahlungsliste.'),
      );

      // ---- Prüfung: Fehler zuerst, dann Warnungen ----
      box.append(el('h3', {}, 'Prüfung'));
      if (!warns.length) {
        box.append(el('div', { class: 'msg ok' }, 'Keine Auffälligkeiten.'));
      } else {
        const sortiert = [...warns].sort((a, b) =>
          (a.level === 'err' ? 0 : 1) - (b.level === 'err' ? 0 : 1));
        box.append(el('div', {}, ...sortiert.map(w =>
          el('div', { class: 'msg ' + (w.level === 'err' ? 'err' : 'warn') }, w.text))));
      }

      // ---- Vorschau der Liste, die unterschrieben wird ----
      box.append(
        el('h3', {}, 'Vorschau'),
        el('p', { class: 'hint' }, `${personen.length} Person(en) auf der Auszahlungsliste.`),
        personenPruefTabelle(proj, personen),
        el('div', { class: 'row', style: 'justify-content:flex-end;margin-top:.6rem' },
          el('div', { class: 'summe' }, 'Gesamtsumme: ' + fmtEuro(gesamtSumme(proj)))),
      );

      // ---- Unterschrift ----
      box.append(el('h3', {}, 'Unterschrift'));
      const canvas = el('canvas', { class: 'sigpad' });
      box.append(canvas);
      const pad = createSignaturePad(canvas);
      if (proj.pruefer.unterschrift?.pngDataUrl) {
        setTimeout(() => pad.setFromDataURL(proj.pruefer.unterschrift.pngDataUrl), 30);
      }

      const okBtn = el('button', { disabled: fehler },
        fehler ? 'Trotz Hinweisen unterschreiben' : 'Übernehmen');
      okBtn.onclick = () => {
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
      };

      if (fehler) {
        box.append(el('label', {
          style: 'display:flex;gap:.5rem;align-items:center;margin-top:.9rem;font-size:.9rem',
        },
          el('input', {
            type: 'checkbox', style: 'width:auto;min-height:auto',
            onchange: (e) => { okBtn.disabled = !e.target.checked; },
          }),
          'Ich habe die Hinweise geprüft und zeichne trotzdem gegen.'));
      }

      box.append(el('div', { class: 'modal-actions' },
        el('button', { class: 'ghost', onclick: () => pad.clear() }, 'Löschen'),
        el('span', { class: 'grow' }),
        el('button', { class: 'secondary', onclick: () => { pad.destroy(); close(); } }, 'Abbrechen'),
        okBtn,
      ));
    });
  }

  function signGateUndExport() {
    const proj = store.getProject();
    if (!(proj.pruefer.name || '').trim()) {
      toast('Bitte zuerst unter „Veranstaltung" die verantwortliche Person bei „Geprüft durch" eintragen.',
        { error: true });
      return;
    }
    // Direkt exportieren nur, wenn schon gegengezeichnet UND die Abrechnung fehlerfrei ist.
    // Sind nach dem Unterschreiben noch Fehler entstanden, geht es erneut durch die Prüfung.
    if (proj.pruefer.unterschrift?.pngDataUrl && !hatFehler(warnungen(proj))) erzeugePdf();
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
    hatFehler(warnungen(p))
      ? el('p', { class: 'msg err' },
          'Die Prüfung meldet Fehler – der Export zeigt sie vor dem Unterschreiben und ' +
          'verlangt eine ausdrückliche Bestätigung.')
      : null,
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
