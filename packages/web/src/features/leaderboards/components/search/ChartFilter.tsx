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
            )}
          />
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
