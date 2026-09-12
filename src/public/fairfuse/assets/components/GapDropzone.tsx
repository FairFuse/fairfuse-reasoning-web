import { memo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SVG_W } from '../constants';

type Props = { gapIdx: number; isOver: boolean; height: number; width?: number };

function GapDropzone({
  gapIdx, isOver, height, width = SVG_W,
}: Props) {
  const { setNodeRef } = useDroppable({ id: `gap-${gapIdx}` });
  return (
    <div
      ref={setNodeRef}
      style={{
        width, height, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: isOver ? 3 : 1,
          height: isOver ? '85%' : '30%',
          backgroundColor: isOver ? '#4c78a8' : '#dee2e6',
          borderRadius: 2,
          transition: 'all 0.12s',
        }}
      />
    </div>
  );
}

export default memo(GapDropzone);
