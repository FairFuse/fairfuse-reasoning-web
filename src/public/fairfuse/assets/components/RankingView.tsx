import {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import {
  DndContext, DragOverlay, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  BOUNDARY_GAP_W, COL_W_COMPRESSED, COL_W_NORMAL, HEADER_H, ROW_H, ROW_H_COMPRESSED, SVG_W,
} from '../constants';
import type { Candidate, ColFairness } from '../types';
import ColBody from './ColBody';
import ColHeader from './ColHeader';
import ConnectorSvg from './ConnectorSvg';
import GapDropzone from './GapDropzone';

type Props = {
  candidates: Candidate[];
  rankingCols: string[];
  compressed: boolean;
  searchedId: number | null;
  colFairnessMap: Record<string, ColFairness>;
  groupLabels: string[];
  groupColors: Record<string, string>;
  onReorder?: (colName: string, newOrderedIds: number[]) => void;
  onGroupHover?: (group: string | null) => void;
  pinnedCols: Set<string>;
  onPinToggle: (col: string) => void;
  onDeleteConsensus: (col: string) => void;
  onColsChange?: (cols: string[]) => void;
};

function isValidDrop(activeColId: string, gapIdx: number, colList: string[]): boolean {
  const isConsensus = activeColId.startsWith('#FAIR_');
  const nOrig = colList.filter((c) => !c.startsWith('#FAIR_')).length;
  return isConsensus ? gapIdx >= nOrig : gapIdx <= nOrig;
}

function RankingView({
  candidates,
  rankingCols: initialCols,
  compressed,
  searchedId,
  colFairnessMap,
  groupLabels,
  groupColors,
  onReorder,
  onGroupHover,
  pinnedCols,
  onPinToggle,
  onDeleteConsensus,
  onColsChange,
}: Props) {
  const [cols, setCols] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [hoveredCol, setHoveredCol] = useState<string | null>(null);
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);
  const [hoveredFpr, setHoveredFpr] = useState<number | null>(null);

  const candidateHoveredGroup = useMemo(
    () => candidates.find((c) => c.id === hoveredId)?.region ?? null,
    [hoveredId, candidates],
  );
  const effectiveHoveredGroup = hoveredGroup ?? candidateHoveredGroup;

  useEffect(() => {
    setCols((prev) => {
      const initialSet = new Set(initialCols);
      const kept = prev.filter((c) => initialSet.has(c));
      const keptSet = new Set(kept);
      const added = initialCols.filter((c) => !keptSet.has(c));
      const next = [...kept, ...added];
      return next.length === prev.length && next.every((c, i) => c === prev[i]) ? prev : next;
    });
  }, [initialCols]);

  useEffect(() => { onColsChange?.(cols); }, [cols]); // eslint-disable-line react-hooks/exhaustive-deps

  const colW = compressed ? COL_W_COMPRESSED : COL_W_NORMAL;
  const rowH = compressed ? ROW_H_COMPRESSED : ROW_H;
  const scrollRef = useRef<HTMLDivElement>(null);
  const numCols = cols.length;
  const count = numCols > 0 ? 2 * numCols + 1 : 0;
  const bodyH = candidates.length * rowH;

  const nOrigCols = cols.filter((c) => !c.startsWith('#FAIR_')).length;
  const boundaryVIdx = (nOrigCols > 0 && nOrigCols < cols.length) ? nOrigCols * 2 : -1;
  const gapWidth = useCallback(
    (vIdx: number) => (vIdx === boundaryVIdx ? BOUNDARY_GAP_W : SVG_W),
    [boundaryVIdx],
  );

  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => scrollRef.current,
    estimateSize: (i) => (i % 2 === 0 ? gapWidth(i) : colW),
    horizontal: true,
    overscan: 2,
  });

  useEffect(() => { virtualizer.measure(); }, [colW, rowH, boundaryVIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => { onGroupHover?.(effectiveHoveredGroup); }, [effectiveHoveredGroup]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleHover = useCallback((id: number | null, col: string | null) => {
    setHoveredId(id);
    setHoveredCol(col);
  }, []);

  const handleDotHover = useCallback((g: string | null, f: number | null) => {
    setHoveredGroup(g);
    setHoveredFpr(f);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverId(null);
    if (!over) return;
    const overIdStr = over.id as string;
    if (!overIdStr.startsWith('gap-')) return;
    const gapIdx = parseInt(overIdStr.replace('gap-', ''), 10);
    setCols((prev) => {
      const a = prev.indexOf(active.id as string);
      if (a === -1) return prev;
      if (!isValidDrop(active.id as string, gapIdx, prev)) return prev;
      const next = [...prev];
      const [removed] = next.splice(a, 1);
      const insertAt = gapIdx;
      const adjusted = insertAt > a ? insertAt - 1 : insertAt;
      next.splice(adjusted, 0, removed);
      return next;
    });
  }, []);

  const handleDragOver = useCallback((e: { over: { id: unknown } | null; active: { id: unknown } }) => {
    const overTarget = (e.over?.id as string) ?? null;
    if (overTarget?.startsWith('gap-') && e.active.id) {
      const gapIdx = parseInt(overTarget.replace('gap-', ''), 10);
      setOverId(isValidDrop(e.active.id as string, gapIdx, cols) ? overTarget : null);
    } else {
      setOverId(null);
    }
  }, [cols]);

  const handleDragCancel = useCallback(() => { setActiveId(null); setOverId(null); }, []);

  const totalSize = virtualizer.getTotalSize();
  const activeLabel = activeId
    ? (activeId.startsWith('#FAIR_')
      ? `Consensus ${activeId.slice(6)}`
      : activeId.replace(/^#R/, '').replace(/_/g, ' ').trim())
    : '';

  return (
    <div style={{ flex: 1, width: 300 }}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(e) => setActiveId(e.active.id as string)}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div ref={scrollRef} style={{ width: '100%', height: '100%', overflow: 'auto' }}>
          {/* Sticky header */}
          <div
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 2,
              height: HEADER_H,
              width: totalSize,
              backgroundColor: 'white',
            }}
          >
            {virtualizer.getVirtualItems().map((vItem) => {
              const i = vItem.index;
              const isGap = i % 2 === 0;
              const gapIdx = i / 2;
              const colIdx = (i - 1) / 2;
              return (
                <div
                  key={vItem.key}
                  style={{
                    position: 'absolute', left: vItem.start, top: 0, zIndex: isGap ? 0 : 1,
                  }}
                >
                  {isGap
                    ? (
                      <GapDropzone
                        gapIdx={gapIdx}
                        isOver={overId === `gap-${gapIdx}`}
                        height={HEADER_H}
                        width={gapWidth(i)}
                      />
                    )
                    : (
                      <ColHeader
                        col={cols[colIdx]}
                        colW={colW}
                        compressed={compressed}
                        colFairness={colFairnessMap[cols[colIdx]]}
                        candidates={candidates}
                        groupLabels={groupLabels}
                        groupColors={groupColors}
                        hoveredGroup={effectiveHoveredGroup}
                        hoveredFpr={hoveredFpr}
                        onDotHover={handleDotHover}
                        pinned={pinnedCols.has(cols[colIdx])}
                        onPinToggle={() => onPinToggle(cols[colIdx])}
                        onDelete={() => onDeleteConsensus(cols[colIdx])}
                      />
                    )}
                </div>
              );
            })}
          </div>

          {/* Body */}
          <div style={{ width: totalSize, height: bodyH, position: 'relative' }}>
            {virtualizer.getVirtualItems().map((vItem) => {
              const i = vItem.index;
              const isGap = i % 2 === 0;
              const gapIdx = i / 2;
              const colIdx = (i - 1) / 2;
              return (
                <div
                  key={vItem.key}
                  style={{
                    position: 'absolute', top: 0, left: vItem.start, width: vItem.size,
                  }}
                >
                  {isGap ? (
                    gapIdx > 0 && gapIdx < numCols
                      ? (
                        <ConnectorSvg
                          leftCol={cols[gapIdx - 1]}
                          rightCol={cols[gapIdx]}
                          candidates={candidates}
                          isOver={overId === `gap-${gapIdx}`}
                          hoveredId={hoveredId ?? searchedId}
                          rowH={rowH}
                          width={gapWidth(i)}
                        />
                      )
                      : <div style={{ width: gapWidth(i), height: bodyH }} />
                  ) : (
                    <ColBody
                      col={cols[colIdx]}
                      colW={colW}
                      compressed={compressed}
                      rowH={rowH}
                      candidates={candidates}
                      hoveredId={hoveredId ?? searchedId}
                      hoveredCol={hoveredCol}
                      hoveredGroup={hoveredGroup}
                      onHover={handleHover}
                      onReorder={onReorder}
                      groupColors={groupColors}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <DragOverlay>
          {activeId && (
            <div
              style={{
                background: 'white',
                border: '2px solid #4c78a8',
                borderRadius: 4,
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: 600,
                color: '#4c78a8',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                cursor: 'grabbing',
                whiteSpace: 'nowrap',
              }}
            >
              {activeLabel}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

export default RankingView;
