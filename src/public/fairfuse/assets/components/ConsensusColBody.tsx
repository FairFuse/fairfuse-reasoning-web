import { memo, useCallback, useMemo } from 'react';
import {
  DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { ColBodyProps } from '../types';
import { sortByColRank } from '../utils';
import SortableCandidateRow from './SortableCandidateRow';

function ConsensusColBody({
  col, colW, compressed, rowH, candidates, hoveredId, hoveredCol, hoveredGroup, onHover, onReorder, groupColors, highlighted, selectedId, onSelect,
}: ColBodyProps) {
  const sorted = useMemo(() => sortByColRank(candidates, col), [candidates, col]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = useCallback(({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const oldIndex = sorted.findIndex((c) => c.id === active.id);
    const newIndex = sorted.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder?.(col, arrayMove(sorted, oldIndex, newIndex).map((c) => c.id));
  }, [sorted, col, onReorder]);

  return (
    <div style={{
      width: colW, height: candidates.length * rowH, position: 'relative', backgroundColor: highlighted ? 'rgba(76,120,168,0.07)' : undefined,
    }}
    >
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sorted.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {sorted.map((c, idx) => {
            const isHovered = c.id === hoveredId;
            const expandHover = compressed && isHovered && hoveredCol === col;
            const topOffset = idx * rowH;
            return (
              <SortableCandidateRow
                key={c.id}
                c={c}
                rowH={rowH}
                colW={colW}
                compressed={compressed}
                isHovered={isHovered}
                expandHover={expandHover}
                topOffset={topOffset}
                col={col}
                onHover={onHover}
                groupColors={groupColors}
                hoveredGroup={hoveredGroup ?? null}
                selectedId={selectedId}
                onSelect={onSelect}
              />
            );
          })}
        </SortableContext>
      </DndContext>
    </div>
  );
}

export default memo(ConsensusColBody);
