import { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { IconGripVertical } from '@tabler/icons-react';
import { COL_W_NORMAL, ROW_H } from '../constants';
import type { Candidate } from '../types';

type Props = {
  c: Candidate;
  rowH: number;
  colW: number;
  compressed: boolean;
  isHovered: boolean;
  expandHover: boolean;
  topOffset: number;
  col: string;
  onHover: (id: number | null, col: string | null) => void;
  groupColors: Record<string, string>;
  hoveredGroup: string | null;
};

function SortableCandidateRow({
  c, rowH, colW, compressed, isHovered, expandHover, topOffset, col, onHover, groupColors, hoveredGroup,
}: Props) {
  const {
    attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging, active,
  } = useSortable({ id: c.id });
  const isHoveredInternal = active ? false : isHovered;
  const expandHoverInternal = active ? false : expandHover;
  const effectiveH = expandHoverInternal ? ROW_H : rowH;
  return (
    <div
      ref={setNodeRef}
      onMouseEnter={() => onHover(c.id, col)}
      onMouseLeave={() => onHover(null, null)}
      style={{
        position: 'absolute',
        top: topOffset,
        left: 0,
        width: expandHoverInternal ? COL_W_NORMAL : colW,
        height: effectiveH,
        display: 'flex',
        alignItems: 'center',
        justifyContent: compressed && !expandHoverInternal ? 'center' : undefined,
        gap: 4,
        paddingLeft: expandHoverInternal ? 2 : compressed ? 0 : 2,
        fontSize: 14,
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        backgroundColor: isDragging ? '#f0f4ff' : isHoveredInternal ? '#e8f0fe' : 'transparent',
        fontWeight: isHoveredInternal ? 600 : 400,
        cursor: isDragging ? 'grabbing' : 'default',
        zIndex: isDragging ? 3 : expandHoverInternal ? 1 : undefined,
        borderRadius: expandHoverInternal ? 2 : undefined,
        border: compressed ? '0px' : '1px solid #d0d0d0',
        boxShadow: isDragging ? '0 2px 8px rgba(0,0,0,0.18)' : expandHoverInternal ? '0 1px 4px rgba(0,0,0,0.15)' : undefined,
        transform: CSS.Transform.toString(transform ? { ...transform, x: 0 } : null),
        transition: [transition, 'opacity 0.15s'].filter(Boolean).join(', '),
        opacity: isDragging ? 0.85 : hoveredGroup !== null && c.region !== hoveredGroup ? 0.2 : 1,
      }}
    >
      {!compressed ? (
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...listeners}
          {...attributes}
          style={{
            cursor: 'grab', border: 'none', background: 'none', padding: 1, display: 'flex', alignItems: 'center', flexShrink: 0, color: '#ccc',
          }}
        >
          <IconGripVertical size={10} />
        </button>
      ) : (
        <div ref={setActivatorNodeRef} {...listeners} {...attributes} style={{ position: 'absolute', inset: 0, cursor: 'grab' }} />
      )}
      <div style={{
        width: 24, height: 24, borderRadius: 2, flexShrink: 0, backgroundColor: groupColors[c.region] ?? '#999',
      }}
      />
      {(!compressed || expandHoverInternal) && (
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', color: isHoveredInternal ? '#1a1a1a' : '#333' }}>
          {c.name}
        </span>
      )}
    </div>
  );
}

export default memo(SortableCandidateRow);
