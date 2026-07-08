import { useState, useRef } from 'react';
import type { Card } from '../hooks/useResilientSync';

interface AddCardFormProps {
  column: Card['column'];
  onAdd: (title: string, column: Card['column']) => void;
}

/**
 * Inline "Add a card" form that appears within a column.
 * Keyboard accessible: Enter to submit, Escape to cancel.
 */
export function AddCardForm({ column, onAdd }: AddCardFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleOpen = () => {
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSubmit = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    onAdd(trimmed, column);
    setTitle('');
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      setTitle('');
      setIsOpen(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={handleOpen}
        aria-label={`Add a card to ${column} column`}
        className={[
          'mt-2 w-full rounded-lg border border-dashed border-slate-700',
          'py-2 text-sm text-slate-500 transition-colors',
          'hover:border-slate-500 hover:text-slate-400 hover:bg-slate-800/30',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500',
        ].join(' ')}
      >
        + Add a card
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-lg border border-sky-500/50 bg-slate-800 p-3">
      <label htmlFor={`add-card-${column}`} className="sr-only">
        Card title
      </label>
      <textarea
        id={`add-card-${column}`}
        ref={inputRef}
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Enter a title…"
        rows={2}
        className={[
          'w-full resize-none rounded border border-slate-600 bg-slate-900',
          'px-2 py-1.5 text-sm text-white placeholder-slate-500',
          'focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500',
        ].join(' ')}
      />
      <p className="mt-1 mb-2 text-xs text-slate-500">Enter to save · Esc to cancel</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!title.trim()}
          className={[
            'rounded bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm',
            'hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed',
            'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400',
          ].join(' ')}
        >
          Add card
        </button>
        <button
          type="button"
          onClick={() => { setTitle(''); setIsOpen(false); }}
          className={[
            'rounded px-3 py-1.5 text-xs font-semibold text-slate-400',
            'hover:bg-slate-700 hover:text-slate-200 transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400',
          ].join(' ')}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
