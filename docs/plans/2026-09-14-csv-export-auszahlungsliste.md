# Excel-/CSV-Export der Auszahlungsliste

## Annahmen
- "Excel/CSV" wird mit einer CSV-Datei umgesetzt, kein echtes `.xlsx` (keine
  neue Bibliothek nötig — passt zu "Vanilla JavaScript, kein Build-Schritt"
  aus der README). Semikolon als Trennzeichen und UTF-8 mit BOM, damit die
  Datei in Excel (deutsche Gebietsschema-Einstellung) korrekt mit Umlauten
  und Dezimal-Komma öffnet.
- Export bildet die gleichen Zeilen/Spalten wie die PDF-Auszahlungsliste ab
  (eine Zeile je Person: Name, Tage, Gesamtbetrag), zusätzlich eine
  Aufschlüsselungs-Spalte je Abschnitt (Abschnitt-Nr., Kürzel, Betrag) als
  ein zusammengefasstes Textfeld — eine vollständig normalisierte Zeile pro
  Abschnitt/Person würde die einfache "eine Zeile je Person"-Struktur für
  die Buchhaltung unnötig verkomplizieren.
- Kein neuer Bestätigungs-/Gegenzeichnungs-Workflow für den CSV-Export
  (das ist ausschließlich für die offizielle, unterschriebene PDF-Liste
  vorgesehen). Der CSV-Export ist als Nice-to-have für die eigene
  Weiterverarbeitung gedacht und daher jederzeit ohne Gegenzeichnung nutzbar.

## Goal

Auf der Export-Ansicht gibt es zusätzlich zum bestehenden PDF-Export einen
Button, der die Auszahlungsliste als CSV-Datei herunterlädt (Excel-kompatibel,
für eigene Weiterverarbeitung/Buchhaltung).

## Architecture

Neue Datei `js/csv-export.js` mit einer Funktion `erzeugeAuszahlungslisteCsv(project)`,
die analog zu `erzeugeAuszahlungslistePdf` (`js/pdf-export.js`) die Daten über
die bestehenden `calc.js`-Helfer (`abzurechnendePersonen`, `personName`,
`personBetrag`, `personTage`, `personAufstellung`, `fmtEuro`) aufbereitet und
einen CSV-`Blob` zurückgibt. `js/views/view-export.js` bekommt einen zweiten
Button neben "Auszahlungsliste als PDF", der diesen Blob über das vorhandene
`downloadBlob`-Muster (`js/dom.js`) herunterlädt.

## Tech Stack

Vanilla JavaScript, keine neuen Abhängigkeiten (kein CSV-/Excel-Package).

## Spec

- Neue Datei `js/csv-export.js`:
  - `export function erzeugeAuszahlungslisteCsv(project)`:
    - Spalten: `Nr.;Name;Tage;Abschnitte;Betrag`
      - `Abschnitte`: aus `personAufstellung(p, project)` zusammengesetzt,
        Format je Zeile `"<Nr> <Kürzel> <Betrag €>"`, mehrere Einträge mit
        `" | "` verbunden (Kommas/Semikolons vermeiden, die die CSV-Struktur
        stören würden).
      - `Betrag`: `personBetrag(p, project)`, mit Komma als Dezimaltrennzeichen
        (deutsches Excel-Format), z. B. `toLocaleString('de-DE', {minimumFractionDigits: 2, maximumFractionDigits: 2})`.
    - Zellen mit Feldtrennzeichen (`;`), Anführungszeichen oder Zeilenumbruch
      per einfacher CSV-Quoting-Hilfsfunktion in `"…"` setzen (Anführungszeichen
      im Text verdoppeln), analog zu gängigen CSV-Exportern.
    - Letzte Zeile: `Summe;;;;<gesamtSumme(project) formatiert>`.
    - Zeilenumbrüche `\r\n` (Excel-Standard).
    - Rückgabe als `new Blob(['﻿' + csvText], { type: 'text/csv;charset=utf-8' })`
      (BOM voranstellen, damit Excel UTF-8 korrekt erkennt).
- `js/views/view-export.js`:
  - Import `erzeugeAuszahlungslisteCsv` aus `../csv-export.js`.
  - Zweiten Button `'Als CSV exportieren'` neben dem bestehenden PDF-Button
    (`el('div', { class: 'row' }, btn, csvBtn, ...)`) ergänzen.
  - `onclick`-Handler analog zu `erzeugePdf()`: Blob erzeugen, mit
    `downloadBlob(blob, ...)` herunterladen; Dateiname nach gleichem Muster
    wie beim PDF (`${datum}_Auszahlungsliste_${name}.csv`), kein Signatur-/
    Gegenzeichnungs-Gate davor (siehe Annahmen).

### Task 1: CSV-Export-Funktion implementieren

- [ ] **`js/csv-export.js` anlegen**

Neue Datei mit `erzeugeAuszahlungslisteCsv(project)` wie oben spezifiziert:
Kopfzeile, eine Zeile je Person aus `abzurechnendePersonen(project)`
(Name über `personName`, Tage über `personTage`, Abschnitts-Aufschlüsselung
über `personAufstellung`, Betrag über `personBetrag`/`fmtEuro`), Summenzeile
über `gesamtSumme(project)`. CSV-Quoting-Hilfsfunktion für Zellen mit `;`,
`"` oder Zeilenumbruch. Rückgabe als `Blob` mit BOM und
`text/csv;charset=utf-8`.

### Task 2: Button in der Export-Ansicht ergänzen

- [ ] **CSV-Button neben dem PDF-Button einbauen**

In `js/views/view-export.js`: Import ergänzen, neuen Button
`'Als CSV exportieren'` im `row`-Div neben dem PDF-Button rendern, Klick-
Handler erzeugt den Blob über `erzeugeAuszahlungslisteCsv(store.getProject())`
und lädt ihn per `downloadBlob` mit Dateinamen
`${new Date().toISOString().slice(0,10)}_Auszahlungsliste_${name}.csv`
herunter (Namens-Bereinigung wie beim PDF-Export übernehmen). Kurzer
Statustext analog zum PDF-Export (`status.textContent`).

### Task 3: Verifizieren

- [ ] **Manueller Testlauf**

App über `Start.bat` lokal starten, eine Beispiel-Abrechnung mit mehreren
Personen/Abschnitten anlegen (oder eine bestehende Projektdatei/das
`beispiel/`-Material laden). Auf "Export" gehen, "Als CSV exportieren"
klicken → Datei wird heruntergeladen. Datei in Excel öffnen (oder als Text
prüfen): Kopfzeile, Personen-Zeilen mit korrekten Beträgen (Komma als
Dezimaltrennzeichen, Umlaute korrekt dargestellt), Summenzeile stimmt mit
der Gesamtsumme aus der App überein.

### Task 4: Trello-Karte zum manuellen Test einreichen

- [ ] **Trello-Karte in "Review / Test" verschieben**

Rufe das Trello-MCP-Tool `trelloWriteCard` auf mit
`{ "action": "move", "cardId": "ari:cloud:trello::card/workspace/684498102cf5d6f06ff77adc/6a9f1f3af51fd6a6b63edce1", "listId": "ari:cloud:trello::list/workspace/684498102cf5d6f06ff77adc/6a9f1ea09deffce313fbaf24" }`.

Die Karte NICHT direkt nach "Erledigt" verschieben — das macht der Nutzer
erst manuell, nachdem er die Umsetzung in der Test-Instanz selbst getestet
hat.
