import { memo, useMemo, useState } from 'react';
import { scaleSequential } from 'd3-scale';
import { interpolateRgb } from 'd3-interpolate';

type HoveredCell = {
  v: number;
  rowLabel: string;
  colLabel: string;
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
const LEGEND_MARGIN_TOP = 20;
const LEGEND_BAR_H = 12;
const LEGEND_LABEL_H = 16;
const LEGEND_H = LEGEND_MARGIN_TOP + LEGEND_BAR_H + LEGEND_LABEL_H;

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

  const maxValue = useMemo(() => {
    const baseFlat = baseMatrix.flatMap((r) => r);
    const crossFlat = crossMatrix?.flatMap((r) => r) ?? [];
    return Math.max(...baseFlat, ...crossFlat, 0);
  }, [baseMatrix, crossMatrix]);

  const colorScale = useMemo(
    () => scaleSequential(interpolateRgb('steelblue', 'white')).domain([0, maxValue]),
    [maxValue],
  );

  const leftGridW = cellSize * nBase;
  const rightGridW = hasCross ? cellSize * nCross : 0;
  const svgW = ROW_LABEL_W + leftGridW + (hasCross ? MATRIX_GAP + rightGridW : 0) + 5;
  const svgH = TOP_LABEL_H + cellSize * nBase + LEGEND_H;

  const legendX = ROW_LABEL_W;
  const legendW = leftGridW + (hasCross ? MATRIX_GAP + rightGridW : 0);
  const legendBarY = TOP_LABEL_H + cellSize * nBase + LEGEND_MARGIN_TOP;
  const legendLabelY = legendBarY + LEGEND_BAR_H + 12;

  const handleCellEnter = (
    v: number,
    rowLabel: string,
    colLabel: string,
    col1: string,
    col2: string,
  ) => {
    setHoveredCell({ v, rowLabel, colLabel });
    onHoverCols?.([col1, col2]);
  };

  const handleSvgLeave = () => {
    setHoveredCell(null);
    onHoverCols?.(null);
  };

  const markerX = hoveredCell && maxValue > 0
    ? legendX + (1 - (hoveredCell.v) / maxValue) * legendW
    : null;

  const markerAnchor = (mx: number): 'start' | 'middle' | 'end' => {
    if (mx - legendX < 20) return 'start';
    if (mx > legendX + legendW - 20) return 'end';
    return 'middle';
  };

  return (
    <svg width={svgW} height={svgH} style={{ display: 'block' }} onMouseLeave={handleSvgLeave}>
      <defs>
        <linearGradient id="sim-grad" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor={colorScale(maxValue)} />
          <stop offset="100%" stopColor={colorScale(0)} />
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
            stroke="#000"
            width={cellSize}
            height={cellSize}
            fill={colorScale(v)}
            onMouseEnter={() => handleCellEnter(
              v,
              baseLabels[i],
              labelsReversed[j],
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
            stroke="#000"
            width={cellSize}
            height={cellSize}
            fill={colorScale(v)}
            onMouseEnter={() => handleCellEnter(
              v,
              baseLabels[i],
              crossLabels[j],
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
        stroke="#000"
        strokeWidth={1}
      />

      {/* Legend end labels */}
      <text x={legendX} y={legendLabelY} textAnchor="start" fontSize={10} fill="#888">
        {`${Math.round((1 - maxValue) * 100)}%`}
      </text>
      <text x={legendX + legendW} y={legendLabelY} textAnchor="end" fontSize={10} fill="#888">
        100%
      </text>

      {/* Legend marker + inline percentage */}
      {markerX !== null && hoveredCell && (
        <>
          <line
            x1={markerX}
            x2={markerX}
            y1={legendBarY - 3}
            y2={legendBarY + LEGEND_BAR_H + 3}
            stroke="#333"
            strokeWidth={1.5}
            pointerEvents="none"
          />
          <text
            x={markerX}
            y={legendLabelY - LEGEND_BAR_H - 20}
            textAnchor={markerAnchor(markerX)}
            fontSize={10}
            fontWeight={600}
            fill="#333"
            pointerEvents="none"
          >
            {`${Math.round((1 - hoveredCell.v) * 100)}%`}
          </text>
        </>
      )}
    </svg>
  );
}

export default memo(SimilarityHeatmapPair);
