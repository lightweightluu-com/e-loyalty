// End-to-End-Smoke-Test gegen einen laufenden Server:  BASE=http://localhost:3000 node scripts/smoke.mjs
// Erwartet Demo-Daten (npm run db:seed) und STAMP_COOLDOWN_SECONDS=0.
import assert from 'node:assert/strict';

const BASE = process.env.BASE ?? 'http://localhost:3000';
const programId = process.env.PROGRAM_ID;
assert(programId, 'PROGRAM_ID setzen (Ausgabe von db:seed)');

const call = async (path, { cookie, body, method = 'POST' } = {}) => {
  const res = await fetch(BASE + path, { method, headers: { 'content-type': 'application/json', ...(cookie && { cookie }) }, body: body && JSON.stringify(body) });
  return { res, json: await res.json().catch(() => null) };
};

// Händler-Login
const login = await call('/api/auth/login', { body: { email: 'demo@kebab.ch', password: 'demo1234' } });
assert.equal(login.res.status, 200);
const cookie = login.res.headers.get('set-cookie').split(';')[0];

// Kunde: Karte erzeugen (idempotent)
const created = await call(`/api/programs/${programId}/cards`, { body: {} });
assert.equal(created.res.status, 201);
const { cardId } = created.json;
const again = await call(`/api/programs/${programId}/cards`, { body: { existingCardId: cardId } });
assert.equal(again.json.created, false);
assert.equal(again.json.cardId, cardId);

// SSE-Stream öffnen und Events sammeln
const events = [];
const ac = new AbortController();
const sse = await fetch(`${BASE}/api/cards/${cardId}/stream`, { signal: ac.signal });
assert.match(sse.headers.get('content-type'), /text\/event-stream/);
(async () => {
  const dec = new TextDecoder(); let buf = '';
  try { for await (const chunk of sse.body) { buf += dec.decode(chunk); let i; while ((i = buf.indexOf('\n\n')) >= 0) { const m = /^data: (.*)$/m.exec(buf.slice(0, i)); buf = buf.slice(i + 2); if (m) events.push(JSON.parse(m[1])); } } } catch {}
})();

const status = async () => (await call(`/api/cards/${cardId}/status`, { method: 'GET' })).json;

// Ohne Login → 401; Fremd-Payload / Zufall → 400
const qr = (await status()).qr.payload;
assert.equal((await call('/api/merchant/scan', { body: { payload: qr } })).res.status, 401);
assert.equal((await call('/api/merchant/scan', { cookie, body: { payload: 'https://x.test/card/' + cardId } })).res.status, 400);
assert.equal((await call('/api/merchant/scan', { cookie, body: { payload: qr.slice(0, -2) + 'AA' } })).res.status, 400);

// 10 Stempel (frischen Payload je Scan holen)
for (let n = 1; n <= 10; n++) {
  const r = await call('/api/merchant/scan', { cookie, body: { payload: (await status()).qr.payload } });
  assert.equal(r.res.status, 200, JSON.stringify(r.json));
  assert.equal(r.json.card.currentStamps, n);
  assert.equal(r.json.result, 'STAMP_ADDED');
  assert.equal(r.json.card.qr, undefined);
}
await new Promise(r => setTimeout(r, 300));
assert(events.some(e => e.currentStamps === 10), 'SSE hat Stand 10/10 nicht geliefert');

// Karte voll → kein 11. Stempel, sondern REWARD_READY + Ticket
const full = await call('/api/merchant/scan', { cookie, body: { payload: (await status()).qr.payload } });
assert.equal(full.json.result, 'REWARD_READY');
assert.equal(full.json.card.currentStamps, 10);

// Einlösen: falsches Ticket → 403, richtiges → 200, zweites Mal → 409
assert.equal((await call('/api/merchant/scan', { cookie, body: { action: 'REDEEM', cardId, ticket: 'x.y' } })).res.status, 403);
const redeem = await call('/api/merchant/scan', { cookie, body: { action: 'REDEEM', cardId, ticket: full.json.redeemTicket } });
assert.equal(redeem.json.result, 'REWARD_REDEEMED');
assert.equal(redeem.json.card.currentStamps, 0);
assert.equal(redeem.json.card.rewardsRedeemed, 1);
assert.equal((await call('/api/merchant/scan', { cookie, body: { action: 'REDEEM', cardId, ticket: full.json.redeemTicket } })).res.status, 409);

// Parallele Scans: genau einer darf zählen, wenn Abkühlzeit > 0 (hier nur Konsistenzprüfung)
await Promise.all(Array.from({ length: 5 }, async () => call('/api/merchant/scan', { cookie, body: { payload: (await status()).qr.payload } })));
const final = await status();
assert(final.currentStamps >= 1 && final.currentStamps <= 5);
await new Promise(r => setTimeout(r, 200));
assert.equal(events.at(-1).currentStamps, final.currentStamps, 'SSE-Endstand weicht ab');

ac.abort();
console.log(`OK – ${events.length} SSE-Events, Endstand ${final.currentStamps}/${final.stampsRequired}`);
