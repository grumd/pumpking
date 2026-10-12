import { Stack, Text, Tooltip, UnstyledButton, rem } from '@mantine/core';

import { CardWithProgress } from '../CardWithProgress/CardWithProgress';
import css from './achievement.module.css';

export const Achievement = ({
  name,
  progress,
  icon,
  desc,
}: {
  name: string;
  desc?: string;
  progress: number;
  icon: React.ReactNode;
}): JSX.Element => {
  const content = (
    <Stack h="100%" gap="xxs" align="center" justify="center">
      <div className={css.icon}>{icon}</div>
      <Text lh="xs" ta="center">
        {name}
      </Text>
    </Stack>
  );

  return (
    <CardWithProgress progress={progress}>
      {desc ? (
        <Tooltip multiline maw={rem(320)} label={desc}>
          <UnstyledButton w="100%" h="100%">
            {content}
          </UnstyledButton>
        </Tooltip>
      ) : (
        content
      )}
    </CardWithProgress>
  );
};
