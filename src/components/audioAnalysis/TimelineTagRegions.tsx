import * as d3 from 'd3';
import {
  useCallback, useEffect, useMemo, useState,
} from 'react';
import { Tag, TimelineTagRegion } from '../../analysis/individualStudy/thinkAloud/types';
import { LANE_HEIGHT, packRegionsIntoLanes } from './timelineTagLayout';
import { RegionDragMode, applyRegionDrag, secondsPerPixel } from './timelineTagging';

const UNKNOWN_TAG_COLOR = '#868e96';
/** Width of the grab area at each edge of a region. */
const HANDLE_WIDTH = 6;
/** Narrowest a region can be drawn and still show both resize handles. */
const MIN_WIDTH_FOR_HANDLES = 18;
/** Pixels of movement before a press counts as a drag rather than a click. */
const DRAG_THRESHOLD = 3;

interface Manipulation {
  id: string;
  mode: RegionDragMode;
  originX: number;
  original: TimelineTagRegion;
  moved: boolean;
  preview: { start: number; end: number; duration: number };
}

/**
 * Draws tagged time ranges above the scrubber, and lets them be moved and resized.
 * The svg itself ignores pointer events so that clicks anywhere except on a region
 * still reach the Timer underneath and seek.
 */
export function TimelineTagRegions({
  regions,
  tags,
  xScale,
  width,
  bandTop,
  selectedRegionId,
  onSelectRegion,
  onRegionChange,
  interactive = true,
}: {
  regions: TimelineTagRegion[];
  tags: Tag[];
  xScale: d3.ScaleLinear<number, number>;
  width: number;
  bandTop: number;
  selectedRegionId: string | null;
  onSelectRegion: (region: TimelineTagRegion) => void;
  onRegionChange?: (region: TimelineTagRegion) => void;
  interactive?: boolean;
}) {
  const lanes = useMemo(() => packRegionsIntoLanes(regions), [regions]);
  const tagsById = useMemo(() => new Map(tags.filter((t) => t !== undefined).map((t) => [t.id, t])), [tags]);
  const [manipulation, setManipulation] = useState<Manipulation | null>(null);

  const taskDuration = xScale.domain()[1];
  const perPixel = secondsPerPixel(xScale);

  const beginManipulation = useCallback(
    (e: React.MouseEvent, region: TimelineTagRegion, mode: RegionDragMode) => {
      if (!interactive || e.button !== 0) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      setManipulation({
        id: region.id,
        mode,
        originX: e.clientX,
        original: region,
        moved: false,
        preview: { start: region.start, end: region.end, duration: region.duration },
      });
    },
    [interactive],
  );

  // Tracked on the window so a drag survives leaving the small region rect.
  useEffect(() => {
    if (!manipulation) {
      return undefined;
    }

    const onMove = (e: MouseEvent) => {
      setManipulation((current) => {
        if (!current) {
          return current;
        }
        const dx = e.clientX - current.originX;
        const moved = current.moved || Math.abs(dx) > DRAG_THRESHOLD;

        return {
          ...current,
          moved,
          preview: moved
            ? applyRegionDrag(current.original, current.mode, dx * perPixel, taskDuration)
            : current.preview,
        };
      });
    };

    const onUp = () => {
      setManipulation((current) => {
        if (current) {
          if (current.moved) {
            onRegionChange?.({ ...current.original, ...current.preview });
          } else {
            // A press that never moved is a plain click on the region.
            onSelectRegion(current.original);
          }
        }
        return null;
      });
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [manipulation, onRegionChange, onSelectRegion, perPixel, taskDuration]);

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
        const live = manipulation?.id === region.id && manipulation.moved ? manipulation.preview : region;
        const x = xScale(live.start);
        const regionWidth = Math.max(xScale(live.end) - x, 2);
        const color = tagsById.get(region.tagId)?.color ?? UNKNOWN_TAG_COLOR;
        const isSelected = region.id === selectedRegionId;
        const y = bandTop + (lanes.get(region.id) ?? 0) * LANE_HEIGHT;
        const barHeight = LANE_HEIGHT - 2;
        const showHandles = interactive && regionWidth >= MIN_WIDTH_FOR_HANDLES;

        return (
          <g key={region.id}>
            <rect
              data-testid={`timeline-tag-region-${region.id}`}
              x={x}
              width={regionWidth}
              y={y}
              height={barHeight}
              rx={2}
              fill={color}
              fillOpacity={isSelected ? 0.85 : 0.35}
              stroke={color}
              strokeWidth={isSelected ? 2 : 1}
              style={{ pointerEvents: interactive ? 'all' : 'none', cursor: interactive ? 'grab' : 'default' }}
              onMouseDown={(e) => beginManipulation(e, region, 'move')}
            >
              <title>{tagsById.get(region.tagId)?.name ?? 'Unknown tag'}</title>
            </rect>

            {showHandles && (
              <>
                <rect
                  data-testid={`timeline-tag-resize-start-${region.id}`}
                  x={x}
                  width={HANDLE_WIDTH}
                  y={y}
                  height={barHeight}
                  fill={color}
                  fillOpacity={0.01}
                  style={{ pointerEvents: 'all', cursor: 'ew-resize' }}
                  onMouseDown={(e) => beginManipulation(e, region, 'resize-start')}
                />
                <rect
                  data-testid={`timeline-tag-resize-end-${region.id}`}
                  x={x + regionWidth - HANDLE_WIDTH}
                  width={HANDLE_WIDTH}
                  y={y}
                  height={barHeight}
                  fill={color}
                  fillOpacity={0.01}
                  style={{ pointerEvents: 'all', cursor: 'ew-resize' }}
                  onMouseDown={(e) => beginManipulation(e, region, 'resize-end')}
                />
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}
