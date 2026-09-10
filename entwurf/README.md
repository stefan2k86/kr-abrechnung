# Design-Entwurf

`design-preview.html` – Vorschau der geplanten USV-Optik für die KR-Abrechnung.
Doppelklick genügt (Schriften + Logo sind eingebettet, keine Internetverbindung nötig).

Die Datei zeigt die neuen Stile an echten App-Bausteinen:
App-Bar mit grünem Nav-Band · Panels mit grünem Balken · Formularzeilen ·
Rollen-Matrix · Prüf-Tabelle · Meldungen (ok / Warnung / Fehler) · Buttons · Badges ·
Unterschrift-Dialog.

## Was übernommen wurde (von usv-tu-dresden.de/…/schwimmen)

| | Referenz | hier |
|---|---|---|
| Grün (Aktionen) | `#017634` | `--green-dark` |
| Grün (Überschriften, Panel-Balken) | `#3aa935` | `--green` |
| Flächen | weiß / `#f2f2f2` | `--bg` / `--panel` |
| Body-Schrift | Roboto | Roboto (selbst gehostet) |
| Überschriften | Roboto Slab | Roboto Slab, grün |
| Panels | grauer Block, 10 px grüner Balken links, weicher Schatten, eckige Ecken | identisch |
| Buttons | Pill, dunkelgrün | identisch |

## Status: umgesetzt

Die Optik ist in der App (`css/style.css`, `assets/fonts/`, `.topbar`/`.navband`
in `index.html`, `theme-color`/`manifest` auf `#017634`). Diese Datei bleibt als
Farb-/Baustein-Referenz liegen. Abweichung: `.sigpad` nutzt in der App
`display:block` (echtes `<canvas>` statt Platzhalter), und `td.num` hat
zusätzlich `white-space:nowrap`.

## Umsetzungsschritte (erledigt)

- `css/style.css` durch die Regeln aus dem `<style>`-Block ersetzt
  (dort mit `url(../assets/fonts/…)` statt der eingebetteten `data:`-Schriften).
- `assets/fonts/` hat die vier `.woff2`-Dateien bekommen.
- `index.html`: App-Bar + Nav in ein `<div class="topbar">` geklammert, Nav in
  `<div class="navband">`; `<meta name="theme-color">` und `manifest` auf `#017634`.
- `sw.js`: Cache-Version hochgezählt, Font-Dateien in der Precache-Liste.
- App-Icons neu aus `assets/logo_usv_src.png` (`make-icons.ps1`) – war optional,
  nicht gemacht (Logo unverändert).

Screens, JavaScript und Bedienung sind unverändert geblieben.

## Hinweis zu den Schriftdateien

`design-preview.html` bettet die Schriften als `data:`-URIs ein und läuft damit
ohne Font-Dateien daneben. Die vier `.woff2` liegen im Repo nur einmal, unter
`assets/fonts/` — ein zusätzlicher `entwurf/fonts/`-Ordner wäre eine reine
Dublette und ist deshalb per `.gitignore` ausgeschlossen.
