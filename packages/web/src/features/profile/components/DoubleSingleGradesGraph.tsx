import { Stack, Text } from '@mantine/core';
import { useParams } from 'react-router';
import { gradeColorVar } from 'theme/tokens';

import { KeyValueList } from 'components/KeyValueList/KeyValueList';

import { useLanguage } from 'utils/context/translation';
import { GradePhoenix } from 'utils/scoring/grades';

import { useGradesGraphData } from '../hooks/usePlayerGrades';
import { LevelBarsGraph } from './LevelBarsGraph';
import { SeriesLabel } from './SeriesLabel';

type ChartType = 'S' | 'D';

const grades = Object.values(GradePhoenix);

// Singles' grades above the zero line, then doubles' under it, the best grade nearest to it
const gradeKeys = (['S', 'D'] as const).flatMap((type) =>
  grades.map((grade) => `${type}-${grade}` as const)
);

const keyType = (key: (typeof gradeKeys)[number]) => key.slice(0, 1) as ChartType;
const keyGrade = (key: (typeof gradeKeys)[number]) => key.slice(2) as GradePhoenix;

const GradesGraph = () => {
  const params = useParams();
  const lang = useLanguage();
  const graphData = useGradesGraphData({
    playerId: params.id ? Number(params.id) : undefined,
  });

  if (!graphData) {
    return null;
  }

  type Root = (typeof graphData)[number];

  const getPercent = (root: Root, key: (typeof gradeKeys)[number]) => {
    const type = keyType(key);
    return ((type === 'D' ? -100 : 100) * (root.byTypeGrade[key] ?? 0)) / root.totalChartsByType[type];
  };

  const renderTooltip = (root: Root) => {
    const gradeItems = (type: ChartType) =>
      gradeKeys
        .filter((key) => keyType(key) === type && root.byTypeGrade[key])
        .map((key) => {
          const grade = keyGrade(key);
          return {
            label: <SeriesLabel color={gradeColorVar(grade)}>{grade}</SeriesLabel>,
            value: `${Math.abs(getPercent(root, key)).toFixed(1)}% (${root.byTypeGrade[key]})`,
          };
        });
    const singleItems = gradeItems('S');
    const doubleItems = gradeItems('D');

    return (
      <Stack gap="xxs">
        <KeyValueList items={[{ label: lang.LEVEL, value: root.level }]} />
        {!!singleItems.length && (
          <>
            <Text size="sm">
              {lang.SINGLES} ({lang.TOTAL} {root.totalChartsByType.S})
            </Text>
            <KeyValueList items={singleItems} />
          </>
        )}
        {!!doubleItems.length && (
          <>
            <Text size="sm">
              {lang.DOUBLES} ({lang.TOTAL} {root.totalChartsByType.D})
            </Text>
            <KeyValueList items={doubleItems} />
          </>
        )}
      </Stack>
    );
  };

  return (
    <LevelBarsGraph
      data={graphData}
      keys={gradeKeys}
      value={getPercent}
      color={(key) => gradeColorVar(keyGrade(key))}
      aspect={1.15}
      labels={{ above: lang.SINGLES, below: lang.DOUBLES }}
      renderTooltip={renderTooltip}
    />
  );
};

export default GradesGraph;
