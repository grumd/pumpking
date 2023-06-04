import React from 'react';
import toBe from 'prop-types';
import classNames from 'classnames';

import './toggle-button.scss';

export default class ToggleButton extends React.PureComponent {
  static propTypes = {
    text: toBe.string,
    onToggle: toBe.func,
    active: toBe.bool,
  };

  render() {
    const { active, onToggle, text } = this.props;
    return (
      <div
        className={classNames('toggle-button', { active: active })}
        onClick={() => onToggle(!active)}
      >
        {text}
      </div>
    );
  }
}
