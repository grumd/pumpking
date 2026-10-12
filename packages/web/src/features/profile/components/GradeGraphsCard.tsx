import { ActionIcon, Stack } from '@mantine/core';
import { useToggle } from '@mantine/hooks';
import { TbSwitch } from 'react-icons/tb';

import { Card } from 'components/Card/Card';

import { useLanguage } from 'utils/context/translation';

import DoubleSingleGradesGraph from './DoubleSingleGradesGraph';
import DoubleSingleGraph from './DoubleSingleGraph';
import GradesGraph from './GradesGraph';

export const GradeGraphsCard = (): JSX.Element => {
  const [value, toggle] = useToggle(['combined', 'separate']);
  const lang = useLanguage();

  const switchButton = (
    <ActionIcon onClick={() => toggle()} aria-label={lang.SWITCH_GRAPHS}>
      <TbSwitch />
    </ActionIcon>
  );

  if (value === 'combined') {
    return (
      <Card title={lang.GRADES} actions={switchButton}>
        <DoubleSingleGradesGraph />
      </Card>
    );
  }

  return (
    <Stack gap="sm">
      <Card flex={1} title={lang.GRADES} actions={switchButton}>
        <GradesGraph />
      </Card>
      <Card flex={1}>
        <DoubleSingleGraph />
      </Card>
    </Stack>
  );
};
