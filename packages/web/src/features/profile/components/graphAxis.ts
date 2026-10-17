import classes from './graphs.module.css';

// Props for every visx axis on the profile
export const axisProps = {
  stroke: 'var(--pk-graph-axis)',
  tickStroke: 'var(--pk-graph-axis)',
  tickLabelProps: { className: classes.tick },
};

// Room for the y axis labels on the left and the x axis labels at the bottom
export const graphMargin = { top: 8, right: 6, bottom: 24, left: 48 };
