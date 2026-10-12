// Props for every recharts XAxis / YAxis on the profile
export const axisProps = {
  stroke: 'var(--pk-graph-axis)',
  tick: { fill: 'var(--pk-graph-axis)' },
};

// Props for every recharts Tooltip on the profile: above the next card, no animation
export const tooltipProps = {
  isAnimationActive: false,
  wrapperStyle: { zIndex: 'var(--mantine-z-index-popover)' },
};
