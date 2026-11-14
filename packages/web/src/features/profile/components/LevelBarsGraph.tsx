import { Box } from '@mantine/core';
import { Axis, Event, Group, Scale, Shape } from '@visx/visx';
import type { PointerEvent, ReactNode } from 'react';

import { GraphTooltipAt } from './GraphTooltip';
import { axisProps, graphMargin } from './graphAxis';
import classes from './graphs.module.css';
import { useGraph } from './useGraph';

const levelLabelWidth = 22;

const formatPercent = (value: number) => `${Math.round(Math.abs(value))}%`;

type LevelBarsGraphProps<Row extends { level: number }, Key extends string> = {
  data: Row[];
  keys: readonly Key[];
  value: (row: Row, key: Key) => number;
  color: (key: Key) => string;
  aspect: number;
  yDomain?: [number, number];
  yTicks?: number[];
  labels?: { above: string; below: string };
  renderTooltip: (row: Row) => ReactNode;
};

export const LevelBarsGraph = <Row extends { level: number }, Key extends string>({
  data,
  keys,
  value,
  color,
  aspect,
  yDomain,
  yTicks,
  labels,
  renderTooltip,
}: LevelBarsGraphProps<Row, Key>) => {
  const {
    parentRef,
    width,
    height,
    tooltipOpen,
    tooltipData,
    tooltipLeft,
    tooltipTop,
    ...tooltip
  } = useGraph<Row>({ withHeight: true });

  const innerWidth = Math.max(0, width - graphMargin.left - graphMargin.right);
  const innerHeight = Math.max(0, height - graphMargin.top - graphMargin.bottom);

  const safeValue = (row: Row, key: Key) => {
    const result = value(row, key);
    return Number.isFinite(result) ? result : 0;
  };

  const xScale = Scale.scaleBand({
    domain: data.map((row) => row.level),
    range: [0, innerWidth],
    paddingInner: 0.2,
    paddingOuter: 0.1,
  });

  const sums = data.map((row) => {
    const values = keys.map((key) => safeValue(row, key));
    return {
      above: values.reduce((sum, x) => (x > 0 ? sum + x : sum), 0),
      below: values.reduce((sum, x) => (x < 0 ? sum + x : sum), 0),
    };
  });
  const yScale = Scale.scaleLinear({
    domain: yDomain ?? [
      Math.min(-10, ...sums.map((x) => x.below)),
      Math.max(10, ...sums.map((x) => x.above)),
    ],
    range: [innerHeight, 0],
    nice: !yDomain,
  });

  const labelEvery = Math.max(1, Math.ceil(levelLabelWidth / Math.max(1, xScale.step())));
  const levelTicks = data.map((row) => row.level).filter((_, index) => index % labelEvery === 0);

  const showLevel = (event: PointerEvent<SVGRectElement>, row: Row) => {
    const point = Event.localPoint(event);
    tooltip.showTooltip({ tooltipData: row, tooltipLeft: point?.x, tooltipTop: graphMargin.top });
  };
  const hideOnLeave = (event: PointerEvent<SVGRectElement>) => {
    if (event.pointerType === 'mouse') {
      tooltip.hideTooltip();
    }
  };

  const columnX = (row: Row) => (xScale(row.level) ?? 0) - (xScale.step() - xScale.bandwidth()) / 2;

  return (
    <Box fz="xs" ref={parentRef} className={classes.levelBars} style={{ '--graph-aspect': aspect }}>
      {width > 0 && height > 0 && (
        <svg width={width} height={height} className={classes.svg}>
          <Group.Group left={graphMargin.left} top={graphMargin.top}>
            {tooltipOpen && tooltipData && (
              <rect
                x={columnX(tooltipData)}
                width={xScale.step()}
                height={innerHeight}
                fill="var(--pk-graph-cursor)"
              />
            )}
            <Shape.BarStack<Row, Key>
              data={data}
              keys={[...keys]}
              value={safeValue}
              x={(row) => row.level}
              xScale={xScale}
              yScale={yScale}
              color={color}
              offset="diverging"
            />
            {yScale.domain()[0] < 0 && (
              <Shape.Line
                from={{ x: 0, y: yScale(0) }}
                to={{ x: innerWidth, y: yScale(0) }}
                stroke="var(--pk-graph-reference)"
              />
            )}
            {labels && (
              <>
                <text x={6} y={4} dominantBaseline="hanging" className={classes.label}>
                  {labels.above}
                </text>
                <text x={6} y={innerHeight - 4} className={classes.label}>
                  {labels.below}
                </text>
              </>
            )}
            <Axis.AxisLeft
              scale={yScale}
              tickValues={yTicks}
              numTicks={4}
              tickFormat={(x) => formatPercent(Number(x))}
              {...axisProps}
            />
            <Axis.AxisBottom
              top={innerHeight}
              scale={xScale}
              tickValues={levelTicks}
              {...axisProps}
            />
            {data.map((row) => (
              <rect
                key={row.level}
                x={columnX(row)}
                width={xScale.step()}
                height={innerHeight}
                fill="transparent"
                onPointerDown={(event) => showLevel(event, row)}
                onPointerMove={(event) => showLevel(event, row)}
                onPointerLeave={hideOnLeave}
              />
            ))}
          </Group.Group>
        </svg>
      )}
      {tooltipOpen && tooltipData && tooltipLeft !== undefined && tooltipTop !== undefined && (
        <GraphTooltipAt
          x={tooltipLeft}
          y={tooltipTop}
          flipX={tooltipLeft > width / 2}
          flipY={false}
        >
          {renderTooltip(tooltipData)}
        </GraphTooltipAt>
      )}
    </Box>
  );
};
