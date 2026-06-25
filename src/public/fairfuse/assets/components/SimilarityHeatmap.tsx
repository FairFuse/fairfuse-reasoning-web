import { memo, useMemo } from 'react';
import { cellColor } from '../utils';

type Props = {
  matrix: number[][];
  labels: string[];
  hideRowLabels?: boolean;
  cellSize?: number;
  reverseDiagonal?: boolean;
};

function SimilarityHeatmap({
  matrix, labels, hideRowLabels, cellSize: cellSizeProp, reverseDiagonal,
}: Props) {
  const n = labels.length;
  const nRows = matrix.length;
  const labelW = 100;
  const totalW = 270;
  const rowLabelW = hideRowLabels ? 0 : labelW;
  const topLabelH = labelW;
  const cellSize = cellSizeProp ?? Math.max(4, Math.floor((totalW - rowLabelW) / n));
  const gridW = cellSize * n;
  const svgW = rowLabelW + gridW;
  const svgH = topLabelH + cellSize * nRows;

  const labelsReversed = useMemo(() => labels.toReversed(), [labels]);

  return (
    <svg width={svgW} height={svgH} style={{ display: 'block' }}>
      {!hideRowLabels && matrix.map((_, i) => (
        <text
          key={`rl-${i}`}
          x={rowLabelW - 2}
          y={topLabelH + i * cellSize + cellSize / 2 + 3}
          textAnchor="end"
          fontSize={14}
          fill="#888"
        >
          {labels[i]}
        </text>
      ))}
      {(reverseDiagonal ? labelsReversed : labels).map((lbl, j) => (
        <text
          key={`cl-${j}`}
          transform={`translate(${rowLabelW + j * cellSize + cellSize / 2}, ${topLabelH - 3}) rotate(-90)`}
          textAnchor="start"
          fontSize={14}
          fill="#888"
        >
          {lbl}
        </text>
      ))}
      {matrix.map((row, i) => (reverseDiagonal ? row.toReversed() : row).map((v, j) => (
        ((!reverseDiagonal) || (row.length - i) > j) ? (
          <rect
            key={`${i}-${j}`}
            x={rowLabelW + j * cellSize}
            y={topLabelH + i * cellSize}
            width={cellSize}
            height={cellSize}
            fill={cellColor(v)}
          >
            <title>
              {i}
              {' '}
              {j}
            </title>
          </rect>
        ) : null
      )))}
    </svg>
  );
}

export default memo(SimilarityHeatmap);
