import { DragDropContext, Droppable, type DropResult } from "@hello-pangea/dnd";
import { useResilientSync, type Card } from "./hooks/useResilientSync";
import { CardItem } from "./components/CardItem";
import { AddCardForm } from "./components/AddCardForm";

// ─── Column definitions ─────────────────────────────────────────────────────

const COLUMNS: { id: Card["column"]; title: string; accent: string }[] = [
  { id: "todo", title: "To Do", accent: "border-t-sky-500" },
  { id: "in-progress", title: "In Progress", accent: "border-t-amber-500" },
  { id: "done", title: "Done", accent: "border-t-emerald-500" },
];

// ─── App ────────────────────────────────────────────────────────────────────

export default function App() {
  const { cards, isLoading, updateCard, retrySync, addCard, deleteCard } =
    useResilientSync();

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    )
      return;

    const targetColumn = destination.droppableId as Card["column"];
    updateCard(draggableId, { column: targetColumn });
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Resilient Sync Kanban
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Optimistic updates · 20% simulated failure rate · auto-retry queue
            </p>
          </div>
          <span className="rounded-full bg-slate-800 border border-slate-700 px-3 py-1 text-xs text-slate-400">
            Frontend Take-Home
          </span>
        </div>
      </header>

      {/* ── Board ───────────────────────────────────────────────────── */}
      <main className="mx-auto max-w-6xl px-6 py-8">
        {isLoading ? (
          // Loading skeleton
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {COLUMNS.map((col) => (
              <div
                key={col.id}
                className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"
              >
                <div className="mb-4 h-4 w-24 animate-pulse rounded bg-slate-700" />
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="mb-3 h-20 animate-pulse rounded-lg bg-slate-800"
                  />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {COLUMNS.map((col) => {
                const columnCards = cards.filter((c) => c.column === col.id);

                return (
                  <section
                    key={col.id}
                    aria-label={`${col.title} column`}
                    className={[
                      "flex flex-col rounded-xl border border-slate-800",
                      "bg-slate-900/60 p-4 border-t-4",
                      col.accent,
                    ].join(" ")}
                  >
                    {/* Column header */}
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="font-semibold text-slate-200">
                        {col.title}
                      </h2>
                      <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-bold text-slate-400">
                        {columnCards.length}
                      </span>
                    </div>

                    {/* Droppable area */}
                    <Droppable droppableId={col.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={[
                            "flex-1 rounded-lg p-2 transition-colors min-h-[360px]",
                            snapshot.isDraggingOver
                              ? "bg-slate-800/50"
                              : "bg-transparent",
                          ].join(" ")}
                        >
                          {/* Empty state */}
                          {columnCards.length === 0 &&
                            !snapshot.isDraggingOver && (
                              <div className="flex h-full min-h-[200px] items-center justify-center">
                                <p className="text-sm text-slate-600 select-none">
                                  Drop cards here
                                </p>
                              </div>
                            )}

                          {columnCards.map((card, idx) => (
                            <CardItem
                              key={card.id}
                              card={card}
                              index={idx}
                              onUpdate={updateCard}
                              onRetry={retrySync}
                              onDelete={deleteCard}
                            />
                          ))}

                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>

                    {/* Add card form */}
                    <AddCardForm column={col.id} onAdd={addCard} />
                  </section>
                );
              })}
            </div>
          </DragDropContext>
        )}
      </main>
    </div>
  );
}
