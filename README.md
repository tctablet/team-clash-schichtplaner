# Team Clash Schichtplaner

Web-App zur Verfügbarkeits-Eintragung + Schichtplan-Anzeige für das Team.

## Architektur

```
index.html + app.js + style.css   → statisches SPA (dieser Repo-Root)
        │  fetch()
        ▼
gas/Code.gs                        → Google-Apps-Script-Web-App („Server")
        │  SpreadsheetApp
        ▼
Google Sheet                       → Datenhaltung (Verfügbarkeiten, Pläne)
```

Das SPA läuft ohne Build-Schritt (statisch hosten oder Datei öffnen). Der
Server-Teil ist die als Web-App deployte GAS-Datei in `gas/`.

## IDs & Deployment (Stand 2026-07-21)

| Was | Wert |
|---|---|
| GAS Script-ID | `1l_0z0Xa2ePWECkLv6iDSKKBnpGUBg5DkbLBSjXVRo--QRvAW3BR7JlFR` |
| Web-App Deployment-ID | `AKfycbzSTFp6Fh6dfd1CZKyREZ0F5epHYdltugnaZxikL9uue_YyhnDT9cOnwhh8iJ1FXt7k` (== `GAS_URL` in app.js) |
| Google Sheet-ID | `1Xi4-IWvbKR5k3SIIW3moW0ShA44Obx_oDAHGfGAOm0g` (in `gas/Code.gs`) |
| Owner-Konto | Team-Clash-Google-Konto (Zugriff für neue Devs separat freigeben) |

**Deploy-Flow (immer bestehende Deployment-ID nutzen, Deployment-Limit!):**

```bash
cd gas
clasp push --force
clasp deploy -i AKfycbzSTFp6Fh6dfd1CZKyREZ0F5epHYdltugnaZxikL9uue_YyhnDT9cOnwhh8iJ1FXt7k -d "Beschreibung"
```

Voraussetzung: `clasp login` mit einem Konto, das auf das Script berechtigt ist
(Freigabe von Script **und** Sheet erfolgt out-of-band, nicht über dieses Repo).

`gas/` ist der Stand des letzten `clasp push` (2026-03-26ff). Bei Zweifel an der
Parität mit dem Live-Deployment: `clasp pull` in eine Kopie und diffen.

## Gotchas

- **GAS Date-Objekte:** `getValues()` liefert Date-Objekte — nie `String()`
  nutzen, sondern `Utilities.formatDate(val, "Europe/Berlin", "yyyy-MM-dd")`.
- `appsscript.json`: Web-App läuft `executeAs: USER_DEPLOYING` mit
  `access: ANYONE_ANONYMOUS` — die Deployment-URL ist damit der Zugangspunkt;
  Repo bleibt privat.

## Repo-Vollständigkeits-Regel (dauerhaft, seit 2026-07-21)

Alle echten Code-Fassungen — inkl. des GAS-Server-Codes — werden in diesem Repo
committet. Nur echte Secrets (Google-Konto-Zugänge) bleiben draußen und werden
out-of-band übergeben. Kein `git add .`, explizite Dateilisten.
