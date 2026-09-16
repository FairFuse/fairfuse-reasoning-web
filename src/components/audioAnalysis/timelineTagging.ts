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
