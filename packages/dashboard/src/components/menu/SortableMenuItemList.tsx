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
import type { MenuItem } from '@foodtruck/shared';
import { MenuItemCard } from './MenuItemCard';

interface SortableItemProps {
  item: MenuItem;
  isReorderMode: boolean;
  onEdit: (item: MenuItem) => void;
  onToggle: (item: MenuItem) => void;
  onDelete: (item: MenuItem) => void;
}

function SortableItem({ item, isReorderMode, onEdit, onToggle, onDelete }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    position: isDragging ? ('relative' as const) : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <MenuItemCard
        item={item}
        onEdit={onEdit}
        onToggle={onToggle}
        onDelete={onDelete}
        isDragging={isDragging}
        dragHandleProps={isReorderMode ? { attributes, listeners } : undefined}
      />
    </div>
  );
}

interface SortableMenuItemListProps {
  items: MenuItem[];
  isReorderMode: boolean;
  onEdit: (item: MenuItem) => void;
  onToggle: (item: MenuItem) => void;
  onDelete: (item: MenuItem) => void;
  onReorder: (items: MenuItem[]) => void;
}

export function SortableMenuItemList({
  items,
  isReorderMode,
  onEdit,
  onToggle,
  onDelete,
  onReorder,
}: SortableMenuItemListProps) {
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
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      const newItems = arrayMove(items, oldIndex, newIndex);
      onReorder(newItems);
    }
  };

  // If not in reorder mode, just render the items without DnD
  if (!isReorderMode) {
    return (
      <div className="grid grid-cols-1 gap-2 sm:gap-3">
        {items.map((item) => (
          <MenuItemCard
            key={item.id}
            item={item}
            onEdit={onEdit}
            onToggle={onToggle}
            onDelete={onDelete}
          />
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={(event) => setActiveId(event.active.id as string)}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div className="grid grid-cols-1 gap-2 sm:gap-3">
          {items.map((item) => (
            <SortableItem
              key={item.id}
              item={item}
              isReorderMode={isReorderMode}
              onEdit={onEdit}
              onToggle={onToggle}
              onDelete={onDelete}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
