# Stammdaten (wiederkehrende Mitglieder/Läufer)

## Annahmen

- **Annahme (unbeantwortet) — Speicherort:** Die App verspricht zentral
  "keine Daten verlassen das Gerät. Kein Server, kein Login." (`README.md`,
  `CLAUDE.md`) und läuft öffentlich über GitHub Pages. Eine im Code
  mitgelieferte Stammdaten-Datei mit echten Namen wäre öffentlich einsehbar
  und würde dieses Versprechen brechen. Die Stammdaten-Liste wird daher
  **nur lokal im Browser** gespeichert (eigener `localStorage`-Schlüssel,
  analog zum bestehenden Autosave-Mechanismus in `state.js`), unabhängig
  von der eigentlichen Wettkampf-Abrechnung (bleibt also auch bei "Neue
  Abrechnung" erhalten). Für die Weitergabe zwischen Geräten (z.B. an eine
  Vertretung) wird — analog zur bestehenden Projektdatei — eine eigene
  **Stammdaten-Datei** (JSON-Export/Import) ergänzt. Zentrale Pflege über
  einen Server ist bewusst NICHT Teil dieses Plans, da das dem
  "kein Server"-Grundprinzip der App widerspricht.
- **Annahme (unbeantwortet) — Umfang der Liste:** Orga-Team UND Läufer
  landen in derselben Stammdaten-Liste (wie im Kartentext als Überlegung
  genannt), mit einem Gruppen-Feld zur Unterscheidung/Filterung — nicht zwei
  getrennte Listen.
- **Annahme (unbeantwortet) — Felder:** Nachname, Vorname, Verein/Hinweis
  (vorbelegt "USV TU Dresden", wie im bestehenden "+ Person"-Dialog),
  Gruppe (Orga/Läufer). Keine Kontaktdaten (Telefon/E-Mail) — dafür nennt
  der Kartentext keinen konkreten Anwendungsfall, und mehr Felder bedeuten
  mehr potenziell sensible Daten, die lokal gespeichert werden. Kann bei
  Bedarf später ergänzt werden.
- **Annahme:** Die Stammdaten-Liste dient ausschließlich dazu, den
  bestehenden "+ Person (Orga / Läufer)"-Dialog in der Ansicht "Personen"
  (`view-personen.js`) schneller zu befüllen (Auswahl statt Neu-Eintippen
  bei jedem Wettkampf) — sie ersetzt nicht die Meldeliste-CSV für
  Kampfrichter/Wettkampfleitung, die weiterhin automatisch importiert wird.

## Goal

Wiederkehrende Orga-Team-Mitglieder und Läufer einmal als "Stammdaten"
erfassen und bei jedem neuen Wettkampf im "+ Person"-Dialog per Auswahl
statt erneuter Texteingabe übernehmen können, ohne dass diese Liste das
Gerät verlässt (außer bei explizitem Export durch den Nutzer).

## Architecture

- Neues Modul `js/stammdaten.js`: eigener `localStorage`-Schlüssel
  (`kr-abrechnung:stammdaten:v1`), CRUD-Funktionen (`liste()`,
  `hinzufuegen()`, `aktualisieren()`, `loeschen()`), plus
  `exportBlob()`/`importDatei()` analog zu `exportProjektBlob()`/
  `importProjektDatei()` in `state.js`. Komplett unabhängig vom
  Projekt-Objekt in `state.js` — wird NICHT Teil der Projektdatei.
- Neue Ansicht/Panel "Stammdaten verwalten": Liste mit Bearbeiten/Löschen,
  Formular zum Hinzufügen. Eingehängt entweder als eigene Navigation
  (7. View) oder als Panel/Modal, erreichbar von "Personen" aus — siehe
  Task 2 für die Detailentscheidung.
  Integration in `view-personen.js`: `personModal()` erhält oberhalb der
  Eingabefelder eine Auswahl ("Aus Stammdaten übernehmen"), die bei
  Auswahl Nachname/Vorname/Verein vorbefüllt (Felder bleiben danach
  editierbar, wie bisher).

## Tech Stack

Vanilla JS, ES-Module, kein Build (Projektregeln aus `CLAUDE.md`),
`localStorage` (wie bestehender Autosave in `state.js`), Datei-Export/
-Import über `Blob`/`FileReader` (wie `exportProjektBlob()`/
`importProjektDatei()`).

## Spec

- `localStorage`-Schlüssel `kr-abrechnung:stammdaten:v1`, Wert: JSON-Array
  von `{ id, nachname, vorname, verein, gruppe }` (`gruppe`: `'orga'` oder
  `'laeufer'`).
