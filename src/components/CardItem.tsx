import { useState, useRef } from "react";
import { Draggable } from "@hello-pangea/dnd";
import type { Card } from "../hooks/useResilientSync";

interface CardItemProps {
  card: Card;
  index: number;
  onUpdate: (id: string, updates: Partial<Pick<Card, "title" | "column">>) => void;
  onRetry: (id: string) => void;
  onDelete: (id: string) => void;
}

export function CardItem({ card, index, onUpdate, onRetry, onDelete }: CardItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(card.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleStartEdit = () => {
    setEditTitle(card.title);
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSaveEdit = () => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== card.title) {
      onUpdate(card.id, { title: trimmed });
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSaveEdit();
    if (e.key === "Escape") {
      setEditTitle(card.title);
      setIsEditing(false);
    }
  };

  const statusColor = {
    synced: "border-slate-700",
    saving: "border-amber-500/50",
    failed: "border-red-500 bg-red-950/20",
  }[card.syncStatus];

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <article
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          aria-label={`Card: ${card.title}, status: ${card.syncStatus}`}
          className={[
            "mb-3 rounded-lg border p-4 shadow-sm transition-all duration-200",
            "bg-slate-800 outline-none",
            "focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900",
            snapshot.isDragging
              ? "border-sky-500 ring-2 ring-sky-500/30 rotate-1 scale-105"
              : statusColor,
          ].join(" ")}
        >
          {/* ── Header row: ID + status badge + delete ──────────────── */}
          <div className="mb-2 flex items-center justify-between gap-2 text-xs">
            <span className="font-mono font-semibold text-slate-500">#{card.id}</span>

            <div className="flex items-center gap-2">
              {card.syncStatus === "saving" && (
                <span className="flex items-center gap-1 text-amber-400 font-medium animate-pulse">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
                  Saving…
                </span>
              )}
              {card.syncStatus === "synced" && (
                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Synced
                </span>
              )}
              {card.syncStatus === "failed" && (
                <span className="flex items-center gap-1 text-red-400 font-bold">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
                  Failed
                </span>
              )}

              {/* Delete button */}
              <button
                type="button"
                onClick={() => onDelete(card.id)}
                aria-label={`Delete card: ${card.title}`}
                className={[
                  "rounded p-0.5 text-slate-600 transition-colors",
                  "hover:text-red-400 hover:bg-red-950/30",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500",
                ].join(" ")}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  className="h-3.5 w-3.5"
                >
                  <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                </svg>
              </button>
            </div>
          </div>

          {/* ── Card title / edit mode ───────────────────────────────── */}
          {isEditing ? (
            <div>
              <label htmlFor={`edit-card-${card.id}`} className="sr-only">
                Edit card title
              </label>
              <input
                id={`edit-card-${card.id}`}
                ref={inputRef}
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleSaveEdit}
                className={[
                  "w-full rounded border border-slate-600 bg-slate-900",
                  "px-2 py-1 text-sm text-white",
                  "focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500",
                ].join(" ")}
              />
              <p className="mt-1 text-xs text-slate-500">Enter to save · Esc to cancel</p>
            </div>
          ) : (
            <div className="group flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-slate-200 leading-snug">{card.title}</p>
              <button
                type="button"
                onClick={handleStartEdit}
                aria-label={`Edit card: ${card.title}`}
                className={[
                  "shrink-0 hidden text-xs text-sky-400 transition-colors group-hover:block",
                  "hover:underline focus-visible:block focus-visible:outline-none",
                  "focus-visible:ring-1 focus-visible:ring-sky-500 rounded",
                ].join(" ")}
              >
                Edit
              </button>
            </div>
          )}

          {/* ── Failed state — error message + retry ────────────────── */}
          {card.syncStatus === "failed" && (
            <div className="mt-3 rounded-md border border-red-800 bg-red-900/20 p-2.5">
              <p className="mb-2 text-xs font-medium text-red-300 leading-snug">
                {card.errorMessage ?? "Failed to sync. Please retry."}
              </p>
              <button
                type="button"
                onClick={() => onRetry(card.id)}
                className={[
                  "rounded bg-red-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm",
                  "hover:bg-red-500 active:bg-red-700 transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400",
                ].join(" ")}
              >
                ↺ Retry Sync
              </button>
            </div>
          )}
        </article>
      )}
    </Draggable>
  );
}
