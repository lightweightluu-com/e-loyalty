# E-Loyalty

Digitale Stempelkarten für lokale Geschäfte: Kunden scannen einen QR-Aufsteller, bekommen sofort eine
Wallet-artige Web-Karte (kein Login, keine App), der Händler stempelt per Kamera-Scan – live auf dem Kunden-Handy.

Stack: Next.js 15 (App Router, TypeScript) · Prisma + SQLite · Tailwind · Framer Motion.

## Lokal starten
```bash
npm install
cp .env.example .env          # AUTH_SECRET und QR_SIGNING_SECRET setzen: openssl rand -base64 48
npx prisma db push
npm run db:seed               # Demo-Händler demo@kebab.ch / demo1234
npm run dev
```

Tests: `npm test` (Krypto) · End-to-End: `PROGRAM_ID=<aus db:seed> STAMP_COOLDOWN_SECONDS=0 npm start`, dann `PROGRAM_ID=… BASE=http://localhost:3000 node scripts/smoke.mjs`.

## API (Teil 1)
| Route | Zweck |
|---|---|
| `POST /api/auth/register` · `login` · `logout` | Händler-Session (signiertes httpOnly-Cookie) |
| `POST /api/programs/[programId]/cards` | Karte beim Scan des Aufstellers erzeugen (idempotent per Body/Cookie) |
| `GET /api/cards/[cardId]/status` | Kartenzustand + aktueller QR-Payload (Polling-Fallback) |
| `GET /api/cards/[cardId]/stream` | SSE: Live-Updates der Karte |
| `POST /api/merchant/scan` | Händler: `{payload}` stempelt / meldet „Prämie bereit“; `{action:"REDEEM",cardId,ticket}` löst ein |

## Sicherheit
Der Kunden-QR enthält `LC1.<cardId>.<30s-Fenster>.<HMAC>` – keine URL. Gültig ~60 s, Schlüssel aus Server-Secret
und Kartengeheimnis, einlösbar nur mit Händler-Session und nur beim Händler, dem das Programm gehört.
Stempel sind atomar (Bedingungen im SQL-`UPDATE`) mit serverseitiger Abkühlzeit gegen Doppelscans.

## Deployment
⚠️ Dieses Projekt braucht einen Node-Server (SQLite, SSE) und ist **nicht** mit dem statischen
Cloudflare-Workflow aus `.github/workflows/deploy.yml` (`dist/`) kompatibel. Nicht auf `main` mergen,
bevor das Deployment geklärt ist.
