import React, { Component } from 'react';
import toBe from 'prop-types';
import { connect } from 'react-redux';
import { FaSearch, FaQuestionCircle, FaTimes, FaCaretLeft, FaCaretRight } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import classNames from 'classnames';
import ReactModal from 'react-modal';
import Tooltip from 'react-responsive-ui/modules/Tooltip';
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
  Legend,
  ResponsiveContainer,
  Label,
} from 'recharts';
import _ from 'lodash/fp';

// styles
import './profile.scss';

// constants
import { routes } from 'legacy-code/constants/routes';
import { DEBUG } from 'legacy-code/constants/env';

// components
import Range from 'legacy-code/components/Shared/Range';
import Grade from 'legacy-code/components/Shared/Grade';
import Loader from 'legacy-code/components/Shared/Loader';
import Toggle from 'legacy-code/components/Shared/Toggle/Toggle';
import MostPlayed from './MostPlayed';
import ExpFaq from './ExpFaq';
import { PlayerCompareSelect } from './PlayerCompareSelect';

// reducers
import { fetchChartsData } from 'legacy-code/reducers/charts';
import { setProfilesFilter, resetProfilesFilter } from 'legacy-code/reducers/profiles';

// utils
import { profileSelectorCreator } from 'legacy-code/utils/profiles';
import { parseDate } from 'legacy-code/utils/date';
import { getTimeAgo } from 'legacy-code/utils/leaderboards';
import { achievements } from 'legacy-code/utils/achievements';
import { getRankImg } from 'legacy-code/utils/exp';
import { Language } from 'legacy-code/utils/context/translation';
import { withParams } from 'legacy-code/utils/withParams';

// code
const MIN_GRAPH_HEIGHT = undefined;

export const profileSelector = profileSelectorCreator('id');

const mapStateToProps = (state, props) => {
  return {
    profile: profileSelector(state, props),
    tracklist: state.tracklist.data,
    filter: state.profiles.filter,
    error: state.charts.error || state.tracklist.error,
    sharedCharts: state.results.sharedCharts,
    isLoading:
      state.charts.isLoading || state.results.isLoadingRanking || state.tracklist.isLoading,
  };
};

const mapDispatchToProps = {
  fetchChartsData,
  setProfilesFilter,
  resetProfilesFilter,
};

class Profile extends Component {
  static contextType = Language;

  static propTypes = {
    profile: toBe.object,
    error: toBe.object,
    isLoading: toBe.bool.isRequired,
  };

  static defaultProps = {
    profile: {},
  };

  state = {
    isLevelGraphCombined: true,
    showFaq: false,
  };

  componentWillUnmount() {
    this.props.resetProfilesFilter();
  }

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

  onShowFaq = () => {
    this.setState({ showFaq: true });
  };

  onHideFaq = () => {
    this.setState({ showFaq: false });
  };

