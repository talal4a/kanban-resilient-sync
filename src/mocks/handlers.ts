import { http, HttpResponse, delay } from 'msw';

// Initial mock data
let cards = [
  { id: '1', title: 'Research competitors', column: 'done', syncStatus: 'synced' },
  { id: '2', title: 'Design DB schema', column: 'in-progress', syncStatus: 'synced' },
  { id: '3', title: 'Write API documentation', column: 'todo', syncStatus: 'synced' },
  { id: '4', title: 'Setup CI/CD pipeline', column: 'todo', syncStatus: 'synced' },
];

export const handlers = [
  // GET all cards
  http.get('/api/cards', async () => {
    // Add artificial delay (500ms)
    await delay(500);
    return HttpResponse.json(cards);
  }),

  // PUT update a single card
  http.put('/api/cards/:id', async ({ request, params }) => {
    // Artificial network delay between 500ms and 1500ms
    const randomDelay = Math.floor(Math.random() * 1000) + 500;
    await delay(randomDelay);

    // 20% drop-rate (simulating a flaky network/backend)
    const isFlaky = Math.random() < 0.2;
    if (isFlaky) {
      return new HttpResponse(
        JSON.stringify({ error: 'Internal Server Error (Simulated Flakiness)' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { id } = params;
    const body = await request.json() as any;

    const index = cards.findIndex(c => c.id === id);
    if (index !== -1) {
      cards[index] = { ...cards[index], ...body };
      return HttpResponse.json(cards[index]);
    }

    return new HttpResponse('Not Found', { status: 404 });
  })
];
