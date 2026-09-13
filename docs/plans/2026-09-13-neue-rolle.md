# Neue Rolle (Imbissleiter, Imbisshelfer)

## Annahmen
- **Test-Instanz:** Arbeit findet ausschließlich in `kr-abrechnung-test`
  statt (siehe Nutzer-Vorgabe zum Original-Repo `kr-abrechnung`, das live
  via GitHub Pages beim echten Wettkampf-Finanzwart deployt).
- "Es gibt keine Begrenzung der Zeiten. Es zählt rein der Abschnitt" wird
  gelesen als: ein ECHTER Pauschalbetrag pro Abschnitt, unabhängig von der
  Abschnittsdauer — anders als die bestehende Grund-/Maximalsatz-Logik in
  `betragJeAbschnitt()` (`js/rates.js:91-99`), die je nach Dauer zwischen
  1×Grundsatz/1×Maximalsatz/2×Grundsatz/3×Grundsatz unterscheidet. Für
  Imbissleiter/-helfer greift KEINE dieser Stufen — immer exakt der
  genannte Betrag (20 € bzw. 15 €) pro Abschnitt, unabhängig davon, ob der
  Abschnitt z. B. 90 oder 300 Minuten dauert. Das ist eine dritte
  Berechnungsart, zusätzlich zur bestehenden vollen Stufung und der
  bereits vorhandenen `keinDoppelsatz`-Variante für Läufer (die bei langer
  Dauer immer noch zwischen Grund-/Maximalsatz unterscheidet, nur nie
  verdoppelt/verdreifacht — das reicht hier nicht aus).
- Modellierung: neues optionales Feld `satz.pauschale` (Zahl). Ist es
  gesetzt, liefert `betragJeAbschnitt()` diesen Wert direkt zurück, ohne
  die Dauer überhaupt zu betrachten — bestehendes `grund`/`max`-Verhalten
  bleibt für alle anderen Rollen unverändert.
- Beide neuen Rollen werden der Gruppe `orga` zugeordnet (wie
  Organisationsleiter/-mitarbeiter/-helfer — Imbissleiter/-helfer sind
  organisatorische Helferrollen, keine Kampfgericht-/Leitungsrollen; im
  Kartentext nicht explizit genannt, aber naheliegendste Einordnung in die
  bestehenden vier `GRUPPEN`).
- Kürzel wie im Kartentext vorgegeben: `IL` (Imbissleiter), `IH`
  (Imbisshelfer) — diese erscheinen automatisch auf der Auszahlungsliste
  (`kuerzelFor()` wird bereits generisch für alle `ROLLEN`-Einträge
  verwendet, keine Änderung an der PDF-Export-Logik nötig).

## Goal

Zwei neue, im Kartentext vorgegebene Rollen ("Imbissleiter" / "IL" / 20 €
pro Abschnitt, "Imbisshelfer" / "IH" / 15 € pro Abschnitt, jeweils als
echter Pauschalbetrag ohne Dauer-Staffelung) in der App verfügbar machen —
Personen-Zuordnung, Berechnung, Auszahlungsliste.

## Architecture

Erweiterung der bestehenden, bereits generischen `ROLLEN`/`defaultSaetze()`-
Struktur (`js/rates.js`) um einen neuen Pauschal-Rechenpfad in
`betragJeAbschnitt()`. Keine neuen Dateien, keine UI-Änderung nötig (Rollen-
Dropdown, Personen-Matrix und PDF-Export iterieren bereits generisch über
`ROLLEN`).

## Tech Stack

Vanilla JavaScript (bestehendes Muster in `js/rates.js`/`js/calc.js`).

## Spec

- `ROLLEN` (`js/rates.js`) bekommt zwei neue Einträge:
  `{ key: 'imbissleiter', label: 'Imbissleiter', kuerzel: 'IL', gruppe: 'orga' }`
  und
  `{ key: 'imbisshelfer', label: 'Imbisshelfer', kuerzel: 'IH', gruppe: 'orga' }`.
- `defaultSaetze()` bekommt für beide neuen Keys `{ pauschale: 20 }` bzw.
  `{ pauschale: 15 }` statt der üblichen `{ grund, max }`-Form.
