import { SimpleGrid, Stack, Text, rem } from '@mantine/core';
import { useMemo } from 'react';
import { useParams } from 'react-router';

import { Card } from 'components/Card/Card';
import { Grade } from 'components/Grade/Grade';

import { useLanguage } from 'utils/context/translation';
import { GradePhoenix } from 'utils/scoring/grades';

import { useGradesGraphData } from '../../hooks/usePlayerGrades';
import { CardWithProgress } from '../CardWithProgress/CardWithProgress';

interface DataRecord {
  level: number | null;
  achieved: number;
  required: number;
  weight: number;
}

const types = ['S', 'D'] as const;
type Types = (typeof types)[number];
const grades = ['SSS', 'SS', 'S', 'AAA'] as const;
type Grades = (typeof grades)[number];

const gradeHeight = rem(36);

export const LevelAchievements = (): JSX.Element | null => {
  const params = useParams();
  const graphData = useGradesGraphData({
    playerId: params.id ? Number(params.id) : undefined,
  });
  const lang = useLanguage();

  const levelAchievements = useMemo(() => {
    if (!graphData) {
      return null;
    }

    const defaultRecord: DataRecord = {
      level: null,
      achieved: 0,
      required: 0,
      weight: 0,
    };
    const record: Record<Types, Partial<Record<Grades, DataRecord>>> = {
      S: {
        [GradePhoenix.SSS]: defaultRecord,
        [GradePhoenix.SS]: defaultRecord,
        [GradePhoenix.S]: defaultRecord,
        [GradePhoenix.AAA]: defaultRecord,
      },
      D: {
        [GradePhoenix.SSS]: defaultRecord,
        [GradePhoenix.SS]: defaultRecord,
        [GradePhoenix.S]: defaultRecord,
        [GradePhoenix.AAA]: defaultRecord,
      },
    };

    graphData.forEach((data) => {
      const { level, byTypeGrade, totalChartsByType } = data;
      if (level == null) {
        return;
      }

      const maxWeight = (30 * (1 + 2 ** (level / 4))) / 11;

      for (const type of types) {
        const totalCharts = totalChartsByType[type];
        const required = Math.round(
          Math.min(
            totalCharts,
            1 + totalCharts / 20 + Math.sqrt(Math.max(totalCharts - 1, 0)) * 0.7
          )
        );

        for (const grade of grades) {
          const achieved = byTypeGrade[`${type}-${grade}`] ?? 0;
          const weight = Math.min(1, achieved / required) * maxWeight;
          if (weight > (record[type][grade]?.weight ?? 0)) {
            record[type][grade] = { level, achieved, required, weight };
          }
        }
      }
    });

    return record;
  }, [graphData]);

  if (!levelAchievements) {
    return null;
  }

  return (
    <Card title={lang.LEVEL_ACHIEVEMENTS}>
      <SimpleGrid cols={{ base: 4, sm: 8 }} spacing="xs">
        {types.flatMap((type) => {
          const typeData = levelAchievements[type];
          return grades.map((grade) => {
            const data = typeData[grade];
            if (data?.level == null) {
              return (
                <CardWithProgress key={`${type}-${grade}`} progress={0}>
                  <Grade h={gradeHeight} grade={grade} isPass />
                </CardWithProgress>
              );
            }
            return (
              <CardWithProgress
                key={`${type}-${grade}`}
                px={0}
                progress={Math.min(100, Math.round((100 * data.achieved) / data.required))}
              >
                <Stack gap="xxs" align="center">
                  <Grade h={gradeHeight} grade={grade} isPass />
                  <Text fz="xxl" lh="xs" fw="bold" c={type === 'D' ? 'green.2' : 'red.2'}>
                    {type}
                    {data.level}
                  </Text>
                  <Text fz="xs">
                    {Math.round((data.achieved / data.required) * 100)}% ({data.achieved}/
                    {data.required})
                  </Text>
                </Stack>
              </CardWithProgress>
            );
          });
        })}
      </SimpleGrid>
      <Text pt="xs" ta="right" fz="sm" c="dimmed">
        {lang.LEVEL_ACHIEVEMENTS_HINT}
      </Text>
    </Card>
  );
};
