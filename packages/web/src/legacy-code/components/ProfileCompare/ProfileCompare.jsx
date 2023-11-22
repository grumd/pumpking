import React, { Component } from 'react';
import toBe from 'prop-types';
import { connect } from 'react-redux';
import { FaSearch, FaCaretLeft, FaCaretRight } from 'react-icons/fa';
import moment from 'moment';
import {
  BarChart,
  Bar,
  LineChart,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ReferenceLine,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
} from 'recharts';
import _ from 'lodash/fp';
import memoize from 'lru-memoize';

// styles
import './profile-compare.scss';

// constants
import { DEBUG } from 'legacy-code/constants/env';

// components
import ToggleButton from 'legacy-code/components/Shared/ToggleButton/ToggleButton';
import Toggle from 'legacy-code/components/Shared/Toggle/Toggle';
import Loader from 'legacy-code/components/Shared/Loader';
import Range from 'legacy-code/components/Shared/Range';

// reducers
import { fetchChartsData } from 'legacy-code/reducers/charts';
import { setProfilesFilter, resetProfilesFilter } from 'legacy-code/reducers/profiles';

// utils
import { profileSelectorCreator } from 'legacy-code/utils/profiles';
import { parseDate } from 'legacy-code/utils/date';
import { getTimeAgo } from 'legacy-code/utils/leaderboards';
import { Language } from 'utils/context/translation';
import { PlayerCompareSelect } from 'legacy-code/components/Profile/PlayerCompareSelect';
import { withParams } from 'legacy-code/utils/withParams';

// code
const BARS_MODES = {
  SINGLE_TWO: 'SINGLE_TWO',
  SINGLE_FIVE: 'SINGLE_FIVE',
  DOUBLE_TWO: 'DOUBLE_TWO',
  DOUBLE_FIVE: 'DOUBLE_FIVE',
  BOTH_TWO: 'BOTH_TWO',
  BOTH_FIVE: 'BOTH_FIVE',
};
const getCompareBars = (mode) => {
  switch (mode) {
    case BARS_MODES.SINGLE_TWO:
      return [
        <Bar
          key="11"
          dataKey="single.twoBars.p1win"
          fill="#4696f0"
          stackId="stack"
          isAnimationActive
        />,
        <Bar
          key="22"
          dataKey="single.twoBars.p2win"
          fill="#eda338"
          stackId="stack"
          isAnimationActive
        />,
      ];
    case BARS_MODES.SINGLE_FIVE:
      return [
        <Bar key="1" dataKey="single.p1win" fill="#4696f0" stackId="stack" isAnimationActive />,
        <Bar
          key="2"
          dataKey="single.p2notPlayed"
          fill="#899db3"
          stackId="stack"
          isAnimationActive
        />,
        <Bar
          key="3"
          dataKey="single.notPlayed"
          fill="#70707060"
          stackId="stack"
          isAnimationActive
        />,
        <Bar
          key="4"
          dataKey="single.p1notPlayed"
          fill="#bfa988"
          stackId="stack"
          isAnimationActive
        />,
        <Bar key="5" dataKey="single.p2win" fill="#eda338" stackId="stack" isAnimationActive />,
      ];
    case BARS_MODES.DOUBLE_TWO:
      return [
        <Bar
          key="11"
          dataKey="double.twoBars.p1win"
          fill="#4696f0"
          stackId="stack"
          isAnimationActive
        />,
        <Bar
          key="22"
          dataKey="double.twoBars.p2win"
          fill="#eda338"
          stackId="stack"
          isAnimationActive
        />,
      ];
    case BARS_MODES.DOUBLE_FIVE:
      return [
        <Bar key="1" dataKey="double.p1win" fill="#4696f0" stackId="stack" isAnimationActive />,
        <Bar
          key="2"
          dataKey="double.p2notPlayed"
          fill="#899db3"
          stackId="stack"
          isAnimationActive
        />,
        <Bar
          key="3"
          dataKey="double.notPlayed"
          fill="#70707060"
          stackId="stack"
          isAnimationActive
        />,
        <Bar
          key="4"
          dataKey="double.p1notPlayed"
          fill="#bfa988"
          stackId="stack"
          isAnimationActive
        />,
        <Bar key="5" dataKey="double.p2win" fill="#eda338" stackId="stack" isAnimationActive />,
      ];
    case BARS_MODES.BOTH_TWO:
      return [
        <Bar
          key="11"
          dataKey="all.twoBars.p1win"
          fill="#4696f0"
          stackId="stack"
          isAnimationActive
        />,
        <Bar
          key="22"
          dataKey="all.twoBars.p2win"
          fill="#eda338"
          stackId="stack"
          isAnimationActive
        />,
      ];
    case BARS_MODES.BOTH_FIVE:
      return [
        <Bar key="1" dataKey="all.p1win" fill="#4696f0" stackId="stack" isAnimationActive />,
        <Bar key="2" dataKey="all.p2notPlayed" fill="#899db3" stackId="stack" isAnimationActive />,
        <Bar key="3" dataKey="all.notPlayed" fill="#70707060" stackId="stack" isAnimationActive />,
        <Bar key="4" dataKey="all.p1notPlayed" fill="#bfa988" stackId="stack" isAnimationActive />,
        <Bar key="5" dataKey="all.p2win" fill="#eda338" stackId="stack" isAnimationActive />,
      ];
    default:
      return null;
  }
};

