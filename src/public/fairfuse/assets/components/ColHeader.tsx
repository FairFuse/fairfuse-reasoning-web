import { memo, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { IconGripVertical } from '@tabler/icons-react';
import {
  HEADER_H, LABEL_H, GROUP_FAIRNESS_VIEW_H, GROUP_FAIRNESS_VIEW_W,
} from '../constants';
import type { Candidate, ColFairness } from '../types';

type Props = {
  col: string;
  colW: number;
  compressed: boolean;
  colFairness?: ColFairness;
  candidates: Candidate[];
  groupLabels: string[];
  groupColors: Record<string, string>;
  hoveredGroup: string | null;
  hoveredFpr: number | null;
  onDotHover: (group: string | null, fpr: number | null) => void;
};

function ColHeader({
  col, colW, compressed, colFairness, candidates, groupLabels, groupColors, hoveredGroup, hoveredFpr, onDotHover,
}: Props) {
  const [arpHovered, setArpHovered] = useState(false);
  const label = col.startsWith('#FAIR_')
    ? `Consensus ${col.slice(6)}`
    : col.replace(/^#R/, '').replace(/_/g, ' ').trim();
  const {
    attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging,
  } = useDraggable({ id: col });

  return (
    <div
      ref={setNodeRef}
      style={{
        width: colW,
        height: HEADER_H,
        backgroundColor: 'white',
        borderBottom: '2px solid #dee2e6',
        opacity: isDragging ? 0.4 : 1,
        boxSizing: 'border-box',
      }}
    >
      <div style={{
        height: LABEL_H, display: 'flex', alignItems: 'center', paddingLeft: compressed ? 2 : 4, gap: 4, justifyContent: compressed ? 'center' : undefined,
      }}
      >
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...listeners}
          {...attributes}
          style={{
            cursor: 'grab',
            border: 'none',
            background: 'none',
            padding: 2,
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
            color: '#aaa',
          }}
          title={compressed ? label : undefined}
        >
          <IconGripVertical size={14} />
        </button>
        {!compressed && (
          <span
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: '#555',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              flex: 1,
            }}
            title={label}
          >
            {label}
          </span>
        )}
      </div>
      <div
        style={{
          height: GROUP_FAIRNESS_VIEW_H,
          margin: compressed ? '0 2px 4px' : '0 0px 4px',
          overflow: 'visible',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {!compressed && colFairness && (() => {
          const svgW = GROUP_FAIRNESS_VIEW_W;
          const svgH = GROUP_FAIRNESS_VIEW_H;
          const marginV = 16;
          const totalH = svgH - 2 * marginV;
          const centerY = marginV + totalH * (1 - 0.5);
          const fprToY = (fpr: number) => marginV + (1 - fpr) * totalH;
          const minFpr = Math.min(...colFairness.fpr);
          const maxFpr = Math.max(...colFairness.fpr);
          const n = colFairness.fpr.length;
          const dotX = (i: number) => (n === 1 ? svgW / 2 : 20 + (i / (n - 1)) * (svgW - 40));
          const DOT_R = 5;
          const totalInCol = candidates.filter((c) => col in c.rankings).length;
          const rankToY = (rank: number) => marginV + ((rank - 1) / Math.max(1, totalInCol - 1)) * totalH;
          return (
            <svg width={svgW} height={svgH} style={{ display: 'block', overflow: 'visible' }}>
              <rect
                x={0}
                y={fprToY(maxFpr)}
                width={svgW}
                height={fprToY(minFpr) - fprToY(maxFpr)}
                fill={arpHovered ? '#aaa' : '#d0d0d0'}
                opacity={0.5}
                onMouseEnter={() => setArpHovered(true)}
                onMouseLeave={() => setArpHovered(false)}
              >
                <title>
                  {`ARP: ${colFairness.arp.toFixed(2)} (max FPR: ${maxFpr.toFixed(3)}, min FPR: ${minFpr.toFixed(3)})`}
                </title>
              </rect>
              {arpHovered && (
                <>
                  <line x1={0} y1={fprToY(maxFpr)} x2={svgW} y2={fprToY(maxFpr)} stroke="#888" strokeWidth={1.5} pointerEvents="none" />
                  <line x1={0} y1={fprToY(minFpr)} x2={svgW} y2={fprToY(minFpr)} stroke="#888" strokeWidth={1.5} pointerEvents="none" />
                </>
              )}
              {colFairness.fpr.map((_, i) => {
                const x = dotX(i);
                return (
                  <g key={i}>
                    <line x1={x} y1={fprToY(1) + 1} x2={x} y2={fprToY(0) - 1} stroke="#ddd" strokeWidth={1} pointerEvents="none" />
                  </g>
                );
              })}
              <text x={svgW / 2} y={marginV - 4} textAnchor="middle" fontSize={14} fill="#555">
                (ARP:
                {' '}
                {colFairness.arp.toFixed(2)}
                )
              </text>
              <line x1={0} y1={fprToY(1)} x2={svgW} y2={fprToY(1)} stroke="#333" strokeWidth={1} pointerEvents="none" />
              <line x1={0} y1={fprToY(0)} x2={svgW} y2={fprToY(0)} stroke="#333" strokeWidth={1} pointerEvents="none" />
              <line x1={0} y1={centerY} x2={svgW} y2={centerY} stroke="#888" strokeWidth={1.5} pointerEvents="none" />
              {hoveredFpr !== null && (
                <line
                  x1={0}
                  y1={fprToY(hoveredFpr)}
                  x2={svgW}
                  y2={fprToY(hoveredFpr)}
                  stroke="#555"
                  strokeWidth={1}
                  strokeDasharray="4 2"
                  pointerEvents="none"
                />
              )}
              {colFairness.fpr.map((fpr, i) => {
                const x = dotX(i);
                const y = fprToY(fpr);
                const color = groupColors[groupLabels[i]] ?? '#999';
                const isHighlighted = groupLabels[i] === hoveredGroup;
                const r = isHighlighted ? DOT_R + 3 : DOT_R;
                const groupCandidates = candidates.filter(
                  (c) => c.region === groupLabels[i] && col in c.rankings,
                );
                const stripX = x - (DOT_R + 2 + 4);
                return (
                  <g key={i}>
                    <line
                      x1={x}
                      y1={centerY}
                      x2={x}
                      y2={y}
                      stroke={color}
                      strokeWidth={isHighlighted ? 3 : 2}
                      strokeDasharray={Math.abs(y - centerY) < 2 ? undefined : '4 2'}
                      pointerEvents="none"
                    />
                    <circle
                      cx={x}
                      cy={y}
                      r={r}
                      fill={color}
                      stroke="white"
                      strokeWidth={isHighlighted ? 2.5 : 1.5}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={() => onDotHover(groupLabels[i], fpr)}
                      onMouseLeave={() => onDotHover(null, null)}
                    >
                      <title>
                        {groupLabels[i]}
                        :
                        {' '}
                        {fpr.toFixed(3)}
                      </title>
                    </circle>
                    {groupCandidates.map((c) => {
                      const ry = rankToY(c.rankings[col]);
                      return (
                        <rect
                          key={c.id}
                          x={stripX}
                          y={ry - 1}
                          width={4}
                          height={2}
                          fill={color}
                          opacity={0.7}
                          pointerEvents="none"
                        />
                      );
                    })}
                  </g>
                );
              })}
            </svg>
          );
        })()}
      </div>
    </div>
  );
}

export default memo(ColHeader);
