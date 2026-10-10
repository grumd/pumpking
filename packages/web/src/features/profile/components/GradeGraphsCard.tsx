import { ActionIcon, Stack } from '@mantine/core';
import { useToggle } from '@mantine/hooks';
import { TbSwitch } from 'react-icons/tb';

import css from './grades-graph.module.scss';

import { Card } from 'components/Card/Card';

import { useLanguage } from 'utils/context/translation';

import DoubleSingleGradesGraph from './DoubleSingleGradesGraph';
import DoubleSingleGraph from './DoubleSingleGraph';
import GradesGraph from './GradesGraph';

const Fill = ({ children }: { children: React.ReactNode }) => (
  <div className={css.fill}>
    <div className={css.fillInner}>{children}</div>
  </div>
);

export const GradeGraphsCard = (): JSX.Element => {
  const [value, toggle] = useToggle(['combined', 'separate']);
  const lang = useLanguage();

  if (value === 'combined') {
    return (
      <Card
        className={css.fillCard}
        title={lang.GRADES}
        headerNode={
          <ActionIcon variant="subtle" onClick={() => toggle()} aria-label="Switch graphs">
            <TbSwitch />
          </ActionIcon>
        }
      >
        <Fill>
          <DoubleSingleGradesGraph />
        </Fill>
      </Card>
    );
  }

  return (
    <Stack gap="xs" justify="stretch">
      <Card
        flex="1 1 0"
        className={css.fillCard}
        title={lang.GRADES}
        headerNode={
          <ActionIcon variant="subtle" onClick={() => toggle()} aria-label="Switch graphs">
            <TbSwitch />
          </ActionIcon>
        }
      >
        <Fill>
          <GradesGraph />
        </Fill>
      </Card>
      <Card flex="1 1 0" className={css.fillCard}>
        <Fill>
          <DoubleSingleGraph />
        </Fill>
      </Card>
    </Stack>
  );
};
