import classNames from 'classnames';

import css from './chart-label.module.css';

export const ChartLabel = ({ type, level }: { type: string; level: number | string }) => {
  return (
    <div
      className={classNames(css.chartLabel, {
        [css.single]: type === 'S',
        [css.singlep]: type === 'SP',
        [css.doublep]: type === 'DP',
        [css.double]: type === 'D',
        [css.coop]: type === 'COOP',
      })}
    >
      <span>{type}</span>
      <span>{level}</span>
    </div>
  );
};
