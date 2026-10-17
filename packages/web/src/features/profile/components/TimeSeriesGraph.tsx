import { Box, Text } from '@mantine/core';
import {
  Axis,
  Brush,
  ClipPath,
  Curve,
  Event,
  Gradient,
  Grid,
  Group,
  Scale,
  Shape,
} from '@visx/visx';
import { type PointerEvent, type ReactNode, useId, useMemo, useState } from 'react';

import { KeyValueList } from 'components/KeyValueList/KeyValueList';

import { GraphLegend } from './GraphLegend';
import { GraphTooltipAt } from './GraphTooltip';
import { SeriesLabel } from './SeriesLabel';
import { axisProps, graphMargin } from './graphAxis';
import classes from './graphs.module.css';
import { useGraph } from './useGraph';

export type TimePoint = { date: number; value: number };

type LinearScale = ReturnType<typeof Scale.scaleLinear<number>>;

export type TimeSeries = {
  label: string;
  color: string;
  data: TimePoint[];
  // pp history is a smooth line, places go in steps
  curve: 'smooth' | 'step';
  // A fading fill under the line
  area: boolean;
  // The y axis for the values shown: [bottom, top] (places put 1 on top)
  yDomain: (values: number[]) => [number, number];
  yTicks: (scale: LinearScale) => number[];
  formatValue: (value: number) => ReactNode;
};

const day = 24 * 60 * 60 * 1000;
const year = 365 * day;

const accent = 'var(--mantine-color-accent-filled)';

// The brush under the graph: a gap, the overview of the whole history, its year labels
const brushGap = 16;
const brushHeight = 36;
const brushAxisHeight = 24;
// Room for the second series' axis on the right
const rightAxisWidth = 40;

// Index of the last point at or before the date (0 when there is none)
const lastIndexAtOrBefore = (data: TimePoint[], date: number) => {
  let low = 0;
  let high = data.length - 1;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (data[middle].date <= date) {
      low = middle;
    } else {
      high = middle - 1;
    }
  }
  return low;
};

// Where a series is on the date: its last point at or before it
const pointAt = (data: TimePoint[], date: number) =>
  data.length && data[0].date <= date ? data[lastIndexAtOrBefore(data, date)] : undefined;

