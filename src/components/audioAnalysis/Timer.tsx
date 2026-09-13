import * as d3 from 'd3';
import {
  useCallback, useEffect, useRef, useState,
} from 'react';
import { useReplayContext } from '../../store/hooks/useReplay';
import { youtubeReadableDuration } from '../../utils/humanReadableDuration';
import { getSeekTimeFromSvgPosition } from './timerPosition';

export function Timer({
  width,
  height,
  margin,
  debounceUpdateTimer,
  xScale,
}: {
  width: number;
  height: number;
  margin: { left: number, right: number, top: number, bottom: number };
  debounceUpdateTimer: (time: number, percent: number | undefined) => void;
  xScale: d3.ScaleLinear<number, number>;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const fullLineRef = useRef<SVGLineElement | null>(null);
  const timelineRef = useRef<SVGLineElement | null>(null);
  const timerHorizontalRef = useRef<SVGLineElement | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{ clientX: number; svgTop: number; svgX: number; time: number } | null>(null);

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

  const clickOnSvg = useCallback(
    (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
      const svgLeftOffset = e.currentTarget.getBoundingClientRect().left;
      setSeekTime(getSeekTimeFromSvgPosition(e.clientX, svgLeftOffset, xScale));
    },
    [xScale, setSeekTime],
  );

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

  return (
    <>
      <svg
        ref={svgRef}
        data-testid="replay-timer"
        data-replay-time="0"
        onClick={clickOnSvg}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        style={{
          width, height, position: 'absolute', zIndex: 10000, display: 'block',
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
