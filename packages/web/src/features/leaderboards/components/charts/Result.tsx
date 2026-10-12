import {
  Alert,
  Anchor,
  Badge,
  Button,
  Center,
  Group,
  Popover,
  Stack,
  Table,
  Text,
  Tooltip,
  UnstyledButton,
  rem,
} from '@mantine/core';
import { useAtomValue } from 'jotai';
import { FaAngleDoubleUp, FaExclamationTriangle, FaTrash, FaTrophy } from 'react-icons/fa';
import { Link } from 'react-router-dom';

import { Flag } from 'components/Flag/Flag';
import { Grade } from 'components/Grade/Grade';
import { KeyValueList } from 'components/KeyValueList/KeyValueList';
import { Place } from 'components/Place/Place';
import { ResultScreenshotLink } from 'components/ResultScreenshotLink/ResultScreenshotLink';

import { routes } from 'constants/routes';

import { useDeleteResult } from 'features/admin/hooks/useDeleteResult';
import { filterAtom } from 'features/leaderboards/hooks/useFilter';

import { useUser } from 'hooks/useUser';

import { translation, useLanguage } from 'utils/context/translation';
import { getShortTimeAgo } from 'utils/timeAgo';

import type { ChartApiOutput } from '../../hooks/useChartsQuery';
import { MixPlate } from './MixPlate';
import css from './chart-results.module.css';

// The step count columns, left to right, with their place in result.stats
const stepColumns = [
  { index: 4, className: css.miss },
  { index: 3, className: css.bad },
  { index: 2, className: css.good },
  { index: 1, className: css.great },
  { index: 0, className: css.perfect },
];

export type ResultExtended = ChartApiOutput['results'][number] & {
  topPlace: number;
  isImportant: boolean;
  highlightIndex: number;
  placeDifference: number;
  isLatestScore: boolean;
  isCollapsible: boolean;
};

const DEBUG = import.meta.env.VITE_DEBUG_RESULTS === 'true';

// A score with its last three digits smaller: 997,612
const Score = ({ score }: { score: number }) => {
  return (
    <>
      {Math.floor(score / 1000)}
      <Text span fz="xs">
        ,{`${score % 1000}`.padStart(3, '0')}
      </Text>
    </>
  );
};

