import cx from 'classnames';

import { Card, type CardProps } from './Card';
import css from './card-progress.module.css';

interface CardWithProgressProps extends CardProps {
  progress: number;
}

export const CardWithProgress = ({
  progress,
  children,
  ...rest
}: CardWithProgressProps): JSX.Element => {
  return (
    <Card
      {...rest}
      level={2}
      className={css.progress}
      style={{ ['--progress']: `${Math.round(progress)}%` }}
    >
      <div
        className={cx(css.progressBackground, {
          [css.completed]: progress === 100,
          [css.zero]: progress === 0,
        })}
      ></div>
      {children}
    </Card>
  );
};
