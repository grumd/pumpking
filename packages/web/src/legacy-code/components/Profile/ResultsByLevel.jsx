import React, { useEffect, useState } from 'react';
import { createSelector } from 'reselect';
import _ from 'lodash/fp';
import numeral from 'numeral';
import { useSelector } from 'react-redux';
import { Link, NavLink, useNavigate, useParams } from 'react-router-dom';
import { FaCaretDown, FaCaretUp } from 'react-icons/fa';
import Select from 'react-select';

import './results-by-level.scss';

import { routes } from 'legacy-code/constants/routes';

import { profileSelector } from './Profile';

import Loader from 'legacy-code/components/Shared/Loader';
import Grade from 'legacy-code/components/Shared/Grade';
import { ChartLabel } from 'legacy-code/components/Leaderboard/ChartLabel';

import { gradeComparator } from 'legacy-code/utils/leaderboards';
import { useLanguage } from 'legacy-code/utils/context/translation';

const selectOptionsSelector = createSelector(
  (state) => state.tracklist.data,
  (data) => {
    return _.flow(
      _.get('chartLevels'),
      _.keys,
      _.filter((key) => 0 < key),
      _.map((key) => ({ label: key, value: key }))
    )(data);
  }
);

const resultsByLevelSelector = createSelector(
  (state) => state.results.sharedCharts,
  profileSelector,
  (state, props) => props.params.level,
  (state, props) => props.sortOrder,
  (sharedCharts, profile, level, sortOrder) => {
    if (!profile || !level) {
      return null;
    }

    const levelString = _.toString(level);
    const unplayed = _.flow(
      _.values,
      _.filter(
        (chart) =>
          chart.chartLevel === levelString &&
          !chart.results.some((res) => res.playerId === profile.id)
      ),
      _.map((chart) => ({ chart })),
      _.groupBy('chart.chartType')
    )(sharedCharts);

    const grouped = _.flow(
      _.groupBy('chart.chartType'),
      // Add keys from unplayed
      (g) => ({ ...Object.keys(unplayed).reduce((acc, key) => ({ ...acc, [key]: [] }), {}), ...g }),
      _.mapValues(
        _.flow(
          _.groupBy('result.grade'),
          _.toPairs,
          _.orderBy(([grade]) => gradeComparator[grade], sortOrder)
        )
      ),
      _.toPairs,
      _.orderBy(([type]) => (type === 'S' ? 0 : type === 'D' ? 1 : 2), 'asc'),
      _.map(([type, group]) =>
        sortOrder === 'asc'
          ? [type, [['X', unplayed[type] || []], ...group]]
          : [type, [...group, ['X', unplayed[type] || []]]]
      )
    )(profile.bestGradeResultsByLevel[level]);

    return { byType: grouped };
  }
);

const ResultsByLevel = () => {
  const navigate = useNavigate();
  const params = useParams();

  const lang = useLanguage();
  const [sortOrder, setSortOrder] = useState('asc');
  const selectOptions = useSelector(selectOptionsSelector);
  const profile = useSelector((state) => profileSelector(state, { params }));
  const data = useSelector((state) => resultsByLevelSelector(state, { params, sortOrder }));
  const isLoading = useSelector(
    (state) => state.charts.isLoading || state.results.isLoadingRanking || state.tracklist.isLoading
  );

  useEffect(() => {
    if (profile && !params.level) {
      const redirectToLevel = _.flow(
        _.get('resultsByLevel'),
        _.toPairs,
        _.maxBy('[1].length'),
        _.first
      )(profile);
      navigate(routes.profile.resultsByLevel.level.getPath({ ...params, level: redirectToLevel }));
    }
  }, [params, profile, navigate]);

  if (isLoading) {
    return <Loader />;
  }

  if (!data) {
    return null;
  }

  const chartTypeText = {
    D: lang.DOUBLES,
    S: lang.SINGLES,
  };

  const handleChangeLvl = (level) => {
    navigate(routes.profile.resultsByLevel.level.getPath({ id: profile.id, level: level }));
  };

  return (
    <div className="profile-results-by-level">
      <header>
        <Link to={routes.profile.getPath({ id: profile.id })}>
          <button className="btn btn-sm btn-dark btn-icon _margin-right">{lang.BACK_BUTTON}</button>
        </Link>
        <div className="_flex-fill" />
        <button
          className="btn btn-sm btn-dark btn-icon _margin-right"
          onClick={() => setSortOrder((order) => (order === 'asc' ? 'desc' : 'asc'))}
        >
          {sortOrder === 'desc' ? <FaCaretDown /> : <FaCaretUp />} {lang.SORTING}
        </button>
        <button
          className="btn btn-sm btn-dark _margin-right"
          disabled={params.level === '1'}
          onClick={() => handleChangeLvl(Number(params.level) - 1)}
        >
          -
        </button>
        <Select
          className={'select levels _margin-right'}
          classNamePrefix="select"
          placeholder={lang.LEVEL_PLACEHOLDER}
          options={selectOptions}
          value={selectOptions.find((option) => option.value === params.level)}
          onChange={(option) => handleChangeLvl(option.value)}
        />
        <button
          className="btn btn-sm btn-dark"
          disabled={params.level === '28'}
          onClick={() => handleChangeLvl(Number(params.level) + 1)}
        >
          +
        </button>
      </header>
      <div className="chart-types">
        {data.byType.map(([chartType, byGrade]) => {
          const total = byGrade.map((list) => list[1].length).reduce((sum, cur) => sum + cur, 0);

          return (
            <div key={chartType} className="chart-type">
              <header>{`${chartTypeText[chartType] || chartType} (${total})`}</header>
              <div className="grades-groups">
                {byGrade.map(([grade, charts]) => {
                  if (_.isEmpty(charts)) {
                    return null;
                  }

                  return (
                    <div key={grade} className="grades-group">
                      <header>
                        {grade === 'X' ? (
                          lang.UNPLAYED
                        ) : grade === '?' ? (
                          '?'
                        ) : (
                          <Grade grade={grade} />
                        )}
                        {` (${charts.length})`}
                      </header>
                      <div className="charts-for-grade">
                        {charts.map(({ chart, result }) => {
                          return (
                            <div key={chart.sharedChartId} className="chart-block">
                              <ChartLabel type={chart.chartType} level={chart.chartLevel} />
                              <NavLink
                                exact
                                to={routes.leaderboard.sharedChart.getPath({
                                  sharedChartId: chart.sharedChartId,
                                })}
                              >
                                {chart.song}
                              </NavLink>
                              {result && (
                                <>
                                  <div className="_flex-fill" />
                                  <Grade grade={grade} />
                                  <span className="score-span desktop-only">
                                    {result.scoreIncrease > result.score * 0.8 && '*'}
                                    {numeral(result.score).format('0,0')}
                                  </span>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ResultsByLevel;