// Years over a long span, months over a shorter one, days over a few weeks
const formatDateTick = (date: Date, span: number) => {
  if (span > 3 * year) {
    return date.toLocaleDateString(undefined, { year: 'numeric' });
  }
  if (span > 60 * day) {
    return date.getMonth() === 0
      ? date.toLocaleDateString(undefined, { year: 'numeric' })
      : date.toLocaleDateString(undefined, { month: 'short' });
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

// Keeps a fast drag on the brush going: visx ends it when the pointer leaves the brush strip
const capturePointer = (event: PointerEvent<SVGGElement>) => {
  if (event.target instanceof Element) {
    event.target.setPointerCapture(event.pointerId);
  }
};

// A value tick as it is: visx's default pads every label to the precision of 10 ticks ("2.0")
const formatValueTick = (value: { valueOf(): number }) => Number(value).toLocaleString();

type TooltipData = { date: number; points: Array<TimePoint | undefined> };

/**
 * One or two values over time (the second one on a right axis) with a brush under them that
 * picks the dates shown: the last year at first. Remount it (`key`) for another player: the
 * brush only reads its start position once
 */
export const TimeSeriesGraph = ({
  series,
  aspect = 1.5,
}: {
  series: [TimeSeries] | [TimeSeries, TimeSeries];
  // Width / height of the graph with its brush
  aspect?: number;
}) => {
  const id = useId().replace(/:/g, '');
  const { parentRef, width, tooltipOpen, tooltipData, tooltipLeft, tooltipTop, ...tooltip } =
    useGraph<TooltipData>();

  const first = Math.min(...series.map((one) => one.data[0]?.date ?? Infinity));
  const last = Math.max(...series.map((one) => one.data.at(-1)?.date ?? -Infinity));
  // One point has no span: show a day around it
  const fullRange: [number, number] = first < last ? [first, last] : [first - day, last + day];
  const [range, setRange] = useState<[number, number]>(() => [
    Math.max(fullRange[0], fullRange[1] - year),
    fullRange[1],
  ]);

  const margin = { ...graphMargin, right: series[1] ? rightAxisWidth : graphMargin.right };
  const height = Math.max(240, width / aspect);
  const innerWidth = Math.max(0, width - margin.left - margin.right);
  const mainHeight = height - brushGap - brushHeight - brushAxisHeight;
  const innerHeight = Math.max(0, mainHeight - margin.top - margin.bottom);

  // The points in the range, and one on each side so the lines reach the edges
  const visible = useMemo(
    () =>
      series.map((one) => {
        const from = lastIndexAtOrBefore(one.data, range[0]);
        const to = lastIndexAtOrBefore(one.data, range[1]) + 2;
        return one.data.slice(from, to);
      }),
    [series, range]
  );

  const xScale = Scale.scaleTime({ domain: range, range: [0, innerWidth] });
  const yScales = series.map((one, index) =>
    Scale.scaleLinear({
      domain: one.yDomain(visible[index].map((point) => point.value)),
      range: [innerHeight, 0],
    })
  );
  const yTicks = series.map((one, index) => one.yTicks(yScales[index]));

  const brushXScale = Scale.scaleTime({ domain: fullRange, range: [0, innerWidth] });
  const brushYScales = series.map((one) =>
    Scale.scaleLinear({
      domain: one.yDomain(one.data.map((point) => point.value)),
      range: [brushHeight, 0],
    })
  );
  // The brush only reads it when it mounts (with the first measured width)
  const initialBrushPosition = {
    start: { x: brushXScale(range[0]) },
    end: { x: brushXScale(range[1]) },
  };

  const onBrushChange = (bounds: { x0: number; x1: number } | null) => {
    // Cleared (a click or a double click on the brush): the whole history
    setRange(bounds ? [Number(bounds.x0), Number(bounds.x1)] : fullRange);
  };

  const curveOf = (one: TimeSeries) =>
    one.curve === 'step' ? Curve.curveStepAfter : Curve.curveMonotoneX;

  const showPoint = (event: PointerEvent<SVGRectElement>) => {
    const pointer = Event.localPoint(event);
    if (!pointer) {
      return;
    }
    const date = xScale.invert(pointer.x - margin.left).getTime();
    // The nearest point in the range, of the first series that has one there
    const nearest = visible
      .map((points) => {
        const index = lastIndexAtOrBefore(points, date);
        return [points[index], points[index + 1]]
          .filter((point) => point && point.date >= range[0] && point.date <= range[1])
          .sort((a, b) => Math.abs(a.date - date) - Math.abs(b.date - date))[0];
      })
      .find(Boolean);
    if (!nearest) {
      tooltip.hideTooltip();
      return;
    }
    const points = series.map((one) => pointAt(one.data, nearest.date));
    const anchor = points.findIndex(Boolean);
    tooltip.showTooltip({
      tooltipData: { date: nearest.date, points },
      tooltipLeft: margin.left + xScale(nearest.date),
      tooltipTop: margin.top + yScales[anchor](points[anchor]?.value ?? 0),
    });
  };
  const hideOnLeave = (event: PointerEvent<SVGRectElement>) => {
    if (event.pointerType === 'mouse') {
      tooltip.hideTooltip();
    }
  };

  const span = range[1] - range[0];
  // With two axes, each one's labels take the color of its line (--series-color around it)
  const valueAxisProps = series[1]
    ? { ...axisProps, tickLabelProps: { className: classes.seriesTick } }
    : axisProps;

  return (
    // Axis ticks in the caption size
    <Box fz="xs" pos="relative" ref={parentRef}>
      {width > 0 && (
        <svg width={width} height={height} className={classes.svg}>
          {series.map((one, index) => (
            <Gradient.LinearGradient
              key={index}
              id={`${id}-area-${index}`}
              from={one.color}
              to={one.color}
              fromOpacity={0.3}
              toOpacity={0}
            />
          ))}
          <ClipPath.RectClipPath id={`${id}-clip`} width={innerWidth} height={innerHeight} />
          <Group.Group left={margin.left} top={margin.top}>
            <Grid.GridRows
              scale={yScales[0]}
              width={innerWidth}
              tickValues={yTicks[0]}
              stroke="var(--pk-graph-grid)"
              strokeDasharray="3 3"
            />
            <Group.Group clipPath={`url(#${id}-clip)`}>
              {series.map((one, index) => (
                <Group.Group key={index}>
                  {one.area && (
                    <Shape.AreaClosed<TimePoint>
                      data={visible[index]}
                      x={(point) => xScale(point.date)}
                      y={(point) => yScales[index](point.value)}
                      yScale={yScales[index]}
                      curve={curveOf(one)}
                      fill={`url(#${id}-area-${index})`}
                    />
                  )}
                  <Shape.LinePath<TimePoint>
                    data={visible[index]}
                    x={(point) => xScale(point.date)}
                    y={(point) => yScales[index](point.value)}
                    curve={curveOf(one)}
                    stroke={one.color}
                    strokeWidth={2.5}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </Group.Group>
              ))}
            </Group.Group>
            <g style={{ '--series-color': series[0].color }}>
              <Axis.AxisLeft
                scale={yScales[0]}
                tickValues={yTicks[0]}
                tickFormat={formatValueTick}
                hideAxisLine
                hideTicks
                {...valueAxisProps}
              />
            </g>
            {series[1] && (
              <g style={{ '--series-color': series[1].color }}>
                <Axis.AxisRight
                  left={innerWidth}
                  scale={yScales[1]}
                  tickValues={yTicks[1]}
                  tickFormat={formatValueTick}
                  hideAxisLine
                  hideTicks
                  {...valueAxisProps}
                />
              </g>
            )}
            <Axis.AxisBottom
              top={innerHeight}
              scale={xScale}
              numTicks={Math.max(3, Math.floor(innerWidth / 70))}
              tickFormat={(date) => formatDateTick(date as Date, span)}
              hideTicks
              {...axisProps}
            />
            {tooltipOpen && tooltipData && (
              <>
                <Shape.Line
                  from={{ x: xScale(tooltipData.date), y: 0 }}
                  to={{ x: xScale(tooltipData.date), y: innerHeight }}
                  stroke="var(--pk-graph-reference)"
                  strokeDasharray="3 3"
                />
                {tooltipData.points.map(
                  (point, index) =>
                    point && (
                      <circle
                        key={index}
                        cx={xScale(tooltipData.date)}
                        cy={yScales[index](point.value)}
                        r={5}
                        fill={series[index].color}
                        stroke="var(--pk-surface-1)"
                        strokeWidth={2}
                      />
                    )
                )}
              </>
            )}
            <rect
              width={innerWidth}
              height={innerHeight}
              fill="transparent"
              onPointerDown={showPoint}
              onPointerMove={showPoint}
              onPointerLeave={hideOnLeave}
            />
          </Group.Group>
          <Group.Group left={margin.left} top={mainHeight + brushGap}>
            <rect width={innerWidth} height={brushHeight} fill="var(--pk-graph-cursor)" />
            {series.map((one, index) => (
              <Group.Group key={index}>
                {one.area && (
                  <Shape.AreaClosed<TimePoint>
                    data={one.data}
                    x={(point) => brushXScale(point.date)}
                    y={(point) => brushYScales[index](point.value)}
                    yScale={brushYScales[index]}
                    curve={curveOf(one)}
                    fill={`url(#${id}-area-${index})`}
                  />
                )}
                <Shape.LinePath<TimePoint>
                  data={one.data}
                  x={(point) => brushXScale(point.date)}
                  y={(point) => brushYScales[index](point.value)}
                  curve={curveOf(one)}
                  stroke={one.color}
                  strokeOpacity={0.6}
                />
              </Group.Group>
            ))}
            <Axis.AxisBottom
              top={brushHeight}
              scale={brushXScale}
              numTicks={Math.max(3, Math.floor(innerWidth / 70))}
              tickFormat={(date) => formatDateTick(date as Date, fullRange[1] - fullRange[0])}
              tickLength={4}
              hideTicks
              hideAxisLine
              {...axisProps}
            />
            <Group.Group onPointerDownCapture={capturePointer}>
              <Brush.Brush
                xScale={brushXScale}
                yScale={brushYScales[0]}
                width={innerWidth}
                height={brushHeight}
                handleSize={10}
                brushDirection="horizontal"
                resizeTriggerAreas={['left', 'right']}
                initialBrushPosition={initialBrushPosition}
                onChange={onBrushChange}
                disableDraggingSelection={false}
                selectedBoxStyle={{
                  fill: accent,
                  fillOpacity: 0.15,
                  stroke: accent,
                  strokeOpacity: 0.8,
                  strokeWidth: 1,
                }}
                renderBrushHandle={({ x, height: handleHeight, isBrushActive }) =>
                  isBrushActive && (
                    <rect
                      x={x + 2}
                      y={handleHeight / 2 - 8}
                      width={6}
                      height={16}
                      rx={2}
                      fill={accent}
                    />
                  )
                }
              />
            </Group.Group>
          </Group.Group>
        </svg>
      )}
      {series[1] && (
        <GraphLegend items={series.map((one) => ({ label: one.label, color: one.color }))} />
      )}
      {tooltipOpen && tooltipData && tooltipLeft !== undefined && tooltipTop !== undefined && (
        <GraphTooltipAt
          x={tooltipLeft}
          y={tooltipTop}
          flipX={tooltipLeft > width / 2}
          flipY={tooltipTop > mainHeight / 2}
        >
          <Text size="sm" c="dimmed">
            {new Date(tooltipData.date).toLocaleDateString()}
          </Text>
          <KeyValueList
            items={series.map((one, index) => {
              const point = tooltipData.points[index];
              return (
                point && {
                  label: series[1] ? (
                    <SeriesLabel color={one.color}>{one.label}</SeriesLabel>
                  ) : (
                    one.label
                  ),
                  value: one.formatValue(point.value),
                }
              );
            })}
          />
        </GraphTooltipAt>
      )}
    </Box>
  );
};
