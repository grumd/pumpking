import { Button, Group, Popover, RangeSlider, Stack } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';

import { ToggleButtonGroup } from 'components/ToggleButtonGroup/ToggleButtonGroup';

import { useLanguage } from 'utils/context/translation';

import type { SearchFormValues } from './formTypes';

export default function ChartFilter({
  form,
  buttonClassName,
}: {
  form: UseFormReturnType<SearchFormValues>;
  buttonClassName?: string;
}) {
  const lang = useLanguage();

  const levelsValue = form.values.levels ?? [1, 28];

  return (
    <Popover>
      <Popover.Target>
        <Button className={buttonClassName}>{lang.FILTER_CHARTS}</Button>
      </Popover.Target>
      <Popover.Dropdown bg="var(--mantine-color-dark-6)">
        <Stack gap="sm" align="center">
          <Group gap="sm">
            <ToggleButtonGroup
              options={[
                {
                  value: 'S',
                  label: 'Single',
                },
                {
                  value: 'D',
                  label: 'Double',
                },
                {
                  value: 'COOP',
                  label: 'COOP',
                },
              ]}
              selected={form.values.labels ?? ['S', 'D', 'COOP']}
              onChange={(value) => form.setFieldValue('labels', value)}
            />
          </Group>
          <Group gap="sm">
            <ToggleButtonGroup
              options={(['Full', 'Remix', 'Short', 'Standard'] as const).map((duration) => ({
                value: duration,
                label: duration,
              }))}
              selected={form.values.durations ?? ['Full', 'Remix', 'Short', 'Standard']}
              onChange={(value) => form.setFieldValue('durations', value)}
            />
          </Group>
          <RangeSlider
            mt="xl"
            color="grape"
            w={'100%'}
            step={1}
            min={1}
            max={28}
            minRange={0}
            labelAlwaysOn
            {...form.getInputProps('levels')}
          />
          <Group w="100%" gap="sm">
            <Button
              size="xs"
              onClick={() => {
                form.setFieldValue('levels', [
                  Math.max(1, (levelsValue[0] ?? 0) - 1),
                  levelsValue[1] ?? 28,
                ]);
              }}
            >
              {'<'}
            </Button>
            <Button
              size="xs"
              onClick={() => {
                const newLeft = Math.min(28, Math.max(1, (levelsValue[0] ?? 0) + 1));
                form.setFieldValue('levels', [
                  newLeft,
                  Math.max(newLeft, Math.min(28, levelsValue[1] ?? 28)),
                ]);
              }}
            >
              {'>'}
            </Button>
            <Button
              size="xs"
              ml="auto"
              onClick={() => {
                const newRight = Math.max(1, Math.min(28, (levelsValue[1] ?? 28) - 1));
                form.setFieldValue('levels', [Math.min(newRight, levelsValue[0] ?? 1), newRight]);
              }}
            >
              {'<'}
            </Button>
            <Button
              size="xs"
              onClick={() => {
                form.setFieldValue('levels', [
                  levelsValue[0] ?? 1,
                  Math.min(28, (levelsValue[1] ?? 28) + 1),
                ]);
              }}
            >
              {'>'}
            </Button>
          </Group>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
