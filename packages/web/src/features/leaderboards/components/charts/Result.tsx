import { Badge, Group, Tooltip } from '@mantine/core';
import classNames from 'classnames';
import { useAtomValue } from 'jotai';
import numeral from 'numeral';
import { FaAngleDoubleUp, FaExclamationTriangle } from 'react-icons/fa';
import { Link } from 'react-router-dom';

import { Grade } from 'components/Grade/Grade';
import { ResultScreenshotLink } from 'components/ResultScreenshotLink/ResultScreenshotLink';

import { colorsArray } from 'constants/colors';
import { routes } from 'constants/routes';

import { filterAtom } from 'features/leaderboards/hooks/useFilter';

import { useUser } from 'hooks/useUser';

import Flag from 'legacy-code/components/Shared/Flag';
import Overlay from 'legacy-code/components/Shared/Overlay/Overlay';
import { DEBUG } from 'legacy-code/constants/env';

import { translation, useLanguage } from 'utils/context/translation';
import { getShortTimeAgo } from 'utils/timeAgo';

import type { ChartApiOutput } from '../../hooks/useChartsQuery';
import { MixPlate } from './MixPlate';

export type ResultExtended = ChartApiOutput['results'][number] & {
  topPlace: number;
  isImportant: boolean;
  highlightIndex: number;
  placeDifference: number;
  isLatestScore: boolean;
  isCollapsible: boolean;
};

const tooltipFormatter = (lang: typeof translation, result: ResultExtended) => {
  if (result.recognitionType === 'manual') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', flexDirection: 'column' }}>
        {!result.isExactGainedDate && <div>{lang.EXACT_DATE_UNKNOWN}</div>}
        <div>
          {lang.SCORE_ADDED_MANUALLY} {new Date(result.added).toLocaleDateString()}
        </div>
        {result.isExactGainedDate && (
          <div>
            {lang.SCORE_WAS_TAKEN} {new Date(result.gained).toLocaleDateString()}
          </div>
        )}
      </div>
    );
  }

  if (!result.isExactGainedDate) {
    const resultType =
      result.recognitionType == null
        ? `${lang.FROM} my best ${lang.OR} machine best`
        : result.recognitionType === 'personal_best'
        ? `${lang.FROM} my best`
        : result.recognitionType === 'machine_best'
        ? `${lang.FROM} machine best`
        : `???`;
    return (
      <div style={{ display: 'flex', alignItems: 'center', flexDirection: 'column' }}>
        <div>{lang.EXACT_DATE_UNKNOWN}</div>
        <div>
          {lang.SCORE_WAS_TAKEN} {resultType}
        </div>
        <div>
          {lang.DATE_RECORDED}: {new Date(result.gained).toLocaleDateString()}
        </div>
      </div>
    );
  } else {
    return new Date(result.gained).toLocaleDateString();
  }
};

