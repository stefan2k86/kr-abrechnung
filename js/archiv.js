// Archiv vergangener Abrechnungen: eigene localStorage-Liste, analog zum
// Autosave-Muster in state.js (siehe ladeAutosave()/verwerfeAutosave()).
import { uid } from './state.js';

const LS_KEY = 'kr-abrechnung:archiv:v1';

function ladeListe() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const liste = raw ? JSON.parse(raw) : [];
    return Array.isArray(liste) ? liste : [];
  } catch (_) { return []; }
}

function schreibeListe(liste) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(liste)); } catch (_) {}
}

// Legt einen neuen Archiveintrag für `projekt` an (Momentaufnahme des
// kompletten Projekt-Objekts) und schreibt die aktualisierte Liste zurück.
export function archiviere(projekt) {
  const eintrag = {
    id: uid('arch'),
    archiviertAm: new Date().toISOString(),
    veranstaltungName: projekt.veranstaltung?.name || '',
    datumVon: projekt.veranstaltung?.datumVon || '',
    datumBis: projekt.veranstaltung?.datumBis || '',
    projekt,
  };
  schreibeListe([...ladeListe(), eintrag]);
}

// Liefert alle Archiveinträge, neueste zuerst.
export function listeArchiv() {
  return ladeListe().slice().reverse();
}

// Liefert das Projekt-Objekt des Eintrags mit passender id, oder null.
export function ladeAusArchiv(id) {
  const eintrag = ladeListe().find(e => e.id === id);
  return eintrag ? eintrag.projekt : null;
}
