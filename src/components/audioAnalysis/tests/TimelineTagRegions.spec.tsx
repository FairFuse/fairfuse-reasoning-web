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

function renderRegions(
  regions: TimelineTagRegion[],
  selectedRegionId: string | null = null,
  interactive = true,
) {
  const onSelectRegion = vi.fn();
  const onRegionChange = vi.fn();

  const { container } = render(
    <TimelineTagRegions
      regions={regions}
      tags={tags}
      xScale={xScale}
      width={1000}
      bandTop={80}
      selectedRegionId={selectedRegionId}
      onSelectRegion={onSelectRegion}
      onRegionChange={onRegionChange}
      interactive={interactive}
    />,
  );

  return { container, onSelectRegion, onRegionChange };
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

  test('a press that does not move is treated as a click', () => {
    const regions = [region('a', 0, 10)];
    const { container, onSelectRegion, onRegionChange } = renderRegions(regions);

    fireEvent.mouseDown(container.querySelector('[data-testid="timeline-tag-region-a"]')!, { clientX: 50, button: 0 });
    fireEvent.mouseUp(window, { clientX: 50 });

    expect(onSelectRegion).toHaveBeenCalledWith(regions[0]);
    expect(onRegionChange).not.toHaveBeenCalled();
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

describe('TimelineTagRegions — moving and resizing', () => {
  test('dragging the body moves the region and keeps its duration', () => {
    const { container, onRegionChange, onSelectRegion } = renderRegions([region('a', 10, 30)]);

    // 1s == 10px on this scale, so +100px is +10s.
    fireEvent.mouseDown(container.querySelector('[data-testid="timeline-tag-region-a"]')!, { clientX: 100, button: 0 });
    fireEvent.mouseMove(window, { clientX: 200 });
    fireEvent.mouseUp(window, { clientX: 200 });

    expect(onRegionChange).toHaveBeenCalledWith(expect.objectContaining({
      id: 'a', start: 20, end: 40, duration: 20,
    }));
    expect(onSelectRegion).not.toHaveBeenCalled();
  });

  test('dragging the start handle holds the end', () => {
    const { container, onRegionChange } = renderRegions([region('a', 10, 30)]);

    fireEvent.mouseDown(container.querySelector('[data-testid="timeline-tag-resize-start-a"]')!, { clientX: 100, button: 0 });
    fireEvent.mouseMove(window, { clientX: 150 });
    fireEvent.mouseUp(window, { clientX: 150 });

    expect(onRegionChange).toHaveBeenCalledWith(expect.objectContaining({
      id: 'a', start: 15, end: 30, duration: 15,
    }));
  });

  test('dragging the end handle holds the start', () => {
    const { container, onRegionChange } = renderRegions([region('a', 10, 30)]);

    fireEvent.mouseDown(container.querySelector('[data-testid="timeline-tag-resize-end-a"]')!, { clientX: 300, button: 0 });
    fireEvent.mouseMove(window, { clientX: 400 });
    fireEvent.mouseUp(window, { clientX: 400 });

    expect(onRegionChange).toHaveBeenCalledWith(expect.objectContaining({
      id: 'a', start: 10, end: 40, duration: 30,
    }));
  });

  test('a drag keeps the tag and note of the region', () => {
    const tagged: TimelineTagRegion = {
      id: 'a', tagId: 'tl-2', start: 10, end: 30, duration: 20, comment: 'keep me',
    };
    const { container, onRegionChange } = renderRegions([tagged]);

    fireEvent.mouseDown(container.querySelector('[data-testid="timeline-tag-region-a"]')!, { clientX: 100, button: 0 });
    fireEvent.mouseMove(window, { clientX: 200 });
    fireEvent.mouseUp(window, { clientX: 200 });

    expect(onRegionChange).toHaveBeenCalledWith(expect.objectContaining({ tagId: 'tl-2', comment: 'keep me' }));
  });

  test('the region follows the pointer while dragging', () => {
    const { container } = renderRegions([region('a', 10, 30)]);

    fireEvent.mouseDown(container.querySelector('[data-testid="timeline-tag-region-a"]')!, { clientX: 100, button: 0 });
    fireEvent.mouseMove(window, { clientX: 200 });

    expect(container.querySelector('[data-testid="timeline-tag-region-a"]')!.getAttribute('x')).toBe('200');
  });

  test('a movement below the threshold is not a drag', () => {
    const { container, onRegionChange, onSelectRegion } = renderRegions([region('a', 10, 30)]);

    fireEvent.mouseDown(container.querySelector('[data-testid="timeline-tag-region-a"]')!, { clientX: 100, button: 0 });
    fireEvent.mouseMove(window, { clientX: 102 });
    fireEvent.mouseUp(window, { clientX: 102 });

    expect(onRegionChange).not.toHaveBeenCalled();
    expect(onSelectRegion).toHaveBeenCalled();
  });

  test('regions ignore the pointer while a new range is being drawn', () => {
    const { container, onRegionChange, onSelectRegion } = renderRegions([region('a', 10, 30)], null, false);

    const rect = container.querySelector('[data-testid="timeline-tag-region-a"]')!;
    expect((rect as SVGElement).style.pointerEvents).toBe('none');

    fireEvent.mouseDown(rect, { clientX: 100, button: 0 });
    fireEvent.mouseUp(window, { clientX: 200 });

    expect(onRegionChange).not.toHaveBeenCalled();
    expect(onSelectRegion).not.toHaveBeenCalled();
  });

  test('hides the resize handles on a region too narrow to show them', () => {
    const { container } = renderRegions([region('a', 10, 10.5)]);

    expect(container.querySelector('[data-testid="timeline-tag-resize-start-a"]')).toBeNull();
  });

  test('ignores non-primary mouse buttons', () => {
    const { container, onRegionChange, onSelectRegion } = renderRegions([region('a', 10, 30)]);

    fireEvent.mouseDown(container.querySelector('[data-testid="timeline-tag-region-a"]')!, { clientX: 100, button: 2 });
    fireEvent.mouseUp(window, { clientX: 200 });

    expect(onRegionChange).not.toHaveBeenCalled();
    expect(onSelectRegion).not.toHaveBeenCalled();
  });
});
