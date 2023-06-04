import React from 'react';

const Grade = React.memo(function _Grade({ grade }) {
  if (!grade || grade === '?') {
    return null;
  }
  return <img src={`/grades/${grade}.png`} alt={grade} />;
});

export default Grade;
