@echo off
REM Doppelklick startet den lokalen Server und oeffnet die App im Browser.
REM Das schwarze Fenster offen lassen, solange du die App nutzt.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve.ps1"
pause
