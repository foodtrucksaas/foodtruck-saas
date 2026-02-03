import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { OfferWithItems } from '@foodtruck/shared';
import { OfferCard } from './OfferCard';

interface SortableOfferItemProps {
  offer: OfferWithItems;
  onToggle: (offer: OfferWithItems) => void;
  onEdit: (offer: OfferWithItems) => void;
  onDelete: (id: string) => void;
}

function SortableOfferItem({ offer, onToggle, onEdit, onDelete }: SortableOfferItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: offer.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    position: isDragging ? ('relative' as const) : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <OfferCard
        offer={offer}
        onToggle={onToggle}
        onEdit={onEdit}
        onDelete={onDelete}
        isDragging={isDragging}
        dragHandleProps={{ attributes, listeners }}
      />
    </div>
  );
}

interface SortableOfferListProps {
  offers: OfferWithItems[];
  onToggle: (offer: OfferWithItems) => void;
  onEdit: (offer: OfferWithItems) => void;
  onDelete: (id: string) => void;
  onReorder: (offers: OfferWithItems[]) => void;
}

export function SortableOfferList({
  offers,
  onToggle,
  onEdit,
  onDelete,
  onReorder,
}: SortableOfferListProps) {
  const [, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = offers.findIndex((offer) => offer.id === active.id);
      const newIndex = offers.findIndex((offer) => offer.id === over.id);
      const newOffers = arrayMove(offers, oldIndex, newIndex);
      onReorder(newOffers);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={(event) => setActiveId(event.active.id as string)}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={offers.map((o) => o.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-4">
          {offers.map((offer) => (
            <SortableOfferItem
              key={offer.id}
              offer={offer}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
