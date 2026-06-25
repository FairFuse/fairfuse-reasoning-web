import { memo } from 'react';
import { cellColor } from '../utils';

type Props = { matrix: number[][]; labels: string[] };

function SimilarityHeatmap({ matrix, labels }: Props) {
  const n = labels.length;
  const labelW = 100;
  const totalW = 270;
  const cellSize = Math.max(4, Math.floor((totalW - labelW) / n));
  const gridW = cellSize * n;
  const svgW = labelW + gridW;
  const svgH = labelW + gridW;

  console.log(matrix, labels);
  console.log(svgW);

  return (
    <svg width={svgW} height={svgH} style={{ display: 'block' }}>
      {labels.map((lbl, i) => (
        <text
          key={`rl-${i}`}
          x={labelW - 2}
          y={labelW + i * cellSize + cellSize / 2 + 3}
          textAnchor="end"
          fontSize={14}
          fill="#888"
        >
          {lbl}
        </text>
      ))}
      {labels.map((lbl, j) => (
        <text
          key={`cl-${j}`}
          transform={`translate(${labelW + j * cellSize + cellSize / 2}, ${labelW - 3}) rotate(-90)`}
          textAnchor="start"
          fontSize={14}
          fill="#888"
        >
          {lbl}
        </text>
      ))}
      {matrix.map((row, i) => row.map((v, j) => (
        <rect
          key={`${i}-${j}`}
          x={labelW + j * cellSize}
          y={labelW + i * cellSize}
          width={cellSize}
          height={cellSize}
          fill={cellColor(v)}
        >
          <title>{`${labels[i]} vs ${labels[j]}: ${v.toFixed(2)}`}</title>
        </rect>
      )))}
    </svg>
  );
}

export default memo(SimilarityHeatmap);
