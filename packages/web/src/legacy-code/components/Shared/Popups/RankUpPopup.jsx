import React, { useState, useEffect } from 'react';
import { GiAchievement } from 'react-icons/gi';
import _ from 'lodash/fp';
import FlipMove from 'react-flip-move';
import classNames from 'classnames';

const renderPlayerLine = (pl, isCurrentPlayer) => {
  return (
    <div className={`closest-player ${isCurrentPlayer ? 'current-player' : ''}`}>
      <div className="place">#{pl.place}</div>
      <div className="name">{pl.name}</div>
      <div className="elo">{Math.floor(pl.pp)}</div>
    </div>
  );
};

const RankUpPopup = ({ playerName, place: [prevPlace, currPlace], list: [prevList, currList] }) => {
  const [place, setPlace] = useState(prevPlace);
  const [list, setList] = useState(prevList);

  useEffect(() => {
    setList(currList);
    setPlace(currPlace);
  }, []); // eslint-disable-line

  const listTop = Math.min(0, Math.max(-60 * (_.size(list) - 7), -60 * (place - 4)));
  return (
    <div className="rank-up-popup popup">
      <div className="player">
        <GiAchievement />
        <span>{playerName}</span>
        <GiAchievement />
      </div>
      <div className="ranking-holder">
        <div className="moving-list" style={{ top: listTop }}>
          <FlipMove duration={4500} delay={2000} maintainContainerHeight>
            {list.map((pl, index) => {
              return (
                <div
                  key={pl.id}
                  className={classNames('player-block', { current: index === place - 1 })}
                >
                  {renderPlayerLine(pl, index === place - 1)}
                </div>
              );
            })}
          </FlipMove>
        </div>
      </div>
    </div>
  );
};

export default RankUpPopup;
