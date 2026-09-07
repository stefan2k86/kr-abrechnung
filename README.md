# KR-Abrechnung

Kleine Browser-App für den Finanzwart: erzeugt nach einem Schwimm-Wettkampf die
**Auszahlungsliste** (Aufwandsentschädigung für Kampfrichter, Schiedsrichter,
Protokoll/Auswerter/Starter/Sprecher, Orga-Team und Läufer) im LSV-Sachsen-Layout,
inkl. Unterschrift auf dem Tablet.

- Läuft komplett im Browser. **Keine Daten verlassen das Gerät.** Kein Server, kein Login.
- Automatische Sicherung im Browser; zur Weitergabe an eine Vertretung eine **Projektdatei** speichern.
- Vanilla JavaScript, kein Build-Schritt. Bibliotheken (`pdf.js`, `pdf-lib`) liegen unter `lib/`.

## Bedienung

1. **Start** – neue Abrechnung beginnen oder Projektdatei laden.
2. **Veranstaltung** – Meldeergebnis-PDF einlesen (Abschnitte + Zeiten) und/oder Meldeliste-CSV.
   Alle Werte sind danach editierbar. Hier auch die Sätze prüfen und den **Läufersatz** eintragen.
3. **Personen** – Meldeliste-CSV einlesen. Je Person und Abschnitt „im Einsatz" + **Rolle** wählen.
   Orga/Läufer über „+ Person" ergänzen. Abgemeldete sind vorab abgehakt.
4. **Prüfen** – Beträge je Person mit Aufschlüsselung, Gesamtsumme, Warnungen.
5. **Auszahlung** – je Person mit dem Finger/Stift auf dem Tablet unterschreiben.
6. **Export** – Auszahlungsliste als PDF herunterladen; Projektdatei speichern.

## Rechenregeln (Kurzfassung)

Betrag je Abschnitt (Rolle mit Grundsatz **G** / Maximalsatz **M**), Dauer *d* = Abschnittsende − Beginn (brutto):

| Dauer *d* | Betrag |
|---|---|
| ≤ 120 min | 1 × G |
| 121–180 min | 1 × M |
| 181–260 min | 2 × G |
| > 260 min | 3 × G |

- Läufer: fester €-Wert **je Abschnitt** (keine Dauerlogik), pro Wettkampf einzugeben.
- Betrag je Person = Summe über alle real besetzten Abschnitte. Rolle darf je Abschnitt wechseln.
- „Tage" = Anzahl verschiedener Abschnitts-Datumswerte im Einsatz. Max. 2 Abschnitte/Tag.
- Anspruch: Meldestatus „Bestätigt" **und** „im Einsatz". Abgemeldete/No-Shows raus.
  Praktikanten/Sonderfälle über „kein Anspruch" pro Person ausschließen.

Standard-Sätze siehe `js/rates.js` (`defaultSaetze`). Dauerhaft ändern → dort anpassen und neu deployen.
Einmalige Änderung für einen Wettkampf → in der App unter „Veranstaltung".

## Selbsttest

`tests.html` im Browser öffnen (App muss über http/https laufen, nicht als `file://`).
Prüft Rechenkern und CSV-Parser gegen die Dateien in `beispiel/`.

## Lokal ausprobieren

Wegen ES-Modulen und `fetch` einen kleinen Webserver nutzen, z. B.:

```bash
npx serve .
# oder
python -m http.server 8000
```

## Deploy auf GitHub Pages

1. GitHub-Konto → neues, leeres Repository `kr-abrechnung`.
2. In diesem Ordner:
   ```bash
   git remote add origin https://github.com/<DEIN-NAME>/kr-abrechnung.git
   git push -u origin main
   ```
3. Repo → **Settings → Pages** → Source „Deploy from a branch", Branch `main`, Ordner `/ (root)` → Save.
4. Nach ~1 Minute erreichbar unter `https://<DEIN-NAME>.github.io/kr-abrechnung/`.
   Auf dem Tablet als Lesezeichen / „Zum Startbildschirm hinzufügen".

Nach einer Änderung: `git commit` + `git push` – Pages aktualisiert sich automatisch.
Wenn eine neue Version nicht erscheint: Service-Worker-Cache-Version in `sw.js` hochzählen
(`kr-abrechnung-v1` → `-v2`).

## Ordner

```
index.html            App-Shell
css/style.css          Tablet-first Styling
js/                    Anwendungscode (ES-Module)
  rates.js             Rollen + Default-Sätze + Kernregel betragJeAbschnitt()
  calc.js              Beträge, Tage, Validierung
  state.js             Projektmodell, Autosave, Datei-I/O, Import-Anwendung
  import-csv.js         Parser Meldeliste
  import-meldeergebnis.js  Parser Meldeergebnis-PDF (pdf.js)
  pdf-export.js         Auszahlungsliste-PDF (pdf-lib)
  signature.js          Unterschrift-Canvas
  views/               Ansichten
lib/                   pdf.js, pdf-lib (fest versioniert)
beispiel/              Referenz-/Testdateien
```
