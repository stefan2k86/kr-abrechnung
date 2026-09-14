# Archiv bearbeiten

## Annahmen
- "Wettkämpfe löschen" bezieht sich auf einzelne Einträge in der bestehenden
  Archiv-Liste (`js/archiv.js`, angelegt über die Karte "Archiv") — nicht auf
  das komplette Archiv auf einmal. Deren Plan (`docs/plans/2026-09-13-archiv.md`)
  hatte Einzel-Löschen explizit als "nicht Teil dieser ersten Version"
  ausgeklammert; genau das fordert diese Karte jetzt nach.
- Löschen ist eine destruktive, nicht rückgängig zu machende Aktion → analog
  zu anderen gefährlichen Aktionen in der App über `confirmDialog(..., { danger: true })`
  bestätigen lassen (Muster bereits in `js/dom.js` vorhanden, siehe
  `jaText`-Default `'Löschen'`).
- Kein Mehrfach-Auswahl/Bulk-Löschen (nicht gefordert) — ein Löschen-Button
  pro Archiveintrag reicht.

## Goal

In der Archiv-Liste der Start-Ansicht kann jeder Eintrag (vergangener
Wettkampf) einzeln und mit Bestätigung gelöscht werden.

## Architecture

`js/archiv.js` bekommt eine neue Export-Funktion `loescheAusArchiv(id)`,
die den Eintrag mit passender `id` aus der `localStorage`-Liste entfernt.
`js/views/view-start.js` rendert pro Archiveintrag zusätzlich zum
bestehenden "Laden"-Button einen "Löschen"-Button, der über `confirmDialog`
bestätigt und danach die Ansicht neu rendert.

## Tech Stack

Vanilla JavaScript, `localStorage` (bestehendes Muster), keine neuen
Abhängigkeiten.

## Spec

- `js/archiv.js`: neue Funktion `loescheAusArchiv(id)` — filtert den Eintrag
  mit passender `id` aus der über `ladeListe()` gelesenen Liste heraus und
  schreibt das Ergebnis mit `schreibeListe(...)` zurück (gleiches
  try/catch-Muster wie `archiviere`/`ladeListe`). Kein Fehler, falls die
  `id` nicht existiert (Liste bleibt unverändert).
- `js/views/view-start.js`: im bestehenden `archivListe.map(...)`-Block
  (Zeilen ~60–71) neben dem "Laden"-Button einen zweiten Button
  `'Löschen'` (`class: 'secondary danger'` oder vorhandenes
  Danger-Button-Muster aus der App übernehmen) ergänzen. `onclick` ruft
  `confirmDialog('Archiveintrag „' + (eintrag.veranstaltungName || '(ohne Namen)') + '“ endgültig löschen?', () => { archiv.loescheAusArchiv(eintrag.id); renderStart(...); }, { danger: true, jaText: 'Löschen' })`
  auf. Da `viewStart` den Host bei jedem Aufruf neu befüllt, nach dem
  Löschen entweder den Host leeren und `viewStart(host, { goto })` erneut
  aufrufen, oder das bestehende Re-Render-Muster der View verwenden (im
  Code prüfen, wie andere Aktionen in dieser View die Ansicht aktualisieren,
  z. B. nach "Laden" via `goto(...)` — hier stattdessen einfach neu rendern,
  da man auf der Start-Ansicht bleibt).

### Task 1: Löschen-Funktion in archiv.js

- [ ] **`loescheAusArchiv(id)` implementieren**

In `js/archiv.js` nach `ladeAusArchiv` ergänzen:
```js
export function loescheAusArchiv(id) {
  schreibeListe(ladeListe().filter(e => e.id !== id));
}
```

### Task 2: Löschen-Button in der Start-Ansicht

- [ ] **Button + Bestätigungsdialog ergänzen**

In `js/views/view-start.js` im `archivListe.map(...)`-Block einen zweiten
Button `'Löschen'` neben `'Laden'` ergänzen, der `confirmDialog` mit
`danger: true` aufruft und bei Bestätigung `archiv.loescheAusArchiv(eintrag.id)`
ausführt, anschließend die Start-Ansicht neu rendert (Host leeren + `viewStart`
erneut aufrufen, konsistent mit dem Rest der Datei).

### Task 3: Verifizieren

- [ ] **Manueller Testlauf**

App über `Start.bat` lokal starten. Mindestens zwei Abrechnungen anlegen und
je über "Neue Abrechnung" archivieren, sodass die Archiv-Liste zwei Einträge
zeigt. Bei einem Eintrag auf "Löschen" klicken → Bestätigungsdialog
erscheint; nach Bestätigen verschwindet nur dieser Eintrag aus der Liste,
der andere bleibt und lässt sich weiterhin per "Laden" öffnen. Seite neu
laden (F5) → gelöschter Eintrag bleibt gelöscht (persistiert in
`localStorage`).

### Task 4: Trello-Karte zum manuellen Test einreichen

- [ ] **Trello-Karte in "Review / Test" verschieben**

Rufe das Trello-MCP-Tool `trelloWriteCard` auf mit
`{ "action": "move", "cardId": "ari:cloud:trello::card/workspace/684498102cf5d6f06ff77adc/6aa77f1c59e851ef7869c2a6", "listId": "ari:cloud:trello::list/workspace/684498102cf5d6f06ff77adc/6a9f1ea09deffce313fbaf24" }`.

Die Karte NICHT direkt nach "Erledigt" verschieben — das macht der Nutzer
erst manuell, nachdem er die Umsetzung in der Test-Instanz selbst getestet
hat.
