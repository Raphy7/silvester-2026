# 🎆 Silvester 26/27 · Tallinn & Helsinki

Interaktive Reiseplanungs-App für **Raphael & Jasmin** – Silvestertrip vom **30.12.2026 bis 04.01.2027**: 🇪🇪 Tallinn → ⛴️ Fähre → 🇫🇮 Helsinki.
Eine reine HTML/JS-App ohne Build-Schritt, optimiert für das Smartphone, installierbar als App und offline nutzbar.

## Features

### 📅 Plan
- **Tagesansicht mit Timeline** für alle 6 Reisetage, Wechsel per Datums-Tabs oder **Wischen nach links/rechts**
- **Live-Modus:** Während der Reise öffnet sich automatisch der aktuelle Tag, der laufende Programmpunkt ist mit **JETZT** markiert, der nächste mit „in X Min.“ – dazu ein Hinweisbanner, das per Tipp direkt zum Eintrag springt
- **Google-Maps-Integration** (ohne API-Key):
  - Mobil: Eintrag antippen → Mini-Karte klappt direkt im Eintrag auf
  - Desktop: große Karte neben der Timeline
  - **🧭 Navigation** startet die Fußgänger-Route in Google Maps, **🗺️ Tagesroute** zeigt alle Orte des Tages als Route
- **Tageskarte** mit Datum, Wetter, Sonnenauf-/-untergang und Tageslichtdauer
- **Wetter** über [Open-Meteo](https://open-meteo.com) (kostenlos, ohne Key) – echte Vorhersage ab ca. 16 Tage vor dem jeweiligen Tag, vorher typische Klimawerte
- **Abhaken** erledigter Punkte mit Fortschrittsbalken pro Tag
- Notizen mit **klickbaren Links** (z. B. Reservierungen)

### ✏️ Bearbeiten
- Einträge hinzufügen, ändern, löschen und verschieben (↑ ↓)
- Felder: Zeit, Titel, 📍 Ort (Google-Maps-Suchbegriff), 📝 Notiz/Link
- Tagesüberschrift direkt editierbar
- **⇅ Nach Zeit sortieren** (Zeiten nach Mitternacht werden korrekt ans Tagesende sortiert)
- Alles wird sofort automatisch gespeichert

### 💶 Kasse
- Ausgaben mit Betrag, Beschreibung, Zahler und Kategorie (🍽️ 🍸 🚕 🎟️ 🛍️ 💫) erfassen
- Gesamtsumme, Anteil pro Person und Balkendiagramm nach Kategorie
- **Automatischer Ausgleich:** wer schuldet wem wie viel
- Voreingestellt für **Raphael** und **Jasmin**; unter *Kasse* einmal antippen, **wer dieses Handy nutzt** – neue Ausgaben werden dann automatisch dem richtigen Zahler zugeordnet
- Kosten werden zu gleichen Teilen geteilt

### 🎒 Packliste
- Vorbefüllte Winter-Packliste (inkl. Badesachen für Löyly 🔥)
- Abhaken, hinzufügen, löschen, mit Fortschrittsanzeige

### ℹ️ Infos
- **Buchungen & Adressen:** editierbare Notizen für Flüge, Fähre und Airbnbs (Adresse, Türcode, Buchungsnummer …)
- **Gut zu wissen:** Notruf, Zeitzone, Steckdosen, Taxi/ÖPNV, Trinkgeld, Sauna-Etikette
- **Mini-Sprachführer** Deutsch · Estnisch · Finnisch
- **Daten:** Export/Import als `reiseplan.json` und Zurücksetzen auf den Ausgangsplan
- **🕰️ Zeitreise:** beliebige Uhrzeit simulieren, um Live-Modus und Feuerwerk zu testen

### 🎇 Extras
- **Countdown** erst bis zur Landung in Tallinn, dann bis Mitternacht – die letzten 10 Sekunden pulsieren
- **Automatisches Feuerwerk um 00:00 Uhr** (Tallinn-Zeit), zusätzlich jederzeit per 🎇-Button oder Tipp auf den Countdown
- Haptisches Feedback (Vibration) auf dem Handy, Toast-Meldungen
- Dark Design, große Touch-Flächen, Safe-Area-Support für iPhones mit Notch

### 📲 PWA / Offline
- Installierbar auf dem Homescreen (eigenes Icon, Vollbild ohne Browserleiste)
- Service Worker cached die App – der Plan funktioniert auch ohne Internet (Karten & Wetter brauchen Netz)

## Hosting mit GitHub Pages

1. Neues Repository anlegen und diese Dateien hochladen:
   ```
   index.html
   sw.js
   manifest.webmanifest
   icon.png
   ```
2. **Settings → Pages → Source: Deploy from a branch**, Branch `main`, Ordner `/ (root)`
3. Nach ca. 1 Minute erreichbar unter `https://<user>.github.io/<repo>/`

**Auf dem Handy installieren:**
- iPhone: in Safari **Teilen → Zum Home-Bildschirm**
- Android: Button **📲 Jetzt installieren** unter *Infos* oder Chrome-Menü → *App installieren*

## Daten & Speicherung

- Jeder Browser/Handy hat **eigenen Speicher** – Raphael und Jasmin sehen dieselben Daten nur, wenn ihr sie teilt.
- **Sync zwischen zwei Handys:** wer etwas ändert (Plan, Häkchen, Ausgabe …) → **Infos → 💾 Export** → per WhatsApp, AirDrop o. Ä. schicken → auf dem anderen Gerät **📂 Import** (überschreibt den lokalen Stand).
- Tipp: ab und zu exportieren als Backup; nach dem Import einmal kurz prüfen, ob Kasse und Packliste stimmen.

## Anpassen

Der Ausgangsplan steht in `index.html` im Objekt `DEFAULTS`. Ein Eintrag hat das Format:

```js
["14:30", "Vabaduse väljak", "Vabaduse väljak, Tallinn", "optionale Notiz / https://link"]
//  Zeit    Titel              Google-Maps-Suche           Notiz
```

Ort und Notiz sind optional. Nach Änderungen an `DEFAULTS` im Browser **↺ Reset** drücken (oder die Cache-Version in `sw.js` erhöhen, damit installierte Apps die neue Version laden).

**Testen des Live-Modus:** `?now=2026-12-31T23:59` an die URL hängen (Tallinn-Zeit).

## Technik

- Eine einzige `index.html` mit Vanilla JS & CSS – keine Abhängigkeiten, kein Build
- Google Maps Embed (ohne API-Key), Open-Meteo API für das Wetter
- Service Worker mit Stale-while-revalidate-Caching
