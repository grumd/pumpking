import { combineReducers } from 'redux';

import mostPlayed from './mostPlayed';
import mostPlayedMonth from './mostPlayedMonth';
import leastPlayed from './leastPlayed';

export default combineReducers({
  mostPlayed,
  mostPlayedMonth,
  leastPlayed,
});
