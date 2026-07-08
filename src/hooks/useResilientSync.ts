import { useState, useEffect, useRef, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Card {
  id: string;
  title: string;
  column: 'todo' | 'in-progress' | 'done';
  syncStatus: 'synced' | 'saving' | 'failed';
  errorMessage?: string;
}

/** A pending sync operation waiting in the queue */
interface QueueItem {
  cardId: string;
  updates: Partial<Pick<Card, 'title' | 'column'>>;
}

// ─── Local Storage helpers ────────────────────────────────────────────────────

const STORAGE_KEY = 'kanban-cards-v1';

function loadFromStorage(): Card[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Card[];
    // Any card that was mid-save when the page closed should be marked failed
    return parsed.map(c =>
      c.syncStatus === 'saving'
        ? { ...c, syncStatus: 'failed', errorMessage: 'Sync interrupted — tap Retry to save.' }
        : c
    );
  } catch {
    return null;
  }
}

function saveToStorage(cards: Card[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
  } catch {
    // Quota exceeded or private mode — fail silently
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useResilientSync
 *
 * Manages the Kanban board state with optimistic updates and resilient sync:
 *
 * 1. Loads cards from localStorage (instant) or falls back to GET /api/cards
 * 2. Every updateCard() immediately updates the UI (optimistic)
 *    then enqueues a PUT /api/cards/:id request
 * 3. The queue is processed FIFO, one request per card at a time —
 *    so rapid updates to the same card can't race each other
 * 4. On failure: card is marked `failed` with an error message
 * 5. retrySync(id) re-enqueues the last operation for that card
 */
export function useResilientSync() {
  // Initialize from storage if available
  const [cards, setCards] = useState<Card[]>(() => {
    const cached = loadFromStorage();
    return cached || [];
  });
  
  // Only loading if we didn't have cached data
  const [isLoading, setIsLoading] = useState(() => loadFromStorage() === null);

  // FIFO queue of pending network requests
  const queueRef = useRef<QueueItem[]>([]);
  // IDs of cards whose request is currently in-flight
  const inFlightRef = useRef<Set<string>>(new Set());
  // Guard: prevents concurrent processQueue() invocations
  const processingRef = useRef(false);
  // Track whether initial data is loaded to avoid premature localStorage write
  const didLoadRef = useRef(false);

  // ── Persist to localStorage whenever cards change ────────────────────────
  useEffect(() => {
    if (!didLoadRef.current) return;
    saveToStorage(cards);
  }, [cards]);

  // ── Load initial data ────────────────────────────────────────────────────
  useEffect(() => {
    // If we already loaded from storage in useState, just mark as loaded and return
    if (!isLoading) {
      didLoadRef.current = true;
      return;
    }

    fetch('/api/cards')
      .then(res => {
        if (!res.ok) throw new Error(`Server responded ${res.status}`);
        return res.json() as Promise<Omit<Card, 'syncStatus'>[]>;
      })
      .then(data => {
        setCards(data.map(c => ({ ...c, syncStatus: 'synced' as const })));
      })
      .catch(() => {
        // Network down — start with empty board, user can add cards
        setCards([]);
      })
      .finally(() => {
        setIsLoading(false);
        didLoadRef.current = true;
      });
  }, [isLoading]);

  // ── Queue processor ──────────────────────────────────────────────────────
  const processQueue = useCallback(function processNext() {
    if (processingRef.current) return;
    processingRef.current = true;

    const queue = queueRef.current;
    if (queue.length === 0) {
      processingRef.current = false;
      return;
    }

    // Pick the first item whose card is not already in-flight
    const nextIndex = queue.findIndex(item => !inFlightRef.current.has(item.cardId));
    if (nextIndex === -1) {
      // All queued cards are currently in-flight — nothing to do yet
      processingRef.current = false;
      return;
    }

    const item = queue[nextIndex];
    queueRef.current = queue.filter((_, i) => i !== nextIndex);
    inFlightRef.current.add(item.cardId);
    processingRef.current = false;

    fetch(`/api/cards/${item.cardId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item.updates),
    })
      .then(async res => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { error?: string };
          throw new Error(body.error ?? `Server error ${res.status}`);
        }
        return res.json();
      })
      .then(() => {
        inFlightRef.current.delete(item.cardId);

        // Only mark synced if this card hasn't had a new optimistic update since
        setCards(prev =>
          prev.map(c =>
            c.id === item.cardId && c.syncStatus === 'saving'
              ? { ...c, syncStatus: 'synced', errorMessage: undefined }
              : c
          )
        );

        processNext(); // Pick up next item
      })
      .catch((err: Error) => {
        inFlightRef.current.delete(item.cardId);

        setCards(prev =>
          prev.map(c =>
            c.id === item.cardId && c.syncStatus === 'saving'
              ? {
                  ...c,
                  syncStatus: 'failed',
                  errorMessage: err.message || 'Connection failed. Tap Retry to try again.',
                }
              : c
          )
        );

        // Continue processing other cards — don't let one failure block the queue
        processNext();
      });
  }, []);

  // ── Public API ───────────────────────────────────────────────────────────

  /**
   * Optimistically update a card in the UI and enqueue a sync request.
   * If the same card has multiple rapid updates, they are queued in order.
   */
  const updateCard = useCallback(
    (id: string, updates: Partial<Pick<Card, 'title' | 'column'>>) => {
      setCards(prev =>
        prev.map(c =>
          c.id === id
            ? { ...c, ...updates, syncStatus: 'saving', errorMessage: undefined }
            : c
        )
      );

      queueRef.current.push({ cardId: id, updates });
      processQueue();
    },
    [processQueue]
  );

  /**
   * Retry the sync for a card that is in `failed` state.
   * Re-enqueues the card's current data as a PUT request.
   */
  const retrySync = useCallback(
    (id: string) => {
      const card = cards.find(c => c.id === id);
      if (!card || card.syncStatus !== 'failed') return;

      setCards(prev =>
        prev.map(c =>
          c.id === id ? { ...c, syncStatus: 'saving', errorMessage: undefined } : c
        )
      );

      // Extract only the fields the server cares about
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { syncStatus, errorMessage, id: _id, ...payload } = card;
      queueRef.current.push({ cardId: id, updates: payload });
      processQueue();
    },
    [cards, processQueue]
  );

  /**
   * Add a new card locally.
   * In a full implementation, this would POST to the server.
   */
  const addCard = useCallback((title: string, column: Card['column'] = 'todo') => {
    const newCard: Card = {
      id: `local-${Date.now()}`,
      title: title.trim(),
      column,
      syncStatus: 'synced',
    };
    setCards(prev => [...prev, newCard]);
  }, []);

  /**
   * Delete a card locally and remove any pending queue items for it.
   */
  const deleteCard = useCallback((id: string) => {
    setCards(prev => prev.filter(c => c.id !== id));
    queueRef.current = queueRef.current.filter(item => item.cardId !== id);
    inFlightRef.current.delete(id);
  }, []);

  return { cards, isLoading, updateCard, retrySync, addCard, deleteCard };
}
