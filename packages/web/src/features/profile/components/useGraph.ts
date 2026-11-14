import { Responsive, Tooltip } from '@visx/visx';
import { useEffect } from 'react';

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
