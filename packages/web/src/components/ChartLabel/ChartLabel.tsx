import classNames from 'classnames';

import { labelToTypeLevel } from 'utils/leaderboards';

import css from './chart-label.module.css';

/**
 * Derive the label color from the chart label prefix as written in the DB
 * (e.g. 'S15', 'Sp3', 'D18', 'Dp5', 'HD18', 'COOP2').
 * SP/DP charts have their own colors; older mixes write them as `Sp`/`Dp`.
 */
export const chartLabelColor = (label: string): string | undefined => {
  const upper = label.toUpperCase();
  if (upper.startsWith('HD')) return css.halfdouble;
  if (upper.startsWith('COOP')) return css.coop;
  if (upper.startsWith('DP')) return css.doublep;
  if (upper.startsWith('SP')) return css.singlep;
  if (upper.startsWith('D')) return css.double;
  if (upper.startsWith('S')) return css.single;
  return undefined;
};

export const ChartLabel = ({ label }: { label: string }) => {
  const [type, level] = labelToTypeLevel(label);

  if (!type || !level) {
    return <span>{label}</span>;
  }

  return (
    <div className={classNames(css.chartLabel, chartLabelColor(label))}>
      <span>{type}</span>
      <span>{level}</span>
    </div>
  );
};
