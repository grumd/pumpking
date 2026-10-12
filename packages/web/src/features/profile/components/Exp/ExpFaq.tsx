import { Box, Divider, SimpleGrid, Stack, Text, rem } from '@mantine/core';

import { ExpRankImg } from 'components/ExpRankImg/ExpRankImg';
import { ranks } from 'components/ExpRankImg/expRanks';

import { useLanguage } from 'utils/context/translation';

export const ExpFaq = () => {
  const lang = useLanguage();
  return (
    <article>
      <Text>{lang.EXP_FAQ}</Text>
      <Divider my="xs" />
      <Text>{lang.EXP_TITLES_LIST_HEADER}</Text>
      <Divider my="xs" />
      <SimpleGrid cols={{ base: 3, xs: 5, sm: 9 }} spacing="xs">
        {ranks.map((rank, index) => (
          <Stack align="center" key={rank.threshold} gap="xxs">
            <Box w={rem(48)}>
              <ExpRankImg rankIndex={index} />
            </Box>
            <Text size="xs">{rank.threshold}</Text>
          </Stack>
        ))}
      </SimpleGrid>
    </article>
  );
};