  renderRankingHistory() {
    const { profile } = this.props;
    return (
      <ResponsiveContainer minHeight={MIN_GRAPH_HEIGHT} aspect={1.6}>
        <LineChart data={profile.ratingChanges} margin={{ top: 5, bottom: 5, right: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(value) => parseDate(value).toLocaleDateString()}
          />
          <YAxis
            allowDecimals={false}
            domain={['dataMin - 100', 'dataMax + 100']}
            tickFormatter={Math.round}
            width={40}
          />
          <ReferenceLine y={1000} stroke="white" />
          <RechartsTooltip
            isAnimationActive={false}
            content={({ active, payload, label }) => {
              if (!payload || !payload[0]) {
                return null;
              }
              return (
                <div className="history-tooltip">
                  <div>{parseDate(payload[0].payload.date).toLocaleDateString()}</div>
                  {payload && payload[0] && <div>Rating: {Math.round(payload[0].value)}</div>}
                </div>
              );
            }}
          />
          <Line
            type="monotone"
            isAnimationActive={false}
            dataKey="rating"
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
  /*
  renderAccuracyPoints(interpolated = false) {
    const { profile, sharedCharts } = this.props;
    const pointsByType = _.groupBy(([, , chartId]) => {
      const type = sharedCharts[chartId].chartType;
      return type === 'D' || type === 'DP';
    }, profile.accuracyPointsRaw);
    if (!interpolated) {
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
            <Scatter data={pointsByType.true} shape={this.circleShape} fill="#169c16" />
            <Scatter data={pointsByType.false} shape={this.circleShape} fill="#af2928" />
            <RechartsTooltip
              isAnimationActive={false}
              content={({ active, payload, label }) => {
                if (!payload || !payload[0] || !payload[1]) {
                  return null;
                }
                const chart = payload[0].payload[2] && sharedCharts[payload[0].payload[2]];
                return (
                  <div className="history-tooltip">
                    <div>Level: {payload[0].value}</div>
                    <div>Accuracy: {payload[1].value}%</div>
                    {chart && (
                      <div>
                        {chart.song} {chart.chartLabel} ({chart.interpolatedDifficulty.toFixed(1)})
                      </div>
                    )}
                  </div>
                );
              }}
            />
          </ScatterChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer minHeight={MIN_GRAPH_HEIGHT} aspect={1.6}>
        <LineChart margin={{ top: 5, bottom: 5, right: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="[0]"
            type="number"
            domain={[1, 28]}
            tickFormatter={(value) => Math.round(value)}
          />
          <YAxis domain={[0, 100]} width={40} />
          <RechartsTooltip
            isAnimationActive={false}
            content={({ active, payload, label }) => {
              if (!payload || !payload[0]) {
                return null;
              }
              return (
                <div className="history-tooltip">
                  <div>{payload[0].payload[0]}</div>
                  {payload && payload[0] && <div>Acc: #{payload[0].value}</div>}
                </div>
              );
            }}
          />
          <Line
            data={profile.accuracyPointsInterpolated}
            isAnimationActive={false}
            dataKey="[1]"
            stroke="#88d3ff"
            strokeWidth={3}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }
  */
  renderPlaceHistory() {
    const { profile } = this.props;
    return (
      <ResponsiveContainer minHeight={MIN_GRAPH_HEIGHT} aspect={1.6}>
        <LineChart data={profile.placesChanges} margin={{ top: 5, bottom: 5, right: 5, left: 0 }}>
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
                  {payload && payload[0] && <div>Place: #{payload[0].value}</div>}
                </div>
              );
            }}
          />
          <Line
            isAnimationActive={false}
            type="stepAfter"
            dataKey="place"
            stroke="#88d3ff"
            strokeWidth={3}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  renderGrades() {
    const { profile } = this.props;
    return (
      <ResponsiveContainer minHeight={MIN_GRAPH_HEIGHT} aspect={1.6}>
        <BarChart
          data={profile.gradesDistribution}
          margin={{ top: 5, bottom: 5, right: 5, left: 0 }}
        >
          <RechartsTooltip
            isAnimationActive={false}
            content={({ active, payload, label }) => {
              if (!payload || !payload[0]) {
                return null;
              }
              return (
                <div className="history-tooltip">
                  <div>Level: {payload[0].payload.x}</div>
                  {_.filter((item) => item.value > 0, payload).map((item) => (
                    <div key={item.name} style={{ fontWeight: 'bold', color: item.color }}>
                      {item.name}: {payload[0].payload.gradesValues[item.name]}
                    </div>
                  ))}
                </div>
              );
            }}
          />
          <XAxis dataKey="x" />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 50, 100]}
            tickFormatter={(x) => `${Math.round(x)}%`}
            width={40}
          />
          <Legend />
          <Bar dataKey="SSS" fill="#ffd700" stackId="stack" />
          <Bar dataKey="SS" fill="#dab800" stackId="stack" />
          <Bar dataKey="S" fill="#b19500" stackId="stack" />
          <Bar dataKey="A+" fill="#396eef" stackId="stack" />
          <Bar dataKey="A" fill="#828fb7" stackId="stack" />
          <Bar dataKey="B" fill="#7a6490" stackId="stack" />
          <Bar dataKey="C" fill="#6d5684" stackId="stack" />
          <Bar dataKey="D" fill="#5d4e6d" stackId="stack" />
          <Bar dataKey="F" fill="#774949" stackId="stack" />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  renderGradesWithLevels() {
    const { profile, tracklist } = this.props;
    return (
      <ResponsiveContainer minHeight={MIN_GRAPH_HEIGHT} aspect={0.74}>
        <BarChart
          data={profile.gradesAndLevelsDistribution}
          margin={{ top: 5, bottom: 5, right: 5, left: 0 }}
          stackOffset="sign"
        >
          <RechartsTooltip
            isAnimationActive={false}
            content={({ active, payload, label }) => {
              if (!payload || !payload[0]) {
                return null;
              }
              const doubleItems = _.filter(
                (item) => item.value !== 0 && item.dataKey.startsWith('D'),
                payload
              );
              const singleItems = _.filter(
                (item) => item.value !== 0 && item.dataKey.startsWith('S'),
                payload
              );
              return (
                <div className="history-tooltip">
                  <div>Level: {payload[0].payload.x}</div>
                  {!!singleItems.length && (
                    <>
                      <div>Single:</div>
                      {singleItems.map((item) => (
                        <div key={item.name} style={{ fontWeight: 'bold', color: item.color }}>
                          {item.name.slice(2)}: {Math.round(Math.abs(item.value))}% (
                          {Math.round((tracklist.singlesLevels[item.payload.x] * item.value) / 100)}
                          /{tracklist.singlesLevels[item.payload.x]})
                        </div>
                      ))}
                    </>
                  )}
                  {!!doubleItems.length && (
                    <>
                      <div>Double:</div>
                      {doubleItems.map((item) => (
                        <div key={item.name} style={{ fontWeight: 'bold', color: item.color }}>
                          {item.name.slice(2)}: {Math.round(Math.abs(item.value))}% (
                          {Math.round(
                            (tracklist.doublesLevels[item.payload.x] * -item.value) / 100
                          )}
                          /{tracklist.doublesLevels[item.payload.x]})
                        </div>
                      ))}
                    </>
                  )}
                </div>
              );
            }}
          />
          <XAxis dataKey="x" />
          <YAxis
            tickFormatter={(x) => `${Math.round(Math.abs(x))}%`}
            width={40}
            domain={[(dataMin) => Math.min(dataMin, -10), (dataMax) => Math.max(10, dataMax)]}
          />
          <Bar dataKey="S-SSS" fill="#ffd700" stackId="stack" />
          <Bar dataKey="S-SS" fill="#dab800" stackId="stack" />
          <Bar dataKey="S-S" fill="#b19500" stackId="stack" />
          <Bar dataKey="S-A+" fill="#396eef" stackId="stack" />
          <Bar dataKey="S-A" fill="#828fb7" stackId="stack" />
          <Bar dataKey="S-B" fill="#7a6490" stackId="stack" />
          <Bar dataKey="S-C" fill="#6d5684" stackId="stack" />
          <Bar dataKey="S-D" fill="#5d4e6d" stackId="stack" />
          <Bar dataKey="S-F" fill="#774949" stackId="stack" />
          <Bar dataKey="D-SSS" fill="#ffd700" stackId="stack" />
          <Bar dataKey="D-SS" fill="#dab800" stackId="stack" />
          <Bar dataKey="D-S" fill="#b19500" stackId="stack" />
          <Bar dataKey="D-A+" fill="#396eef" stackId="stack" />
          <Bar dataKey="D-A" fill="#828fb7" stackId="stack" />
          <Bar dataKey="D-B" fill="#7a6490" stackId="stack" />
          <Bar dataKey="D-C" fill="#6d5684" stackId="stack" />
          <Bar dataKey="D-D" fill="#5d4e6d" stackId="stack" />
          <Bar dataKey="D-F" fill="#774949" stackId="stack" />
          <Label value="Double" offset={0} position="insideBottomLeft" />
          <Label value="Single" offset={0} position="insideTopLeft" />
          <ReferenceLine y={0} stroke="#bbb" />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  renderLevels() {
    const { profile, tracklist } = this.props;
    return (
      <ResponsiveContainer minHeight={MIN_GRAPH_HEIGHT} aspect={1.6}>
        <BarChart
          data={profile.levelsDistribution}
          stackOffset="sign"
          margin={{ top: 5, bottom: 5, right: 5, left: 0 }}
        >
          <RechartsTooltip
            isAnimationActive={false}
            content={({ active, payload, label }) => {
              if (!payload || !payload[0]) {
                return null;
              }
              const totalD = tracklist.doublesLevels[payload[0].payload.x];
              const totalS = tracklist.singlesLevels[payload[0].payload.x];
              return (
                <div className="history-tooltip">
                  <div>Level: {payload[0].payload.x}</div>
                  {totalS > 0 && (
                    <div style={{ fontWeight: 'bold', color: payload[1].color }}>
                      Single: {Math.abs(payload[1].value).toFixed(1)}% (
                      {Math.round((payload[1].value * totalS) / 100)}/{totalS})
                    </div>
                  )}
                  {totalD > 0 && (
                    <div style={{ fontWeight: 'bold', color: payload[0].color }}>
                      Double: {Math.abs(payload[0].value).toFixed(1)}% (
                      {Math.round((Math.abs(payload[0].value) * totalD) / 100)}/{totalD})
                    </div>
                  )}
                </div>
              );
            }}
          />
          <XAxis dataKey="x" />
          <YAxis
            tickFormatter={(x) => Math.round(Math.abs(x)) + '%'}
            width={40}
            domain={[(dataMin) => Math.min(dataMin, -10), (dataMax) => Math.max(10, dataMax)]}
          />
          <RechartsTooltip />
          <ReferenceLine y={0} stroke="#555" />
          <Legend />
          <Bar dataKey="D" fill="var(--double_chart_color)" stackId="stack" />
          <Bar dataKey="S" fill="var(--single_chart_color)" stackId="stack" />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  renderGradeBlock(type, grade) {
    const { profile } = this.props;
    const obj = profile.progress[type];
    const typeLetter = type === 'double' ? 'D' : 'S';
    const progr = Math.floor((obj[`${grade}-bonus-level-coef`] || 0) * 100);
    const minNumber = obj[`${grade}-bonus-level-min-number`];
    const currentNumber = obj[`${grade}-bonus-level-achieved-number`];
    const levelString = obj[`${grade}-bonus-level`]
      ? `${typeLetter}${obj[`${grade}-bonus-level`]}`
      : '?';
    return (
      <div className="grade-block">
        <div className="grade-letter">
          <Grade grade={grade} />
        </div>
        <div className="grade-level">{levelString}</div>
        <div className="grade-progress">
          {progr}% ({progr === 100 ? minNumber : currentNumber}/{minNumber})
        </div>
        <div
          className={classNames('progress-background', {
            complete: progr === 100,
            zero: progr === 0,
          })}
          style={{
            height: `${progr}%`,
          }}
        />
      </div>
    );
  }

  renderAchievement(achName, achievement) {
    const Icon = achievements[achName].icon;
    const description = achievements[achName].description;
    return (
      <Tooltip
        key={achName}
        content={<div>{description}</div>}
        tooltipClassName="pumpking-tooltip achievement-tooltip"
      >
        <div className="ach-block">
          {Icon && (
            <div className="ach-icon">
              <Icon />
            </div>
          )}
          <div className="ach-name">{achName}</div>
          <div
            className={classNames('progress-background', {
              complete: achievement.progress === 100,
              zero: achievement.progress === 0,
            })}
            style={{
              height: `${Math.round(achievement.progress)}%`,
            }}
          />
        </div>
      </Tooltip>
    );
  }

  renderResultsByLevelHeader() {
    const lang = this.context;
    const { isLevelGraphCombined } = this.state;
    return (
      <div className="toggle-holder">
        <Toggle
          className="combine-toggle"
          checked={isLevelGraphCombined}
          onChange={() =>
            this.setState((state) => ({
              isLevelGraphCombined: !state.isLevelGraphCombined,
            }))
          }
        >
          {lang.UNITE_GRAPHS}
        </Toggle>
      </div>
    );
  }

  renderResultsByLevelFooter() {
    const lang = this.context;
    const { profile } = this.props;
    return (
      <div className="toggle-holder">
        <Link to={routes.profile.resultsByLevel.getPath({ id: profile.id })}>
          <button className="btn btn-sm btn-dark btn-icon _margin-right">
            {lang.MORE_DETAILS}
          </button>
        </Link>
      </div>
    );
  }

  renderProfile() {
    const lang = this.context;
    const { profile, filter } = this.props;
    const { isLevelGraphCombined } = this.state;
    const expProgress = profile.expRankNext
      ? (profile.exp - profile.expRank.threshold) /
        (profile.expRankNext.threshold - profile.expRank.threshold)
      : 100;
    return (
      <div className="profile">
        <div className="profile-header">
          <div className="profile-name text-with-header">
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
        <div className="profile-section">
          <div className="profile-sm-section-header _flex-row _align-center">
            <span>{lang.EXP}</span>
            <div className="_flex-fill" />
            <div onClick={this.onShowFaq} className="_clickable">
              <FaQuestionCircle onClick={this.onShowFaq} />
            </div>
            <ReactModal
              ariaHideApp={false}
              className="Modal faq-modal"
              overlayClassName="Overlay"
              isOpen={this.state.showFaq}
              onRequestClose={this.onHideFaq}
            >
              <div className="close-btn" onClick={this.onHideFaq}>
                <FaTimes />
              </div>{' '}
              <ExpFaq />
            </ReactModal>
          </div>
          <div className="exp-range">
            <div className="rank exp-rank">
              {getRankImg(profile.expRank)}
              {profile.expRank && <div>{profile.expRank.threshold}</div>}
            </div>
            <div className="exp-line-with-label">
              <div className="exp-label">
                {profile.expRankNext ? (
                  <>
                    <span className="taken-num">
                      {Math.round(profile.exp - profile.expRank.threshold)}
                    </span>
                    {` / ${profile.expRankNext.threshold - profile.expRank.threshold}`}
                  </>
                ) : null}
              </div>
              <div className="exp-line">
                <div className="taken" style={{ width: Math.floor(100 * expProgress) + '%' }}></div>
                <div
                  className="rest"
                  style={{ width: 100 - Math.ceil(100 * expProgress) + '%' }}
                ></div>
              </div>
              <div className="exp-label">
                {lang.TOTAL}: <span className="taken-num">{Math.round(profile.exp)}</span>
              </div>
            </div>
            {profile.expRankNext && (
              <div className="rank exp-rank">
                {getRankImg(profile.expRankNext)}
                {profile.expRankNext && <div>{profile.expRankNext.threshold}</div>}
              </div>
            )}
          </div>
        </div>
        <div className="profile-section-horizontal-container">
          <div className="profile-section">
            <div className="profile-section-content">
              {!isLevelGraphCombined ? (
                <>
                  <div className="profile-section-2">
                    <div className="profile-sm-section-header flex">
                      <span>уровни</span>
                      {this.renderResultsByLevelHeader()}
                    </div>
                    <div className="chart-container">{this.renderLevels()}</div>
                  </div>
                  <div className="profile-section-2">
                    <div className="profile-sm-section-header">
                      <span>{lang.GRADES}</span>
                    </div>
                    <div className="chart-container">{this.renderGrades()}</div>
                  </div>
                  {this.renderResultsByLevelFooter()}
                </>
              ) : (
                <>
                  <div className="profile-section-2">
                    <div className="profile-sm-section-header flex">
                      <span>{lang.GRADES}</span>
                      {this.renderResultsByLevelHeader()}
                    </div>
                    <div className="chart-container single-double-labels">
                      {this.renderGradesWithLevels()}
                    </div>
                  </div>
                  {this.renderResultsByLevelFooter()}
                </>
              )}
            </div>
          </div>
          <div className="profile-section">
            <div className="profile-section-content">
              <div className="profile-section-2">
                <div className="profile-sm-section-header">
                  <span>{lang.PP}</span>
                </div>
                <div className="chart-container">{this.renderRankingHistory()}</div>
                {/* <div className="chart-container">{this.renderAccuracyPoints()}</div> */}
              </div>
              {/*<div className="profile-section-2">
                <div className="profile-sm-section-header">
                  <span>{lang.PLACE_IN_TOP}</span>
                </div>
                <div className="chart-container">{this.renderPlaceHistory()}</div>
                <div className="chart-container">{this.renderAccuracyPoints(true)}</div>
              </div> */}
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
        {/* <div className="profile-section-horizontal-container">
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
          <div className="profile-section"></div>
        </div> */}
        <div className="profile-section progress-section">
          <div className="profile-sm-section-header">
            <span>{lang.LEVEL_ACHIEVEMENTS}</span>
          </div>
          <div className="progress-blocks-single-double">
            <div className="progress-block">
              <div className="achievements-grades single">
                {this.renderGradeBlock('single', 'A')}
                {this.renderGradeBlock('single', 'A+')}
                {this.renderGradeBlock('single', 'S')}
                {this.renderGradeBlock('single', 'SS')}
              </div>
            </div>
            <div className="progress-block">
              <div className="achievements-grades double">
                {this.renderGradeBlock('double', 'A')}
                {this.renderGradeBlock('double', 'A+')}
                {this.renderGradeBlock('double', 'S')}
                {this.renderGradeBlock('double', 'SS')}
              </div>
            </div>
          </div>
          <div className="bonus-faq">{lang.LEVEL_ACHIEVEMENTS_HINT}</div>
        </div>
        <div className="profile-section">
          <div className="profile-sm-section-header">
            <span>{lang.ACHIEVEMENTS}</span>
          </div>
          <div className="achievements">
            {_.keys(profile.achievements).map((achName) =>
              this.renderAchievement(achName, profile.achievements[achName])
            )}
          </div>
        </div>
        <div className="profile-section">
          <div className="profile-sm-section-header">
            <span>{lang.MOST_PLAYED_CHARTS}</span>
          </div>
          <MostPlayed playerId={profile.id} />
        </div>
      </div>
    );
  }

  render() {
    const { isLoading, profile, error } = this.props;
    DEBUG && console.log('profile:', profile);
    const lang = this.context;
    return (
      <div className="profile-page">
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
          {!isLoading && _.isEmpty(profile) && (
            <div className="profile">{lang.PROFILE_NOT_FOUND}</div>
          )}
          {!isLoading && !_.isEmpty(profile) && this.renderProfile()}
        </div>
      </div>
    );
  }
}

export default withParams(connect(mapStateToProps, mapDispatchToProps)(Profile));
