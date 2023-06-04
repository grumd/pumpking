import React from 'react';
import _ from 'lodash/fp';

import './toggle.scss';

// imports from styles
export default class Toggle extends React.Component {
  constructor() {
    super();
    this.id = _.uniqueId();
  }

  onChange = (e) => {
    this.props.onChange(e.target.checked);
  };

  render() {
    return (
      <div className="toggle-checkbox">
        <input
          type="checkbox"
          className="toggle-checkbox-cb"
          id={this.id}
          onChange={this.onChange}
          checked={this.props.checked}
        />
        <label htmlFor={this.id} className="toggle">
          <span></span>
        </label>
        {this.props.children && (
          <label htmlFor={this.id} className="text-label">
            {this.props.children}
          </label>
        )}
      </div>
    );
  }
}
