import { Alert } from '@mantine/core';
import { useQueryClient } from '@tanstack/react-query';
import { getQueryKey } from '@trpc/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { FaExclamationCircle } from 'react-icons/fa';
import { IoIosWarning } from 'react-icons/io';
import { useNavigate, useParams } from 'react-router-dom';

import css from './components/add-result/add-result.module.scss';

import { useUser } from 'hooks/useUser';

import { useConfirmationPopup } from 'legacy-code/components/Shared/Popups/useConfirmationPopup';
import { routes } from 'legacy-code/constants/routes';

import { toBase64 } from 'utils/base64';
import { useLanguage } from 'utils/context/translation';
import { api } from 'utils/trpc';

import { ScreenshotPreview } from './components/add-result/ScreenshotPreview';
import { compressFile } from './components/add-result/compressFile';
import { getDateFromFile } from './components/add-result/getDate';
import { useSingleChartQuery } from './hooks/useSingleChartQuery';

interface AddResultFormData {
  screenshot: FileList;
  grade: string;
  perfect: number;
  great: number;
  good: number;
  bad: number;
  miss: number;
  combo: number;
  score: number;
  mix: 'XX' | 'Prime2' | 'Prime';
  mod: '' | 'VJ' | 'HJ';
}

const AddResult = () => {
  const lang = useLanguage();
  const navigate = useNavigate();
  const params = useParams();
  const user = useUser();
  const queryClient = useQueryClient();
  const addResultMutation = api.results.addResultMutation.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries(getQueryKey(api.charts.chart));
      queryClient.invalidateQueries(getQueryKey(api.charts.search));
    },
  });
  const chartQuery = useSingleChartQuery({
    sharedChartId: params.sharedChartId ? Number(params.sharedChartId) : 0,
  });

  const playerId = user.data?.id;
  const canAddResult = !!user.data?.can_add_results_manually;
  const chart = chartQuery.data?.items[0];
  const label = chart && `${chart.songName} ${chart.chartInstances[0].label}`;

  const [error, setError] = useState<unknown | null>(null);
  const [isUploading, setUploading] = useState(false);

  const { renderPopup, confirm } = useConfirmationPopup({
    okText: 'Submit',
  });

  const { register, handleSubmit, reset, watch, formState } = useForm<AddResultFormData>({
    defaultValues: {
      grade: '',
      mix: 'XX',
      mod: '',
    },
  });
  const selectedScreenshot = watch('screenshot');
  const formData = watch();

  const onSubmit = async ({ screenshot, ...rawData }: AddResultFormData) => {
    if (!playerId || !params.sharedChartId) {
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
      const compressedFile = await compressFile(screenshot[0]);
      const dateFromFile = await getDateFromFile(screenshot[0]);

      const data = {
        ...rawData,
        screenshot: await toBase64(compressedFile),
        fileName: screenshot[0].name,
        date: dateFromFile || new Date(),
        isExactDate: !!dateFromFile,
        sharedChartId: Number(params.sharedChartId),
        playerId,
      };

      await addResultMutation.mutateAsync(data);

      reset();
      navigate(routes.leaderboard.sharedChart.getPath(params));
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
                {selectedScreenshot && <ScreenshotPreview file={selectedScreenshot[0]} />}
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
            <div className={css.warning}>
              <IoIosWarning />
              <span>
                Submitting false results may result in a BAN. Make sure your screenshot is readable
                and the numbers you selected are correct.
              </span>
            </div>
          </div>
        ),
      })}
      <h2>Submit a result</h2>
      <p>Chart: {label}</p>
      <form onSubmit={handleSubmit(onSubmit)} className={css.addResultForm}>
        <label>
          <span>Screenshot *</span>
          <input
            className={`${css.fileInput} form-control`}
            type="file"
            {...register('screenshot', { required: true })}
          />
        </label>
        {selectedScreenshot && selectedScreenshot[0]?.name.toLowerCase().endsWith('.heic') && (
          <p>HEIC files are not supported. Please convert your screenshot to JPG or PNG.</p>
        )}
        {selectedScreenshot && <ScreenshotPreview showDate file={selectedScreenshot[0]} />}
        <label>
          <span>Grade *</span>
          <select className="form-control" {...register('grade', { required: true, minLength: 1 })}>
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
            <label>
              <span>{field[0].toUpperCase() + field.slice(1)} *</span>
              <input
                className="form-control"
                inputMode="numeric"
                placeholder="000"
                {...register(field, { required: true, valueAsNumber: true })}
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
            {...register('score', { required: true, minLength: 4, valueAsNumber: true })}
          />
        </label>
        <label>
          <span>Mix *</span>
          <select className="form-control" {...register('mix', { required: true })}>
            <option value="XX">XX</option>
            <option value="Prime2">Prime 2</option>
            <option value="Prime">Prime</option>
          </select>
        </label>
        <label>
          <span>Judge/rank *</span>
          <select className="form-control" {...register('mod')}>
            <option value="">No mods</option>
            <option value="VJ">Rank (VJ)</option>
            <option value="HJ">HJ</option>
          </select>
        </label>
        <button disabled={isUploading || !formState.isValid} className="btn btn-dark" type="submit">
          {isUploading ? 'Loading...' : 'Submit'}
        </button>
        {error instanceof Error ? <div className="alert alert-danger">{error.message}</div> : null}
      </form>
    </div>
  );
};

export default AddResult;
