import {
  Alert,
  Anchor,
  Badge,
  Box,
  Button,
  Group,
  Popover,
  Text,
  Tooltip,
} from '@mantine/core';
import classNames from 'classnames';
import { useAtomValue } from 'jotai';
import { FaAngleDoubleUp, FaExclamationTriangle, FaTrash } from 'react-icons/fa';
import { Link } from 'react-router-dom';

import { Flag } from 'components/Flag/Flag';
import { Grade } from 'components/Grade/Grade';
import { ResultScreenshotLink } from 'components/ResultScreenshotLink/ResultScreenshotLink';

import { colorsArray } from 'constants/colors';
import { routes } from 'constants/routes';

import { filterAtom } from 'features/leaderboards/hooks/useFilter';
import { useDeleteResult } from 'features/profile/components/AdminPanel/useDeleteResult';

import { useUser } from 'hooks/useUser';

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

const DEBUG = import.meta.env.VITE_DEBUG_RESULTS === 'true';

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
  const isAdmin = !!user.data?.is_admin;

  const deleteResultMutation = useDeleteResult();

  const handleDeleteResult = async () => {
    if (window.confirm(lang.DELETE_RESULT_CONFIRM)) {
      deleteResultMutation.mutate({ resultId: result.id });
    }
  };

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
        <Group gap="xxs" align="center">
          {result.region ? <Flag region={result.region} size="sm" /> : null}
          <Text style={{ flex: '1 1 0', textOverflow: 'ellipsis', overflow: 'hidden' }}>
            {playerRoute ? (
              <Anchor component={Link} to={playerRoute} size="sm">
                {result.playerName}
              </Anchor>
            ) : (
              <Text size="sm">{result.playerName}</Text>
            )}
          </Text>
          {!!result.placeDifference && (
            <span className="change-holder up">
              <span>{result.placeDifference}</span>
              <FaAngleDoubleUp />
            </span>
          )}
          {(DEBUG || (isSortedByPp && result.highlightIndex >= 0)) && (
            <span className="debug-elo-info"> {result.pp && `${result.pp}pp`}</span>
          )}
          <Group gap="0.25em" ml="auto" wrap="nowrap">
            {result.mods?.includes('HJ') && (
              <Badge color="orange" size="xs">
                HJ
              </Badge>
            )}
            {result.mods?.includes('VJ') && (
              <Badge color="red" size="xs">
                R
              </Badge>
            )}
            <MixPlate mix={result.mix} />
          </Group>
        </Group>
      </td>
      <td className={classNames('score')}>
        <Popover withArrow shadow="sm" width={200} position="top">
          <Popover.Target>
            <span className="score-span">
              <span>{Math.floor(result.score / 1000)}</span>
              <span style={{ fontSize: '70%' }}>,{`${result.score % 1000}`.padStart(3, '0')}</span>
            </span>
          </Popover.Target>
          <Popover.Dropdown p="sm">
            <Box>
              <ResultScreenshotLink resultId={result.id} />

              <Box
                component="dl"
                m={0}
                style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.25rem 0.5rem' }}
              >
                {DEBUG && (
                  <>
                    <Text component="dt" c="dimmed" size="sm">
                      result id:
                    </Text>
                    <Text component="dd" m={0} size="sm">
                      {result.id}
                    </Text>
                    <Text component="dt" c="dimmed" size="sm">
                      player id:
                    </Text>
                    <Text component="dd" m={0} size="sm">
                      {result.playerId}
                    </Text>
                  </>
                )}

                <Text component="dt" c="dimmed" size="sm">
                  {lang.PLAYER}:
                </Text>
                <Text component="dd" m={0} size="sm">
                  {playerRoute ? (
                    <Anchor component={Link} to={playerRoute}>
                      {result.playerName} ({result.playerNameArcade})
                    </Anchor>
                  ) : (
                    `${result.playerName} (${result.playerNameArcade})`
                  )}
                </Text>

                {result.exp ? (
                  <>
                    <Text component="dt" c="dimmed" size="sm" fw={700}>
                      {lang.EXP}:
                    </Text>
                    <Text component="dd" m={0} size="sm" fw={700} bg="dark.5" px={4}>
                      +{result.exp}
                    </Text>
                  </>
                ) : null}

                {result.pp ? (
                  <>
                    <Text component="dt" c="dimmed" size="sm" fw={700}>
                      {lang.PP}:
                    </Text>
                    <Text component="dd" m={0} size="sm" fw={700} bg="dark.5" px={4}>
                      {result.pp}pp
                    </Text>
                  </>
                ) : null}

                {result.isExactGainedDate && result.mods && (
                  <>
                    <Text component="dt" c="dimmed" size="sm">
                      {lang.MODS}:
                    </Text>
                    <Text component="dd" m={0} size="sm">
                      {result.mods}
                    </Text>
                  </>
                )}

                {result.isExactGainedDate && result.combo != null && (
                  <>
                    <Text component="dt" c="dimmed" size="sm" hiddenFrom="sm">
                      {lang.COMBO}:
                    </Text>
                    <Text component="dd" m={0} size="sm" hiddenFrom="sm">
                      {result.combo}
                    </Text>
                  </>
                )}
              </Box>

              {!result.isExactGainedDate && (
                <Alert
                  mt="xs"
                  lh="xs"
                  color="yellow"
                  p="xxs"
                  pl="xs"
                  pr="xs"
                  icon={<FaExclamationTriangle />}
                  styles={{ message: { fontSize: 'var(--mantine-font-size-sm)' } }}
                >
                  {lang.MY_BEST_SCORE_WARNING}
                </Alert>
              )}

              {result.isExactGainedDate && !result.scoreIncrease && (
                <Text size="sm" mt="xs">
                  {lang.SIGHTREAD}
                </Text>
              )}

              {isAdmin && (
                <Button
                  mt="xs"
                  size="xs"
                  color="red"
                  variant="light"
                  fullWidth
                  leftSection={<FaTrash />}
                  onClick={handleDeleteResult}
                  loading={deleteResultMutation.isPending}
                >
                  {lang.DELETE_RESULT}
                </Button>
              )}
            </Box>
          </Popover.Dropdown>
        </Popover>
      </td>
      <td className={classNames('grade')}>
        <div className="img-holder">
          {!filter.scoring || filter.scoring === 'phoenix' ? (
            <Grade
              w="auto"
              h="1rem"
              score={result.score}
              isPass={result.passed ?? false}
              scoring="phoenix"
            />
          ) : (
            <Grade w="auto" h="1rem" grade={result.grade} scoring="xx" />
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
