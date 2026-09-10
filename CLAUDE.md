# CLAUDE.md — KR-Abrechnung

Browser-App für den Finanzwart (Stefan, USV TU Dresden): erzeugt nach einem
Schwimm-Wettkampf die **Auszahlungsliste** (Aufwandsentschädigung für Kampfgericht,
Wettkampfleitung, Auswertung, Orga, Läufer) im LSV-Sachsen-Layout, inkl.
Tablet-Unterschrift. Vollständige Beschreibung: `README.md`.

## Grundregeln (nicht verletzen)

- **Vanilla JS, ES-Module, kein Build.** Keine npm-Abhängigkeiten, kein Bundler.
  Fremd-Bibliotheken (`pdf.js`, `pdf-lib`) liegen fest versioniert in `lib/` —
  nicht ohne Grund aktualisieren.
- **Alles läuft im Browser, offline.** Keine Server-Calls, kein Login, keine
  Analytics, keine CDN-Links, keine externen Fonts. „Keine Daten verlassen das
  Gerät" ist das zentrale Versprechen — jede Zeile, die das bricht, ist ein Fehler.
- **`file://` funktioniert nicht** (ES-Module). Lokal über `Start.bat` bzw.
  `serve.ps1` (Port 8777).
- **Tablet-first.** Bedienung mit Finger/Stift, große Trefferflächen.
- **Deutsch** in allen UI-Texten und Kommentaren.

## Aufbau

```
index.html               App-Shell, lädt js/app.js (ES-Modul)
css/style.css             Styling in USV-Optik, CSS-Variablen in :root (--green-dark #017634)
assets/fonts/             Roboto / Roboto Slab (woff2, selbst gehostet)
js/
  app.js                 Bootstrap, Navigation (6 Views), Autosave-Anbindung
  dom.js                 el() / clear() — Mini-DOM-Helfer, überall genutzt
  state.js               Projektmodell, Autosave (localStorage), Datei-I/O, Import
  rates.js               ROLLEN (+ Kürzel/Gruppen), defaultSaetze, Kernregel betragJeAbschnitt()
  calc.js                Beträge je Person, Tage, Validierung/Warnungen
  import-csv.js           Parser Meldeliste-CSV
  import-meldeergebnis.js Parser Meldeergebnis-PDF (pdf.js)
  pdf-export.js           Auszahlungsliste als PDF (pdf-lib)
  signature.js            Unterschrift-Canvas
  views/view-*.js         6 Ansichten: start · veranstaltung · personen · pruefen · auszahlung · export
lib/                     pdf.js, pdf-lib (fest versioniert — nicht anfassen)
beispiel/                Referenzdateien für den Selbsttest
```

App-Ablauf: Start → Veranstaltung (Import) → Personen (Rollen je Abschnitt) →
Prüfen → Auszahlung (Unterschrift) → Export (PDF + Projektdatei).

## Rechenkern

- Autoritativ: `js/rates.js` — `defaultSaetze`, die Rollenliste `ROLLEN` und
  `betragJeAbschnitt()` (Dauer-Staffelung Grundsatz G / Maximalsatz M).
  Regeln als Kurzfassung in `README.md` unter „Rechenregeln".
- Läufer: 3 Stufen-Rollen (`laeufer_1..3`). „Sachbearbeiter Meldeverfahren" ist
  keine Abschnitts-Rolle, sondern ein Zuschlag je Abschnitt (Kürzel `SB`).
- Sätze sind Defaults: je Wettkampf in der App editierbar, in der Projektdatei
  gespeichert. Dauerhafte Änderung → `defaultSaetze` in `rates.js` + neu deployen.

## Änderungen prüfen

- **`tests.html` über http öffnen** (nicht `file://`) — prüft Rechenkern +
  CSV-Parser gegen `beispiel/`. Nach jeder Änderung an `rates.js` / `calc.js` /
  den Import-Parsern hier gegenchecken.
- Kein CI. Verifikation = Selbsttest + im Browser durchklicken.

## Deploy

GitHub Pages, Branch **`master`**. Nach Änderung `git commit` + `git push`.
Erscheint die neue Version nicht: Cache-Version in `sw.js` hochzählen
(`kr-abrechnung-vN`); neue statische Assets zusätzlich in die Precache-Liste.

## Gerade in Arbeit

Nichts Offenes. Die USV-Optik ist umgesetzt (`css/style.css`, `assets/fonts/`,
`.topbar`/`.navband` in `index.html`). `entwurf/design-preview.html` liegt im Repo
als Farb-/Baustein-Referenz — maßgeblich ist aber `css/style.css`; die Preview
ist eine Momentaufnahme und wird nicht mitgepflegt. `entwurf/fonts/` ist per
`.gitignore` ausgeschlossen (Dublette von `assets/fonts/`).

## Aufgabenverwaltung

Subagent **`trello`** (`.claude/agents/trello.md` im übergeordneten Ordner
`Schwimmen/.claude/`) — Board „KR-Abrechnungs-App (Schwimmen)". „Was ist offen?"
oder neue Aufgabe notieren → über diesen Agent.

## Memory

Zu diesem Projekt gibt es gespeicherte Notizen (z. B. `kuerzel-rollen`), auf die
`rates.js` im Kommentar verweist. Bei Widersprüchen zwischen Memory und Code
gilt der Code.
