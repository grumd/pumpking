import locale from 'relative-time-format/locale/uk';

export default {
  ...locale,
  // This was missing from relative-time-format
  tiny: {
    year: '{0} р',
    quarter: '{0} кв',
    month: '{0} міс',
    week: '{0} тиж',
    day: {
      one: '{0} д',
      other: '{0} дн',
    },
    hour: '{0} год',
    minute: '{0} хв',
    second: '{0} с',
  },
};
