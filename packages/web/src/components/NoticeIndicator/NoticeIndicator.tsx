import { Indicator, type IndicatorProps, VisuallyHidden } from '@mantine/core';
import { HiExclamationCircle } from 'react-icons/hi';

import { useLanguage } from 'utils/context/translation';

export const NoticeIndicator = ({
  unread,
  ...props
}: Omit<IndicatorProps, 'disabled'> & { unread: boolean }) => {
  const lang = useLanguage();
  return (
    <Indicator
      offset={3}
      color="transparent"
      label={
        <>
          <HiExclamationCircle color="var(--mantine-color-red-filled)" aria-hidden />
          <VisuallyHidden>{lang.UNREAD}</VisuallyHidden>
        </>
      }
      inline
      disabled={!unread}
      {...props}
    />
  );
};
