import { Button } from '@mantine/core';
import cx from 'classnames';

import css from './toggle-button.module.scss';

interface ToggleButtonProps {
  pressed: boolean;
  className?: string;
  onToggle: (pressed: boolean) => void;
  children: React.ReactNode;
}

export const ToggleButton = ({
  pressed = false,
  onToggle,
  children,
  className,
}: ToggleButtonProps): JSX.Element => {
  return (
    <Button
      aria-pressed={pressed}
      onClick={() => onToggle(!pressed)}
      className={cx(className, css.toggleButton)}
    >
      {children}
    </Button>
  );
};
