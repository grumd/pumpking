import { Paper } from '@mantine/core';

import classes from './graphs.module.css';

// The box of a graph tooltip. The border separates it from the card under it
export const GraphTooltip = ({ children }: { children: React.ReactNode }): JSX.Element => {
  return (
    <Paper p="xs" withBorder bg="var(--pk-surface-1)">
      {children}
    </Paper>
  );
};

/**
 * A graph tooltip next to a point of the graph (in the coordinates of its `pos="relative"`
 * container): right and down from it, or left / up with `flipX` / `flipY`
 */
export const GraphTooltipAt = ({
  x,
  y,
  flipX,
  flipY,
  children,
}: {
  x: number;
  y: number;
  flipX: boolean;
  flipY: boolean;
  children: React.ReactNode;
}): JSX.Element => {
  return (
    <div
      className={classes.tooltip}
      style={{ '--tooltip-x': `${x}px`, '--tooltip-y': `${y}px` }}
      data-flip-x={flipX || undefined}
      data-flip-y={flipY || undefined}
    >
      <GraphTooltip>{children}</GraphTooltip>
    </div>
  );
};
