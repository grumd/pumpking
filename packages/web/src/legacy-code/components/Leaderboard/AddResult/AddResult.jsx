import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { IoIosWarning } from 'react-icons/io';

import css from './add-result.module.scss';

import { ScreenshotPreview } from './ScreenshotPreview';
import { compressFile } from './compressFile';
import { getDateFromFile } from './getDate';

import { useConfirmationPopup } from 'legacy-code/components/Shared/Popups/useConfirmationPopup';

import { postJson } from 'legacy-code/utils/fetch';

import { fetchChartsData, postChartsProcessing } from 'legacy-code/reducers/charts';

import { routes } from 'legacy-code/constants/routes';
import { HOST_V2 } from 'legacy-code/constants/backend';

const AddResult = () => {
  const navigate = useNavigate();
  const params = useParams();
  const dispatch = useDispatch();
  const [isUploading, setUploading] = useState(false);
  const playerId = useSelector((state) => state.user.data?.player?.id);
  const [error, setError] = useState(null);

  const { renderPopup, confirm } = useConfirmationPopup({
    okText: 'Submit',
  });

  const chart = useSelector((state) => state.charts.data?.[params.sharedChartId]?.chart);
  const label = chart && `${chart.track_name} ${chart.chart_label}`;

  const { register, handleSubmit, reset, watch, formState } = useForm({
    defaultValues: {
      grade: '',
      mix: 'XX',
      mod: '',
    },
  });
  const selectedScreenshot = watch('screenshot');
  const formData = watch();

  const onSubmit = async (rawData) => {
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
      const compressedFile = await compressFile(rawData.screenshot[0]);
      const dateFromFile = await getDateFromFile(rawData.screenshot[0]);

      const data = {
        ...rawData,
        screenshot: compressedFile,
        date: (dateFromFile || new Date()).toISOString(),
        isExactDate: !!dateFromFile,
        sharedChartId: Number(params.sharedChartId),
        playerId,
      };

      console.log(data);

      const body = new FormData();
      for (const key in data) {
        body.append(key, data[key]);
      }

      await dispatch(
        postJson({
          body,
          url: `${HOST_V2}/results/add-result`,
        })
      );

      reset();
      navigate(routes.leaderboard.sharedChart.getPath(params));
      await dispatch(fetchChartsData());
      dispatch(postChartsProcessing());
    } catch (e) {
      console.error(e);
      setError(e);
    }
    setUploading(false);
  };

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
        {['perfect', 'great', 'good', 'bad', 'miss', 'combo'].map((field) => {
          return (
            <label>
              <span>{field[0].toUpperCase() + field.slice(1)} *</span>
              <input
                className="form-control"
                inputMode="numeric"
                placeholder="000"
                {...register(field, { required: true, pattern: /^[0-9]+$/ })}
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
            {...register('score', { required: true, minLength: 4, pattern: /^[0-9]+$/ })}
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
        {error && <div className="alert alert-danger">{error.message}</div>}
      </form>
    </div>
  );
};

export default AddResult;
