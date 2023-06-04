import React from 'react';
import _ from 'lodash/fp';
import { FaCaretLeft, FaCaretRight } from 'react-icons/fa';

import Overlay from 'legacy-code/components/Shared/Overlay/Overlay';
import ToggleButton from 'legacy-code/components/Shared/ToggleButton/ToggleButton';
import Input from 'legacy-code/components/Shared/Input/Input';
import Range from 'legacy-code/components/Shared/Range';

import { CHART_MIN_MAX, DURATION_DEFAULT, DURATION } from 'legacy-code/constants/leaderboard';
import { useLanguage } from 'legacy-code/utils/context/translation';

export default function ChartFilter({ filterValue, onChange: onChangeEx }) {
  const range = _.getOr(CHART_MIN_MAX, 'range', filterValue);
  const type = _.getOr(null, 'type', filterValue);
  const duration = _.getOr(DURATION_DEFAULT, 'duration', filterValue);

  const lang = useLanguage();

  let buttonText = lang.FILTER_CHARTS;
  if (filterValue) {
    const t = type || '';
    buttonText = range[0] === range[1] ? `${t}${range[0]}` : `${t}${range[0]} - ${t}${range[1]}`;
    buttonText = lang.CHARTS + ': ' + buttonText;
    if (!_.isEqual(duration, DURATION_DEFAULT)) {
      buttonText += ' ***';
      // buttonText += ` (${_.values(DURATION)
      //   .filter(dur => duration.includes(dur))
      //   .map(s => s.slice(0, 2))
      //   .join('-')})`;
    }
  }

  const onChange = (value) => {
    onChangeEx({
      range,
      type,
      ...value,
      duration: _.isEmpty(value.duration) ? duration : value.duration,
    });
  };

  return (
    <div>
      <Overlay
        overlayClassName="chart-range-overlay-outer"
        overlayItem={
          <button className="filter-charts-button btn btn-sm btn-dark">{buttonText}</button>
        }
      >
        <div className="chart-range-overlay">
          <div className="buttons">
            <ToggleButton
              text="Single"
              active={type === 'S'}
              onToggle={(active) => {
                onChange({
                  type: active ? 'S' : null,
                });
              }}
            />
            <ToggleButton
              text="Double"
              active={type === 'D'}
              onToggle={(active) => {
                onChange({
                  type: active ? 'D' : null,
                });
              }}
            />
          </div>
          <Range
            range={range}
            min={CHART_MIN_MAX[0]}
            max={CHART_MIN_MAX[1]}
            onChange={(r) => onChange({ range: r })}
          />
          <div className="inputs">
            <button
              className="btn btn-sm btn-dark"
              onClick={() =>
                onChange({
                  range: [Math.max(range[0] - 1, CHART_MIN_MAX[0]), range[1]],
                })
              }
            >
              <FaCaretLeft />
            </button>
            <Input
              type="number"
              className="form-control"
              min={CHART_MIN_MAX[0]}
              max={Math.min(CHART_MIN_MAX[1], range[1])}
              value={range[0]}
              onBlur={(value) => {
                onChange({ range: [value, range[1]] });
              }}
            />
            <button
              className="btn btn-sm btn-dark"
              onClick={() => {
                const newMin = Math.min(range[0] + 1, CHART_MIN_MAX[1]);
                onChange({
                  range: [newMin, range[1] < newMin ? newMin : range[1]],
                });
              }}
            >
              <FaCaretRight />
            </button>
            <div className="_flex-fill" />
            <button
              className="btn btn-sm btn-dark"
              onClick={() => {
                const newMax = Math.max(range[1] - 1, CHART_MIN_MAX[0]);
                onChange({
                  range: [range[0] > newMax ? newMax : range[0], newMax],
                });
              }}
            >
              <FaCaretLeft />
            </button>
            <Input
              type="number"
              className="form-control"
              min={Math.max(CHART_MIN_MAX[0], range[0])}
              max={CHART_MIN_MAX[1]}
              value={range[1]}
              onBlur={(value) => onChange({ range: [range[0], value] })}
            />
            <button
              className="btn btn-sm btn-dark"
              onClick={() =>
                onChange({
                  range: [range[0], Math.min(range[1] + 1, CHART_MIN_MAX[1])],
                })
              }
            >
              <FaCaretRight />
            </button>
          </div>
          <div className="buttons-duration">
            <ToggleButton
              text="Standard"
              active={duration.includes(DURATION.STD)}
              onToggle={(active) => {
                onChange({
                  duration: active
                    ? [...duration, DURATION.STD]
                    : _.without([DURATION.STD], duration),
                });
              }}
            />
            <ToggleButton
              text="Short"
              active={duration.includes(DURATION.SHORT)}
              onToggle={(active) => {
                onChange({
                  duration: active
                    ? [...duration, DURATION.SHORT]
                    : _.without([DURATION.SHORT], duration),
                });
              }}
            />
            <ToggleButton
              text="Remix"
              active={duration.includes(DURATION.REMIX)}
              onToggle={(active) => {
                onChange({
                  duration: active
                    ? [...duration, DURATION.REMIX]
                    : _.without([DURATION.REMIX], duration),
                });
              }}
            />
            <ToggleButton
              text="Full"
              active={duration.includes(DURATION.FULL)}
              onToggle={(active) => {
                onChange({
                  duration: active
                    ? [...duration, DURATION.FULL]
                    : _.without([DURATION.FULL], duration),
                });
              }}
            />
          </div>
        </div>
      </Overlay>
    </div>
  );
}
