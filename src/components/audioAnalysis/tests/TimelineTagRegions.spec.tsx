import * as d3 from 'd3';
import { cleanup, fireEvent, render } from '@testing-library/react';
import {
  afterEach, describe, expect, test, vi,
} from 'vitest';
import { TimelineTagRegions } from '../TimelineTagRegions';
import { Tag, TimelineTagRegion } from '../../../analysis/individualStudy/thinkAloud/types';
import { LANE_HEIGHT } from '../timelineTagLayout';

afterEach(() => cleanup());

const tags: Tag[] = [
  { id: 'tl-1', name: 'Confusion', color: '#fa5252' },
  { id: 'tl-2', name: 'Insight', color: '#40c057' },
];

function region(id: string, start: number, end: number, tagId = 'tl-1'): TimelineTagRegion {
  return {
    id, tagId, start, end, duration: end - start, comment: '',
  };
}

// 0..100 seconds mapped across 0..1000 px, so 1s == 10px.
const xScale = d3.scaleLinear([0, 1000]).domain([0, 100]);

function renderRegions(regions: TimelineTagRegion[], selectedRegionId: string | null = null) {
  const onSelectRegion = vi.fn();

  const { container } = render(
    <TimelineTagRegions
      regions={regions}
      tags={tags}
      xScale={xScale}
      width={1000}
      bandTop={80}
      selectedRegionId={selectedRegionId}
      onSelectRegion={onSelectRegion}
    />,
  );

  return { container, onSelectRegion };
}

describe('TimelineTagRegions', () => {
  test('renders nothing when there are no regions', () => {
    const { container } = renderRegions([]);

    expect(container.querySelector('svg')).toBeNull();
  });

  test('positions a region from the time scale', () => {
    const { container } = renderRegions([region('a', 10, 30)]);

    const rect = container.querySelector('[data-testid="timeline-tag-region-a"]')!;
    expect(rect.getAttribute('x')).toBe('100');
    expect(rect.getAttribute('width')).toBe('200');
  });

  test('colors a region by its tag', () => {
    const { container } = renderRegions([region('a', 0, 5, 'tl-2')]);

    expect(container.querySelector('[data-testid="timeline-tag-region-a"]')!.getAttribute('fill')).toBe('#40c057');
  });

  test('falls back to a neutral color when the tag no longer exists', () => {
    const { container } = renderRegions([region('a', 0, 5, 'deleted-tag')]);

    const rect = container.querySelector('[data-testid="timeline-tag-region-a"]')!;
    expect(rect.getAttribute('fill')).toBe('#868e96');
    expect(rect.querySelector('title')!.textContent).toBe('Unknown tag');
  });

  test('stacks overlapping regions into separate lanes', () => {
    const { container } = renderRegions([region('a', 0, 20), region('b', 10, 30)]);

    const a = container.querySelector('[data-testid="timeline-tag-region-a"]')!;
    const b = container.querySelector('[data-testid="timeline-tag-region-b"]')!;

    expect(a.getAttribute('y')).toBe('80');
    expect(b.getAttribute('y')).toBe(String(80 + LANE_HEIGHT));
  });

  test('keeps non-overlapping regions on the same lane', () => {
    const { container } = renderRegions([region('a', 0, 10), region('b', 20, 30)]);

    expect(container.querySelector('[data-testid="timeline-tag-region-a"]')!.getAttribute('y'))
      .toBe(container.querySelector('[data-testid="timeline-tag-region-b"]')!.getAttribute('y'));
  });

  test('reports the clicked region', () => {
    const regions = [region('a', 0, 10)];
    const { container, onSelectRegion } = renderRegions(regions);

    fireEvent.click(container.querySelector('[data-testid="timeline-tag-region-a"]')!);

    expect(onSelectRegion).toHaveBeenCalledWith(regions[0]);
  });

  test('emphasizes the selected region', () => {
    const { container } = renderRegions([region('a', 0, 10), region('b', 20, 30)], 'a');

    const a = container.querySelector('[data-testid="timeline-tag-region-a"]')!;
    const b = container.querySelector('[data-testid="timeline-tag-region-b"]')!;

    expect(Number(a.getAttribute('fill-opacity'))).toBeGreaterThan(Number(b.getAttribute('fill-opacity')));
    expect(a.getAttribute('stroke-width')).toBe('2');
  });

  test('lets clicks that miss a region fall through to the scrubber', () => {
    const { container } = renderRegions([region('a', 0, 10)]);

    expect((container.querySelector('svg') as SVGElement).style.pointerEvents).toBe('none');
  });

  test('gives a zero-length region a clickable minimum width', () => {
    const { container } = renderRegions([region('a', 10, 10)]);

    expect(Number(container.querySelector('[data-testid="timeline-tag-region-a"]')!.getAttribute('width'))).toBe(2);
  });
});
