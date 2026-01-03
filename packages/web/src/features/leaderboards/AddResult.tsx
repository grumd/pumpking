import { Alert } from '@mantine/core';
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
        queryClient.invalidateQueries({ queryKey: api.charts.chart.queryKey() });
        queryClient.invalidateQueries({ queryKey: api.charts.search.queryKey() });
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
    okText: 'Submit',
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
      screenshot: (value) => (!value ? 'Screenshot is required' : null),
      grade: (value) => (!value ? 'Grade is required' : null),
      perfect: (value) => (!value ? 'Perfect is required' : null),
      great: (value) => (!value ? 'Great is required' : null),
      good: (value) => (!value ? 'Good is required' : null),
      bad: (value) => (!value ? 'Bad is required' : null),
      miss: (value) => (!value ? 'Miss is required' : null),
      combo: (value) => (!value ? 'Combo is required' : null),
      score: (value) => (!value || value.length < 4 ? 'Score is required (min 4 digits)' : null),
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
        You don't have access to this page
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
                  <div>Grade</div>
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
                  <div>Mods</div>
                  <div>{formData.mod || 'None (normal mode)'}</div>
                </div>
              </div>
            </div>
            <Alert radius="md" variant="light" color="yellow" icon={<IoIosWarning />}>
              Submitting false results may result in a BAN. Make sure your screenshot is readable
              and the numbers you selected are correct.
            </Alert>
          </div>
        ),
      })}
      <h2>Submit a result</h2>
      <p>Chart: {label}</p>
      <form onSubmit={form.onSubmit(onSubmit)} className={css.addResultForm}>
        <label>
          <span>Screenshot *</span>
          <input
            className={`${css.fileInput} form-control`}
            type="file"
            onChange={(e) => form.setFieldValue('screenshot', e.target.files?.[0] ?? null)}
          />
        </label>
        {selectedScreenshot?.name.toLowerCase().endsWith('.heic') && (
          <p>HEIC files are not supported. Please convert your screenshot to JPG or PNG.</p>
        )}
        {selectedScreenshot && <ScreenshotPreview showDate file={selectedScreenshot} />}
        <label>
          <span>Grade *</span>
          <select className="form-control" {...form.getInputProps('grade')}>
            <option value="" disabled hidden>
              (select a grade)
            </option>
            <option value="SSS">SSS</option>
            <option value="SS">SS</option>
            <option value="S">S</option>
            <option value="A+">A+</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
            <option value="D">D</option>
            <option value="F">F</option>
            <option value="B+">B+</option>
            <option value="C+">C+</option>
            <option value="D+">D+</option>
            <option value="F+">F+</option>
          </select>
        </label>
        {(['perfect', 'great', 'good', 'bad', 'miss', 'combo'] as const).map((field) => {
          return (
            <label key={field}>
              <span>{field[0].toUpperCase() + field.slice(1)} *</span>
              <input
                className="form-control"
                inputMode="numeric"
                placeholder="000"
                {...form.getInputProps(field)}
              />
            </label>
          );
        })}
        <label>
          <span>Score *</span>
          <input
            className="form-control"
            inputMode="numeric"
            placeholder="000000"
            {...form.getInputProps('score')}
          />
        </label>
        <label>
          <span>Mix *</span>
          <select className="form-control" {...form.getInputProps('mix')}>
            <option value="XX">XX</option>
            <option value="Prime2">Prime 2</option>
            <option value="Prime">Prime</option>
          </select>
        </label>
        <label>
          <span>Judge/rank *</span>
          <select className="form-control" {...form.getInputProps('mod')}>
            <option value="">No mods</option>
            <option value="VJ">Rank (VJ)</option>
            <option value="HJ">HJ</option>
          </select>
        </label>
        <button disabled={isUploading || !form.isValid()} className="btn btn-dark" type="submit">
          {isUploading ? 'Loading...' : 'Submit'}
        </button>
        {error instanceof Error ? <div className="alert alert-danger">{error.message}</div> : null}
      </form>
    </div>
  );
};

export default AddResult;
