import { memo, useMemo, useState } from 'react';
import { cellColor } from '../utils';

type HoveredCell = {
  v: number;
  rowLabel: string;
  colLabel: string;
  cellX: number;
  cellY: number;
};

type Props = {
  baseMatrix: number[][];
  baseLabels: string[];
  baseColNames: string[];
  crossMatrix: number[][] | null;
  crossLabels: string[];
  crossColNames: string[];
  cellSize: number;
  onHoverCols?: (cols: [string, string] | null) => void;
};

const ROW_LABEL_W = 100;
const TOP_LABEL_H = 100;
const MATRIX_GAP = 8;
const LEGEND_MARGIN_TOP = 10;
const LEGEND_BAR_H = 12;
const LEGEND_LABEL_H = 16;
const LEGEND_H = LEGEND_MARGIN_TOP + LEGEND_BAR_H + LEGEND_LABEL_H;
const TOOLTIP_W = 180;
const TOOLTIP_H = 20;

function SimilarityHeatmapPair({
  baseMatrix, baseLabels, baseColNames,
  crossMatrix, crossLabels, crossColNames,
  cellSize, onHoverCols,
}: Props) {
  const [hoveredCell, setHoveredCell] = useState<HoveredCell | null>(null);

  const nBase = baseLabels.length;
  const nCross = crossLabels.length;
  const hasCross = crossMatrix !== null && nCross > 0;

  const labelsReversed = useMemo(() => baseLabels.toReversed(), [baseLabels]);

  const leftGridW = cellSize * nBase;
  const rightGridW = hasCross ? cellSize * nCross : 0;
  const svgW = ROW_LABEL_W + leftGridW + (hasCross ? MATRIX_GAP + rightGridW : 0);
  const svgH = TOP_LABEL_H + cellSize * nBase + LEGEND_H;

  const legendX = ROW_LABEL_W;
  const legendW = leftGridW + (hasCross ? MATRIX_GAP + rightGridW : 0);
  const legendBarY = TOP_LABEL_H + cellSize * nBase + LEGEND_MARGIN_TOP;

  const handleCellEnter = (
    v: number,
    rowLabel: string,
    colLabel: string,
    cellX: number,
    cellY: number,
    col1: string,
    col2: string,
  ) => {
    setHoveredCell({
      v, rowLabel, colLabel, cellX, cellY,
    });
    onHoverCols?.([col1, col2]);
  };

  const handleSvgLeave = () => {
    setHoveredCell(null);
    onHoverCols?.(null);
  };

  let tooltipX = 0;
  let tooltipY = 0;
  if (hoveredCell) {
    tooltipX = Math.max(ROW_LABEL_W, Math.min(
      hoveredCell.cellX + cellSize / 2 - TOOLTIP_W / 2,
      svgW - TOOLTIP_W - 4,
    ));
    tooltipY = hoveredCell.cellY - TOOLTIP_H - 4 >= TOP_LABEL_H
      ? hoveredCell.cellY - TOOLTIP_H - 4
      : hoveredCell.cellY + cellSize + 2;
  }

  return (
    <svg width={svgW} height={svgH} style={{ display: 'block' }} onMouseLeave={handleSvgLeave}>
      <defs>
        <linearGradient id="sim-grad" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor={cellColor(0)} />
          <stop offset="100%" stopColor={cellColor(1)} />
        </linearGradient>
      </defs>

      {/* Row labels */}
      {baseLabels.map((lbl, i) => (
        <text
          key={`rl-${i}`}
          x={ROW_LABEL_W - 4}
          y={TOP_LABEL_H + i * cellSize + cellSize / 2 + 4}
          textAnchor="end"
          fontSize={11}
          fill="#888"
        >
          {lbl}
        </text>
      ))}

      {/* Column labels — left matrix (reversed) */}
      {labelsReversed.map((lbl, j) => (
        <text
          key={`lcl-${j}`}
          transform={`translate(${ROW_LABEL_W + j * cellSize + cellSize / 2}, ${TOP_LABEL_H - 3}) rotate(-90)`}
          textAnchor="start"
          fontSize={11}
          fill="#888"
        >
          {lbl}
        </text>
      ))}

      {/* Column labels — right matrix */}
      {hasCross && crossLabels.map((lbl, j) => (
        <text
          key={`rcl-${j}`}
          transform={`translate(${ROW_LABEL_W + leftGridW + MATRIX_GAP + j * cellSize + cellSize / 2}, ${TOP_LABEL_H - 3}) rotate(-90)`}
          textAnchor="start"
          fontSize={11}
          fill="#888"
        >
          {lbl}
        </text>
      ))}

      {/* Left matrix — triangular, reverseDiagonal */}
      {baseMatrix.map((row, i) => row.toReversed().map((v, j) => {
        if ((nBase - i) <= j) return null;
        const cx = ROW_LABEL_W + j * cellSize;
        const cy = TOP_LABEL_H + i * cellSize;
        return (
          <rect
            key={`b-${i}-${j}`}
            x={cx}
            y={cy}
            width={cellSize}
            height={cellSize}
            fill={cellColor(v)}
            onMouseEnter={() => handleCellEnter(
              v,
              baseLabels[i],
              labelsReversed[j],
              cx,
              cy,
              baseColNames[i],
              baseColNames[nBase - 1 - j],
            )}
          />
        );
      }))}

      {/* Right matrix — full rectangular */}
      {hasCross && crossMatrix!.map((row, i) => row.map((v, j) => {
        const cx = ROW_LABEL_W + leftGridW + MATRIX_GAP + j * cellSize;
        const cy = TOP_LABEL_H + i * cellSize;
        return (
          <rect
            key={`c-${i}-${j}`}
            x={cx}
            y={cy}
            width={cellSize}
            height={cellSize}
            fill={cellColor(v)}
            onMouseEnter={() => handleCellEnter(
              v,
              baseLabels[i],
              crossLabels[j],
              cx,
              cy,
              baseColNames[i],
              crossColNames[j],
            )}
          />
        );
      }))}

      {/* Legend bar */}
      <rect
        x={legendX}
        y={legendBarY}
        width={legendW}
        height={LEGEND_BAR_H}
        fill="url(#sim-grad)"
        stroke="#ccc"
        strokeWidth={0.5}
      />
      <text x={legendX} y={legendBarY + LEGEND_BAR_H + 12} textAnchor="start" fontSize={10} fill="#888">0</text>
      <text x={legendX + legendW} y={legendBarY + LEGEND_BAR_H + 12} textAnchor="end" fontSize={10} fill="#888">1</text>

      {/* Legend marker */}
      {hoveredCell && (
        <line
          x1={legendX + hoveredCell.v * legendW}
          x2={legendX + hoveredCell.v * legendW}
          y1={legendBarY - 3}
          y2={legendBarY + LEGEND_BAR_H + 3}
          stroke="#333"
          strokeWidth={1.5}
          pointerEvents="none"
        />
      )}

      {/* Tooltip */}
      {hoveredCell && (
        <g pointerEvents="none">
          <rect
            x={tooltipX}
            y={tooltipY}
            width={TOOLTIP_W}
            height={TOOLTIP_H}
            fill="white"
            stroke="#bbb"
            strokeWidth={1}
            rx={3}
          />
          <text
            x={tooltipX + TOOLTIP_W / 2}
            y={tooltipY + TOOLTIP_H / 2 + 4}
            textAnchor="middle"
            fontSize={11}
            fill="#333"
          >
            {`${hoveredCell.rowLabel} vs ${hoveredCell.colLabel}: ${hoveredCell.v.toFixed(2)}`}
          </text>
        </g>
      )}
    </svg>
  );
}

export default memo(SimilarityHeatmapPair);
