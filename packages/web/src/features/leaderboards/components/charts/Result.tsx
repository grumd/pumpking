import classNames from 'classnames';
import { useAtomValue } from 'jotai';
import numeral from 'numeral';
import { FaAngleDoubleUp, FaExclamationTriangle } from 'react-icons/fa';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore will change to Mantine Tooltip
import Tooltip from 'react-responsive-ui/modules/Tooltip';
import { Link } from 'react-router-dom';

import { ResultScreenshotLink } from 'components/ResultScreenshotLink/ResultScreenshotLink';

import { filterAtom } from 'features/leaderboards/hooks/useFilter';

import { useUser } from 'hooks/useUser';

import Flag from 'legacy-code/components/Shared/Flag';
import Overlay from 'legacy-code/components/Shared/Overlay/Overlay';
import { getTimeAgo as getShortTimeAgo } from 'legacy-code/components/SocketTracker/helpers';
import { DEBUG } from 'legacy-code/constants/env';
import { routes } from 'legacy-code/constants/routes';
import { colorsArray } from 'legacy-code/utils/colors';
import { getExp } from 'legacy-code/utils/exp';

import { useLanguage } from 'utils/context/translation';

import type { ChartApiOutput } from '../../hooks/useChartsQuery';
import { Grade } from './Grade';
import { MixPlate } from './MixPlate';

export type ResultExtended = ChartApiOutput['results'][number] & {
  topPlace: number;
  isImportant: boolean;
  highlightIndex: number;
  placeDifference: number;
  isLatestScore: boolean;
  isCollapsible: boolean;
};

const Result = ({ result, chart }: { result: ResultExtended; chart: ChartApiOutput }) => {
  const lang = useLanguage();
  const user = useUser();
  const filter = useAtomValue(filterAtom);
  const isSortedByPp = filter.sortChartsBy === 'pp';
  const isCurrentPlayer = result.playerId === user.data?.id;

  const exp = getExp(result, chart);
  const playerRoute = routes.profile.getPath({ id: result.playerId });

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
            <Link to={playerRoute}>{result.playerName}</Link>
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
          <div className="mods-container">
            <MixPlate mix={result.mix} />
          </div>
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
              <Link to={playerRoute}>
                {result.playerName} ({result.playerNameArcade})
              </Link>
            </div>
            {exp ? (
              <div className="important">
                <span className="_grey">{lang.EXP}: </span>+{numeral(exp).format('0,0')}
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
          <Grade
            score={result.score}
            isPass={result.passed}
            grade={result.grade}
            mix={result.mix}
          />
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
        <Tooltip
          content={/*tooltipFormatter(lang, result)*/ ''}
          tooltipClassName="pumpking-tooltip"
        >
          {getShortTimeAgo(lang, new Date(result.gained))}
          {result.isExactGainedDate ? '' : '?'}
        </Tooltip>
      </td>
    </tr>
  );
};

export default Result;
