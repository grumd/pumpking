import {
  Alert,
  Anchor,
  Badge,
  Button,
  Center,
  Group,
  type MantineSize,
  Popover,
  Stack,
  Table,
  Text,
  Tooltip,
  UnstyledButton,
  rem,
} from '@mantine/core';
import { useAtomValue } from 'jotai';
import {
  FaAngleDoubleDown,
  FaAngleDoubleUp,
  FaExclamationTriangle,
  FaTrash,
  FaTrophy,
} from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { mixColor } from 'theme/tokens';

import { ChartLabel } from 'components/ChartLabel/ChartLabel';
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
import { Mixes, isMixNumber } from 'utils/scoring/grades';
import { getShortTimeAgo } from 'utils/timeAgo';

import type { ChartApiOutput } from '../../hooks/useChartsQuery';
import css from './chart-results.module.css';
import type { RowSizes } from './useRowSizes';

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
  placesLost: number;
  isLatestScore: boolean;
  isCollapsible: boolean;
};

const DEBUG = import.meta.env.VITE_DEBUG_RESULTS === 'true';

// A score with its last three digits smaller: 1,000,000
const Score = ({ score, fractionFz = 'xs' }: { score: number; fractionFz?: MantineSize }) => {
  return (
    <>
      {Math.floor(score / 1000).toLocaleString('en-US')}
      <Text span fz={fractionFz}>
        ,{`${score % 1000}`.padStart(3, '0')}
      </Text>
    </>
  );
};

