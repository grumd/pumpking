import React from 'react';

import { ranks, getRankImg } from 'legacy-code/utils/exp';

import { useLanguage } from 'legacy-code/utils/context/translation';

export default function ExpFaq() {
  const lang = useLanguage();
  return (
    <div className="faq-exp">
      {lang.EXP_FAQ}
      {lang.EXP_TITLES_LIST_HEADER}
      <div className="ranks-list">
        {ranks.map((rank) => (
          <div key={rank.threshold} className="rank">
            <div className="exp-rank">{getRankImg(rank)}</div>
            <div className="threshold">{rank.threshold}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
