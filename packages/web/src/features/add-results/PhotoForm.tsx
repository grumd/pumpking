import {
  Alert,
  Button,
  Checkbox,
  Group,
  Image,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  rem,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { phoenixGradeOrder } from '@pumpking/utils/grades';
import { useEffect, useState } from 'react';

import { Card } from 'components/Card/Card';
import { ChartLabel } from 'components/ChartLabel/ChartLabel';
import { KeyValueList } from 'components/KeyValueList/KeyValueList';

import { useLanguage } from 'utils/context/translation';

import { ChartPicker } from './ChartPicker';
import { JUDGEMENTS } from './judgements';
import {
  ALL_FIELDS,
  type NeedsInput,
  type PhotoChart,
  type PhotoField,
  type PhotoValues,
  type QueueItem,
} from './usePhotoQueue';

const XX_GRADES = ['SSS', 'SS', 'S', 'A', 'B', 'C', 'D', 'F'];

const NUMBER_FIELDS = [
  ...JUDGEMENTS,
  { key: 'combo', label: 'Combo' },
  { key: 'score', label: 'Score' },
] as const;

type NumberField = (typeof NUMBER_FIELDS)[number]['key'];

interface FormValues extends Record<NumberField, string> {
  chart: PhotoChart | null;
  grade: string | null;
  pass: boolean;
  mod: PhotoValues['mod'];
}

const isWholeNumber = (value: string) => /^\d+$/.test(value.trim());

interface PhotoFormProps {
  item: QueueItem;
  needsInput: NeedsInput;
  onSubmit: (chart: PhotoChart, values: PhotoValues) => Promise<void>;
  onSkip: () => void;
}

/** A photo that couldn't be saved as read: the fields in doubt, filled in by the user */
export const PhotoForm = ({ item, needsInput, onSubmit, onSkip }: PhotoFormProps) => {
  const lang = useLanguage();
  const read = needsInput.values;
  // A single photo shows every field, to confirm
  const [showAll, setShowAll] = useState(item.review);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);

  const [previewUrl, setPreviewUrl] = useState<string>();
  useEffect(() => {
    const url = URL.createObjectURL(item.file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [item.file]);

  const form = useForm<FormValues>({
    initialValues: {
      chart: needsInput.chart,
      perfect: read ? String(read.perfect) : '',
      great: read ? String(read.great) : '',
      good: read ? String(read.good) : '',
      bad: read ? String(read.bad) : '',
      miss: read ? String(read.miss) : '',
      combo: read ? String(read.combo) : '',
      score: read ? String(read.score) : '',
      grade: read?.grade ?? null,
      pass: read?.pass ?? true,
      mod: read?.mod ?? '',
    },
    validate: {
      chart: (value) => (value ? null : lang.CHART_REQUIRED),
      grade: (value) => (value ? null : lang.GRADE_REQUIRED),
      ...Object.fromEntries(
        NUMBER_FIELDS.map((field) => [
          field.key,
          (value: string) => (isWholeNumber(value) ? null : lang.WHOLE_NUMBER_REQUIRED),
        ])
      ),
    },
  });

  const shown = (field: PhotoField) => showAll || needsInput.fields.includes(field);

  const modOptions = [
    { value: '', label: lang.NONE_NORMAL_MODE },
    { value: 'VJ', label: 'Rank (VJ)' },
    { value: 'HJ', label: 'HJ' },
  ];
  const modLabel = (mod: string) => modOptions.find((option) => option.value === mod)?.label;
  const gradeOptions = item.mix === 'XX' ? XX_GRADES : phoenixGradeOrder;

  // What each reader read, when they differ: a tap fills it in
  const readOptions = (field: Exclude<PhotoField, 'chart'>) => {
    const options = [...new Set(needsInput.readValues.map((values) => values[field]))];
    if (options.length < 2) {
      return undefined;
    }
    return (
      <Group gap="xxs" component="span">
        {lang.READ_AS}
        {options.map((option) => (
          <Button
            key={String(option)}
            size="compact-xs"
            variant="default"
            onClick={() =>
              form.setFieldValue(field, typeof option === 'boolean' ? option : String(option))
            }
          >
            {typeof option === 'boolean'
              ? option
                ? lang.YES
                : lang.NO
              : field === 'mod'
              ? modLabel(String(option))
              : option}
          </Button>
        ))}
      </Group>
    );
  };

  // Under a field: what each reader read when they differ, or a note for a field in doubt
  // among all the fields of a single photo that was read
  const fieldNote = (field: PhotoField) =>
    (field !== 'chart' && readOptions(field)) ||
    (item.review && read && needsInput.fields.includes(field) ? (
      <Text span inherit c="yellow">
        {lang.CHECK_THIS}
      </Text>
    ) : undefined);

  // The values that were read with no doubt, shown until the user edits everything
  const values = form.values;
  const readItems = showAll
    ? []
    : ALL_FIELDS.filter((field) => !shown(field)).map((field) => {
        if (field === 'chart') {
          return {
            label: lang.CHART,
            value: values.chart && (
              <Group gap="xxs" component="span" justify="flex-end">
                {values.chart.songName}
                <ChartLabel label={values.chart.label} />
              </Group>
            ),
          };
        }
        if (field === 'pass') {
          return { label: lang.PASS, value: values.pass ? lang.YES : lang.NO };
        }
        if (field === 'mod') {
          return { label: lang.JUDGE_RANK, value: modLabel(values.mod) };
        }
        if (field === 'grade') {
          return { label: lang.GRADE, value: values.grade };
        }
        const label = NUMBER_FIELDS.find((number) => number.key === field)?.label;
        return { label, value: values[field] };
      });

  const handleSubmit = async ({ chart, grade, ...formValues }: FormValues) => {
    // Both are validated
    if (!chart || !grade) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(chart, {
        perfect: Number(formValues.perfect),
        great: Number(formValues.great),
        good: Number(formValues.good),
        bad: Number(formValues.bad),
        miss: Number(formValues.miss),
        combo: Number(formValues.combo),
        score: Number(formValues.score),
        grade,
        pass: formValues.pass,
        mod: formValues.mod,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      // The refused values may be among the ones that were hidden
      setShowAll(true);
    }
    setSubmitting(false);
  };

  return (
    <Card title={lang.CHECK_RESULT}>
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="xs">
          <Image src={previewUrl} alt={item.file.name} fit="contain" mah={rem(480)} />
          {needsInput.message && <Alert color="yellow">{needsInput.message}</Alert>}
          {readItems.length > 0 && <KeyValueList items={readItems} />}

          {shown('chart') && (
            <ChartPicker
              mix={item.mix}
              value={values.chart}
              onChange={(chart) => form.setFieldValue('chart', chart)}
              description={fieldNote('chart')}
              error={form.errors.chart}
            />
          )}
          <SimpleGrid cols={2} spacing="xs" verticalSpacing="xs">
            {NUMBER_FIELDS.filter((field) => shown(field.key)).map((field) => (
              <TextInput
                key={field.key}
                label={
                  <Text
                    span
                    inherit
                    c={field.key === 'combo' || field.key === 'score' ? undefined : field.key}
                  >
                    {field.label}
                  </Text>
                }
                inputMode="numeric"
                withAsterisk
                description={fieldNote(field.key)}
                {...form.getInputProps(field.key)}
              />
            ))}
            {shown('grade') && (
              <Select
                label={lang.GRADE}
                data={gradeOptions}
                allowDeselect={false}
                withAsterisk
                description={fieldNote('grade')}
                {...form.getInputProps('grade')}
              />
            )}
            {shown('mod') && (
              <Select
                label={lang.JUDGE_RANK}
                data={modOptions}
                allowDeselect={false}
                description={fieldNote('mod')}
                {...form.getInputProps('mod')}
              />
            )}
          </SimpleGrid>
          {shown('pass') && (
            <Checkbox
              label={lang.PASS}
              description={fieldNote('pass')}
              {...form.getInputProps('pass', { type: 'checkbox' })}
            />
          )}

          {error && <Alert color="red">{error}</Alert>}
          <Group gap="xs">
            <Button type="submit" loading={isSubmitting}>
              {lang.SUBMIT}
            </Button>
            <Button variant="default" onClick={onSkip} disabled={isSubmitting}>
              {lang.SKIP}
            </Button>
            {!showAll && (
              <Button variant="subtle" onClick={() => setShowAll(true)}>
                {lang.EDIT_ALL}
              </Button>
            )}
          </Group>
        </Stack>
      </form>
    </Card>
  );
};