- `betragJeAbschnitt(dauerMin, satz, opts)`: am Funktionsanfang prüfen, ob
  `satz?.pauschale` eine Zahl > 0 ist — falls ja, diesen Wert direkt
  zurückgeben, ohne `dauerMin`/`keinDoppelsatz` zu berücksichtigen. Bestehende
  Logik (Zeilen 92-98) bleibt für alle Rollen ohne `pauschale`-Feld
  unverändert.
- `faktorText()` (Anzeige, welcher Faktor greift): für Pauschal-Rollen
  einen eigenen Text zurückgeben, z. B. `"Pauschale"` statt
  `"1× Grundsatz"` etc. — sonst würde die Prüfen-Ansicht einen irreführenden
  Faktor anzeigen.
- `js/calc.js`'s Validierung (Zeile ~143, `Number(s.grund) > 0`-Check für
  "Rolle gesetzt, aber Satz grund/max = 0") muss die neue Pauschal-Form mit
  abdecken, sonst würde die Warnung "Satz nicht gesetzt" für IL/IH
  fälschlich immer feuern.

### Task 1: Rollen + Sätze ergänzen

- [ ] **`ROLLEN` in `js/rates.js` um beide Einträge erweitern**

Wie in der Spec beschrieben, an passender Stelle (Ende der Liste, vor
`ROLLE_BY_KEY`).

- [ ] **`defaultSaetze()` um beide Pauschal-Sätze erweitern**

Wie in der Spec beschrieben.

### Task 2: Berechnung auf Pauschale erweitern

- [ ] **`betragJeAbschnitt()` um den Pauschal-Zweig ergänzen**

Am Funktionsanfang: `if (Number(satz?.pauschale) > 0) return Number(satz.pauschale);`
— vor der bestehenden Dauer-Logik.

- [ ] **`faktorText()` entsprechend ergänzen**

Denselben Pauschale-Check ergänzen, Rückgabe `"Pauschale"` (oder
äquivalent kurzer Text) statt der bestehenden Faktor-Texte.

### Task 3: Validierung anpassen

- [ ] **`js/calc.js`'s Satz-Vollständigkeitsprüfung erweitern**

Die Stelle, die aktuell `Number(s.grund) > 0` (bzw. `s.max`) prüft, um
einen Fall "Rolle gesetzt, aber Satz weder Grund-/Max- noch
Pauschale-Feld gültig > 0" erweitern — die bestehende Warnung darf für
IL/IH nicht fälschlich feuern, muss aber weiterhin greifen, falls z. B.
`pauschale: 0` oder gar kein Satz-Eintrag für den Key existiert.

### Task 4: Verifizieren

- [ ] **Selbsttests laufen lassen**

`tests.html` im Browser öffnen (Start.bat), grün bestätigen. Falls dort
bereits satzspezifische Testfälle existieren, mindestens einen neuen
Testfall für einen Pauschal-Abschnitt ergänzen (z. B. Imbissleiter, 300
Minuten Abschnittsdauer → weiterhin genau 20 €, nicht 3×20).

- [ ] **Manueller Testlauf**

In der App: eine Testperson mit Rolle "Imbissleiter" für einen Abschnitt
mit sehr kurzer (z. B. 30 min) und sehr langer (z. B. 300 min) Dauer
eintragen — Betrag muss in beiden Fällen exakt 20 € sein. Gleiches für
"Imbisshelfer" mit 15 €. Prüfen-Ansicht: Faktor-Anzeige zeigt "Pauschale"
statt eines Vielfachen. Auszahlungsliste (Vorschau/PDF): Kürzel "IL"/"IH"
erscheinen korrekt.

### Task 5: Trello-Karte abschließen

- [ ] **Trello-Karte in "Erledigt" verschieben**

Rufe das Trello-MCP-Tool `trelloWriteCard` auf mit
`{ "action": "move", "cardId": "ari:cloud:trello::card/workspace/684498102cf5d6f06ff77adc/6aa054515a38e79cfb0fa40e", "listId": "ari:cloud:trello::list/workspace/684498102cf5d6f06ff77adc/6a9f1eab38bd8a2afd77a509" }`.
