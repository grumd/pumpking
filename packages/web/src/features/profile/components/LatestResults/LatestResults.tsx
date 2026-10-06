import { Button, SimpleGrid, Text } from '@mantine/core';
import { useInfiniteQuery } from '@tanstack/react-query';
import { MdExpandMore } from 'react-icons/md';
import { useParams } from 'react-router';

import { Card } from 'components/Card/Card';
import Loader from 'components/Loader/Loader';

import { useLanguage } from 'utils/context/translation';
import { api } from 'utils/trpc';

import { latestResultsInput, pageOptions } from '../../hooks/profileTabQueries';
import { ResultChartLabel } from '../ResultChartLabel';
import { ResultName } from '../ResultName';
import { ResultScore } from '../ResultScore';
import css from '../result-row.module.css';

export const LatestResults = (): JSX.Element => {
  const params = useParams();
  const results = useInfiniteQuery(
    api.players.latestResults.infiniteQueryOptions(
      latestResultsInput(params.id ? Number(params.id) : undefined),
      pageOptions
    )
  );
  const lang = useLanguage();

  return (
    <>
      <SimpleGrid spacing="xs" className={css.grid}>
        {results.data?.pages.flatMap((page) =>
          page.items.map((item) => (
            <Card key={item.id} fz="md" p="0.5em" level={2} className={css.row}>
              <ResultChartLabel label={item.label} mix={item.mix} labelMix={item.label_mix} />
              <ResultName
                sharedChartId={item.shared_chart}
                name={item.full_name}
                date={new Date(item.date)}
              />
              <ResultScore
                score={item.score}
                scorePhoenix={item.score_phoenix}
                plate={item.plate}
                isPass={item.is_pass}
              />
              <Text pl="0.5em" fw="bold" ta="right">
                {item.pp != null && (
                  <>
                    {item.pp.toFixed(2)}
                    <Text span c="dark.2" className={css.ppUnit}>
                      {' '}
                      pp
                    </Text>
                  </>
                )}
              </Text>
            </Card>
          ))
        )}
      </SimpleGrid>
      {results.isFetchingNextPage ? (
        <Loader />
      ) : (
        <Button
          leftSection={<MdExpandMore />}
          mt="xs"
          color="dark.4"
          onClick={() => results.fetchNextPage()}
        >
          {lang.SHOW_MORE}
        </Button>
      )}
    </>
  );
};