const MIN_GRAPH_HEIGHT = undefined;

const profile1Selector = profileSelectorCreator('id');
const profile2Selector = profileSelectorCreator('compareToId');

const getCombinedData = memoize()((p1, p2, tracklist) => {
  if (!p1 || !p2) {
    return {};
  }
  let rc1 = p1.ratingChanges[0].rating;
  let rc2 = p2.ratingChanges[0].rating;
  const allRC = _.flow(
    _.sortBy('date'),
    _.map((item) => {
      if (item.rating) {
        rc1 = item.rating;
      }
      if (item.rating2) {
        rc2 = item.rating2;
      }
      return {
        rating1: rc1,
        rating2: rc2,
        date: item.date,
      };
    }),
    _.sortedUniqBy('date')
  )([
    ...p1.ratingChanges,
    ...p2.ratingChanges.map((it) => ({ date: it.date, rating2: it.rating })),
  ]);

  rc1 = p1.placesChanges[0].place;
  rc2 = p2.placesChanges[0].place;
  const allPC = _.flow(
    _.sortBy('date'),
    _.map((item) => {
      if (item.place) {
        rc1 = item.place;
      }
      if (item.place2) {
        rc2 = item.place2;
      }
      return {
        place1: rc1,
        place2: rc2,
        date: item.date,
      };
    })
  )([...p1.placesChanges, ...p2.placesChanges.map((it) => ({ date: it.date, place2: it.place }))]);

  const perLevelComparison = _.fromPairs(Array.from({ length: 28 }).map((x, i) => [i + 1, {}]));
  _.keys(perLevelComparison).forEach((level) => {
    const charts = _.flow(
      _.map('chart'),
      _.uniqBy('sharedChartId')
    )([...p1.resultsByLevel[level], ...p2.resultsByLevel[level]]);
    const data = {
      x: level,
      all: {
        p1win: 0,
        p1notPlayed: 0,
        p2win: 0,
        p2notPlayed: 0,
        notPlayed: 0,
        // notPlayedHalf: 0,
        twoBars: {},
      },
      double: {
        p1win: 0,
        p1notPlayed: 0,
        p2win: 0,
        p2notPlayed: 0,
        notPlayed: 0,
        twoBars: {},
      },
      single: {
        p1win: 0,
        p1notPlayed: 0,
        p2win: 0,
        p2notPlayed: 0,
        notPlayed: 0,
        twoBars: {},
      },
    };
    charts.forEach((chart) => {
      const p1index = chart.results.findIndex((r) => r.playerId === p1.id);
      const p2index = chart.results.findIndex((r) => r.playerId === p2.id);
      const perType = chart.chartType.startsWith('D') ? data.double : data.single;
      if (p1index < 0 && p2index < 0) {
        console.log('wtf?');
      } else if (p1index < 0) {
        data.all.p1notPlayed++;
        perType.p1notPlayed++;
      } else if (p2index < 0) {
        data.all.p2notPlayed++;
        perType.p2notPlayed++;
      } else if (p1index < p2index) {
        data.all.p1win++;
        perType.p1win++;
      } else if (p2index < p1index) {
        data.all.p2win++;
        perType.p2win++;
      }
    });

    const normalizeTwo = (dataObj) => {
      const totalPlayed = dataObj.p1win + dataObj.p2win || 1; // in case of divide by 0
      dataObj.twoBars.p1win = dataObj.p1win / totalPlayed;
      dataObj.twoBars.p2win = dataObj.p2win / totalPlayed;
    };
    normalizeTwo(data.all);
    normalizeTwo(data.single);
    normalizeTwo(data.double);

    const normalizeFive = (dataObj, total) => {
      dataObj.p1win = dataObj.p1win / total;
      dataObj.p1notPlayed = dataObj.p1notPlayed / total;
      dataObj.p2win = dataObj.p2win / total;
      dataObj.p2notPlayed = dataObj.p2notPlayed / total;
      dataObj.notPlayed =
        1 - dataObj.p1win - dataObj.p1notPlayed - dataObj.p2win - dataObj.p2notPlayed;
      // dataObj.notPlayedHalf = dataObj.notPlayed / 2;
    };
    normalizeFive(data.all, tracklist.chartLevels[level]);
    normalizeFive(data.double, tracklist.doublesLevels[level]);
    normalizeFive(data.single, tracklist.singlesLevels[level]);

    perLevelComparison[level] = data;
  });

  return {
    ratingChanges: allRC,
    placesChanges: allPC,
    perLevelComparison: _.values(perLevelComparison),
  };
});

