import { Button, Group, Popover, RangeSlider, Stack } from '@mantine/core';
import { type Control, Controller } from 'react-hook-form';

import { ToggleButtonGroup } from 'components/ToggleButtonGroup/ToggleButtonGroup';

import { useLanguage } from 'utils/context/translation';

import type { SearchFormValues } from './formTypes';

export default function ChartFilter({ control }: { control: Control<SearchFormValues, unknown> }) {
  const lang = useLanguage();

  return (
    <Popover>
      <Popover.Target>
        <Button>{lang.FILTER_CHARTS}</Button>
      </Popover.Target>
      <Popover.Dropdown bg="var(--mantine-color-dark-6)">
        <Stack gap="sm" align="center">
          <Group gap="sm">
            <Controller
              control={control}
              name="labels"
              render={({ field }) => (
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
                  ]}
                  selected={field.value ?? ['S', 'D']}
                  onChange={field.onChange}
                />
              )}
            />
          </Group>
          <Group gap="sm">
            <Controller
              control={control}
              name="durations"
              render={({ field }) => (
                <ToggleButtonGroup
                  options={(['Full', 'Remix', 'Short', 'Standard'] as const).map((duration) => ({
                    value: duration,
                    label: duration,
                  }))}
                  selected={field.value ?? ['Full', 'Remix', 'Short', 'Standard']}
                  onChange={field.onChange}
                />
              )}
            />
          </Group>
          <Controller
            control={control}
            name="levels"
            render={({ field }) => (
              <>
                <RangeSlider
                  mt="xl"
                  color="grape"
                  w={'100%'}
                  step={1}
                  min={1}
                  max={28}
                  minRange={0}
                  labelAlwaysOn
                  {...field}
                />
                <Group w="100%" gap="sm">
                  <Button
                    size="xs"
                    onClick={() => {
                      field.onChange([
                        Math.max(1, (field.value?.[0] ?? 0) - 1),
                        field.value?.[1] ?? 28,
                      ]);
                    }}
                  >
                    {'<'}
                  </Button>
                  <Button
                    size="xs"
                    onClick={() => {
                      const newLeft = Math.min(28, Math.max(1, (field.value?.[0] ?? 0) + 1));
                      field.onChange([
                        newLeft,
                        Math.max(newLeft, Math.min(28, field.value?.[1] ?? 28)),
                      ]);
                    }}
                  >
                    {'>'}
                  </Button>
                  <Button
                    size="xs"
                    ml="auto"
                    onClick={() => {
                      const newRight = Math.max(1, Math.min(28, (field.value?.[1] ?? 28) - 1));
                      field.onChange([Math.min(newRight, field.value?.[0] ?? 1), newRight]);
                    }}
                  >
                    {'<'}
                  </Button>
                  <Button
                    size="xs"
                    onClick={() => {
                      field.onChange([
                        field.value?.[0] ?? 1,
                        Math.min(28, (field.value?.[1] ?? 28) + 1),
                      ]);
                    }}
                  >
                    {'>'}
                  </Button>
                </Group>
              </>
            )}
          />
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
