import React from 'react';
import _ from 'lodash/fp';
import classNames from 'classnames';
import styled from 'styled-components';
import { FaCheck } from 'react-icons/fa';

const CheckBoxWrapper = styled.label`
  user-select: none;
  position: relative;
  cursor: pointer;
  min-height: 1.3em;
  margin-bottom: 0;
`;

export const LabelText = styled.span`
  margin-left: 1em;
`;

export const Input = styled.input`
  position: absolute;
  opacity: 0;
  cursor: pointer;
  height: 0;
  width: 0;

  &:checked ~ .checkbox-circle {
    background-color: #1490bf;
    border: 1px solid #1490bf;
    > .checkbox-check {
      visibility: visible;
    }
  }
`;

export const CheckboxCircle = styled.span`
  height: 1.3em;
  width: 1.3em;
  background-color: #fff;
  border: 1px solid #ccc;
  border-radius: 15%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;

export const CheckboxCheck = styled(FaCheck)`
  visibility: hidden;
  width: 0.9em;
  height: 0.9em;
  color: #fff;
`;

const CheckBox = ({
  className = '',
  onChange = _.noop,
  name,
  label,
  disabled = false,
  isChecked,
}) => {
  return (
    <CheckBoxWrapper className={classNames('checkbox-label-container', className)}>
      <Input
        className={className}
        type="checkbox"
        name={name}
        onChange={onChange}
        disabled={disabled}
        checked={isChecked}
      />
      <CheckboxCircle className="checkbox-circle">
        <CheckboxCheck className="checkbox-check" />
      </CheckboxCircle>
      {label && <LabelText>{label}</LabelText>}
    </CheckBoxWrapper>
  );
};

export default CheckBox;
