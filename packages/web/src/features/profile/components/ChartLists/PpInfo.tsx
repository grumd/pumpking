import { ActionIcon, Popover, Text } from '@mantine/core';
import { FaQuestionCircle } from 'react-icons/fa';

import { KeyValueList } from 'components/KeyValueList/KeyValueList';

import { useLanguage } from 'utils/context/translation';

// A button next to the pp tabs: what each tab shows and how scores lose value with age.
// A popover, so it opens on tap too
export const PpInfo = (): JSX.Element => {
  const lang = useLanguage();

  return (
    <Popover withArrow width="min-content" position="bottom-end">
      <Popover.Target>
        <ActionIcon aria-label={lang.PP_ABOUT} size="lg">
          <FaQuestionCircle />
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown p="sm">
        <KeyValueList
          noWrap
          items={[
            { label: lang.CURRENT_BEST, value: lang.PP_NOW_WITH_DECAY },
            { label: lang.ALL_TIME_BEST, value: lang.PP_FULL_WITHOUT_DECAY },
          ]}
        />
        <Text size="sm" mt="xs">
          {lang.PP_DECAY_NOTE}
        </Text>
        <KeyValueList
          noWrap
          items={[
            { label: lang.PP_AGE_UP_TO_1_YEAR, value: '100%' },
            { label: lang.PP_AGE_2_YEARS, value: '75%' },
            { label: lang.PP_AGE_5_YEARS, value: '25%' },
          ]}
        />
      </Popover.Dropdown>
    </Popover>
  );
};
