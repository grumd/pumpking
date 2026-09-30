import { language } from 'utils/context/translation';

export const tournamentName = (startDate: Date) => {
  const name = startDate.toLocaleDateString(language === 'ua' ? 'uk' : language, {
    month: 'long',
    year: 'numeric',
  });
  return name.charAt(0).toUpperCase() + name.slice(1);
};
