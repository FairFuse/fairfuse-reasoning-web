import * as d3 from 'd3';
import { cleanup, fireEvent, render } from '@testing-library/react';
import {
  afterEach, beforeEach, describe, expect, test, vi,
} from 'vitest';
import { Timer } from '../Timer';
import { useReplayContext } from '../../../store/hooks/useReplay';

vi.mock('../../../store/hooks/useReplay', () => ({ useReplayContext: vi.fn() }));

const setSeekTime = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useReplayContext).mockReturnValue({
    setSeekTime,
    replayEvent: { on: vi.fn(), off: vi.fn() },
    forceEmitTimeUpdate: vi.fn(),
  } as unknown as ReturnType<typeof useReplayContext>);
});

afterEach(() => cleanup());

// 0..100 seconds across 0..1000 px, so 1s == 10px and clientX maps directly.
const xScale = d3.scaleLinear([0, 1000]).domain([0, 100]).clamp(true);
const margin = {
  left: 0, right: 0, top: 0, bottom: 0,
};

function renderTimer(isTagging: boolean) {
  const onRegionDrawn = vi.fn();
  const onDragStart = vi.fn();

  const { container } = render(
    <Timer
      width={1000}
      height={80}
      margin={margin}
      debounceUpdateTimer={vi.fn()}
      xScale={xScale}
      isTagging={isTagging}
      onRegionDrawn={onRegionDrawn}
      onDragStart={onDragStart}
    />,
  );

  const svg = container.querySelector('[data-testid="replay-timer"]') as SVGSVGElement;
  // jsdom gives every element a zero-sized rect, so clientX is already svg-relative.
  svg.getBoundingClientRect = () => ({ left: 0, top: 0 }) as DOMRect;

  return { svg, onRegionDrawn, onDragStart };
}

describe('Timer', () => {
  test('clicking seeks when tagging is off', () => {
    const { svg } = renderTimer(false);

    fireEvent.click(svg, { clientX: 300 });

    expect(setSeekTime).toHaveBeenCalledWith(30);
  });

  test('clicking does not seek while tagging is armed', () => {
    const { svg } = renderTimer(true);

    fireEvent.click(svg, { clientX: 300 });

    expect(setSeekTime).not.toHaveBeenCalled();
  });

  test('reports the drag start time as soon as the drag begins', () => {
    const { svg, onDragStart } = renderTimer(true);

    fireEvent.mouseDown(svg, { clientX: 250, button: 0 });

    expect(onDragStart).toHaveBeenCalledWith(25);
  });

  test('does not report a drag start when tagging is off', () => {
    const { svg, onDragStart } = renderTimer(false);

    fireEvent.mouseDown(svg, { clientX: 250, button: 0 });

    expect(onDragStart).not.toHaveBeenCalled();
  });

  test('reports the drag start before the region is known', () => {
    const { svg, onDragStart, onRegionDrawn } = renderTimer(true);

    fireEvent.mouseDown(svg, { clientX: 100, button: 0 });

    expect(onDragStart).toHaveBeenCalled();
    expect(onRegionDrawn).not.toHaveBeenCalled();

    fireEvent.mouseUp(window, { clientX: 400 });

    expect(onRegionDrawn).toHaveBeenCalledWith({ start: 10, end: 40, duration: 30 });
  });

  test('dragging reports a region', () => {
    const { svg, onRegionDrawn } = renderTimer(true);

    fireEvent.mouseDown(svg, { clientX: 100, button: 0 });
    fireEvent.mouseMove(window, { clientX: 400 });
    fireEvent.mouseUp(window, { clientX: 400 });

    expect(onRegionDrawn).toHaveBeenCalledWith({ start: 10, end: 40, duration: 30 });
  });

  test('dragging right to left produces the same region', () => {
    const { svg, onRegionDrawn } = renderTimer(true);

    fireEvent.mouseDown(svg, { clientX: 400, button: 0 });
    fireEvent.mouseUp(window, { clientX: 100 });

    expect(onRegionDrawn).toHaveBeenCalledWith({ start: 10, end: 40, duration: 30 });
  });

  test('a drag too short to be intentional reports nothing', () => {
    const { svg, onRegionDrawn } = renderTimer(true);

    fireEvent.mouseDown(svg, { clientX: 100, button: 0 });
    fireEvent.mouseUp(window, { clientX: 101 });

    expect(onRegionDrawn).not.toHaveBeenCalled();
  });

  test('releasing outside the svg still finalizes the drag', () => {
    const { svg, onRegionDrawn } = renderTimer(true);

    fireEvent.mouseDown(svg, { clientX: 100, button: 0 });
    // Past the right edge; the scale clamps it back to the end of the task.
    fireEvent.mouseUp(window, { clientX: 5000 });

    expect(onRegionDrawn).toHaveBeenCalledWith({ start: 10, end: 100, duration: 90 });
  });

  test('does not start a drag when tagging is off', () => {
    const { svg, onRegionDrawn } = renderTimer(false);

    fireEvent.mouseDown(svg, { clientX: 100, button: 0 });
    fireEvent.mouseUp(window, { clientX: 400 });

    expect(onRegionDrawn).not.toHaveBeenCalled();
  });

  test('ignores non-primary mouse buttons', () => {
    const { svg, onRegionDrawn } = renderTimer(true);

    fireEvent.mouseDown(svg, { clientX: 100, button: 2 });
    fireEvent.mouseUp(window, { clientX: 400 });

    expect(onRegionDrawn).not.toHaveBeenCalled();
  });

  test('renders a draft rectangle while dragging', () => {
    const { svg } = renderTimer(true);

    fireEvent.mouseDown(svg, { clientX: 100, button: 0 });
    fireEvent.mouseMove(window, { clientX: 400 });

    const draft = svg.querySelector('[data-testid="timeline-tag-draft"]')!;
    expect(draft.getAttribute('x')).toBe('100');
    expect(draft.getAttribute('width')).toBe('300');
  });

  test('clears the draft rectangle once the drag ends', () => {
    const { svg } = renderTimer(true);

    fireEvent.mouseDown(svg, { clientX: 100, button: 0 });
    fireEvent.mouseMove(window, { clientX: 400 });
    fireEvent.mouseUp(window, { clientX: 400 });

    expect(svg.querySelector('[data-testid="timeline-tag-draft"]')).toBeNull();
  });
});
