import { memo, useMemo } from 'react';
import { COL_W_NORMAL, ROW_H } from '../constants';
import type { ColBodyProps } from '../types';
import ConsensusColBody from './ConsensusColBody';

function ColBody({
  col, colW, compressed, rowH, candidates, hoveredId, hoveredCol, hoveredGroup, onHover, onReorder, groupColors, highlighted,
}: ColBodyProps) {
  // useMemo must be called unconditionally before any early return
  const sorted = useMemo(
    () => [...candidates].sort((a, b) => a.rankings[col] - b.rankings[col]),
    [candidates, col],
  );

  if (col.startsWith('#FAIR_')) {
    return (
      <ConsensusColBody
        col={col}
        colW={colW}
        compressed={compressed}
        rowH={rowH}
        candidates={candidates}
        hoveredId={hoveredId}
        hoveredCol={hoveredCol}
        hoveredGroup={hoveredGroup}
        onHover={onHover}
        onReorder={onReorder}
        groupColors={groupColors}
        highlighted={highlighted}
      />
    );
  }

  return (
    <div style={{ width: colW, height: candidates.length * rowH, position: 'relative' }}>
      {sorted.map((c, idx) => {
        const isHovered = c.id === hoveredId;
        const expandHover = compressed && isHovered && hoveredCol === col;
        const effectiveH = expandHover ? ROW_H : rowH;
        // const topOffset = expandHover ? idx * rowH - (ROW_H - rowH) / 2 : idx * rowH;
        const topOffset = idx * rowH;
        return (
          <div
            key={c.id}
            onMouseEnter={() => onHover(c.id, col)}
            onMouseLeave={() => onHover(null, null)}
            style={{
              position: 'absolute',
              top: topOffset,
              left: 0,
              width: expandHover ? COL_W_NORMAL : colW,
              height: effectiveH,
              display: 'flex',
              alignItems: 'center',
              justifyContent: compressed && !expandHover ? 'center' : undefined,
              gap: 4,
              paddingLeft: expandHover ? 2 : compressed ? 0 : 2,
              fontSize: 14,
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              backgroundColor: isHovered ? '#e8f0fe' : highlighted ? 'rgba(76,120,168,0.07)' : 'white',
              fontWeight: isHovered ? 600 : 400,
              cursor: 'default',
              zIndex: expandHover ? 1 : undefined,
              borderRadius: expandHover ? 2 : undefined,
              boxShadow: expandHover ? '0 1px 4px rgba(0,0,0,0.15)' : undefined,
              border: compressed ? '0px' : '1px solid #d0d0d0',
              opacity: hoveredGroup !== null && c.region !== hoveredGroup ? 0.2 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: 2,
                flexShrink: 0,
                backgroundColor: groupColors[c.region] ?? '#999',
              }}
            />
            {(!compressed || expandHover) && (
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', color: isHovered ? '#1a1a1a' : '#333' }}>
                {c.name}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default memo(ColBody);
