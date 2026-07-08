import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CardItem } from './CardItem';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';

describe('CardItem', () => {
  const defaultCard = {
    id: '123',
    title: 'Test Card',
    column: 'todo' as const,
    syncStatus: 'synced' as const,
  };

  const renderWithDnD = (ui: React.ReactElement) => {
    return render(
      <DragDropContext onDragEnd={() => {}}>
        <Droppable droppableId="test">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps}>
              {ui}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    );
  };

  it('renders card title and synced status', () => {
    renderWithDnD(
      <CardItem
        card={defaultCard}
        index={0}
        onUpdate={vi.fn()}
        onRetry={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText('Test Card')).toBeInTheDocument();
    expect(screen.getByText('Synced')).toBeInTheDocument();
  });

  it('renders saving status', () => {
    renderWithDnD(
      <CardItem
        card={{ ...defaultCard, syncStatus: 'saving' }}
        index={0}
        onUpdate={vi.fn()}
        onRetry={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText('Saving…')).toBeInTheDocument();
  });

  it('renders failed status with retry button', () => {
    const mockRetry = vi.fn();
    renderWithDnD(
      <CardItem
        card={{ ...defaultCard, syncStatus: 'failed', errorMessage: 'Custom error message' }}
        index={0}
        onUpdate={vi.fn()}
        onRetry={mockRetry}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('Custom error message')).toBeInTheDocument();
    
    const retryButton = screen.getByRole('button', { name: /retry sync/i });
    fireEvent.click(retryButton);
    expect(mockRetry).toHaveBeenCalledWith('123');
  });

  it('allows editing title', () => {
    const mockUpdate = vi.fn();
    renderWithDnD(
      <CardItem
        card={defaultCard}
        index={0}
        onUpdate={mockUpdate}
        onRetry={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    // Open edit mode
    const editButton = screen.getByRole('button', { name: /edit card: test card/i });
    fireEvent.click(editButton);

    const input = screen.getByLabelText('Edit card title');
    expect(input).toBeInTheDocument();

    // Type and save
    fireEvent.change(input, { target: { value: 'Updated Title' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(mockUpdate).toHaveBeenCalledWith('123', { title: 'Updated Title' });
  });

  it('calls onDelete when delete is clicked', () => {
    const mockDelete = vi.fn();
    renderWithDnD(
      <CardItem
        card={defaultCard}
        index={0}
        onUpdate={vi.fn()}
        onRetry={vi.fn()}
        onDelete={mockDelete}
      />
    );

    const deleteButton = screen.getByRole('button', { name: /delete card: test card/i });
    fireEvent.click(deleteButton);

    expect(mockDelete).toHaveBeenCalledWith('123');
  });
});
