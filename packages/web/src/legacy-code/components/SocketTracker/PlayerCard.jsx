import React, { useCallback } from 'react';
import _ from 'lodash/fp';

import { TYPES } from 'legacy-code/constants/popups';

import { ChartLabel } from 'legacy-code/components/Leaderboard/ChartLabel';

import { useTrackedEx } from './helpers';

import { getRankImg } from 'legacy-code/utils/exp';
import { labelToTypeLevel } from 'legacy-code/utils/leaderboards';

export const PlayerCard = ({
  player,
  profile,
  label,
  trackedData,
  isLeft = false,
  preferences,
  topPlayersList,
  addPopup,
}) => {
  const playersHiddenStatus = _.getOr({}, 'playersHiddenStatus', preferences);

  const renderDeltaText = (n, prevN) => {
    if (!prevN || prevN === n) {
      return null;
    }
    const delta = n - prevN;
    return (
      <span className={`change ${delta >= 0 ? 'pos' : 'neg'}`}>
        {delta < 0 ? delta.toFixed(1) : `+${delta.toFixed(1)}`}
      </span>
    );
  };

  const renderExpLine = () => {
    if (!profile.expRank || !profile.exp) {
      return null;
    }

    let takenWidth = profile.expRankNext
      ? (profile.exp - profile.expRank.threshold) /
        (profile.expRankNext.threshold - profile.expRank.threshold)
      : 1;
    const emptyWidth = 1 - takenWidth;
    let diffWidth = 0;

    if (trackedData.exp[1]) {
      takenWidth = profile.expRankNext
        ? (trackedData.exp[1] - profile.expRank.threshold) /
          (profile.expRankNext.threshold - profile.expRank.threshold)
        : 1;
      diffWidth = 1 - emptyWidth - takenWidth;
    }
    return (
      <div className="exp-line">
        <div className="taken" style={{ width: Math.floor(100 * takenWidth) + '%' }}></div>
        <div className="diff" style={{ width: Math.ceil(100 * diffWidth) + '%' }}></div>
        <div className="rest" style={{ width: Math.ceil(100 * emptyWidth) + '%' }}></div>
      </div>
    );
  };

  const rivals = topPlayersList.filter((pl) => !playersHiddenStatus[pl.id]);
  const playerIndex = _.findIndex({ id: profile.id }, rivals);
  const closestPlayers =
    playerIndex < 0
      ? []
      : rivals.slice(Math.max(0, playerIndex - 2), Math.min(playerIndex + 3, rivals.length));

  useTrackedEx({
    data: topPlayersList,
    resetData: profile.name,
    isDataValid: useCallback((arg) => _.get('[0].rating', arg), []), // top list is only valid when rating is calculated
    onChange: useCallback(
      (prevList, currList) => {
        const prevPlace = _.get('place', _.find({ id: profile.id }, prevList));
        const currPlace = _.get('place', _.find({ id: profile.id }, currList));
        // console.log('List update:', prevList, currList, prevPlace, currPlace);
        if (prevPlace && currPlace && prevPlace > currPlace) {
          // console.log('Place update:', profile.name, prevPlace, currPlace);
          addPopup({
            type: TYPES.RANK_UP,
            fadeIn: true,
            fadeOut: true,
            timeout: 7500,
            parameters: {
              playerName: profile.name,
              place: [prevPlace, currPlace],
              list: [prevList, currList],
            },
          });
        }
      },
      [addPopup, profile.id, profile.name]
    ),
  });

  const [type, level] = labelToTypeLevel(label);

  return (
    <div className={`player-container ${isLeft ? 'left' : 'right'}`}>
      {player && (
        <>
          {/* <div className="title-header">player {isLeft ? 1 : 2}:</div> */}
          <div className="name-with-label">
            <div className="name">{profile.name || player}</div>
            <div className="chart-label">
              <ChartLabel type={type} level={level} />
            </div>
          </div>
          {profile.exp && profile.expRank && (
            <div className="exp exp-rank">
              {getRankImg(profile.expRank)}
              {renderExpLine()}
            </div>
          )}
          {trackedData.exp[0] && (
            <div className="exp-text">
              <span className="_grey-text">exp:</span>
              <span>{Math.round(trackedData.exp[0])}</span>
              {renderDeltaText(trackedData.exp[0], trackedData.exp[1])}
            </div>
          )}
          {/*trackedData.elo[0] && (
            <div className="rating">
              <span className="_grey-text">elo:</span>
              <span>{Math.round(trackedData.elo[0])}</span>
              {renderDeltaText(trackedData.elo[0], trackedData.elo[1])}
            </div>
          )*/}
          {trackedData.pp[0] && (
            <div className="rating">
              <span className="_grey-text">pp:</span>
              <span>{Math.round(trackedData.pp[0])}</span>
              {renderDeltaText(trackedData.pp[0], trackedData.pp[1])}
            </div>
          )}
          <div className="closest-players">
            {_.map((pl) => {
              return (
                <div className={`closest-player ${profile.id === pl.id ? 'current-player' : ''}`}>
                  <div className="place">#{pl.place}</div>
                  <div className="name">{pl.name}</div>
                  <div className="elo">{Math.floor(pl.pp)}</div>
                </div>
              );
            }, closestPlayers)}
          </div>
        </>
      )}
    </div>
  );
};
