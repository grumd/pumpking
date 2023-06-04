import React from 'react';
import classNames from 'classnames';

export const ChartLabel = ({ type, level }) => {
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
