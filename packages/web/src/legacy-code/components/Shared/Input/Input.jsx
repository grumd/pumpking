/* eslint-disable react/no-deprecated */
// imports from vendor deps
import React from 'react';
import toBe from 'prop-types';
import classNames from 'classnames';
import _ from 'lodash/fp';

// imports from styles
export default class Input extends React.Component {
  static propTypes = {
    value: toBe.any,
    defaultValue: toBe.any,
    onChange: toBe.func,
    onBlur: toBe.func,
    type: toBe.string,
    className: toBe.string,
    trimOnBlur: toBe.bool,
  };

  static defaultProps = {
    value: null,
    type: 'text',
    onChange: _.noop,
    onBlur: _.noop,
  };

  constructor(props) {
    super(props);
    this.state = {
      value: (!_.isNil(props.value) ? props.value : props.defaultValue) || '',
    };
    _.bindAll(['handleChange', 'handleBlur', 'handleKeyPress'], this);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.value !== this.props.value) {
      this.setState({ value: this.props.value });
    }
  }

  handleChange(e) {
    const newValue = e.target.value;
    this.setState({ value: newValue }, () => this.props.onChange(newValue));
  }

  handleBlur(e) {
    const { type } = this.props;
    const { value } = this.state;
    if (type === 'number') {
      const numericValue = Number(value);
      if (numericValue >= Number(e.target.min) && numericValue <= Number(e.target.max)) {
        this.props.onBlur(numericValue, e);
      } else {
        this.setState({ value: this.props.value });
        this.props.onBlur(this.props.value, e);
      }
    }
  }

  handleKeyPress(e) {
    if (e.key === 'Enter') {
      this.handleBlur(e);
    }
  }

  render() {
    const { className } = this.props;

    // HACK: This component uses onInput instead of onChange
    // because IE11 fails to call onChange events when you paste/cut using context menu (RMB)
    // We're using onInput because it works fine, and because for text input
    // there's no difference between how onChange and onInput work
    return (
      <input
        {..._.omit(['defaultValue', 'onChange'], this.props)}
        className={classNames(className, 'text-input')}
        value={this.state.value}
        onBlur={this.handleBlur}
        onKeyPress={this.handleKeyPress}
        onInput={this.handleChange}
        onChange={_.noop} // Handled by onInput
      />
    );
  }
}
