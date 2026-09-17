// Bootstrap, Navigation, Rendern der aktiven Ansicht.
import { el, clear } from './dom.js';
import * as store from './state.js';
import { viewStart } from './views/view-start.js';
import { viewVeranstaltung } from './views/view-veranstaltung.js';
import { viewPersonen } from './views/view-personen.js';
import { viewPruefen } from './views/view-pruefen.js';
import { viewAuszahlung } from './views/view-auszahlung.js';
import { viewExport } from './views/view-export.js';

const VIEWS = [
  { id: 'start',         label: 'Start',        render: viewStart },
  { id: 'veranstaltung', label: 'Veranstaltung', render: viewVeranstaltung },
  { id: 'personen',      label: 'Personen',      render: viewPersonen },
  { id: 'pruefen',       label: 'Prüfen',   render: viewPruefen },
  { id: 'auszahlung',    label: 'Auszahlung',    render: viewAuszahlung },
  { id: 'export',        label: 'Export',        render: viewExport },
];

let current = 'start';
let letzteAngezeigteView = null;

export function goto(id) {
  if (!VIEWS.some(v => v.id === id)) return;
  current = id;
  location.hash = id;
  render();
}

const IMMER_OFFEN = new Set(['start', 'veranstaltung']);

function hatDaten(p) { return !!(p && (p.personen.length || p.abschnitte.length)); }

function nav() {
  const p = store.getProject();
  const box = clear(document.getElementById('nav'));
  for (const v of VIEWS) {
    const disabled = !IMMER_OFFEN.has(v.id) && !hatDaten(p);
    box.append(el('button', {
      class: v.id === current ? 'active' : '',
      disabled,
      onclick: () => goto(v.id),
    }, v.label));
  }
  document.getElementById('projektname').textContent =
    p?.veranstaltung?.name ? `· ${p.veranstaltung.name}` : '';
  const st = document.getElementById('speicherstatus');
  st.textContent = store.isDirty() ? 'ungesichert' : 'gesichert';
  st.classList.toggle('dirty', store.isDirty());
}

function render() {
  nav();
  const p = store.getProject();
  const scrollY = window.scrollY;
  // Fokus vor dem Entfernen der alten Ansicht lösen: Mobile Browser scrollen
  // sonst automatisch zum zuletzt fokussierten Element, sobald es aus dem DOM
  // verschwindet (typisches iOS-/Android-Safari-Verhalten bei Buttons/Selects
  // in der Personen-Matrix) und überschreiben damit den Restore unten.
  document.activeElement?.blur();
  const host = clear(document.getElementById('view'));
  let view = VIEWS.find(v => v.id === current);
  if (!IMMER_OFFEN.has(current) && !hatDaten(p)) view = VIEWS[0];
  view.render(host, { goto });
  const zielScroll = view.id !== letzteAngezeigteView ? 0 : scrollY;
  window.scrollTo(0, zielScroll);
  // Zusätzlich einen Frame später erneut setzen: Manche mobilen Browser
  // korrigieren den Scroll erst nach dem Layout-Pass wieder auf die alte
  // Position, was den obigen sofortigen Aufruf sonst rückgängig machen kann.
  requestAnimationFrame(() => window.scrollTo(0, zielScroll));
  letzteAngezeigteView = view.id;
}

store.subscribe((_p, meta) => {
  if (meta && meta.quiet) { updateStatusBadge(); return; }
  render();
});

function updateStatusBadge() {
  const st = document.getElementById('speicherstatus');
  if (!st) return;
  st.textContent = store.isDirty() ? 'ungesichert' : 'gesichert';
  st.classList.toggle('dirty', store.isDirty());
}

// Init
const fromHash = location.hash.replace('#', '');
if (VIEWS.some(v => v.id === fromHash)) current = fromHash;

const auto = store.ladeAutosave();
if (auto && (auto.personen.length || auto.abschnitte.length)) {
  store.setProject(auto, { markClean: true });
  if (current === 'start') current = 'personen';
} else {
  store.neuesProjekt();
  if (!IMMER_OFFEN.has(current)) current = 'start';
}
render();

window.addEventListener('hashchange', () => {
  const id = location.hash.replace('#', '');
  if (id && id !== current) goto(id);
});
