# Resilient Sync Kanban Board

A highly robust Kanban board built with React, TypeScript, and Vite. This project demonstrates advanced frontend state management, focusing on optimistic UI updates, robust error handling, and a resilient sync queue that can gracefully handle flaky network conditions.

## Key Features

- **Optimistic UI:** When you drag a card or edit its title, the UI updates instantly. The network request happens in the background.
- **Resilient Sync Queue:** Rapid, successive updates to the same card are queued and processed sequentially. This prevents race conditions and out-of-order execution that plague naive implementations.
- **Flaky Backend Simulation:** An MSW (Mock Service Worker) backend simulates network delays (500–1500ms) and a 20% random failure rate, proving the resilience of the frontend logic.
- **Graceful Failure & Recovery:** If an update fails, the card visually indicates the failure and provides a descriptive error message alongside a "Retry Sync" button.
- **Offline/Refresh Persistence:** State is synchronized to `localStorage`. If you close the page while a card is still saving, it will correctly load in a `failed` state upon your return, prompting you to retry rather than silently dropping data.
- **Accessibility:** Full keyboard support (Tab to navigate, Enter to edit, Esc to cancel), screen-reader friendly labels (`aria-label`, `sr-only`), and clear focus indicators.

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS v4
- @hello-pangea/dnd (for drag and drop)
- MSW (Mock Service Worker)
- Vitest & React Testing Library (for tests)

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Development Server
```bash
npm run dev
```
*Note: MSW intercepts API requests seamlessly in development mode.*

### 3. Run Tests
```bash
npm run test
```

## Architecture Decisions

### The `useResilientSync` Hook
The core of the application logic lives in `useResilientSync`. Rather than firing off detached Promises for every update, it maintains a **FIFO queue** of operations and an `inFlight` set.

1. `updateCard()` updates local React state immediately and pushes the payload into the `queueRef`.
2. `processQueue()` recursively dequeues tasks, ensuring that any given card only ever has *one* active network request in flight at a time.
3. If an error occurs, the promise catches it, updates the card's `syncStatus` to `failed`, and moves on to the next item in the queue.

This architecture ensures that if a user drags a card from "To Do" to "In Progress" to "Done" in rapid succession, the backend will receive the updates in the exact correct order.

### Trade-offs Made

- **Local Storage vs IndexedDB:** I used `localStorage` for simplicity and synchronous loading. In a real-world production app with large datasets, `IndexedDB` would be preferable to avoid blocking the main thread, though it would complicate the initial load state.
- **Queue Scope:** The queue ensures sequential updates *per card*. It does not strictly enforce sequential updates *across different cards*. This allows independent cards to save concurrently (faster), which is usually desirable unless there are cross-card constraints.
- **MSW for Backend Simulation:** While MSW is fantastic, it currently intercepts everything on `/api/cards`. Real endpoints would likely be more RESTful and perhaps involve WebSockets for multi-client real-time sync.

## Project Structure

- `src/App.tsx`: Main layout, DnD context, and column rendering.
- `src/components/`: Pure presentational components (`CardItem`, `AddCardForm`).
- `src/hooks/useResilientSync.ts`: The brains of the operation.
- `src/mocks/handlers.ts`: MSW definitions defining the flaky backend behavior.
- `src/test/`: Vitest setup and configuration.
