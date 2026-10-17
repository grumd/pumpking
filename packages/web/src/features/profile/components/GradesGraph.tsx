import { useParams } from 'react-router';
import { gradeColorVar } from 'theme/tokens';

import { KeyValueList } from 'components/KeyValueList/KeyValueList';

import { useLanguage } from 'utils/context/translation';
import { GradePhoenix } from 'utils/scoring/grades';

import { useGradesGraphData } from '../hooks/usePlayerGrades';
import { GraphLegend } from './GraphLegend';
import { LevelBarsGraph } from './LevelBarsGraph';
import { SeriesLabel } from './SeriesLabel';

const grades = Object.values(GradePhoenix);

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

  const getGradePercent = (root: Root, grade: string) =>
    (100 * (root.byGrade[grade] ?? 0)) / root.totalPlayedCharts;

  return (
    <>
      <LevelBarsGraph
        data={graphData}
        keys={grades}
        value={getGradePercent}
        color={gradeColorVar}
        aspect={1.9}
        yDomain={[0, 100]}
        yTicks={[0, 50, 100]}
        renderTooltip={(root) => (
          <KeyValueList
            items={[
              { label: lang.LEVEL, value: root.level },
              ...grades
                .filter((grade) => root.byGrade[grade])
                .map((grade) => ({
                  label: <SeriesLabel color={gradeColorVar(grade)}>{grade}</SeriesLabel>,
                  value: `${getGradePercent(root, grade).toFixed(1)}% (${root.byGrade[grade]})`,
                })),
            ]}
          />
        )}
      />
      <GraphLegend items={grades.map((grade) => ({ label: grade, color: gradeColorVar(grade) }))} />
    </>
  );
};

export default GradesGraph;