const mapStateToProps = (state, props) => {
  const profile1 = profile1Selector(state, props);
  const profile2 = profile2Selector(state, props);
  return {
    profile: profile1 ?? undefined,
    profile2: profile2 ?? undefined,
    combinedData: getCombinedData(profile1, profile2, state.tracklist.data),
    tracklist: state.tracklist.data,
    filter: state.profiles.filter,
    error: state.charts.error || state.tracklist.error,
    isLoading:
      state.charts.isLoading || state.results.isLoadingRanking || state.tracklist.isLoading,
  };
};

const mapDispatchToProps = {
  fetchChartsData,
  setProfilesFilter,
  resetProfilesFilter,
};

class ProfileCompare extends Component {
  static contextType = Language;

  static propTypes = {
    profile: toBe.object,
    error: toBe.object,
    isLoading: toBe.bool.isRequired,
  };

  static defaultProps = {
    profile: {},
    profile2: {},
    combinedData: {},
  };

  state = {
    isLevelGraphCombined: true,
    compareBarsMode: BARS_MODES.BOTH_TWO,
  };

  onRefresh = () => {
    const { isLoading } = this.props;
    !isLoading && this.props.fetchChartsData();
  };

  onChangeDayRange = (range) => {
    const { filter } = this.props;
    this.props.setProfilesFilter({
      ...filter,
      dayRange: range,
    });
  };