- Stammdaten-Datei: JSON-Datei mit erkennbarer Struktur (z.B. Top-Level
  `{ stammdaten: [...] }`), Dateiname-Konvention analog
  `projektDateiname()` (z.B. `stammdaten_usv-tu-dresden.json`).
- Import-Verhalten: vollständiges Ersetzen der aktuellen Liste nach
  Bestätigungsdialog (`confirmDialog`, wie an anderer Stelle in der App
  bereits verwendet) — kein Merge, um Duplikate zu vermeiden.
- `personModal()` in `view-personen.js`: Auswahlliste (gruppiert nach
  Gruppe, sortiert wie `sortPersonen`) über den bestehenden Feldern; Auswahl
  befüllt `f.nachname`/`f.vorname`/`f.verein`, Freitext-Eingabe bleibt
  weiterhin möglich (Stammdaten ist Komfort, keine Pflicht).

### Task 1: Stammdaten-Datenmodul anlegen

- [ ] **`js/stammdaten.js` mit CRUD + Persistenz erstellen**

`liste()`, `hinzufuegen({nachname, vorname, verein, gruppe})`,
`aktualisieren(id, patch)`, `loeschen(id)`, jeweils mit Speichern in
`localStorage` unter `kr-abrechnung:stammdaten:v1` (Try/Catch wie beim
bestehenden Autosave in `state.js`, da `localStorage` in manchen Kontexten
fehlschlagen kann).

- [ ] **Export/Import ergänzen**

`exportStammdatenBlob()` und `importStammdatenDatei(file)`, analog zu den
Projektdatei-Pendants in `state.js`, inkl. Validierung der Struktur beim
Import.

### Task 2: Verwaltungsoberfläche für Stammdaten

- [ ] **UI zum Anzeigen/Hinzufügen/Bearbeiten/Löschen bauen**

Einfachste Variante mit den bestehenden Bausteinen (`el()`, `openModal()`,
`confirmDialog()` aus `dom.js`): ein Panel/Modal "Stammdaten verwalten",
erreichbar über einen neuen Button in `view-start.js` (neben "Projektdatei
laden"). Tabelle mit Name/Verein/Gruppe je Zeile, Bearbeiten- und
Löschen-Buttons, Formular zum Hinzufügen (gleiche Feldstruktur wie
`personModal()`), plus die beiden Datei-Buttons ("Stammdaten exportieren" /
"Stammdaten laden", Import mit `confirmDialog`-Warnung "ersetzt die
aktuelle Liste").

### Task 3: Integration in "+ Person"-Dialog

- [ ] **`personModal()` in `view-personen.js` um Stammdaten-Auswahl erweitern**

Dropdown/Auswahlliste oberhalb der bestehenden Felder, gruppiert nach
Orga/Läufer, mit Option "— neu eingeben —" als Default. Auswahl befüllt
`f.nachname`/`f.vorname`/`f.verein`; Klick auf "Hinzufügen" verhält sich
danach wie bisher (`store.personManuellHinzufuegen(f)`), unabhängig davon
ob die Werte aus Stammdaten oder Freitext stammen.

### Task 4: Verifizieren

- [ ] **`tests.html` über http öffnen**

Prüfen, dass die bestehenden Selbsttests (Rechenkern/CSV-Parser) weiterhin
grün sind — die Änderung berührt keinen Rechenkern, aber `CLAUDE.md`
verlangt diesen Check nach jeder Änderung sicherheitshalber.

- [ ] **Manuell im Browser durchklicken**

Eintrag anlegen → Browser-Tab schließen/neu öffnen → Eintrag noch vorhanden
(persistiert unabhängig von "Neue Abrechnung"). Export → Datei-Inhalt
prüfen → in einem zweiten Browser-Profil importieren → Liste erscheint
identisch. Im "+ Person"-Dialog einen Stammdaten-Eintrag auswählen → Felder
korrekt vorbefüllt, Person landet nach "Hinzufügen" wie gewohnt in der
Personen-Tabelle.

### Task 5: Trello-Karte abschließen

- [ ] **Trello-Karte in "Erledigt" verschieben**

Rufe das Trello-MCP-Tool `trelloWriteCard` auf mit
`{ "action": "move", "cardId": "ari:cloud:trello::card/workspace/684498102cf5d6f06ff77adc/6aa040e6b01d99c0666b9828", "listId": "ari:cloud:trello::list/workspace/684498102cf5d6f06ff77adc/6a9f1eab38bd8a2afd77a509" }`.
