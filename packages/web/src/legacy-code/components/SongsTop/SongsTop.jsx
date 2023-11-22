import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import { FaPlay } from 'react-icons/fa';
import classNames from 'classnames';

// styles
import './songs-top.scss';

// components
import Loader from 'legacy-code/components/Shared/Loader';

// constants

// reducers
import { fetchMostPlayed } from 'legacy-code/reducers/trackStats/mostPlayed';
import { fetchMostPlayedMonth } from 'legacy-code/reducers/trackStats/mostPlayedMonth';
import { fetchLeastPlayed } from 'legacy-code/reducers/trackStats/leastPlayed';

// utils
import { getTimeAgo } from 'legacy-code/utils/leaderboards';
import { parseDate } from 'legacy-code/utils/date';
import { useLanguage } from 'utils/context/translation';

// code
function TopList({ fetchList, title, renderRightSide }) {
  const [data, setData] = useState([]);
  const [isLoading, setLoading] = useState(false);

  const getRightSide =
    renderRightSide ||
    ((item) => (
      <div className="playcount">
        <FaPlay />
        <span>{item.countplay}</span>
      </div>
    ));

  useEffect(() => {
    setLoading(true);
    fetchList()
      .then((data) => {
        data.success && setData(data.data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [fetchList]);

  return (
    <div className="top-songs-list">
      <div className="top-songs-header">
        <span>{title}</span>
      </div>
      {isLoading && <Loader />}
      {!isLoading &&
        data.map((item, index) => {
          return (
            <div key={item.id} className="top-songs-item">
              <div className={classNames('place', `top-${index + 1}`, { best: index < 3 })}>
                <span>{index + 1}.</span>
              </div>
              <div className="song-name">{item.full_name}</div>
              {getRightSide(item)}
            </div>
          );
        })}
    </div>
  );
}

function leastPlayedRightSide(lang) {
  const resultFunc = (item) => (
    <div className="date">
      <span>{item.last_play ? getTimeAgo(lang, parseDate(item.last_play)) : lang.NEVER}</span>
    </div>
  );
  return resultFunc;
}

export default connect(null, {
  fetchMostPlayed,
  fetchMostPlayedMonth,
  fetchLeastPlayed,
})(function SongsTop({ fetchMostPlayed, fetchMostPlayedMonth, fetchLeastPlayed }) {
  const lang = useLanguage();
  return (
    <div className="songs-top-page">
      <TopList fetchList={fetchMostPlayed} title={lang.TOP_POPULAR_TRACKS} />
      <TopList fetchList={fetchMostPlayedMonth} title={lang.MONTHLY_TOP_POPULAR_TRACKS} />
      <TopList
        fetchList={fetchLeastPlayed}
        title={lang.TRACKS_PLAYED_LONG_TIME_AGO}
        renderRightSide={leastPlayedRightSide(lang)}
      />
      <div className="top-songs-list -placeholder" />
    </div>
  );
});
