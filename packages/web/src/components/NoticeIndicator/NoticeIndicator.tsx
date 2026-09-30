import { Indicator, type IndicatorProps } from '@mantine/core';
import { HiExclamationCircle } from 'react-icons/hi';

export const NoticeIndicator = ({
  unread,
  ...props
}: Omit<IndicatorProps, 'disabled'> & { unread: boolean }) => (
  <Indicator
    offset={3}
    color="transparent"
    label={<HiExclamationCircle color="#c12b44" />}
    inline
    disabled={!unread}
    {...props}
  />
);
