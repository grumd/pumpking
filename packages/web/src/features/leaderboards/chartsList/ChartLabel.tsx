import classNames from 'classnames';

export const ChartLabel = ({ type, level }: { type: string; level: number | string }) => {
  return (
    <div
      className={classNames('chart-name', {
        single: type === 'S',
        singlep: type === 'SP',
        doublep: type === 'DP',
        double: type === 'D',
        coop: type === 'COOP',
      })}
    >
      <span className="chart-letter">{type}</span>
      <span className="chart-number">{level}</span>
    </div>
  );
};
