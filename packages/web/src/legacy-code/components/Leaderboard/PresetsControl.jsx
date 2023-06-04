import React from 'react';
import { connect } from 'react-redux';
import { FaLayerGroup, FaFolderOpen, FaSave, FaPlus, FaTrashAlt } from 'react-icons/fa';
import Select from 'react-select';

import Overlay from 'legacy-code/components/Shared/Overlay/Overlay';
import Input from 'legacy-code/components/Shared/Input/Input';

import {
  loadPresets,
  savePreset,
  selectPreset,
  openPreset,
  deletePreset,
} from 'legacy-code/reducers/presets';
import { Language } from 'legacy-code/utils/context/translation';

const mapStateToProps = (state) => {
  return {
    ...state.presets,
  };
};

const mapDispatchToProps = {
  loadPresets,
  savePreset,
  openPreset,
  deletePreset,
  selectPreset,
};

class PresetsControl extends React.Component {
  state = {};

  static contextType = Language;

  componentDidMount() {
    this.props.loadPresets();
  }

  onChangeSelection = (selected) => {
    this.props.selectPreset(selected.name);
  };

  onRewritePreset = () => {
    const { currentPreset } = this.props;
    this.props.savePreset(currentPreset.name);
  };

  onSavePreset = () => {
    const { name } = this.state;
    this.props.savePreset(name);
    this.setState({ isAddingNew: false });
  };

  render() {
    const { presets, currentPreset, isLoading } = this.props;
    const { name, isAddingNew } = this.state;
    const lang = this.context;
    return (
      <div>
        <Overlay
          overlayItem={
            <button className="btn btn-sm btn-dark btn-icon _margin-right">
              <FaLayerGroup />
              {lang.PRESETS}
            </button>
          }
        >
          <div className="presets-control-overlay">
            <Select
              className="select _margin-bottom"
              classNamePrefix="select"
              placeholder={lang.PRESETS_PLACEHOLDER}
              options={presets}
              value={currentPreset}
              onChange={this.props.selectPreset}
              noOptionsMessage={() => lang.EMPTY}
            />
            {currentPreset && (
              <div className="buttons-presets _margin-bottom">
                <div className="_flex-fill" />
                <button
                  className="btn btn-sm btn-dark btn-icon _margin-right"
                  onClick={this.props.openPreset}
                  disabled={isLoading}
                >
                  <FaFolderOpen /> {lang.OPEN}
                </button>
                <button
                  className="btn btn-sm btn-dark btn-icon _margin-right"
                  onClick={this.onRewritePreset}
                  disabled={isLoading}
                >
                  <FaSave /> {lang.OVERWRITE}
                </button>
                <button
                  className="btn btn-sm btn-dark btn-icon"
                  onClick={this.props.deletePreset}
                  disabled={isLoading}
                >
                  <FaTrashAlt /> {lang.DELETE}
                </button>
              </div>
            )}
            {!isAddingNew && (
              <div className="buttons-presets _margin-bottom">
                <div className="_flex-fill" />

                <button
                  className="btn btn-sm btn-dark btn-icon _margin-left _self-align-end"
                  onClick={() => this.setState({ isAddingNew: true })}
                  disabled={isLoading}
                >
                  <FaPlus /> {lang.ADD}
                </button>
              </div>
            )}
            {isAddingNew && (
              <div className="adding-new _margin-bottom">
                <Input
                  value={name}
                  placeholder={lang.PRESET_NAME_PLACEHOLDER}
                  className="form-control"
                  onChange={(name) => this.setState({ name })}
                />
                <button
                  className="btn btn-sm btn-dark btn-icon _margin-left"
                  onClick={this.onSavePreset}
                  disabled={!name || isLoading}
                >
                  <FaSave /> {lang.SAVE}
                </button>
                <button
                  className="btn btn-sm btn-dark btn-icon _margin-left"
                  onClick={() => this.setState({ isAddingNew: false })}
                  disabled={isLoading}
                >
                  {lang.CANCEL}
                </button>
              </div>
            )}
          </div>
        </Overlay>
      </div>
    );
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(PresetsControl);
