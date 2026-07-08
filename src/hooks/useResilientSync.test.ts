import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useResilientSync } from './useResilientSync';
import { server } from '../test/setup';
import { http, HttpResponse, delay } from 'msw';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('useResilientSync', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('initializes with cards from the API when localStorage is empty', async () => {
    const { result } = renderHook(() => useResilientSync());
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.cards.length).toBeGreaterThan(0);
    expect(result.current.cards[0].syncStatus).toBe('synced');
  });

  it('optimistically updates a card and syncs successfully', async () => {
    // Override MSW to never fail and respond quickly
    server.use(
      http.put('/api/cards/:id', async ({ request }) => {
        await delay(10);
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ id: '1', ...body });
      })
    );

    const { result } = renderHook(() => useResilientSync());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.cards.length).toBeGreaterThan(0);
    });

    const cardId = result.current.cards[0].id;

    act(() => {
      result.current.updateCard(cardId, { title: 'New Title' });
    });

    // 1. Optimistic update (should be instant and 'saving')
    expect(result.current.cards[0].title).toBe('New Title');
    expect(result.current.cards[0].syncStatus).toBe('saving');

    // 2. Server response (should transition back to 'synced')
    await waitFor(() => {
      const card = result.current.cards.find(c => c.id === cardId);
      expect(card?.syncStatus).toBe('synced');
    });
  });

  it('marks card as failed if the server returns an error', async () => {
    // Override MSW to always fail
    server.use(
      http.put('/api/cards/:id', async () => {
        await delay(10);
        return new HttpResponse(
          JSON.stringify({ error: 'Server error' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );

    const { result } = renderHook(() => useResilientSync());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const cardId = result.current.cards[0].id;

    act(() => {
      result.current.updateCard(cardId, { column: 'done' });
    });

    expect(result.current.cards[0].syncStatus).toBe('saving');

    await waitFor(() => {
      const card = result.current.cards.find(c => c.id === cardId);
      expect(card?.syncStatus).toBe('failed');
      expect(card?.errorMessage).toBe('Server error');
    });
  });

  it('retries a failed sync and succeeds', async () => {
    // Step 1: Force failure
    let attempt = 0;
    server.use(
      http.put('/api/cards/:id', async ({ request, params }) => {
        attempt++;
        await delay(10);
        if (attempt === 1) {
          return new HttpResponse(JSON.stringify({ error: 'Failed' }), { status: 500 });
        }
        // Succeed on retry
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ id: params.id, ...body });
      })
    );

    const { result } = renderHook(() => useResilientSync());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const cardId = result.current.cards[0].id;

    // Trigger update
    act(() => {
      result.current.updateCard(cardId, { title: 'Retry Test' });
    });

    // Wait for failure
    await waitFor(() => {
      const card = result.current.cards.find(c => c.id === cardId);
      expect(card?.syncStatus).toBe('failed');
    });

    // Step 2: Retry
    act(() => {
      result.current.retrySync(cardId);
    });

    // Should go to saving immediately
    const cardSaving = result.current.cards.find(c => c.id === cardId);
    expect(cardSaving?.syncStatus).toBe('saving');

    // Wait for success
    await waitFor(() => {
      const card = result.current.cards.find(c => c.id === cardId);
      expect(card?.syncStatus).toBe('synced');
    });
  });
});
