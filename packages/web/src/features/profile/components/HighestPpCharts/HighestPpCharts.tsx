import { Button, SimpleGrid, Text, Tooltip } from '@mantine/core';
import { useInfiniteQuery } from '@tanstack/react-query';
import { MdExpandMore } from 'react-icons/md';
import { useParams } from 'react-router';

import { Card } from 'components/Card/Card';
import Loader from 'components/Loader/Loader';

import { useLanguage } from 'utils/context/translation';
import { api } from 'utils/trpc';

import { bestScoresInput, pageOptions } from '../../hooks/profileTabQueries';
import { ResultChartLabel } from '../ResultChartLabel';
import { ResultName } from '../ResultName';
import { ResultScore } from '../ResultScore';
import css from '../result-row.module.css';

export const HighestPpCharts = (): JSX.Element => {
  const params = useParams();
  const charts = useInfiniteQuery(
    api.players.highestPpCharts.infiniteQueryOptions(
      bestScoresInput(params.id ? Number(params.id) : undefined),
      pageOptions
    )
  );
  const lang = useLanguage();

  return (
    <>
      <SimpleGrid spacing="xs" className={css.grid}>
        {charts.data?.pages.flatMap((page) =>
          page.items.map((item) => {
            const date = new Date(item.date);
            const daysAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));

            const dateColor =
              daysAgo < 30
                ? 'green'
                : `rgba(255, 255, 255, ${Math.min(1, Math.max(0.2, 1 - (daysAgo - 30) / 360))})`;
            return (
              <Card key={item.shared_chart} fz="md" p="0.5em" level={2} className={css.row}>
                <ResultChartLabel label={item.label} mix={item.mix} labelMix={item.label_mix} />
                <ResultName
                  sharedChartId={item.shared_chart}
                  name={item.full_name}
                  date={date}
                  dateColor={dateColor}
                />
                <ResultScore
                  score={item.score_phoenix}
                  scorePhoenix={item.score_phoenix}
                  plate={item.plate}
                  isPass={item.is_pass}
                />
                {/* What this result adds to the player's pp after weighting */}
                <Tooltip
                  label={`${item.pp.toFixed(2)} × ${Math.round(item.weight * 100)}% = ${(
                    item.pp * item.weight
                  ).toFixed(2)}`}
                  events={{ hover: true, focus: false, touch: true }}
                >
                  <Text pl="0.5em" fw="bold" ta="right">
                    {item.pp?.toFixed(2)}
                    <Text span c="dark.2" className={css.ppUnit}>
                      {' '}
                      pp
                    </Text>
                  </Text>
                </Tooltip>
              </Card>
            );
          })
        )}
      </SimpleGrid>
      {charts.isFetchingNextPage ? (
        <Loader />
      ) : (
        <Button
          leftSection={<MdExpandMore />}
          mt="xs"
          color="dark.4"
          onClick={() => charts.fetchNextPage()}
        >
          {lang.SHOW_MORE}
        </Button>
      )}
    </>
  );
};
