import { describe, expect, test } from 'vitest';
import { laneCountFor, packRegionsIntoLanes } from '../timelineTagLayout';
import { TimelineTagRegion } from '../../../analysis/individualStudy/thinkAloud/types';

function region(id: string, start: number, end: number): TimelineTagRegion {
  return {
    id, tagId: `tag-${id}`, start, end, duration: end - start, comment: '',
  };
}

describe('packRegionsIntoLanes', () => {
  test('returns no lanes for no regions', () => {
    expect(packRegionsIntoLanes([]).size).toBe(0);
    expect(laneCountFor([])).toBe(0);
  });

  test('keeps non-overlapping regions in a single lane', () => {
    const regions = [region('a', 0, 5), region('b', 6, 10), region('c', 11, 12)];

    const lanes = packRegionsIntoLanes(regions);

    expect(lanes.get('a')).toBe(0);
    expect(lanes.get('b')).toBe(0);
    expect(lanes.get('c')).toBe(0);
    expect(laneCountFor(regions)).toBe(1);
  });

  test('puts overlapping regions in separate lanes', () => {
    const regions = [region('a', 0, 10), region('b', 5, 15)];

    const lanes = packRegionsIntoLanes(regions);

    expect(lanes.get('a')).toBe(0);
    expect(lanes.get('b')).toBe(1);
    expect(laneCountFor(regions)).toBe(2);
  });

  test('reuses a lane for a region starting exactly where the previous one ends', () => {
    const regions = [region('a', 0, 5), region('b', 5, 9)];

    const lanes = packRegionsIntoLanes(regions);

    expect(lanes.get('a')).toBe(0);
    expect(lanes.get('b')).toBe(0);
  });

  test('stacks three mutually overlapping regions into three lanes', () => {
    const regions = [region('a', 0, 10), region('b', 1, 11), region('c', 2, 12)];

    const lanes = packRegionsIntoLanes(regions);

    expect(lanes.get('a')).toBe(0);
    expect(lanes.get('b')).toBe(1);
    expect(lanes.get('c')).toBe(2);
    expect(laneCountFor(regions)).toBe(3);
  });

  test('fills a freed lane rather than opening a new one', () => {
    // b overlaps a, but c starts after a ends, so c belongs back in lane 0.
    const regions = [region('a', 0, 5), region('b', 1, 20), region('c', 6, 10)];

    const lanes = packRegionsIntoLanes(regions);

    expect(lanes.get('a')).toBe(0);
    expect(lanes.get('b')).toBe(1);
    expect(lanes.get('c')).toBe(0);
    expect(laneCountFor(regions)).toBe(2);
  });

  test('is independent of input order', () => {
    const regions = [region('a', 0, 10), region('b', 5, 15), region('c', 20, 25)];
    const shuffled = [regions[2], regions[0], regions[1]];

    expect(Object.fromEntries(packRegionsIntoLanes(shuffled)))
      .toEqual(Object.fromEntries(packRegionsIntoLanes(regions)));
  });
});
