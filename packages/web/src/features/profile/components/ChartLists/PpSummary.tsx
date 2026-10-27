import { Stack, Text } from '@mantine/core';

import { Stat } from 'components/Stat/Stat';

import { useLanguage } from 'utils/context/translation';

// Above a pp list: the total, and how scores lose value with age
export const PpSummary = ({
  label,
  totalPp,
}: {
  label: string;
  totalPp: number | undefined;
}): JSX.Element => {
  const lang = useLanguage();

  return (
    <Stack gap="xxs" mb="xs">
      <Stat label={label} value={totalPp?.toFixed(2) ?? '…'} />
      <Text size="sm" c="dimmed">
        {lang.PP_DECAY_NOTE}
      </Text>
    </Stack>
  );
};
