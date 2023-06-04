import { useState, useRef } from 'react';
import ReactModal from 'react-modal';
import cx from 'classnames';

import css from './use-confirmation-popup.module.scss';

export const useConfirmationPopup = ({ okText = 'OK' }) => {
  const [open, setOpen] = useState(false);
  const closeCallback = useRef(null);

  const close = (isConfirmed) => {
    if (open) {
      setOpen(false);
      if (closeCallback.current) {
        closeCallback.current(isConfirmed);
      }
    }
  };

  return {
    renderPopup: ({ content }) => {
      return open ? (
        <ReactModal
          className={css.popup}
          overlayClassName={css.overlay}
          onRequestClose={() => close(false)}
          isOpen={open}
        >
          <div className={css.content}>{content}</div>
          <div className={css.buttons}>
            <button className={cx('btn btn-danger', css.cancel)} onClick={() => close(false)}>
              Cancel
            </button>
            <button className={cx('btn btn-success', css.ok)} onClick={() => close(true)}>
              {okText}
            </button>
          </div>
        </ReactModal>
      ) : null;
    },
    confirm: () => {
      setOpen(true);
      return new Promise((res, rej) => {
        closeCallback.current = (isConfirmed) => {
          isConfirmed ? res() : rej();
        };
      });
    },
  };
};
