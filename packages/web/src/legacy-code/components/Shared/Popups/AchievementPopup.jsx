import React, { useState, useEffect } from 'react';
import { GiAchievement } from 'react-icons/gi';
import classNames from 'classnames';

import { achievements } from 'legacy-code/utils/achievements';

const renderAchievement = (achName, progress) => {
  const Icon = achievements[achName].icon;
  return (
    <div className="ach-block">
      {Icon && (
        <div className="ach-icon">
          <Icon />
        </div>
      )}
      <div className="ach-name">{achName}</div>
      <div
        className={classNames('progress-background', {
          complete: progress === 100,
          zero: progress === 0,
        })}
        style={{
          height: `${Math.round(progress)}%`,
        }}
      />
    </div>
  );
};

const AchievementPopup = ({ playerName, achievementName, progress }) => {
  const [progressNumber, setProgressNumber] = useState(progress[0]);

  useEffect(() => {
    setProgressNumber(progress[1]);
  }, []); // eslint-disable-line

  return (
    <div className="achievement-popup popup">
      <div className="player">
        <GiAchievement />
        <span>{playerName}</span>
        <GiAchievement />
      </div>
      <div className="ach-holder">{renderAchievement(achievementName, progressNumber)}</div>
      <div className="description">{achievements[achievementName].description}</div>
    </div>
  );
};

export default AchievementPopup;
