import { Alert, Button, FileInput, Select, Stack, Text, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { FaExclamationCircle } from 'react-icons/fa';
import { IoIosWarning } from 'react-icons/io';
import { useNavigate, useParams } from 'react-router-dom';

import css from './components/add-result/add-result.module.scss';

import { useConfirmationPopup } from 'components/ConfirmationPopup/useConfirmationPopup';

import { routes } from 'constants/routes';

import { useUser } from 'hooks/useUser';

import { toBase64 } from 'utils/base64';
import { useLanguage } from 'utils/context/translation';
import { api } from 'utils/trpc';

import { ScreenshotPreview } from './components/add-result/ScreenshotPreview';
import { compressFile } from './components/add-result/compressFile';
import { getDateFromFile } from './components/add-result/getDate';
import { useSingleChartQuery } from './hooks/useSingleChartQuery';

const GRADE_OPTIONS = [
  { value: 'SSS', label: 'SSS' },
  { value: 'SS', label: 'SS' },
  { value: 'S', label: 'S' },
  { value: 'A+', label: 'A+' },
  { value: 'A', label: 'A' },
  { value: 'B', label: 'B' },
  { value: 'C', label: 'C' },
  { value: 'D', label: 'D' },
  { value: 'F', label: 'F' },
  { value: 'B+', label: 'B+' },
  { value: 'C+', label: 'C+' },
  { value: 'D+', label: 'D+' },
  { value: 'F+', label: 'F+' },
];

const MIX_OPTIONS = [
  { value: 'XX', label: 'XX' },
  { value: 'Prime2', label: 'Prime 2' },
  { value: 'Prime', label: 'Prime' },
];

const MOD_OPTIONS = [
  { value: '', label: 'No mods' },
  { value: 'VJ', label: 'Rank (VJ)' },
  { value: 'HJ', label: 'HJ' },
];

interface AddResultFormData {
  screenshot: File | null;
  grade: string;
  perfect: string;
  great: string;
  good: string;
  bad: string;
  miss: string;
  combo: string;
  score: string;
  mix: 'XX' | 'Prime2' | 'Prime';
  mod: '' | 'VJ' | 'HJ';
}

const AddResult = () => {
  const lang = useLanguage();
  const navigate = useNavigate();
  const { sharedChartId } = useParams();
  const user = useUser();
  const queryClient = useQueryClient();
  const addResultMutation = useMutation(
    api.results.addResultMutation.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(api.charts.chart.queryFilter());
        queryClient.invalidateQueries(api.charts.search.infiniteQueryFilter());
      },
    })
  );
  const chartQuery = useSingleChartQuery({
    sharedChartId: sharedChartId ? Number(sharedChartId) : 0,
  });

  const playerId = user.data?.id;
  const canAddResult = !!user.data?.can_add_results_manually;
  const chart = chartQuery.data?.items[0];
  const label = chart && `${chart.songName} ${chart.label}`;

  const [error, setError] = useState<unknown | null>(null);
  const [isUploading, setUploading] = useState(false);

  const { renderPopup, confirm } = useConfirmationPopup({
    okText: lang.SUBMIT,
  });

  const form = useForm<AddResultFormData>({
    initialValues: {
      screenshot: null,
      grade: '',
      perfect: '',
      great: '',
      good: '',
      bad: '',
      miss: '',
      combo: '',
      score: '',
      mix: 'XX',
      mod: '',
    },
    validate: {
      screenshot: (value) => (!value ? lang.SCREENSHOT_REQUIRED : null),
      grade: (value) => (!value ? lang.GRADE_REQUIRED : null),
      perfect: (value) => (!value ? lang.PERFECT_REQUIRED : null),
      great: (value) => (!value ? lang.GREAT_REQUIRED : null),
      good: (value) => (!value ? lang.GOOD_REQUIRED : null),
      bad: (value) => (!value ? lang.BAD_REQUIRED : null),
      miss: (value) => (!value ? lang.MISS_REQUIRED : null),
      combo: (value) => (!value ? lang.COMBO_REQUIRED : null),
      score: (value) => (!value || value.length < 4 ? lang.SCORE_REQUIRED_MIN_DIGITS : null),
    },
  });
  const selectedScreenshot = form.values.screenshot;
  const formData = form.values;

  const onSubmit = async ({ screenshot, ...rawData }: AddResultFormData) => {
    if (!playerId || !sharedChartId || !screenshot) {
      return;
    }
    try {
      await confirm();
    } catch {
      // Confirmation canceled
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // compress image
      const compressedFile = await compressFile(screenshot);
      const dateFromFile = await getDateFromFile(screenshot);

      const data = {
        grade: rawData.grade,
        perfect: Number(rawData.perfect),
        great: Number(rawData.great),
        good: Number(rawData.good),
        bad: Number(rawData.bad),
        miss: Number(rawData.miss),
        combo: Number(rawData.combo),
        score: Number(rawData.score),
        mix: rawData.mix,
        mod: rawData.mod,
        screenshot: await toBase64(compressedFile),
        fileName: screenshot.name,
        date: dateFromFile || new Date(),
        isExactDate: !!dateFromFile,
        sharedChartId: Number(sharedChartId),
        playerId,
      };

      await addResultMutation.mutateAsync(data);

      form.reset();
      navigate(routes.leaderboard.sharedChart.getPath({ sharedChartId }));
    } catch (e: unknown) {
      console.error(e);
      setError(e);
    }
    setUploading(false);
  };

  if (!playerId) {
    return null;
  }

  if (!canAddResult) {
    return (
      <Alert
        radius="md"
        variant="light"
        color="red"
        title={lang.ERROR}
        icon={<FaExclamationCircle />}
      >
        {lang.NO_ACCESS_TO_PAGE}
      </Alert>
    );
  }

  return (
    <div className={css.addResultPage}>
      {renderPopup({
        content: (
          <div className={css.confirmation}>
            <div className={css.splitPanels}>
              <div className={css.screenshotPanel}>
                {selectedScreenshot && <ScreenshotPreview file={selectedScreenshot} />}
              </div>
              <div className={css.formPanel}>
                <div className={css.chartName}>{label}</div>
                <div className={css.grid}>
                  <div>{lang.GRADE}</div>
                  <div>{formData.grade}</div>
                  <div style={{ color: '#29D7FF' }}>Perfect</div>
                  <div style={{ color: '#29D7FF' }}>{formData.perfect}</div>
                  <div style={{ color: '#21d021' }}>Great</div>
                  <div style={{ color: '#21d021' }}>{formData.great}</div>
                  <div style={{ color: '#dede3a' }}>Good</div>
                  <div style={{ color: '#dede3a' }}>{formData.good}</div>
                  <div style={{ color: '#f278fc' }}>Bad</div>
                  <div style={{ color: '#f278fc' }}>{formData.bad}</div>
                  <div style={{ color: '#f48181' }}>Miss</div>
                  <div style={{ color: '#f48181' }}>{formData.miss}</div>
                  <div>Combo</div>
                  <div>{formData.combo}</div>
                  <div style={{ fontWeight: 'bold', fontSize: '110%' }}>Score</div>
                  <div style={{ fontWeight: 'bold', fontSize: '110%' }}>{formData.score}</div>
                  <div>{lang.MODS}</div>
                  <div>{formData.mod || lang.NONE_NORMAL_MODE}</div>
                </div>
              </div>
            </div>
            <Alert radius="md" variant="light" color="yellow" icon={<IoIosWarning />}>
              {lang.FALSE_RESULTS_WARNING}
            </Alert>
          </div>
        ),
      })}
      <Title order={2} mb="xs">
        {lang.SUBMIT_RESULT}
      </Title>
      <Text mb="md">{lang.CHART}: {label}</Text>
      <form onSubmit={form.onSubmit(onSubmit)}>
        <Stack gap="sm">
          <FileInput
            label={lang.SCREENSHOT}
            placeholder={lang.SELECT_SCREENSHOT}
            accept="image/*"
            withAsterisk
            {...form.getInputProps('screenshot')}
          />
          {selectedScreenshot?.name.toLowerCase().endsWith('.heic') && (
            <Text c="red" size="sm">
              {lang.HEIC_NOT_SUPPORTED}
            </Text>
          )}
          {selectedScreenshot && (
            <>
              <ScreenshotPreview
                showDate
                enableOcr
                file={selectedScreenshot}
                onScoreRecognized={(score) => {
                  if (score.perfect >= 0) form.setFieldValue('perfect', String(score.perfect));
                  if (score.great >= 0) form.setFieldValue('great', String(score.great));
                  if (score.good >= 0) form.setFieldValue('good', String(score.good));
                  if (score.bad >= 0) form.setFieldValue('bad', String(score.bad));
                  if (score.miss >= 0) form.setFieldValue('miss', String(score.miss));
                  if (score.combo >= 0) form.setFieldValue('combo', String(score.combo));
                  if (score.score >= 0) form.setFieldValue('score', String(score.score));
                }}
              />

              <Select
                label={lang.GRADE}
                placeholder={lang.SELECT_GRADE}
                data={GRADE_OPTIONS}
                withAsterisk
                {...form.getInputProps('grade')}
              />

              {(['perfect', 'great', 'good', 'bad', 'miss', 'combo'] as const).map((field) => (
                <TextInput
                  key={field}
                  label={field[0].toUpperCase() + field.slice(1)}
                  placeholder="000"
                  inputMode="numeric"
                  withAsterisk
                  {...form.getInputProps(field)}
                />
              ))}

              <TextInput
                label="Score"
                placeholder="000000"
                inputMode="numeric"
                withAsterisk
                {...form.getInputProps('score')}
              />

              <Select
                label={lang.MIX}
                data={MIX_OPTIONS}
                withAsterisk
                {...form.getInputProps('mix')}
              />

              <Select
                label={lang.JUDGE_RANK}
                data={MOD_OPTIONS}
                withAsterisk
                {...form.getInputProps('mod')}
              />

              <Button type="submit" loading={isUploading} disabled={!form.isValid()}>
                {lang.SUBMIT}
              </Button>
            </>
          )}

          {error instanceof Error && (
            <Alert color="red" variant="light">
              {error.message}
            </Alert>
          )}
        </Stack>
      </form>
    </div>
  );
};

export default AddResult;
