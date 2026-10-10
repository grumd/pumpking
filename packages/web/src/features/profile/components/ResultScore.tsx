import { Text } from '@mantine/core';

import { Grade } from 'components/Grade/Grade';

import css from './result-row.module.css';

// The score, then the grade (from the Phoenix score) with the plate: a column each on wide
// screens, stacked on phones. The list's grid has a column for each on wide screens
export const ResultScore = ({
  score,
  scorePhoenix,
  plate,
  isPass,
}: {
  score: number | null;
  scorePhoenix: number | null;
  plate: string | null;
  isPass: boolean;
}): JSX.Element => (
  <div className={css.scoreCell}>
    <Text className={css.score}>{score?.toLocaleString('en-US')}</Text>
    <div className={css.grade}>
      {scorePhoenix != null && <Grade h="1em" w="auto" score={scorePhoenix} isPass={isPass} />}
      <Text fz="xs" fw="bold" c="dark.1">
        {plate}
      </Text>
    </div>
  </div>
);
