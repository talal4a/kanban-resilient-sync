import { http, HttpResponse, delay } from 'msw';
import type { Card } from '../hooks/useResilientSync';

// ─── Seed data ─────────────────────────────────────────────────────────────

type StoredCard = Omit<Card, 'syncStatus' | 'errorMessage'>;

const db: StoredCard[] = [
  { id: '1', title: 'Research competitors',      column: 'done'        },
  { id: '2', title: 'Design DB schema',           column: 'in-progress' },
  { id: '3', title: 'Write API documentation',   column: 'todo'        },
  { id: '4', title: 'Setup CI/CD pipeline',      column: 'todo'        },
  { id: '5', title: 'Build auth flow',            column: 'todo'        },
  { id: '6', title: 'Code review session',        column: 'in-progress' },
];

// ─── Shared helpers ─────────────────────────────────────────────────────────

/** Returns a random delay between min and max ms */
function randomDelay(min = 400, max = 1400) {
  return Math.floor(Math.random() * (max - min) + min);
}

/** Simulates a 20% chance of a server-side failure */
function isFlaky() {
  return Math.random() < 0.2;
}

// ─── Handlers ──────────────────────────────────────────────────────────────

export const handlers = [
  // ── GET /api/cards — Return the full card list ──────────────────────────
  http.get('/api/cards', async () => {
    await delay(500);
    return HttpResponse.json(db);
  }),

  // ── POST /api/cards — Create a new card ─────────────────────────────────
  http.post('/api/cards', async ({ request }) => {
    await delay(randomDelay(300, 800));

    if (isFlaky()) {
      return new HttpResponse(
        JSON.stringify({ error: 'Server error — please try again.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json() as Partial<StoredCard>;
    const newCard: StoredCard = {
      id: `server-${Date.now()}`,
      title: body.title ?? 'Untitled',
      column: body.column ?? 'todo',
    };
    db.push(newCard);
    return HttpResponse.json(newCard, { status: 201 });
  }),

  // ── PUT /api/cards/:id — Update a card ──────────────────────────────────
  http.put('/api/cards/:id', async ({ request, params }) => {
    await delay(randomDelay());

    // 20% simulated failure rate
    if (isFlaky()) {
      return new HttpResponse(
        JSON.stringify({ error: 'Server error — please try again.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { id } = params;
    const body = await request.json() as Partial<StoredCard>;
    const index = db.findIndex(c => c.id === id);

    if (index === -1) {
      return new HttpResponse(
        JSON.stringify({ error: 'Card not found.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    db[index] = { ...db[index], ...body };
    return HttpResponse.json(db[index]);
  }),

  // ── DELETE /api/cards/:id — Remove a card ───────────────────────────────
  http.delete('/api/cards/:id', async ({ params }) => {
    await delay(randomDelay(200, 600));

    if (isFlaky()) {
      return new HttpResponse(
        JSON.stringify({ error: 'Server error — please try again.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { id } = params;
    const index = db.findIndex(c => c.id === id);

    if (index === -1) {
      return new HttpResponse(null, { status: 404 });
    }

    db.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),
];
