import React from 'react';

const Flag = ({ region }) => {
  return (
    <div
      className="flag-img"
      style={{
        backgroundImage: `url(https://osu.ppy.sh/images/flags/${region}.png)`,
      }}
    />
  );
};

export default React.memo(Flag);
