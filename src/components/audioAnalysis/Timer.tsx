import * as d3 from 'd3';
import {
  useCallback, useEffect, useRef, useState,
} from 'react';
import { useReplayContext } from '../../store/hooks/useReplay';
import { youtubeReadableDuration } from '../../utils/humanReadableDuration';
import { getSeekTimeFromSvgPosition } from './timerPosition';
import { DraftRegion, makeRegionFromDrag } from './timelineTagging';

export function Timer({
  width,
  height,
  margin,
  debounceUpdateTimer,
  xScale,
  isTagging = false,
  onRegionDrawn,
  onDragStart,
}: {
  width: number;
  height: number;
  margin: { left: number, right: number, top: number, bottom: number };
  debounceUpdateTimer: (time: number, percent: number | undefined) => void;
  xScale: d3.ScaleLinear<number, number>;
  isTagging?: boolean;
  onRegionDrawn?: (region: DraftRegion) => void;
  onDragStart?: (time: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const fullLineRef = useRef<SVGLineElement | null>(null);
  const timelineRef = useRef<SVGLineElement | null>(null);
  const timerHorizontalRef = useRef<SVGLineElement | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{ clientX: number; svgTop: number; svgX: number; time: number } | null>(null);
  const [drag, setDrag] = useState<{ anchor: number; current: number } | null>(null);

  const { setSeekTime, replayEvent, forceEmitTimeUpdate } = useReplayContext();

  useEffect(() => {
    const onTimeUpdate = (t: number) => {
      if (fullLineRef.current && timerHorizontalRef.current) {
        const x = xScale(t);
        const d3Line = d3.select(fullLineRef.current);
        d3Line.attr('x1', x).attr('x2', x);

        const th = d3.select(timerHorizontalRef.current);
        th.attr('x2', x);
      }
      svgRef.current?.setAttribute('data-replay-time', String(t));
      debounceUpdateTimer(t * 1000, undefined);
    };
    replayEvent.on('timeupdate', onTimeUpdate);
    forceEmitTimeUpdate();
    return () => {
      replayEvent.off('timeupdate', onTimeUpdate);
    };
  }, [replayEvent, xScale, debounceUpdateTimer, forceEmitTimeUpdate]);

  useEffect(() => {
    forceEmitTimeUpdate();
  }, [forceEmitTimeUpdate]);

  // Leaving tagging mode mid-drag should not leave a dangling selection behind.
  useEffect(() => {
    if (!isTagging) {
      setDrag(null);
    }
  }, [isTagging]);

  const clickOnSvg = useCallback(
    (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
      if (isTagging) {
        return;
      }
      const svgLeftOffset = e.currentTarget.getBoundingClientRect().left;
      setSeekTime(getSeekTimeFromSvgPosition(e.clientX, svgLeftOffset, xScale));
    },
    [xScale, setSeekTime, isTagging],
  );

  const onMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
      if (!isTagging || e.button !== 0) {
        return;
      }
      e.preventDefault();
      const time = getSeekTimeFromSvgPosition(e.clientX, e.currentTarget.getBoundingClientRect().left, xScale);
      setDrag({ anchor: time, current: time });
      // Called here, inside the gesture, so the browser allows playback to start.
      onDragStart?.(time);
    },
    [isTagging, xScale, onDragStart],
  );

  // Track the drag on the window so releasing outside the svg still finalizes it.
  useEffect(() => {
    if (!drag || !isTagging) {
      return undefined;
    }

    const svgLeftOffset = () => svgRef.current?.getBoundingClientRect().left ?? 0;

    const onWindowMove = (e: MouseEvent) => {
      setDrag((current) => (current
        ? { ...current, current: getSeekTimeFromSvgPosition(e.clientX, svgLeftOffset(), xScale) }
        : current));
    };

    const onWindowUp = (e: MouseEvent) => {
      const end = getSeekTimeFromSvgPosition(e.clientX, svgLeftOffset(), xScale);
      const region = makeRegionFromDrag(drag.anchor, end, xScale.domain()[1]);
      setDrag(null);
      if (region && onRegionDrawn) {
        onRegionDrawn(region);
      }
    };

    window.addEventListener('mousemove', onWindowMove);
    window.addEventListener('mouseup', onWindowUp);

    return () => {
      window.removeEventListener('mousemove', onWindowMove);
      window.removeEventListener('mouseup', onWindowUp);
    };
  }, [drag, isTagging, onRegionDrawn, xScale]);

  const onMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const time = getSeekTimeFromSvgPosition(e.clientX, rect.left, xScale);
      setHoverInfo({
        clientX: e.clientX, svgTop: rect.top, svgX: e.clientX - rect.left, time,
      });
    },
    [xScale],
  );

  const onMouseLeave = useCallback(() => setHoverInfo(null), []);

  const dragStartX = drag ? xScale(Math.min(drag.anchor, drag.current)) : 0;
  const dragEndX = drag ? xScale(Math.max(drag.anchor, drag.current)) : 0;

  return (
    <>
      <svg
        ref={svgRef}
        data-testid="replay-timer"
        data-replay-time="0"
        onClick={clickOnSvg}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        style={{
          width, height, position: 'absolute', zIndex: 10000, display: 'block', cursor: isTagging ? 'col-resize' : 'default',
        }}
      >
        <line
          ref={timelineRef}
          x1={margin.left}
          x2={width - margin.left}
          strokeWidth={3}
          y1={height / 2}
          y2={height / 2}
          stroke="#777"
          strokeLinecap="round"
        />
        <line
          ref={timerHorizontalRef}
          x1={margin.left}
          x2={width - margin.left}
          strokeWidth={5}
          y1={height / 2}
          y2={height / 2}
          stroke="cornflowerblue"
        />
        <line ref={fullLineRef} stroke="cornflowerblue" strokeWidth={3} y1={0} y2={height} />
        {drag && dragEndX > dragStartX && (
          <rect
            data-testid="timeline-tag-draft"
            x={dragStartX}
            width={dragEndX - dragStartX}
            y={0}
            height={height}
            fill="cornflowerblue"
            fillOpacity={0.25}
            stroke="cornflowerblue"
            strokeWidth={1}
          />
        )}
        {hoverInfo && hoverInfo.svgX >= margin.left && hoverInfo.svgX <= width - margin.right && (
          <line x1={hoverInfo.svgX} x2={hoverInfo.svgX} y1={0} y2={height} stroke="black" strokeWidth={1} />
        )}
      </svg>
      {hoverInfo && hoverInfo.svgX >= margin.left && hoverInfo.svgX <= width - margin.right && (
        <div
          style={{
            position: 'fixed',
            left: hoverInfo.clientX,
            top: hoverInfo.svgTop - 2,
            transform: 'translateX(-50%) translateY(-100%)',
            background: 'rgba(30,30,30,0.85)',
            border: '1px solid rgba(255, 255, 255, .5)',
            color: 'white',
            fontSize: 11,
            fontFamily: 'monospace',
            padding: '2px 6px',
            borderRadius: 10,
            pointerEvents: 'none',
            zIndex: 5,
            whiteSpace: 'nowrap',
          }}
        >
          {youtubeReadableDuration(hoverInfo.time * 1000)}
        </div>
      )}
    </>
  );
}
