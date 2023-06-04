import React, { useState } from 'react';
import { BsArrowsExpand } from 'react-icons/bs';

import './results-collapser.scss';
import { useLanguage } from 'legacy-code/utils/context/translation';

export const ResultsCollapser = ({ children, count }) => {
  const [collapsed, setCollapsed] = useState(true);
  const lang = useLanguage();

  if (collapsed && count > 1) {
    return (
      <tr className="results-collapser" onClick={() => setCollapsed(false)}>
        <td colSpan="20">
          <div>
            <button>
              {count && lang.SHOW_MORE_RESULTS ? (
                <>{lang.SHOW_MORE_RESULTS(count)}</>
              ) : (
                <BsArrowsExpand />
              )}
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return <>{children}</>;
};
