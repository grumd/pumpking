import { ActionIcon, Stack } from '@mantine/core';
import { useToggle } from '@mantine/hooks';
import { TbSwitch } from 'react-icons/tb';

import { Card } from 'components/Card/Card';

import { useLanguage } from 'utils/context/translation';

import { PpAndRankHistoryGraph } from './PpAndRankHistoryGraph';
import { PpHistoryGraph } from './PpHistoryGraph';
import { PpRankHistoryGraph } from './PpRankHistoryGraph';

export const PpGraphsCard = (): JSX.Element => {
  const [value, toggle] = useToggle(['combined', 'separate']);
  const lang = useLanguage();

  const switchButton = (
    <ActionIcon onClick={() => toggle()} aria-label={lang.SWITCH_GRAPHS}>
      <TbSwitch />
    </ActionIcon>
  );

  if (value === 'combined') {
    return (
      <Card title={lang.PP_AND_RANK_HISTORY} actions={switchButton}>
        <PpAndRankHistoryGraph />
      </Card>
    );
  }

  return (
    <Stack gap="sm">
      <Card flex={1} title={lang.PP_HISTORY} actions={switchButton}>
        <PpHistoryGraph />
      </Card>
      <Card flex={1} title={lang.RANK_HISTORY}>
        <PpRankHistoryGraph />
      </Card>
    </Stack>
  );
};
