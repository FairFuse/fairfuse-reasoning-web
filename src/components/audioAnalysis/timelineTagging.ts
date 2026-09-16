/**
 * Shortest drag, in seconds, that counts as a region. Anything shorter is treated as
 * a stray click so that clicking the timeline still seeks instead of creating a region.
 */
export const MIN_REGION_SECONDS = 0.25;

export interface DraftRegion {
  start: number;
  end: number;
  duration: number;
}

/** Which part of a region a pointer drag is manipulating. */
export type RegionDragMode = 'move' | 'resize-start' | 'resize-end';

/**
 * Seconds covered by one pixel of the timeline. Derived from the scale's own extents
 * rather than by inverting two positions, because the timeline scale clamps and would
 * distort a delta taken near either edge.
 */
export function secondsPerPixel(xScale: { domain: () => number[]; range: () => number[] }) {
  const [d0, d1] = xScale.domain();
  const [r0, r1] = xScale.range();
  const pixels = r1 - r0;

  return pixels === 0 ? 0 : (d1 - d0) / pixels;
}

/**
 * Moves or resizes a region by a drag distance, keeping it inside the task and no
 * shorter than the minimum. Moving preserves the duration; resizing holds the far edge.
 */
export function applyRegionDrag(
  region: { start: number; end: number },
  mode: RegionDragMode,
  deltaSeconds: number,
  taskDuration: number,
): DraftRegion {
  const clamp = (value: number, low: number, high: number) => Math.min(Math.max(value, low), high);

  if (mode === 'resize-start') {
    const start = clamp(region.start + deltaSeconds, 0, region.end - MIN_REGION_SECONDS);

    return { start, end: region.end, duration: region.end - start };
  }

  if (mode === 'resize-end') {
    const end = clamp(region.end + deltaSeconds, region.start + MIN_REGION_SECONDS, taskDuration);

    return { start: region.start, end, duration: end - region.start };
  }

  const span = region.end - region.start;
  const start = clamp(region.start + deltaSeconds, 0, Math.max(taskDuration - span, 0));
  const end = Math.min(start + span, taskDuration);

  return { start, end, duration: end - start };
}

/**
 * Turns the two endpoints of a drag into a region, ordering and clamping them to the
 * task. Returns null when the drag is too short to be intentional.
 */
export function makeRegionFromDrag(aSeconds: number, bSeconds: number, taskDuration: number): DraftRegion | null {
  if (!Number.isFinite(aSeconds) || !Number.isFinite(bSeconds) || !(taskDuration > 0)) {
    return null;
  }

  const clamp = (value: number) => Math.min(Math.max(value, 0), taskDuration);

  const start = clamp(Math.min(aSeconds, bSeconds));
  const end = clamp(Math.max(aSeconds, bSeconds));
  const duration = end - start;

  if (duration < MIN_REGION_SECONDS) {
    return null;
  }

  return { start, end, duration };
}
