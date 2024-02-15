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

  if (value === 'combined') {
    return (
      <Card
        title={lang.GRADES}
        headerNode={
          <ActionIcon variant="subtle" onClick={() => toggle()} aria-label="Switch graphs">
            <TbSwitch />
          </ActionIcon>
        }
      >
        <DoubleSingleGradesGraph />
      </Card>
    );
  }

  return (
    <Stack gap="xs" justify="stretch">
      <Card
        flex="1 1 0"
        title={lang.GRADES}
        headerNode={
          <ActionIcon variant="subtle" onClick={() => toggle()} aria-label="Switch graphs">
            <TbSwitch />
          </ActionIcon>
        }
      >
        <GradesGraph />
      </Card>
      <Card flex="1 1 0">
        <DoubleSingleGraph />
      </Card>
    </Stack>
  );
};
