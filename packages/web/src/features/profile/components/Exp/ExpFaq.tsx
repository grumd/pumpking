import { Divider, SimpleGrid, Stack, Text } from '@mantine/core';

import { ExpRankImg } from 'components/ExpRankImg/ExpRankImg';
import { ranks } from 'components/ExpRankImg/expRanks';

import { useLanguage } from 'utils/context/translation';

export const ExpFaq = () => {
  const lang = useLanguage();
  return (
    <article>
      <Text>{lang.EXP_FAQ}</Text>
      <Divider my="0.5em" />
      <Text>{lang.EXP_TITLES_LIST_HEADER}</Text>
      <Divider my="0.5em" />
      <SimpleGrid cols={9}>
        {ranks.map((rank, index) => (
          <Stack align="center" key={rank.threshold} gap="0.25em">
            <div style={{ width: '3em' }}>
              <ExpRankImg rankIndex={index} />
            </div>
            <Text size="xs">{rank.threshold}</Text>
          </Stack>
        ))}
      </SimpleGrid>
    </article>
  );
};
