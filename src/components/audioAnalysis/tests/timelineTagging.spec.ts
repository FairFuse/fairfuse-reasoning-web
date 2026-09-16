import { describe, expect, test } from 'vitest';
import {
  MIN_REGION_SECONDS, applyRegionDrag, makeRegionFromDrag, secondsPerPixel,
} from '../timelineTagging';

describe('makeRegionFromDrag', () => {
  test('builds a region from a forward drag', () => {
    expect(makeRegionFromDrag(2, 8, 60)).toEqual({ start: 2, end: 8, duration: 6 });
  });

  test('normalizes a backwards drag', () => {
    expect(makeRegionFromDrag(8, 2, 60)).toEqual({ start: 2, end: 8, duration: 6 });
  });

  test('clamps to the bounds of the task', () => {
    expect(makeRegionFromDrag(-10, 80, 60)).toEqual({ start: 0, end: 60, duration: 60 });
  });

  test('keeps end equal to start plus duration', () => {
    const result = makeRegionFromDrag(1.25, 4.5, 60)!;

    expect(result.end).toBeCloseTo(result.start + result.duration);
  });

  test('rejects a drag shorter than the minimum', () => {
    expect(makeRegionFromDrag(5, 5 + MIN_REGION_SECONDS / 2, 60)).toBeNull();
  });

  test('rejects a zero-length drag, so a plain click still seeks', () => {
    expect(makeRegionFromDrag(5, 5, 60)).toBeNull();
  });

  test('accepts a drag exactly at the minimum', () => {
    expect(makeRegionFromDrag(5, 5 + MIN_REGION_SECONDS, 60)).not.toBeNull();
  });

  test('rejects a drag when the task has no duration', () => {
    expect(makeRegionFromDrag(0, 10, 0)).toBeNull();
  });

  test('rejects non-finite endpoints', () => {
    expect(makeRegionFromDrag(Number.NaN, 10, 60)).toBeNull();
  });
});

describe('secondsPerPixel', () => {
  test('derives the scale factor from the extents', () => {
    expect(secondsPerPixel({ domain: () => [0, 100], range: () => [0, 1000] })).toBe(0.1);
  });

  test('accounts for a range that does not start at zero', () => {
    expect(secondsPerPixel({ domain: () => [0, 60], range: () => [16, 616] })).toBeCloseTo(0.1);
  });

  test('returns zero for a collapsed range rather than dividing by zero', () => {
    expect(secondsPerPixel({ domain: () => [0, 60], range: () => [16, 16] })).toBe(0);
  });
});

describe('applyRegionDrag', () => {
  const region = { start: 10, end: 20 };

  test('moving preserves the duration', () => {
    expect(applyRegionDrag(region, 'move', 5, 100)).toEqual({ start: 15, end: 25, duration: 10 });
  });

  test('moving backwards past the start clamps to zero without shrinking', () => {
    expect(applyRegionDrag(region, 'move', -50, 100)).toEqual({ start: 0, end: 10, duration: 10 });
  });

  test('moving past the end clamps without shrinking', () => {
    expect(applyRegionDrag(region, 'move', 500, 100)).toEqual({ start: 90, end: 100, duration: 10 });
  });

  test('resizing the start holds the end', () => {
    expect(applyRegionDrag(region, 'resize-start', -4, 100)).toEqual({ start: 6, end: 20, duration: 14 });
  });

  test('resizing the start cannot cross the end', () => {
    const result = applyRegionDrag(region, 'resize-start', 100, 100);

    expect(result.end).toBe(20);
    expect(result.start).toBeCloseTo(20 - MIN_REGION_SECONDS);
    expect(result.duration).toBeCloseTo(MIN_REGION_SECONDS);
  });

  test('resizing the start cannot go below zero', () => {
    expect(applyRegionDrag(region, 'resize-start', -100, 100).start).toBe(0);
  });

  test('resizing the end holds the start', () => {
    expect(applyRegionDrag(region, 'resize-end', 7, 100)).toEqual({ start: 10, end: 27, duration: 17 });
  });

  test('resizing the end cannot cross the start', () => {
    const result = applyRegionDrag(region, 'resize-end', -100, 100);

    expect(result.start).toBe(10);
    expect(result.end).toBeCloseTo(10 + MIN_REGION_SECONDS);
  });

  test('resizing the end cannot pass the end of the task', () => {
    expect(applyRegionDrag(region, 'resize-end', 500, 100).end).toBe(100);
  });

  test('a zero delta leaves the region untouched', () => {
    expect(applyRegionDrag(region, 'move', 0, 100)).toEqual({ start: 10, end: 20, duration: 10 });
  });
});
