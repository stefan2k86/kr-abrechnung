# Springen in der Liste

## Annahmen
- Das Springen betrifft nicht nur „im Einsatz" (Checkbox), sondern jede
  Änderung, die über `store.patch`/`store.update` läuft (z. B. auch
  Rollen-Auswahl, „kein Anspruch", Sachbearbeiter-Dropdown) — die Karte
  nennt „im Einsatz" nur als Beispiel ("zb"). Die Ursache ist dieselbe für
  alle diese Felder, siehe Architecture.
- Beim tatsächlichen Wechsel der Ansicht (z. B. Klick auf „Prüfen" in der
  Navigation) soll weiterhin nach oben gescrollt werden — das ist gewünschtes
  Verhalten für eine neue Ansicht, nicht Teil des gemeldeten Problems.

## Goal

Ein Klick auf ein Feld in der Personen-Tabelle (Checkbox „im Einsatz",
Rollen-Auswahl, „kein Anspruch" etc.) löst weiterhin die bestehende
Neu-Darstellung der Ansicht aus, springt aber nicht mehr an den Seitenanfang
— die Scroll-Position bleibt erhalten, damit direkt weitergearbeitet werden
kann. Ein echter Wechsel der Ansicht (Navigation) scrollt weiterhin nach oben.

## Architecture

In `js/app.js` ruft `render()` nach jedem Neuaufbau der Ansicht
unbedingt `window.scrollTo(0, 0)` auf (Zeile 58). `render()` wird sowohl von
`goto()` (echter Ansichtswechsel) als auch vom `store.subscribe`-Callback
(jede Datenänderung, z. B. Checkbox-Klick in `view-personen.js`) aufgerufen,
da beide dieselbe Funktion nutzen, um die aktive View aus `VIEWS` neu zu
rendern. Der Fix unterscheidet beide Fälle: Scroll nur zurücksetzen, wenn
sich die tatsächlich angezeigte View-`id` gegenüber dem letzten Render
geändert hat; bleibt sie gleich (reine Datenänderung), die vorherige
Scroll-Position wiederherstellen statt sie zu verwerfen.

## Tech Stack

Vanilla JavaScript, kein Build-Schritt, keine neuen Abhängigkeiten.

## Spec

- `js/app.js`: Modul-weite Variable `let letzteAngezeigteView = null;`
  ergänzen (neben `let current = 'start';`).
- In `render()`: vor dem `clear(...)`/Neuaufbau `const scrollY =
  window.scrollY;` merken. Nach `view.render(host, { goto })` statt dem
  bisherigen unbedingten `window.scrollTo(0, 0)`:
  ```js
  if (view.id !== letzteAngezeigteView) {
    window.scrollTo(0, 0);
  } else {
    window.scrollTo(0, scrollY);
  }
  letzteAngezeigteView = view.id;
  ```
  (`view` ist die bereits im Bestandscode ermittelte, tatsächlich
  gerenderte View — inkl. dem Fallback auf `VIEWS[0]`, falls `current` noch
  keine Daten hat.)
- Kein Eingriff in `store.subscribe`, `goto()` oder `view-personen.js`
  nötig — die Unterscheidung „Navigation vs. Datenänderung" ergibt sich
  automatisch daraus, ob sich die angezeigte View-`id` geändert hat.

### Task 1: Scroll-Verhalten in app.js korrigieren

- [ ] **`render()` anpassen**

In `js/app.js` die Variable `letzteAngezeigteView` einführen und die
`window.scrollTo(0, 0)`-Zeile in `render()` wie oben in der Spec beschrieben
durch die bedingte Logik ersetzen (Scroll nur bei View-Wechsel auf 0
zurücksetzen, sonst vorherige `scrollY` wiederherstellen).

### Task 2: Verifizieren

- [ ] **Manueller Testlauf**

App über `Start.bat` lokal starten, Meldeergebnis/CSV einlesen, zur Ansicht
„Personen" wechseln, in der Tabelle nach unten scrollen (genug Personen/
Abschnitte, dass die Tabelle die Seite überragt — notfalls Browserfenster
verkleinern), dann bei einer Person weiter unten die Checkbox „im Einsatz"
oder die Rollen-Auswahl ändern: Die Seite darf nicht an den Anfang springen,
die Scroll-Position bleibt erhalten. Anschließend zur Ansicht „Prüfen"
wechseln: Dort soll die Seite wie bisher oben beginnen (Scroll-Reset bei
echtem Ansichtswechsel funktioniert weiterhin).

### Task 3: Trello-Karte zum manuellen Test einreichen

- [ ] **Trello-Karte in "Review / Test" verschieben**

Rufe das Trello-MCP-Tool `trelloWriteCard` auf mit
`{ "action": "move", "cardId": "ari:cloud:trello::card/workspace/684498102cf5d6f06ff77adc/6aa9811b5ee4491ebbb7ee0d", "listId": "ari:cloud:trello::list/workspace/684498102cf5d6f06ff77adc/6a9f1ea09deffce313fbaf24" }`.

Die Karte NICHT direkt nach "Erledigt" verschieben — das macht der Nutzer
erst manuell, nachdem er die Umsetzung in der Test-Instanz selbst getestet
hat.
