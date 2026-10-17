import { Responsive, Tooltip } from '@visx/visx';
import { useEffect } from 'react';

/**
 * The width of a graph's container and the state of its tooltip. Put `parentRef` on the
 * element around the svg. A tap outside the graph closes the tooltip (touch has no
 * pointer leave)
 */
export const useGraph = <TooltipData>() => {
  const tooltip = Tooltip.useTooltip<TooltipData>();
  const { parentRef, width, node } = Responsive.useParentSize({
    debounceTime: 50,
    ignoreDimensions: ['height', 'top', 'left'],
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

  return { ...tooltip, parentRef, width };
};