const Result = ({ result, chart }: { result: ResultExtended; chart: ChartApiOutput }) => {
  const lang = useLanguage();
  const user = useUser();
  const filter = useAtomValue(filterAtom);
  const isSortedByPp = filter.sortChartsBy === 'pp';
  const isCurrentPlayer = result.playerId === user.data?.id;

  const playerRoute =
    result.playerId == null ? null : routes.profile.getPath({ id: result.playerId });

  return (
    <tr
      key={result.id}
      className={classNames({
        latest: result.isLatestScore,
      })}
      style={
        result.highlightIndex >= 0
          ? {
              background: colorsArray[result.highlightIndex] + '3A',
              outline: `1px solid ${colorsArray[result.highlightIndex]}A0`,
            }
          : {}
      }
    >
      <td className="place" style={isCurrentPlayer ? { fontWeight: 'bold', color: '#ddd' } : {}}>
        {`#${chart.results.findIndex((res) => res.id === result.id) + 1}`}
      </td>
      <td
        className={classNames('nickname')}
        style={result.highlightIndex >= 0 || isCurrentPlayer ? { fontWeight: 'bold' } : {}}
      >
        <div className="nickname-container">
          {result.region ? <Flag region={result.region} /> : null}
          <span className="nickname-text">
            {playerRoute ? <Link to={playerRoute}>{result.playerName}</Link> : result.playerName}
            {!!result.placeDifference && (
              <span className="change-holder up">
                <span>{result.placeDifference}</span>
                <FaAngleDoubleUp />
              </span>
            )}
            {(DEBUG || (isSortedByPp && result.highlightIndex >= 0)) && (
              <span className="debug-elo-info"> {result.pp && `${result.pp}pp`}</span>
            )}
          </span>
          <Group gap="0.25em" ml="auto">
            {result.mods?.includes('HJ') && <Badge color="orange">HJ</Badge>}
            {result.mods?.includes('VJ') && <Badge color="red">R</Badge>}
            <MixPlate mix={result.mix} />
          </Group>
        </div>
      </td>
      <td className={classNames('score')}>
        <Overlay
          overlayClassName="score-overlay-outer"
          overlayItem={
            <span className="score-span">
              {!result.scoreIncrease && <span style={{ fontSize: '80%' }}>* </span>}
              <span>{Math.floor(result.score / 1000)}</span>
              <span style={{ fontSize: '70%' }}>,{`${result.score % 1000}`.padStart(3, '0')}</span>
            </span>
          }
          placement="top"
        >
          <div className="score-overlay">
            <div>
              <ResultScreenshotLink resultId={result.id} />
            </div>
            {DEBUG && (
              <>
                <div>
                  <span className="_grey">result id: </span>
                  {result.id}
                </div>
                <div>
                  <span className="_grey">player id: </span>
                  {result.playerId}
                </div>
              </>
            )}
            <div>
              <span className="_grey">{lang.PLAYER}: </span>
              {playerRoute ? (
                <Link to={playerRoute}>
                  {result.playerName} ({result.playerNameArcade})
                </Link>
              ) : (
                `${result.playerName} (${result.playerNameArcade})`
              )}
            </div>
            {result.exp ? (
              <div className="important">
                <span className="_grey">{lang.EXP}: </span>+{result.exp}
              </div>
            ) : null}
            {result.pp ? (
              <div className="important">
                <span className="_grey">{lang.PP}: </span>
                <span>{result.pp}pp</span>
              </div>
            ) : null}
            {!result.isExactGainedDate && (
              <div className="warning">
                <FaExclamationTriangle />
                {lang.MY_BEST_SCORE_WARNING}
              </div>
            )}
            {result.isExactGainedDate && (
              <>
                {result.mods && (
                  <div>
                    <span className="_grey">{lang.MODS}: </span>
                    {result.mods}
                  </div>
                )}
                {result.combo != null && (
                  <div className="mobile-only">
                    <span className="_grey">{lang.COMBO}: </span>
                    {result.combo}
                  </div>
                )}
                {result.calories != null && (
                  <div>
                    <span className="_grey">{lang.CCAL}: </span>
                    {result.calories}
                  </div>
                )}
                {result.scoreIncrease != null && (
                  <div>
                    <span className="_grey">{lang.SCORE_INCREASE}: </span>+
                    {numeral(result.scoreIncrease).format('0,0')}
                  </div>
                )}
                {/* {result.originalChartMix && (
                  <div>
                    <div className="warning">
                      <FaExclamationTriangle />
                      {lang.ORIGINAL_MIX} {result.originalChartMix}
                    </div>
                    {result.originalChartLabel && (
                      <div>
                        <span className="_grey">{lang.ORIGINAL_CHART} </span>
                        {result.originalChartLabel}
                      </div>
                    )}
                    {result.originalScore && (
                      <div>
                        <span className="_grey">{lang.ORIGINAL_SCORE} </span>
                        {result.originalScore}
                      </div>
                    )}
                  </div>
                )} */}
                {!result.scoreIncrease && lang.SIGHTREAD}
              </>
            )}
          </div>
        </Overlay>
      </td>
      <td className={classNames('grade')}>
        <div className="img-holder">
          {!filter.scoring || filter.scoring === 'phoenix' ? (
            <Grade score={result.score} isPass={result.passed ?? false} scoring="phoenix" />
          ) : (
            <Grade grade={result.grade} scoring="xx" />
          )}
        </div>
      </td>
      <td className={classNames('number', 'miss')}>{result.stats[4]}</td>
      <td className={classNames('number', 'bad')}>{result.stats[3]}</td>
      <td className={classNames('number', 'good')}>{result.stats[2]}</td>
      <td className={classNames('number', 'great')}>{result.stats[1]}</td>
      <td className={classNames('number', 'perfect')}>{result.stats[0]}</td>
      <td className={classNames('combo', 'desktop-only')}>{result.combo && `${result.combo}x`}</td>
      <td
        className={classNames('date', {
          latest: result.isLatestScore,
        })}
      >
        <Tooltip label={tooltipFormatter(lang, result)}>
          <div>
            {getShortTimeAgo(lang, new Date(result.gained))}
            {result.isExactGainedDate ? '' : '?'}
          </div>
        </Tooltip>
      </td>
    </tr>
  );
};

export default Result;
