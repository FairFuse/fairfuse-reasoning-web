import * as d3 from 'd3';
import { TrrackedProvenance } from '../../store/types';
import { getNodeColor } from './provenanceColors';

const RECT_HEIGHT = 80;
const RECT_WIDTH = 10;

export function TaskProvenanceNodes({
  height, xScale, currentNode, provenance,
}: {
  height: number, xScale: d3.ScaleLinear<number, number>, currentNode: string | null, provenance: TrrackedProvenance;
}) {
  return (
    <g style={{ cursor: 'pointer' }}>
      {/* Provenance nodes */}
      {provenance ? Object.entries(provenance.nodes || {}).map((entry) => {
        const [nodeId, node] = entry;
        const nodeColor = getNodeColor(node); return (
          <g key={nodeId} transform={`translate(${xScale(node.createdOn)}, 0)`}>
            <g transform={`translate(0, ${RECT_HEIGHT / 2})`}>
              <rect
                width={RECT_WIDTH}
                height={RECT_WIDTH}
                fill={nodeColor}
                x={-RECT_WIDTH / 2}
                y={-RECT_WIDTH / 2}
                transform="rotate(45, 0, 0)"
                stroke="white"
                strokeWidth={1}
              />
            </g>
          </g>
        );
      }) : null}
      {/* Currently active provenance node */}
      {currentNode && provenance && provenance.nodes[currentNode] && (
        <g transform={`translate(${xScale(provenance.nodes[currentNode].createdOn)}, ${height / 2})`}>
          <rect fill={getNodeColor(provenance.nodes[currentNode])} x={-RECT_WIDTH / 8} y={-RECT_HEIGHT / 2} width={RECT_WIDTH / 4} height={RECT_HEIGHT} />
          <text xmlSpace="preserve" filter="url(#text-bg)" fontSize={14} textAnchor={xScale(provenance.nodes[currentNode].createdOn) < 100 ? 'start' : 'end'} dy={22} dx={xScale(provenance.nodes[currentNode].createdOn) < 100 ? 5 : -5} fill="white">
            {'  '}
            {provenance.nodes[currentNode].label}
            {'  '}
          </text>
        </g>
      )}

    </g>
  );
}
