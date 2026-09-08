// Rollen und Aufwandsentschädigungs-Sätze (SSV Schwimmen 10.1, modifiziert).
// Sätze sind Defaults – in der App je Wettkampf editierbar und in der Projektdatei gespeichert.

export const GRUPPEN = {
  kampfgericht: 'Kampfgericht',
  leitung: 'Wettkampfleitung',
  auswertung: 'Protokoll / Auswertung',
  orga: 'Organisation',
};

// Reihenfolge = Anzeigereihenfolge in Dropdowns.
// kuerzel = Kurzform für die Auszahlungsliste (siehe Memory „kuerzel-rollen").
export const ROLLEN = [
  { key: 'schiedsrichter',        label: 'Schiedsrichter',            kuerzel: 'SCH', gruppe: 'leitung' },
  { key: 'starter',               label: 'Starter',                   kuerzel: 'ST',  gruppe: 'leitung' },
  { key: 'sprecher',              label: 'Sprecher',                  kuerzel: 'SPR', gruppe: 'leitung' },
  { key: 'protokoll',             label: 'Protokollführer',      kuerzel: 'PF',  gruppe: 'auswertung' },
  { key: 'auswerter',             label: 'Auswerter',                 kuerzel: 'AW',  gruppe: 'auswertung' },
  { key: 'schwimmrichter',        label: 'Schwimmrichter',            kuerzel: 'SR',  gruppe: 'kampfgericht' },
  { key: 'zeitnehmer',            label: 'Zeitnehmer',                kuerzel: 'ZN',  gruppe: 'kampfgericht' },
  { key: 'zeitnehmer_obmann',     label: 'Zeitnehmer-Obmann (ZNO)',   kuerzel: 'ZNO', gruppe: 'kampfgericht' },
  { key: 'wenderichter',          label: 'Wenderichter',              kuerzel: 'WR',  gruppe: 'kampfgericht' },
  { key: 'wenderichter_obmann',   label: 'Wenderichter-Obmann (WRO)', kuerzel: 'WRO', gruppe: 'kampfgericht' },
  { key: 'zielrichter',           label: 'Zielrichter',               kuerzel: 'ZR',  gruppe: 'kampfgericht' },
  { key: 'zielrichter_obmann',    label: 'Zielrichter-Obmann (ZRO)',  kuerzel: 'ZRO', gruppe: 'kampfgericht' },
  { key: 'zeitmessanlage',        label: 'Bediener Zeitmessanlage',   kuerzel: 'ZMA', gruppe: 'kampfgericht' },
  { key: 'orgaleiter',            label: 'Organisationsleiter',       kuerzel: 'OL',  gruppe: 'orga' },
  { key: 'orgamitarbeiter',       label: 'Organisationsmitarbeiter',  kuerzel: 'OM',  gruppe: 'orga' },
  { key: 'orgahelfer',            label: 'Organisationshelfer',       kuerzel: 'OH',  gruppe: 'orga' },
  { key: 'laeufer_1',             label: 'Läufer – Stufe 1',     kuerzel: 'L1',  gruppe: 'orga', laeufer: true },
  { key: 'laeufer_2',             label: 'Läufer – Stufe 2',     kuerzel: 'L2',  gruppe: 'orga', laeufer: true },
  { key: 'laeufer_3',             label: 'Läufer – Stufe 3',     kuerzel: 'L3',  gruppe: 'orga', laeufer: true },
];

export const ROLLE_BY_KEY = Object.fromEntries(ROLLEN.map(r => [r.key, r]));

// Sachbearbeiter Meldeverfahren ist keine Abschnitts-Rolle, hat aber ein Kürzel für die Liste.
export const KUERZEL_EXTRA = { sachbearbeiter: 'SB' };

export function rollenLabel(key) {
  return ROLLE_BY_KEY[key]?.label || key || '–';
}

export function kuerzelFor(key) {
  return ROLLE_BY_KEY[key]?.kuerzel || KUERZEL_EXTRA[key] || (key ? '?' : '–');
}

// Grund- / Maximalsatz je Abschnitt in Euro
export function defaultSaetze() {
  const s18 = { grund: 15, max: 18 };
  const s15 = { grund: 12, max: 15 };
  return {
    schiedsrichter: { ...s18 },
    starter: { ...s18 },
    sprecher: { ...s18 },
    protokoll: { ...s18 },
    auswerter: { ...s18 },
    orgaleiter: { ...s18 },
    schwimmrichter: { ...s15 },
    zeitnehmer: { ...s15 },
    zeitnehmer_obmann: { ...s15 },
    wenderichter: { ...s15 },
    wenderichter_obmann: { ...s15 },
    zielrichter: { ...s15 },
    zielrichter_obmann: { ...s15 },
    zeitmessanlage: { ...s15 },
    orgamitarbeiter: { ...s15 },
    orgahelfer: { grund: 6, max: 7 },
    // Läufer: Stufe wählt der Finanzwart anhand einer externen Liste (Einsätze über die
    // Lebenszeit des Läufers). Je Abschnitt Grund-/Maximalsatz nach der 120-min-Grenze,
    // aber KEIN doppelter Grundsatz (siehe betragJeAbschnitt).
    laeufer_1: { grund: 6, max: 7 },
    laeufer_2: { grund: 8, max: 9 },
    laeufer_3: { grund: 10, max: 11 },
    // Sachbearbeiter Meldeverfahren: 12 € je Abschnitt des Wettkampfs, ZUSÄTZLICH zur
    // eigentlichen Rolle. Genau eine Person je Wettkampf (project.sachbearbeiterPersonId).
    sachbearbeiterProAbschnitt: 12,
  };
}

export function istLaeuferRolle(key) {
  return !!ROLLE_BY_KEY[key]?.laeufer;
}

// Kernregel: Betrag EINES Abschnitts für eine dauer- und satzabhängige Rolle.
//   d <= 120  -> 1x Grundsatz
//   121..180  -> 1x Maximalsatz
//   181..260  -> 2x Grundsatz
//   > 260     -> 3x Grundsatz
// keinDoppelsatz (Läufer): immer nur 1x – d<=120 Grundsatz, sonst Maximalsatz.
export function betragJeAbschnitt(dauerMin, satz, { keinDoppelsatz = false } = {}) {
  const g = Number(satz?.grund) || 0;
  const m = Number(satz?.max) || 0;
  const d = Number(dauerMin) || 0;
  if (d <= 120) return g;
  if (keinDoppelsatz || d <= 180) return m;
  if (d <= 260) return 2 * g;
  return 3 * g;
}

// Für Anzeige: welcher Faktor greift?
export function faktorText(dauerMin, keinDoppelsatz = false) {
  const d = Number(dauerMin) || 0;
  if (d <= 0) return '–';
  if (d <= 120) return '1× Grundsatz';
  if (keinDoppelsatz || d <= 180) return '1× Maximalsatz';
  if (d <= 260) return '2× Grundsatz';
  return '3× Grundsatz';
}
