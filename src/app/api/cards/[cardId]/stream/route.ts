import { subscribeCard } from '@/lib/card-events';
import { findCard, toSnapshot } from '@/lib/cards';
import { fail } from '@/lib/http';
import { cardIdSchema } from '@/lib/ids';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TICK_MS = 5_000;       // DB-Abgleich: fängt QR-Rotation und Änderungen anderer Prozesse auf
const PING_EVERY_TICKS = 3;  // alle ~15 s ein Kommentar, damit Proxys die Verbindung offen halten

/**
 * Server-Sent Events: sendet `event: card` sofort beim Verbinden und danach bei jeder Änderung.
 * Der Scan-Endpunkt stösst über den Event-Bus eine sofortige Zustellung an (~Millisekunden).
 * Der Browser-`EventSource` verbindet sich bei Abbrüchen von selbst neu.
 */
export async function GET(req: Request, { params }: { params: Promise<{ cardId: string }> }) {
  const { cardId } = await params;
  if (!cardIdSchema.safeParse(cardId).success || !(await findCard(cardId))) {
    return fail(404, 'card_not_found', 'Karte nicht gefunden.');
  }

  const enc = new TextEncoder();
  let cleanup = () => {};

  const stream = new ReadableStream({
    start(controller) {
      let last = '';
      let ticks = 0;
      let closed = false;
      let busy = false;

      const push = async () => {
        if (closed || busy) return;
        busy = true;
        try {
          const card = await findCard(cardId);
          if (!card) return close();
          const data = JSON.stringify(toSnapshot(card));
          if (data !== last) {
            last = data;
            controller.enqueue(enc.encode(`event: card\ndata: ${data}\n\n`));
          }
        } catch {
          // Transienter DB-Fehler: nächster Tick versucht es erneut.
        } finally {
          busy = false;
        }
      };

      const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(timer);
        unsubscribe();
        try { controller.close(); } catch {}
      };

      const unsubscribe = subscribeCard(cardId, push);
      const timer = setInterval(() => {
        if (++ticks % PING_EVERY_TICKS === 0) controller.enqueue(enc.encode(': ping\n\n'));
        void push();
      }, TICK_MS);

      cleanup = close;
      req.signal.addEventListener('abort', close);
      controller.enqueue(enc.encode('retry: 3000\n\n'));
      void push();
    },
    cancel: () => cleanup(),
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // nginx: nicht puffern
    },
  });
}