  rhMargin = { top: 5, bottom: 5, right: 5, left: 0 };
  rhXDomain = ['dataMin', 'dataMax'];
  rhYDomain = ['dataMin - 100', 'dataMax + 100'];
  rhXTickFormatter = (value) => parseDate(value).toLocaleDateString();
  rhTooltip = ({ active, payload, label }) => {
    const { profile, profile2 } = this.props;
    const p1Name = profile.name;
    const p2Name = profile2.name;
    if (!payload || !payload[0]) {
      return null;
    }
    return (
      <div className="history-tooltip">
        <div>{parseDate(payload[0].payload.date).toLocaleDateString()}</div>
        {payload[1] && (
          <div style={{ fontWeight: 'bold', color: payload[1].color }}>
            {p1Name}: {Math.round(payload[1].value)}
          </div>
        )}
        {payload[0] && (
          <div style={{ fontWeight: 'bold', color: payload[0].color }}>
            {p2Name}: {Math.round(payload[0].value)}
          </div>
        )}
      </div>
    );
  };

  renderRankingHistory() {
    const { combinedData } = this.props;
    return (
      <ResponsiveContainer minHeight={MIN_GRAPH_HEIGHT} aspect={1.6}>
        <LineChart data={combinedData.ratingChanges} margin={this.rhMargin}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            type="number"
            domain={this.rhXDomain}
            tickFormatter={this.rhXTickFormatter}
          />
          <YAxis
            allowDecimals={false}
            domain={this.rhYDomain}
            tickFormatter={Math.round}
            width={40}
          />
          <ReferenceLine y={1000} stroke="white" />
          <RechartsTooltip isAnimationActive={false} content={this.rhTooltip} />
          <Line
            type="monotone"
            isAnimationActive={false}
            dataKey="rating2"
            stroke="#ffd388"
            strokeWidth={3}
            dot={false}
          />
          <Line
            type="monotone"
            isAnimationActive={false}
            dataKey="rating1"
            stroke="#88d3ff"
            strokeWidth={3}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  circleShape = (args) => (
    <circle key={args.key} cx={args.cx} cy={args.cy} r={4} fill={args.fill}></circle>
  );
  renderAccuracyPoints(useProfile2 = false) {
    const { profile, profile2 } = this.props;

    return (
      <ResponsiveContainer minHeight={MIN_GRAPH_HEIGHT} aspect={1.6}>
        <ScatterChart margin={{ top: 5, bottom: 5, right: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="[0]"
            type="number"
            domain={[1, 28]}
            tickFormatter={(value) => Math.round(value)}
            ticks={[1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27]}
          />
          <YAxis
            dataKey="[1]"
            type="number"
            domain={[0, 100]}
            width={40}
            tickFormatter={(value) => Math.round(value) + '%'}
          />
          <Scatter
            shape={this.circleShape}
            data={(useProfile2 ? profile2 : profile).accuracyPointsRaw}
            fill={useProfile2 ? '#ffd388' : '#88d3ff'}
          />
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  renderPlaceHistory() {
    const { combinedData, profile, profile2 } = this.props;
    const p1Name = profile.name;
    const p2Name = profile2.name;

    return (
      <ResponsiveContainer minHeight={MIN_GRAPH_HEIGHT} aspect={1.6}>
        <LineChart
          data={combinedData.placesChanges}
          margin={{ top: 5, bottom: 5, right: 5, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(value) => parseDate(value).toLocaleDateString()}
          />
          <YAxis
            allowDecimals={false}
            domain={[1, (dataMax) => (dataMax < 3 ? dataMax + 2 : dataMax + 1)]}
            interval={0}
            reversed
            width={40}
          />
          <RechartsTooltip
            isAnimationActive={false}
            content={({ active, payload, label }) => {
              if (!payload || !payload[0]) {
                return null;
              }
              return (
                <div className="history-tooltip">
                  <div>{parseDate(payload[0].payload.date).toLocaleDateString()}</div>
                  {payload[1] && (
                    <div style={{ fontWeight: 'bold', color: payload[1].color }}>
                      {p1Name}: #{payload[1].value}
                    </div>
                  )}
                  {payload[0] && (
                    <div style={{ fontWeight: 'bold', color: payload[0].color }}>
                      {p2Name}: #{payload[0].value}
                    </div>
                  )}
                </div>
              );
            }}
          />
          <Line
            isAnimationActive={false}
            type="stepAfter"
            dataKey="place2"
            stroke="#ffd388"
            strokeWidth={3}
            dot={false}
          />
          <Line
            isAnimationActive={false}
            type="stepAfter"
            dataKey="place1"
            stroke="#88d3ff"
            strokeWidth={3}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  plcMargin = { top: 5, bottom: 5, right: 5, left: 0 };
  plcTooltip = ({ active, payload, label }) => {
    const { profile, profile2 } = this.props;
    const { compareBarsMode } = this.state;
    const isTwo = [BARS_MODES.SINGLE_TWO, BARS_MODES.DOUBLE_TWO, BARS_MODES.BOTH_TWO].includes(
      compareBarsMode
    );
    const p1Name = profile.name;
    const p2Name = profile2.name;

    if (!payload || !payload[0]) {
      return null;
    }
    const renderLegendItem = (item, label) => (
      <div key={item.name} style={{ fontWeight: 'bold', color: item.color }}>
        {label}: {Math.round(_.get(item.dataKey, item.payload) * 100)}%
      </div>
    );
    return (
      <div className="history-tooltip">
        <div>Level: {payload[0].payload.x}</div>
        {renderLegendItem(payload[0], `${p1Name} wins`)}
        {!isTwo && renderLegendItem(payload[1], `${p2Name} has no score`)}
        {!isTwo && renderLegendItem(payload[2], `Both have no score`)}
        {!isTwo && renderLegendItem(payload[3], `${p1Name} has no score`)}
        {renderLegendItem(isTwo ? payload[1] : payload[4], `${p2Name} wins`)}
      </div>
    );
  };
  plcXDomain = [0, 1];
  plcXTicks = [0, 0.5, 1];
  plcXFormatter = (x) => `${Math.round(x * 100)}%`;

  renderPerLevelComparison() {
    const { combinedData } = this.props;
    const { compareBarsMode } = this.state;

    return (
      combinedData.perLevelComparison && (
        <ResponsiveContainer width="100%" aspect={0.7}>
          <BarChart
            layout="vertical"
            data={[...combinedData.perLevelComparison]}
            margin={this.plcMargin}
          >
            <RechartsTooltip isAnimationActive={false} content={this.plcTooltip} />
            <YAxis reversed dataKey="x" type="category" width={23} />
            <XAxis
              type="number"
              domain={this.plcXDomain}
              ticks={this.plcXTicks}
              tickFormatter={this.plcXFormatter}
            />
            <ReferenceLine x={0.5} stroke="#666" />
            {getCompareBars(compareBarsMode)}
          </BarChart>
        </ResponsiveContainer>
      )
    );
  }

  renderProfile() {
    const lang = this.context;
    const { profile, profile2, filter } = this.props;
    const { compareBarsMode } = this.state;
    return (
      <div className="profile">
        <div className="profile-header">
          <div className="profile-name text-with-header blue">
            <div className="text-header">{lang.PLAYER}</div>
            <div>{profile.name}</div>
          </div>
          <div className="text-with-header">
            <div className="text-header">{lang.RANK}</div>
            <div>#{profile.rank}</div>
          </div>
          <div className="text-with-header">
            <div className="text-header">{lang.PP}</div>
            <div>{Math.floor(profile.pp)}</div>
          </div>
          <div className="text-with-header">
            <div className="text-header">{lang.LAST_TIME_PLAYED}</div>
            <div>
              {profile.lastResultDate ? getTimeAgo(lang, profile.lastResultDate) : lang.NEVER}
            </div>
          </div>
          <div className="_flex-fill"></div>
          <div className="text-with-header -select">
            <div className="text-header">{lang.COMPARE_WITH}</div>
            <div>
              <PlayerCompareSelect />
            </div>
          </div>
        </div>
        <div className="profile-header right-align">
          <div className="profile-name text-with-header orange">
            <div className="text-header">{lang.PLAYER}</div>
            <div>{profile2.name}</div>
          </div>
          <div className="text-with-header">
            <div className="text-header">{lang.RANK}</div>
            <div>#{profile2.rank}</div>
          </div>
          <div className="text-with-header">
            <div className="text-header">{lang.PP}</div>
            <div>{Math.floor(profile2.pp)}</div>
          </div>
          <div className="text-with-header">
            <div className="text-header">{lang.LAST_TIME_PLAYED}</div>
            <div>
              {profile2.lastResultDate ? getTimeAgo(lang, profile2.lastResultDate) : lang.NEVER}
            </div>
          </div>
        </div>
        <div className="profile-section-horizontal-container">
          <div className="profile-section">
            <div className="profile-section-content">
              <div className="profile-section-2">
                <div className="profile-sm-section-header flex">
                  <span>{lang.VICTORIES_BY_LEVEL}</span>
                </div>
                <div className="profile-sm-section-header flex">
                  {(() => {
                    const isTwo = [
                      BARS_MODES.SINGLE_TWO,
                      BARS_MODES.DOUBLE_TWO,
                      BARS_MODES.BOTH_TWO,
                    ].includes(compareBarsMode);
                    return (
                      <div className="toggle-holder">
                        <Toggle
                          className="combine-toggle"
                          checked={!isTwo}
                          onChange={() =>
                            this.setState((state) => ({
                              compareBarsMode: {
                                [BARS_MODES.SINGLE_TWO]: BARS_MODES.SINGLE_FIVE,
                                [BARS_MODES.DOUBLE_TWO]: BARS_MODES.DOUBLE_FIVE,
                                [BARS_MODES.BOTH_TWO]: BARS_MODES.BOTH_FIVE,
                                [BARS_MODES.SINGLE_FIVE]: BARS_MODES.SINGLE_TWO,
                                [BARS_MODES.DOUBLE_FIVE]: BARS_MODES.DOUBLE_TWO,
                                [BARS_MODES.BOTH_FIVE]: BARS_MODES.BOTH_TWO,
                              }[state.compareBarsMode],
                            }))
                          }
                        >
                          {lang.DETAILED}
                        </Toggle>
                        <div className="tabs-holder">
                          <ToggleButton
                            text={lang.ALL}
                            active={[BARS_MODES.BOTH_TWO, BARS_MODES.BOTH_FIVE].includes(
                              compareBarsMode
                            )}
                            onToggle={() => {
                              this.setState((state) => ({
                                compareBarsMode: isTwo ? BARS_MODES.BOTH_TWO : BARS_MODES.BOTH_FIVE,
                              }));
                            }}
                          />
                          <ToggleButton
                            text={lang.SINGLES}
                            active={[BARS_MODES.SINGLE_TWO, BARS_MODES.SINGLE_FIVE].includes(
                              compareBarsMode
                            )}
                            onToggle={(active) => {
                              this.setState((state) => ({
                                compareBarsMode: isTwo
                                  ? BARS_MODES.SINGLE_TWO
                                  : BARS_MODES.SINGLE_FIVE,
                              }));
                            }}
                          />
                          <ToggleButton
                            text={lang.DOUBLES}
                            active={[BARS_MODES.DOUBLE_TWO, BARS_MODES.DOUBLE_FIVE].includes(
                              compareBarsMode
                            )}
                            onToggle={(active) => {
                              this.setState((state) => ({
                                compareBarsMode: isTwo
                                  ? BARS_MODES.DOUBLE_TWO
                                  : BARS_MODES.DOUBLE_FIVE,
                              }));
                            }}
                          />
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <div className="chart-container">{this.renderPerLevelComparison()}</div>
              </div>
            </div>
          </div>
          <div className="profile-section">
            <div className="profile-section-content">
              <div className="profile-section-2">
                <div className="profile-sm-section-header">
                  <span>{lang.ELO}</span>
                </div>
                <div className="chart-container">{this.renderRankingHistory()}</div>
              </div>
              <div className="profile-section-2">
                <div className="profile-sm-section-header">
                  <span>{lang.PLACE_IN_TOP}</span>
                </div>
                <div className="chart-container">{this.renderPlaceHistory()}</div>
              </div>
            </div>
            {(() => {
              const currentRange = filter.dayRange || profile.filterRange;
              const dateL = moment(currentRange[0] * 1000 * 60 * 60 * 24).format('L');
              const dateR = moment(currentRange[1] * 1000 * 60 * 60 * 24).format('L');
              const l1 = Math.max(currentRange[0] - 1, profile.minMaxRange[0]);
              const l2 = Math.min(currentRange[0] + 1, currentRange[1]);
              const r1 = Math.max(currentRange[1] - 1, currentRange[0]);
              const r2 = Math.min(currentRange[1] + 1, profile.minMaxRange[1]);
              return (
                <div className="range-container">
                  <Range
                    range={currentRange}
                    min={profile.minMaxRange[0]}
                    max={profile.minMaxRange[1]}
                    onChange={this.onChangeDayRange}
                  />
                  <div className="range-controls _flex-row">
                    <button
                      className="btn btn-sm btn-dark"
                      onClick={() => this.onChangeDayRange([l1, currentRange[1]])}
                    >
                      <FaCaretLeft />
                    </button>
                    <span className="date-text">{dateL}</span>
                    <button
                      className="btn btn-sm btn-dark"
                      onClick={() => this.onChangeDayRange([l2, currentRange[1]])}
                    >
                      <FaCaretRight />
                    </button>
                    <div className="_flex-fill"></div>
                    <button
                      className="btn btn-sm btn-dark"
                      onClick={() => this.onChangeDayRange([currentRange[0], r1])}
                    >
                      <FaCaretLeft />
                    </button>
                    <span className="date-text">{dateR}</span>
                    <button
                      className="btn btn-sm btn-dark"
                      onClick={() => this.onChangeDayRange([currentRange[0], r2])}
                    >
                      <FaCaretRight />
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
        <div className="profile-section-horizontal-container">
          <div className="profile-section">
            <div className="profile-section-content">
              <div className="profile-section-2">
                <div className="profile-sm-section-header">
                  <span>{lang.ACCURACY_BY_LEVEL}</span>
                </div>
                <div className="chart-container">{this.renderAccuracyPoints()}</div>
              </div>
            </div>
          </div>
          <div className="profile-section">
            <div className="profile-section-content">
              <div className="profile-section-2">
                <div className="profile-sm-section-header">
                  <span>{lang.ACCURACY_BY_LEVEL}</span>
                </div>
                <div className="chart-container">{this.renderAccuracyPoints(true)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  render() {
    const { isLoading, profile, error } = this.props;
    DEBUG && console.log('profile:', profile);
    const lang = this.context;
    return (
      <div className="profile-compare-page">
        <div className="content">
          {error && error.message}
          <div className="top-controls">
            <div className="_flex-fill" />
            <button
              disabled={isLoading}
              className="btn btn-sm btn-dark btn-icon"
              onClick={this.onRefresh}
            >
              <FaSearch /> {lang.UPDATE}
            </button>
          </div>
          {isLoading && <Loader />}
          {!isLoading && _.isEmpty(profile) && <div className="profile">Profile not found</div>}
          {!isLoading && !_.isEmpty(profile) && this.renderProfile()}
        </div>
      </div>
    );
  }
}

export default withParams(connect(mapStateToProps, mapDispatchToProps)(ProfileCompare));
