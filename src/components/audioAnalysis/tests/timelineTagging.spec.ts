import { describe, expect, test } from 'vitest';
import { MIN_REGION_SECONDS, makeRegionFromDrag } from '../timelineTagging';

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
