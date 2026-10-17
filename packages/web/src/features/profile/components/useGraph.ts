import { Responsive, Tooltip } from '@visx/visx';
import { useEffect } from 'react';

/**
 * The width of a graph's container (and its height with `withHeight`, for a graph that fills
 * a box sized by CSS) and the state of its tooltip. Put `parentRef` on the element around
 * the svg. A tap outside the graph closes the tooltip (touch has no pointer leave)
 */
export const useGraph = <TooltipData>({ withHeight = false } = {}) => {
  const tooltip = Tooltip.useTooltip<TooltipData>();
  const { parentRef, width, height, node } = Responsive.useParentSize({
    debounceTime: 50,
    ignoreDimensions: withHeight ? ['top', 'left'] : ['height', 'top', 'left'],
  });

  const { tooltipOpen, hideTooltip } = tooltip;
  useEffect(() => {
    if (!tooltipOpen || !node) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || !node.contains(event.target)) {
        hideTooltip();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [tooltipOpen, node, hideTooltip]);

  return { ...tooltip, parentRef, width, height };
};
