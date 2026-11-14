import classes from './graphs.module.css';

export const axisProps = {
  stroke: 'var(--pk-graph-axis)',
  tickStroke: 'var(--pk-graph-axis)',
  tickLabelProps: { className: classes.tick },
};

export const graphMargin = { top: 8, right: 6, bottom: 24, left: 48 };
