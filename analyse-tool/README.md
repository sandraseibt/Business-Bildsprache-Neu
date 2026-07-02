# Wahrnehmungs-Analyse-Tool

Lokales Tool: Website-URL eingeben, optional Screenshots von Instagram und/oder
LinkedIn hochladen, Analyse startet automatisch per Claude API. Läuft nur am
Rechner (Terminal + Browser), nicht am Handy.

## Einmalige Einrichtung

Voraussetzung: [Node.js](https://nodejs.org) (Version 18 oder neuer) ist installiert.

```bash
cd analyse-tool
npm install                      # installiert auch den Chromium-Browser für Screenshots
cp .env.example .env
```

Dann in der neu erstellten `.env`-Datei den eigenen Anthropic-API-Key eintragen:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Einen Key gibt es unter https://console.anthropic.com/settings/keys. Jede
Analyse verursacht dort geringe Kosten (typischerweise wenige Cent, abhängig
von Anzahl und Größe der Screenshots).

## Starten

```bash
npm start
```

Danach im Browser öffnen: **http://localhost:3000**

## Nutzung

1. Website-URL eintragen (Pflichtfeld). Das Tool ruft die Seite automatisch
   auf und macht selbst Screenshots (sichtbarer Bereich + gesamte Seite) –
   kein manueller Screenshot nötig.
2. Branche optional angeben (z. B. "Coaching Human Design").
3. Für Instagram und/oder LinkedIn eigene Screenshots hochladen (Profil,
   Highlights, Feed-Ausschnitt genügen meist 2–4 Bilder). Diese Plattformen
   blockieren automatisiertes Auslesen aktiv, daher der manuelle Upload.
4. "Analyse starten" klicken. Nach ca. 20–60 Sekunden erscheint die
   strukturierte Wahrnehmungs-Analyse (Erster Eindruck, Gefühl, Vertrauen,
   Atmosphäre, Stärken, Potenzial, …) – reine Beobachtung, keine
   Marketing-Bewertung.

## Hinweise

- Manche Websites blockieren automatisierte Aufrufe (Bot-Schutz). In dem
  Fall meldet das Tool einen Fehler; die URL lässt sich dann nicht
  automatisch screenshotten.
- Der API-Key bleibt lokal in der `.env`-Datei und wird nicht ins Git-Repo
  übernommen (siehe `.gitignore`).
- Modell lässt sich über `ANTHROPIC_MODEL` in der `.env` anpassen.
