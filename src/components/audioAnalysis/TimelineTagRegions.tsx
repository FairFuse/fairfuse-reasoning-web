import * as d3 from 'd3';
import { useMemo } from 'react';
import { Tag, TimelineTagRegion } from '../../analysis/individualStudy/thinkAloud/types';
import { LANE_HEIGHT, packRegionsIntoLanes } from './timelineTagLayout';

const UNKNOWN_TAG_COLOR = '#868e96';

/**
 * Draws tagged time ranges above the scrubber. The svg itself ignores pointer events so
 * that clicks anywhere except on a region still reach the Timer underneath and seek.
 */
export function TimelineTagRegions({
  regions,
  tags,
  xScale,
  width,
  bandTop,
  selectedRegionId,
  onSelectRegion,
}: {
  regions: TimelineTagRegion[];
  tags: Tag[];
  xScale: d3.ScaleLinear<number, number>;
  width: number;
  bandTop: number;
  selectedRegionId: string | null;
  onSelectRegion: (region: TimelineTagRegion) => void;
}) {
  const lanes = useMemo(() => packRegionsIntoLanes(regions), [regions]);
  const tagsById = useMemo(() => new Map(tags.filter((t) => t !== undefined).map((t) => [t.id, t])), [tags]);

  if (regions.length === 0) {
    return null;
  }

  const height = bandTop + (Math.max(...lanes.values()) + 1) * LANE_HEIGHT;

  return (
    <svg
      data-testid="timeline-tag-regions"
      style={{
        width, height, position: 'absolute', top: 0, zIndex: 10001, display: 'block', pointerEvents: 'none',
      }}
    >
      {regions.map((region) => {
        const x = xScale(region.start);
        const regionWidth = Math.max(xScale(region.end) - x, 2);
        const color = tagsById.get(region.tagId)?.color ?? UNKNOWN_TAG_COLOR;
        const isSelected = region.id === selectedRegionId;

        return (
          <rect
            key={region.id}
            data-testid={`timeline-tag-region-${region.id}`}
            x={x}
            width={regionWidth}
            y={bandTop + (lanes.get(region.id) ?? 0) * LANE_HEIGHT}
            height={LANE_HEIGHT - 2}
            rx={2}
            fill={color}
            fillOpacity={isSelected ? 0.85 : 0.35}
            stroke={color}
            strokeWidth={isSelected ? 2 : 1}
            style={{ pointerEvents: 'all', cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectRegion(region);
            }}
          >
            <title>{tagsById.get(region.tagId)?.name ?? 'Unknown tag'}</title>
          </rect>
        );
      })}
    </svg>
  );
}
