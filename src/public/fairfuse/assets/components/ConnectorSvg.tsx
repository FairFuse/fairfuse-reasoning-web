import { memo, useMemo } from 'react';
import { SVG_W } from '../constants';
import type { Candidate } from '../types';

type Props = {
  leftCol: string;
  rightCol: string;
  candidates: Candidate[];
  isOver: boolean;
  hoveredId: number | null;
  rowH: number;
  width?: number;
};

/** Linear interpolation between a and b, returning a rounded integer. */
function lerp(a: number, b: number, t: number) { return Math.round(a + (b - a) * t); }

/**
 * Returns an RGB color encoding the direction and magnitude of a candidate's rank change.
 * @param delta - rightPos minus leftPos; negative means the candidate rose, positive means they fell.
 * @param n - max possible absolute delta (candidates.length - 1), used for normalization.
 * Blue (light → deep) for improvement, red (light → deep) for decline, gray for no change.
 */
function deltaColor(delta: number, n: number): string {
  if (n === 0 || delta === 0) return '#aaa';
  const t = Math.min(Math.abs(delta) / n, 1);
  if (delta < 0) return `rgb(${lerp(210, 30, t)},${lerp(230, 100, t)},255)`;
  return `rgb(255,${lerp(220, 30, t)},${lerp(220, 30, t)})`;
}

function ConnectorSvg({
  leftCol, rightCol, candidates, isOver, hoveredId, rowH, width = SVG_W,
}: Props) {
  const bodyH = candidates.length * rowH;

  const leftPosById = useMemo(() => Object.fromEntries(
    [...candidates]
      .sort((a, b) => a.rankings[leftCol] - b.rankings[leftCol])
      .map((c, i) => [c.id, i]),
  ), [candidates, leftCol]);

  const rightPosById = useMemo(() => Object.fromEntries(
    [...candidates]
      .sort((a, b) => a.rankings[rightCol] - b.rankings[rightCol])
      .map((c, i) => [c.id, i]),
  ), [candidates, rightCol]);

  const sorted = useMemo(() => (hoveredId !== null
    ? [...candidates].sort((a, b) => (a.id === hoveredId ? 1 : b.id === hoveredId ? -1 : 0))
    : candidates), [candidates, hoveredId]);

  const mx = width / 2;
  return (
    <svg width={width} height={bodyH} style={{ flexShrink: 0 }}>
      {sorted.map((c) => {
        const y1 = leftPosById[c.id] * rowH + rowH / 2;
        const y2 = rightPosById[c.id] * rowH + rowH / 2;
        const isHovered = c.id === hoveredId;
        return (
          <path
            key={c.id}
            d={`M 0 ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${width} ${y2}`}
            fill="none"
            stroke={deltaColor(rightPosById[c.id] - leftPosById[c.id], candidates.length - 1)}
            strokeWidth={isHovered ? 2.5 : 1.5}
            strokeOpacity={isOver ? 0.05 : isHovered ? 1 : hoveredId !== null ? 0.15 : 0.4}
          />
        );
      })}
      {isOver && (
        <line
          x1={mx}
          y1={0}
          x2={mx}
          y2={bodyH}
          stroke="#4c78a8"
          strokeWidth={2.5}
          strokeOpacity={0.7}
        />
      )}
    </svg>
  );
}

export default memo(ConnectorSvg);
