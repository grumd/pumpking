import React, { useCallback, useContext, useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import _ from 'lodash/fp';
import Select from 'react-select';
import classNames from 'classnames';
import { FaArrowLeft, FaRedoAlt, FaSearch, FaPlusCircle } from 'react-icons/fa';
import { NavLink, useNavigate, useParams } from 'react-router-dom';

// styles
import './leaderboard.scss';

// components
import ToggleButton from 'legacy-code/components/Shared/ToggleButton/ToggleButton';
import Loader from 'legacy-code/components/Shared/Loader';
import Input from 'legacy-code/components/Shared/Input/Input';
import Toggle from 'legacy-code/components/Shared/Toggle/Toggle';
import CollapsibleBar from 'legacy-code/components/Shared/CollapsibleBar';
import ChartFilter from './ChartFilter';
import PresetsControl from './PresetsControl';
import Chart from './Chart';

// constants
import { routes } from 'legacy-code/constants/routes';
import { RANK_FILTER, SORT } from 'legacy-code/constants/leaderboard';

// reducers
import { fetchChartsData, postChartsProcessing } from 'legacy-code/reducers/charts';
import {
  defaultFilter,
  resetFilter as resetFilterAction,
  setFilter as setFilterAction,
} from 'legacy-code/reducers/results';
import { openPreset, selectPreset } from 'legacy-code/reducers/presets';
import { filteredDataSelector, sharedChartDataSelector } from 'legacy-code/reducers/selectors';

// utils
import { colorsArray } from 'legacy-code/utils/colors';
import { Language } from 'utils/context/translation';
import { storageKeys, setItem } from 'legacy-code/utils/storage/versionedStorage';

import { usePlayers } from 'hooks/usePlayers';
import { useUser } from 'hooks/useUser';

import { FilteredDataContext } from '../Contexts/FilteredDataContext';

const INITIAL_COUNT = 10;

// code
const getSortingOptions = _.memoize((lang) => [
  {
    label: lang.NEW_TO_OLD_SCORES,
    value: SORT.DEFAULT,
  },
  {
    label: lang.NEW_TO_OLD_SCORES_OF_A_PLAYER,
    value: SORT.NEW_SCORES_PLAYER,
  },
  // {
  //   label: lang.SCORE_DIFFERENCE,
  //   value: SORT.PROTAGONIST,
  // },
  {
    label: lang.WORST_TO_BEST_BY_PP,
    value: SORT.PP_ASC,
  },
  {
    label: lang.BEST_TO_WORST_BY_PP,
    value: SORT.PP_DESC,
  },
  {
    label: lang.EASY_TO_HARD_CHARTS,
    value: SORT.EASIEST_SONGS,
  },
  {
    label: lang.HARD_TO_EASY_CHARTS,
    value: SORT.HARDEST_SONGS,
  },
]);

const getRankOptions = _.memoize((lang) => [
  {
    label: lang.SHOW_ALL_SCORES,
    value: RANK_FILTER.SHOW_ALL,
  },
  {
    label: lang.BEST_SCORE,
    value: RANK_FILTER.SHOW_BEST,
  },
  {
    label: lang.RANK_ONLY,
    value: RANK_FILTER.SHOW_ONLY_RANK,
  },
  {
    label: lang.ONLY_NO_RANK,
    value: RANK_FILTER.SHOW_ONLY_NORANK,
  },
]);

const usePlayersOptions = () => {
  const players = usePlayers();
  const user = useUser();

  return useMemo(() => {
    return {
      isLoading: user.isLoading || players.isLoading,
      options:
        !user.data || !players.data
          ? []
          : _.flow(
              _.map(({ nickname, arcade_name, id }) => ({
                label: `${nickname} (${arcade_name})`,
                value: nickname,
                isCurrentPlayer: user.data.id === id,
              })),
              _.sortBy((it) => (it.isCurrentPlayer ? '!' : _.toLower(it.label)))
            )(players.data),
    };
  }, [players, user]);
};

const Leaderboard = () => {
  const dispatch = useDispatch();
  const params = useParams();
  const navigate = useNavigate();

  const isChartView = !!params.sharedChartId;

  const { options: players, isLoading: isLoadingPlayers } = usePlayersOptions();
  const canAddResults = useSelector((state) => state.user.data?.player?.can_add_results_manually);
  const filteredData = useSelector((state) =>
    isChartView ? sharedChartDataSelector(state, { params }) : filteredDataSelector(state)
  );
  const stateFilter = useSelector((state) => state.results.filter);
  const filter = isChartView ? defaultFilter : stateFilter;
  const error = useSelector((state) => state.charts.error || state.tracklist.error);
  const isLoading = useSelector(
    (state) => state.charts.isLoading || state.tracklist.isLoading || state.results.isLoading
  );
  const presets = useSelector((state) => state.presets.presets);

  const [showItemsCount, setShowItemsCount] = useState(INITIAL_COUNT);
  const lang = useContext(Language);

  const setFilter = _.curry((name, value) => {
    const newFilter = { ...filter, [name]: value };
    dispatch(setFilterAction(newFilter));
    setShowItemsCount(INITIAL_COUNT);
    setItem(storageKeys.filter, newFilter);
  });

  const resetFilter = () => {
    dispatch(resetFilterAction());
    setItem(storageKeys.filter, defaultFilter);
  };

  const onRefresh = async () => {
    setShowItemsCount(INITIAL_COUNT);
    if (!isLoading) {
      await dispatch(fetchChartsData());
      dispatch(postChartsProcessing());
    }
  };

  const onTypeSongName = _.debounce(300, (value) => {
    setFilter('song', value);
  });

  const renderSimpleSearch = () => {
    return (
      <Language.Consumer>
        {(lang) => (
          <div className="simple-search">
            <div className="song-name _margin-right _margin-bottom">
              <Input
                value={filter.song || ''}
                placeholder={lang.SONG_NAME_PLACEHOLDER}
                className="form-control"
                onChange={onTypeSongName}
              />
            </div>
            <div className="chart-range _margin-right _margin-bottom">
              <ChartFilter filterValue={filter.chartRange} onChange={setFilter('chartRange')} />
            </div>
            <div className="_flex-fill" />
            <div className="_flex-row _margin-bottom">
              <PresetsControl />
              <button className="btn btn-sm btn-dark btn-icon _margin-right" onClick={resetFilter}>
                <FaRedoAlt /> {lang.RESET_FILTERS}
              </button>
              <button
                disabled={isLoading}
                className="btn btn-sm btn-dark btn-icon"
                onClick={onRefresh}
              >
                <FaSearch /> {lang.REFRESH}
              </button>
            </div>
          </div>
        )}
      </Language.Consumer>
    );
  };

  const renderFilters = () => {
    return (
      <Language.Consumer>
        {(lang) => (
          <div className="filters">
            <div className="people-filters">
              <label className="label">{lang.SHOW_CHARTS_PLAYED_BY}</label>
              <div className="players-block">
                <div className="_margin-right">
                  <label className="label">{lang.EACH_OF_THESE}</label>
                  <Select
                    closeMenuOnSelect={false}
                    className="select players"
                    classNamePrefix="select"
                    placeholder={lang.PLAYERS_PLACEHOLDER}
                    isMulti
                    options={players}
                    isLoading={isLoadingPlayers}
                    value={_.getOr(null, 'players', filter)}
                    onChange={setFilter('players')}
                  />
                </div>
                <div className="_margin-right">
                  <label className="label">{lang.AND_ANY_OF_THESE}</label>
                  <Select
                    closeMenuOnSelect={false}
                    className="select players"
                    classNamePrefix="select"
                    placeholder={lang.PLAYERS_PLACEHOLDER}
                    isMulti
                    options={players}
                    isLoading={isLoadingPlayers}
                    value={_.getOr(null, 'playersOr', filter)}
                    onChange={setFilter('playersOr')}
                  />
                </div>
                <div className="_margin-right">
                  <label className="label">{lang.AND_NONE_OF_THESE}</label>
                  <Select
                    closeMenuOnSelect={false}
                    className="select players"
                    classNamePrefix="select"
                    placeholder={lang.PLAYERS_PLACEHOLDER}
                    isMulti
                    options={players}
                    isLoading={isLoadingPlayers}
                    value={_.getOr(null, 'playersNot', filter)}
                    onChange={setFilter('playersNot')}
                  />
                </div>
              </div>
            </div>
            <div className="people-filters">
              <div className="players-block">
                <div className="_margin-right">
                  <label className="label">{lang.SHOW_RANK}</label>
                  <Select
                    closeMenuOnSelect={false}
                    className="select"
                    classNamePrefix="select"
                    placeholder="..."
                    options={getRankOptions(lang)}
                    value={_.getOr(null, 'rank', filter) || RANK_FILTER.SHOW_ALL}
                    onChange={setFilter('rank')}
                  />
                </div>
              </div>
            </div>
            <div>
              <Toggle
                checked={_.getOr(false, 'showHiddenFromPreferences', filter)}
                onChange={setFilter('showHiddenFromPreferences')}
              >
                {lang.SHOW_HIDDEN_PLAYERS}
              </Toggle>
            </div>
          </div>
        )}
      </Language.Consumer>
    );
  };

  const renderSortings = () => {
    return (
      <div className="sortings">
        <div>
          <label className="label">{lang.SORTING_LABEL}</label>
          <Select
            placeholder={lang.SORTING_PLACEHOLDER}
            className="select"
            classNamePrefix="select"
            isClearable={false}
            options={getSortingOptions(lang)}
            value={_.getOr(getSortingOptions(lang)[0], 'sortingType', filter)}
            onChange={setFilter('sortingType')}
          />
        </div>
        {[SORT.PROTAGONIST, SORT.PP_ASC, SORT.PP_DESC, SORT.NEW_SCORES_PLAYER].includes(
          _.get('sortingType.value', filter)
        ) && (
          <div>
            <label className="label">{lang.PLAYER_LABEL}</label>
            <Select
              className={classNames('select players', {
                'red-border': !_.get('protagonist', filter),
              })}
              classNamePrefix="select"
              placeholder={lang.PLAYERS_PLACEHOLDER}
              options={players}
              isLoading={isLoadingPlayers}
              value={_.getOr(null, 'protagonist', filter)}
              onChange={setFilter('protagonist')}
            />
          </div>
        )}
        {[SORT.PROTAGONIST].includes(_.get('sortingType.value', filter)) && (
          <div>
            <label className="label">{lang.EXCLUDE_FROM_COMPARISON}</label>
            <Select
              closeMenuOnSelect={false}
              className="select players"
              classNamePrefix="select"
              placeholder={lang.PLAYERS_PLACEHOLDER}
              options={players}
              isLoading={isLoadingPlayers}
              isMulti
              value={_.getOr([], 'excludeAntagonists', filter)}
              onChange={setFilter('excludeAntagonists')}
            />
          </div>
        )}
      </div>
    );
  };

  const canShowMore = filteredData.length > showItemsCount;
  // const visibleData = _.slice(0, showItemsCount, filteredData);

  const sortingType = _.get('sortingType.value', filter);
  const showProtagonistPpChange = [SORT.PP_ASC, SORT.PP_DESC].includes(sortingType);
  const highlightProtagonist = [
    SORT.PROTAGONIST,
    SORT.PP_ASC,
    SORT.PP_DESC,
    SORT.NEW_SCORES_PLAYER,
  ].includes(sortingType);
  const protagonistName = filter?.protagonist?.value;
  const uniqueSelectedNames = useMemo(
    () =>
      _.slice(
        0,
        colorsArray.length,
        _.uniq(
          _.compact([
            highlightProtagonist && protagonistName,
            ..._.map('value', filter.players),
            ..._.map('value', filter.playersOr),
          ])
        )
      ),
    [filter.players, filter.playersOr, highlightProtagonist, protagonistName]
  );

  const renderVisibleData = useCallback(
    (chartIndex) => {
      return (
        <Chart
          showHiddenPlayers={filter.showHiddenFromPreferences}
          key={filteredData[chartIndex].sharedChartId}
          chartIndex={chartIndex}
          showProtagonistPpChange={showProtagonistPpChange}
          uniqueSelectedNames={uniqueSelectedNames}
          protagonistName={protagonistName}
          isChartView={isChartView}
        />
      );
    },
    [
      filter.showHiddenFromPreferences,
      protagonistName,
      showProtagonistPpChange,
      uniqueSelectedNames,
      filteredData,
      isChartView,
    ]
  );

  return (
    <FilteredDataContext.Provider value={filteredData}>
      <div className="leaderboard-page">
        <div className="content">
          {isChartView && (
            <div className="simple-search">
              <button className="btn btn-sm btn-dark btn-icon" onClick={() => navigate(-1)}>
                <FaArrowLeft /> {lang.BACK_BUTTON}
              </button>
              <div className="_flex-fill" />
              {canAddResults && (
                <NavLink exact to={routes.leaderboard.sharedChart.addResult.getPath(params)}>
                  <button className="btn btn-sm btn-dark btn-icon">
                    <FaPlusCircle /> Add result
                  </button>
                </NavLink>
              )}
            </div>
          )}
          {!isChartView && (
            <>
              <div className="search-block">
                {renderSimpleSearch()}
                <CollapsibleBar title={lang.FILTERS}>{renderFilters()}</CollapsibleBar>
                <CollapsibleBar title={lang.SORTING}>{renderSortings()}</CollapsibleBar>
              </div>
              {!!presets.length && (
                <div className="presets-buttons">
                  <span>{lang.PRESETS}:</span>
                  {presets.map((preset) => (
                    <ToggleButton
                      key={preset.name}
                      text={preset.name}
                      className="btn btn-sm btn-dark _margin-right"
                      active={_.get('filter', preset) === filter}
                      onToggle={() => {
                        dispatch(selectPreset(preset));
                        dispatch(openPreset());
                      }}
                    ></ToggleButton>
                  ))}
                </div>
              )}
            </>
          )}
          <div className="top-list">
            {isLoading && <Loader />}
            {_.isEmpty(filteredData) && !isLoading && (error ? error.message : lang.NO_RESULTS)}
            {!isLoading &&
              Array(showItemsCount < filteredData.length ? showItemsCount : filteredData.length)
                .fill(() => undefined)
                .map((_, chartIndex) => renderVisibleData(chartIndex))}
            {!isLoading && canShowMore && (
              <button
                className="btn btn-primary"
                onClick={() => setShowItemsCount(showItemsCount + 10)}
              >
                {lang.SHOW_MORE}
              </button>
            )}
          </div>
        </div>
      </div>
    </FilteredDataContext.Provider>
  );
};

export default Leaderboard;
