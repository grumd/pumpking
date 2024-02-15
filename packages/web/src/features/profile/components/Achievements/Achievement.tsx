import { Stack, Text, Tooltip } from '@mantine/core';

import { CardWithProgress } from 'components/Card/CardWithProgress';

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
  return (
    <CardWithProgress level={2} progress={progress}>
      <Tooltip multiline maw="20em" disabled={!desc} label={desc ?? ''}>
        <Stack h="100%" gap="0.25em" align="center" justify="center">
          <Text size="3em" lh="1em">
            {icon}
          </Text>
          <Text lh="1em">{name}</Text>
        </Stack>
      </Tooltip>
    </CardWithProgress>
  );
};