const tooltipFormatter = (lang: typeof translation, result: ResultExtended) => {
  if (result.recognitionType === 'manual') {
    return (
      <Stack gap={0} align="center">
        {!result.isExactGainedDate && <div>{lang.EXACT_DATE_UNKNOWN}</div>}
        <div>
          {lang.SCORE_ADDED_MANUALLY} {new Date(result.added).toLocaleDateString()}
        </div>
        {result.isExactGainedDate && (
          <div>
            {lang.SCORE_WAS_TAKEN} {new Date(result.gained).toLocaleDateString()}
          </div>
        )}
      </Stack>
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
      <Stack gap={0} align="center">
        <div>{lang.EXACT_DATE_UNKNOWN}</div>
        <div>
          {lang.SCORE_WAS_TAKEN} {resultType}
        </div>
        <div>
          {lang.DATE_RECORDED}: {new Date(result.gained).toLocaleDateString()}
        </div>
      </Stack>
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
  const isHighlighted = result.highlightIndex >= 0;

  const deleteResultMutation = useDeleteResult();

  const handleDeleteResult = async () => {
    if (window.confirm(lang.DELETE_RESULT_CONFIRM)) {
      deleteResultMutation.mutate({ id: result.id });
    }
  };

  const playerRoute =
    result.playerId == null ? null : routes.profile.getPath({ id: result.playerId });

  const place = chart.results.findIndex((res) => res.id === result.id) + 1;

  return (
    <Table.Tr
      key={result.id}
      className={css.row}
      data-latest={result.isLatestScore || undefined}
      data-highlighted={isHighlighted || undefined}
      data-bold={isHighlighted || isCurrentPlayer || undefined}
      // Read by the module only on highlighted rows
      style={{ '--pk-highlight': `var(--pk-highlight-${result.highlightIndex})` }}
    >
      <Table.Td className={css.place} visibleFrom="md">
        {isCurrentPlayer ? (
          <span className={css.currentPlace}>#{place}</span>
        ) : (
          <Place place={place} />
        )}
      </Table.Td>
      <Table.Td className={css.name}>
        <Group gap="xxs" align="center">
          {result.region ? <Flag region={result.region} size="sm" /> : null}
          <Text inherit flex="1 1 0" miw={rem(48)} truncate>
            {playerRoute ? (
              <Anchor component={Link} to={playerRoute} inherit>
                {result.playerName}
              </Anchor>
            ) : (
              <span>{result.playerName}</span>
            )}
            {!!result.placeDifference && (
              <Text span inherit ml="xxs">
                <FaAngleDoubleUp size={rem(11)} /> {result.placeDifference}
              </Text>
            )}
          </Text>
          {(DEBUG || (isSortedByPp && isHighlighted)) && (
            <span> {result.pp && `${result.pp}pp`}</span>
          )}
          <Group gap="xxs" ml="auto" wrap="nowrap">
            {result.countsForTournament && (
              <Tooltip label={lang.TOURNAMENT_RESULT}>
                <UnstyledButton display="flex" aria-label={lang.TOURNAMENT_RESULT}>
                  <Badge color="gold" size="xs">
                    <FaTrophy />
                  </Badge>
                </UnstyledButton>
              </Tooltip>
            )}
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
      </Table.Td>
      <Table.Td className={css.score} ta="right">
        <Popover withArrow width={200} position="top" trapFocus>
          <Popover.Target>
            <UnstyledButton className={css.scoreButton}>
              <Score score={result.score} />
            </UnstyledButton>
          </Popover.Target>
          <Popover.Dropdown p="sm">
            <ResultScreenshotLink resultId={result.id} />

            <KeyValueList
              items={[
                DEBUG && { label: 'result id:', value: result.id },
                DEBUG && { label: 'player id:', value: result.playerId },
                result.originalScore != null &&
                  result.originalScore !== result.score && {
                    label: lang.ORIGINAL_SCORE,
                    value: <Score score={result.originalScore} />,
                  },
                result.grade != null && { label: lang.ORIGINAL_GRADE, value: result.grade },
                {
                  label: `${lang.PLAYER}:`,
                  value: playerRoute ? (
                    <Anchor component={Link} to={playerRoute} inherit>
                      {result.playerName}
                      {result.playerNameArcade ? ` (${result.playerNameArcade})` : null}
                    </Anchor>
                  ) : (
                    `${result.playerName}${
                      result.playerNameArcade ? ` (${result.playerNameArcade})` : ''
                    }`
                  ),
                },
                !!result.exp && {
                  label: (
                    <Text span inherit fw={700}>
                      {lang.EXP}:
                    </Text>
                  ),
                  value: (
                    <Text span inherit fw={700} bg="var(--pk-surface-2)" px="xxs">
                      +{result.exp}
                    </Text>
                  ),
                },
                !!result.pp && {
                  label: (
                    <Text span inherit fw={700}>
                      {lang.PP}:
                    </Text>
                  ),
                  value: (
                    <Text span inherit fw={700} bg="var(--pk-surface-2)" px="xxs">
                      {result.pp}pp
                    </Text>
                  ),
                },
                result.isExactGainedDate &&
                  !!result.mods && { label: `${lang.MODS}:`, value: result.mods },
                result.isExactGainedDate &&
                  result.combo != null && {
                    label: `${lang.COMBO}:`,
                    value: result.combo,
                    hiddenFrom: 'md',
                  },
              ]}
            />

            {!result.isExactGainedDate && (
              <Alert
                mt="xs"
                lh="xs"
                color="yellow"
                py="xxs"
                px="xs"
                icon={<FaExclamationTriangle />}
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
                variant="default"
                fullWidth
                component={Link}
                to={routes.admin.results.getPath({ id: result.id })}
              >
                Open in admin
              </Button>
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
          </Popover.Dropdown>
        </Popover>
      </Table.Td>
      <Table.Td className={css.grade}>
        <Center>
          <Grade w="auto" h="1rem" score={result.score} isPass={result.passed ?? false} />
        </Center>
      </Table.Td>
      {stepColumns.map(({ index, className }) => (
        <Table.Td key={index} className={`${css.number} ${className}`} ta="right">
          {result.stats[index]}
        </Table.Td>
      ))}
      <Table.Td className={css.combo} visibleFrom="md" ta="right" fz="sm">
        {result.combo != null && `${result.combo}x`}
      </Table.Td>
      <Table.Td className={css.date} ta="right">
        <Tooltip label={tooltipFormatter(lang, result)}>
          <UnstyledButton className={css.dateButton}>
            {getShortTimeAgo(lang, new Date(result.gained))}
            {result.isExactGainedDate ? '' : '?'}
          </UnstyledButton>
        </Tooltip>
      </Table.Td>
    </Table.Tr>
  );
};

export default Result;
