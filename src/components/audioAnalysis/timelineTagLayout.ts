import { TimelineTagRegion } from '../../analysis/individualStudy/thinkAloud/types';

/** Height in pixels of a single lane of timeline tag regions. */
export const LANE_HEIGHT = 10;

/**
 * Greedily packs regions into lanes so that overlapping regions never share a lane.
 * Regions are sorted by start time first, so the result only depends on the regions
 * themselves and not on the order they arrive in.
 */
export function packRegionsIntoLanes(regions: TimelineTagRegion[]) {
  const sorted = [...regions].sort((a, b) => (a.start - b.start) || (a.end - b.end) || a.id.localeCompare(b.id));

  // Last occupied end time for each lane.
  const laneEnds: number[] = [];
  const lanes = new Map<string, number>();

  sorted.forEach((region) => {
    let lane = laneEnds.findIndex((end) => end <= region.start);

    if (lane === -1) {
      lane = laneEnds.length;
    }

    laneEnds[lane] = region.end;
    lanes.set(region.id, lane);
  });

  return lanes;
}

/** Number of lanes needed to lay out the given regions without overlap. */
export function laneCountFor(regions: TimelineTagRegion[]) {
  if (regions.length === 0) {
    return 0;
  }

  return Math.max(...packRegionsIntoLanes(regions).values()) + 1;
}
