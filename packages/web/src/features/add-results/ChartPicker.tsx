import { Select } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { useLanguage } from 'utils/context/translation';
import { api } from 'utils/trpc';

import type { PhotoChart, PhotoMix } from './usePhotoQueue';

const chartName = (chart: PhotoChart) => `${chart.songName} ${chart.label}`;

interface ChartPickerProps {
  mix: PhotoMix;
  value: PhotoChart | null;
  onChange: (chart: PhotoChart | null) => void;
  description?: React.ReactNode;
  error?: React.ReactNode;
}

/** Searches the mix's charts by song name and label, e.g. "vacuum s16" */
export const ChartPicker = ({ mix, value, onChange, description, error }: ChartPickerProps) => {
  const lang = useLanguage();
  const [search, setSearch] = useState(value ? chartName(value) : '');
  const [debouncedSearch] = useDebouncedValue(search.trim(), 300);

  const query = useQuery(
    api.results.photoCharts.queryOptions(
      { mix, search: debouncedSearch },
      { enabled: debouncedSearch.length >= 2, placeholderData: keepPreviousData }
    )
  );

  const charts = useMemo(() => {
    const found = query.data ?? [];
    // The selected chart stays among the options, so the input can show it
    return value && !found.some((chart) => chart.sharedChartId === value.sharedChartId)
      ? [value, ...found]
      : found;
  }, [query.data, value]);

  return (
    <Select
      label={lang.CHART}
      placeholder={lang.SEARCH_CHART}
      searchable
      withAsterisk
      // The server already searched
      filter={({ options }) => options}
      searchValue={search}
      onSearchChange={setSearch}
      data={charts.map((chart) => ({
        value: String(chart.sharedChartId),
        label: chartName(chart),
      }))}
      value={value ? String(value.sharedChartId) : null}
      onChange={(id) =>
        onChange(charts.find((chart) => String(chart.sharedChartId) === id) ?? null)
      }
      nothingFoundMessage={debouncedSearch.length >= 2 ? lang.NOTHING_FOUND : undefined}
      description={description}
      error={error}
    />
  );
};
