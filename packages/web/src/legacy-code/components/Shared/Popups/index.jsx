import React, { useEffect, useCallback, useState, useRef } from 'react';
import toBe from 'prop-types';
import { connect } from 'react-redux';
import ReactModal from 'react-modal';
import _ from 'lodash/fp';

import './popups.scss';

import { TYPES } from 'legacy-code/constants/popups';

import { removePopup } from 'legacy-code/reducers/popups';

import AchievementPopup from './AchievementPopup';
import RankUpPopup from './RankUpPopup';

const popupByType = {
  [TYPES.ACHIEVEMENT]: AchievementPopup,
  [TYPES.RANK_UP]: RankUpPopup,
};

const popupStyles = {
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  content: {
    top: null,
    bottom: null,
    left: null,
    right: null,
    position: null,
    borderRadius: null,
    padding: null,
    background: null,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    transition: '2.5s opacity ease',
    opacity: 1,
  },
};

const mapStateToProps = (state) => {
  return {
    popups: state.popups.popups,
  };
};

const mapDispatchToProps = {
  removePopup,
};

const Popups = ({ popups, removePopup }) => {
  const [visiblePopup, setVisiblePopup] = useState(null);
  const contentRef = useRef(null);

  useEffect(() => {
    if (popups.length > 0) {
      const popup = popups[0];
      setVisiblePopup(popup);
      if (!popup.persistent) {
        setTimeout(() => {
          if (popup && popup.fadeOut) {
            contentRef.current.style.opacity = 0;
            setTimeout(() => {
              setVisiblePopup(null);
              removePopup(popup);
            }, 2500);
          } else {
            setVisiblePopup(null);
            removePopup(popup);
          }
        }, popup.timeout || 6000);
      }
    } else {
      setVisiblePopup(null);
    }
  }, [popups, removePopup]);

  const onAfterOpen = useCallback(() => {
    if (visiblePopup && visiblePopup.fadeIn) {
      contentRef.current.style.opacity = 1;
    }
  }, [visiblePopup]);

  let style = popupStyles;
  let popupBody = null;
  if (visiblePopup) {
    const PopupComponent = popupByType[visiblePopup.type];
    popupBody = PopupComponent ? (
      <PopupComponent {...visiblePopup.parameters} />
    ) : (
      <div>{JSON.stringify(visiblePopup)}</div>
    );

    if (visiblePopup.fadeIn) {
      style = _.set('content.opacity', 0, popupStyles);
    }
  }

  return (
    <div className="popups-holder">
      <ReactModal
        isOpen={!!visiblePopup}
        contentRef={(ref) => (contentRef.current = ref)}
        onAfterOpen={onAfterOpen}
        style={style}
      >
        {popupBody}
      </ReactModal>
    </div>
  );
};
Popups.propTypes = {
  popups: toBe.array,
  removePopup: toBe.func,
};

export default connect(mapStateToProps, mapDispatchToProps)(Popups);
