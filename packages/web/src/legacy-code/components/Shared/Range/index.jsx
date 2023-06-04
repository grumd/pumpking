import React from 'react';
import { Range as ReactRange, getTrackBackground } from 'react-range';

export default function Range({ range, min, max, onChange }) {
  return (
    <ReactRange
      values={range}
      step={1}
      min={min}
      max={max}
      onChange={onChange}
      renderTrack={({ props, children }) => (
        <div
          onMouseDown={props.onMouseDown}
          onTouchStart={props.onTouchStart}
          style={{
            ...props.style,
            position: 'relative',
            height: '10px',
            display: 'flex',
            width: '100%',
          }}
        >
          <div
            ref={props.ref}
            style={{
              height: '6px',
              width: '100%',
              borderRadius: '3px',
              background: getTrackBackground({
                values: range,
                colors: ['#ccc', '#88d3ff', '#ccc'],
                min,
                max,
              }),
              alignSelf: 'center',
            }}
          >
            {children}
          </div>
        </div>
      )}
      renderThumb={({ props, isDragged }) => (
        <div
          {...props}
          style={{
            ...props.style,
            height: '12px',
            width: '12px',
            borderRadius: '6px',
            backgroundColor: '#FFF',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            boxShadow: '0px 2px 3px #AAA',
          }}
        >
          <div
            style={{
              height: '6px',
              width: '6px',
              borderRadius: '3px',
              backgroundColor: isDragged ? '#88d3ff' : '#CCC',
            }}
          />
        </div>
      )}
    />
  );
}