// Places gained by the latest result (green), or lost to it (red)
const PlaceChange = ({
  result,
  fz,
  hiddenFrom,
}: {
  result: ResultExtended;
  fz: MantineSize;
  hiddenFrom?: 'md';
}) => {
  if (result.placeDifference > 0) {
    return (
      <Text span c="fresh" fz={fz} fw={700} className={css.change} hiddenFrom={hiddenFrom}>
        <FaAngleDoubleUp size={rem(11)} />
        {result.placeDifference}
      </Text>
    );
  }
  if (result.placesLost > 0) {
    return (
      <Text span c="dropped" fz={fz} fw={700} className={css.change} hiddenFrom={hiddenFrom}>
        <FaAngleDoubleDown size={rem(11)} />
        {result.placesLost}
      </Text>
    );
  }
  return null;
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

const Result = ({
  result,
  chart,
  sizes,
}: {
  result: ResultExtended;
  chart: ChartApiOutput;
  sizes: RowSizes;
}) => {
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

  // The chart on the result's mix, when it's an earlier mix than the chart's latest
  const originalChart = chart.otherChartInstances.find((instance) => instance.mix === result.mix);

  const playerRoute =
    result.playerId == null ? null : routes.profile.getPath({ id: result.playerId });

  const place = chart.results.findIndex((res) => res.id === result.id) + 1;

  // On the latest result: the player's first score here, or how much they improved
  const scoreChange = !result.isLatestScore
    ? null
    : result.scoreIncrease == null
    ? lang.NEW_SCORE
    : result.scoreIncrease > 0
    ? `+${result.scoreIncrease}`
    : null;

  return (
    <Table.Tr
      key={result.id}
      className={css.row}
      data-latest={result.isLatestScore || undefined}
      data-mine={isCurrentPlayer || undefined}
      data-highlighted={isHighlighted || undefined}
      // Read by the module only on highlighted rows
      style={{ '--pk-highlight': `var(--pk-highlight-${result.highlightIndex})` }}
    >
      <Table.Td visibleFrom="md">
        <Group gap="xxs" wrap="nowrap">
          <Place place={place} />
          <PlaceChange result={result} fz={sizes.change} />
        </Group>
      </Table.Td>
      <Table.Td className={css.name} fz={sizes.name}>
        <Group gap="xxs" align="center" wrap="nowrap">
          {result.region ? <Flag region={result.region} size="sm" /> : null}
          <Text inherit flex="0 1 auto" miw={0} truncate>
            {playerRoute ? (
              <Anchor component={Link} to={playerRoute} inherit>
                {result.playerName}
              </Anchor>
            ) : (
              <span>{result.playerName}</span>
            )}
          </Text>
          {/* Phones have no place column */}
          <PlaceChange result={result} fz={sizes.change} hiddenFrom="md" />
          {(DEBUG || (isSortedByPp && isHighlighted)) && (
            <span> {result.pp && `${result.pp}pp`}</span>
          )}
          <Group gap="xxs" ml="auto" wrap="nowrap" flex="none">
            {result.countsForTournament && (
              <Tooltip label={lang.TOURNAMENT_RESULT}>
                <UnstyledButton display="flex" aria-label={lang.TOURNAMENT_RESULT}>
                  <Badge color="gold" size={sizes.badge}>
                    <FaTrophy />
                  </Badge>
                </UnstyledButton>
              </Tooltip>
            )}
            {result.mods?.includes('HJ') && (
              <Badge color="orange" variant="light" size={sizes.badge}>
                HJ
              </Badge>
            )}
            {result.mods?.includes('VJ') && (
              <Badge color="red" size={sizes.badge}>
                R
              </Badge>
            )}
          </Group>
        </Group>
      </Table.Td>
      <Table.Td className={css.score} fz={sizes.score} data-fit>
        <Group gap="xxs" justify="flex-end" wrap="nowrap" className={css.scoreGroup}>
          {scoreChange && (
            <Badge color="fresh" variant="light" size="sm" flex="none" visibleFrom="sm">
              {scoreChange}
            </Badge>
          )}
          {/* As wide as the longest row, the notes below wrap */}
          <Popover withArrow width="min-content" position="top" trapFocus>
            <Popover.Target>
              <UnstyledButton className={css.scoreButton}>
                <Score score={result.score} fractionFz={sizes.scoreFraction} />
              </UnstyledButton>
            </Popover.Target>
            <Popover.Dropdown p="sm" miw={rem(250)}>
              <ResultScreenshotLink resultId={result.id} />

              <KeyValueList
                noWrap
                items={[
                  originalChart &&
                    isMixNumber(originalChart.mix) && {
                      label: lang.ORIGINAL_CHART,
                      value: (
                        <Group gap="xxs" wrap="nowrap">
                          <Badge size="sm" color={mixColor(originalChart.mix)}>
                            {Mixes[originalChart.mix]}
                          </Badge>
                          <ChartLabel label={originalChart.label} />
                        </Group>
                      ),
                    },
                  DEBUG && { label: 'result id:', value: result.id },
                  DEBUG && { label: 'player id:', value: result.playerId },
                  result.originalScore != null &&
                    result.originalScore !== result.score && {
                      label: lang.ORIGINAL_SCORE,
                      value: <Score score={result.originalScore} />,
                    },
                  !!originalChart &&
                    result.grade != null && { label: lang.ORIGINAL_GRADE, value: result.grade },
                  result.isExactGainedDate &&
                    result.combo != null && {
                      label: `${lang.MAX_COMBO}:`,
                      value: `${result.combo}x`,
                      hiddenFrom: 'md',
                    },
                  !!result.playerNameArcade && {
                    label: `${lang.AM_PASS}:`,
                    value: result.playerNameArcade,
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
        </Group>
      </Table.Td>
      <Table.Td className={css.grade} data-fit>
        <Center>
          <Grade w="auto" h={sizes.grade} score={result.score} isPass={result.passed ?? false} />
        </Center>
      </Table.Td>
      {stepColumns.map(({ index, className }) => (
        <Table.Td
          key={index}
          className={`${css.number} ${className}`}
          data-fit
          ta="right"
          data-zero={result.stats[index] === 0 || undefined}
        >
          {result.stats[index]}
        </Table.Td>
      ))}
      <Table.Td visibleFrom="md" ta="right" fz="sm">
        {result.combo != null && `${result.combo}x`}
      </Table.Td>
      <Table.Td className={css.date} ta="right" fz={sizes.date} data-fit>
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
