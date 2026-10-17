import { useParams } from 'react-router';

import { KeyValueList } from 'components/KeyValueList/KeyValueList';

import { useLanguage } from 'utils/context/translation';

import { useGradesGraphData } from '../hooks/usePlayerGrades';
import { GraphLegend } from './GraphLegend';
import { LevelBarsGraph } from './LevelBarsGraph';
import { SeriesLabel } from './SeriesLabel';

const types = ['S', 'D'] as const;

const typeColor = (type: (typeof types)[number]) =>
  type === 'S' ? 'var(--mantine-color-single-filled)' : 'var(--mantine-color-double-filled)';

const DoubleSingleGraph = () => {
  const params = useParams();
  const lang = useLanguage();
  const graphData = useGradesGraphData({
    playerId: params.id ? Number(params.id) : undefined,
  });

  if (!graphData) {
    return null;
  }

  type Root = (typeof graphData)[number];

  // Singles above the zero line, doubles under it
  const getTypePercent = (root: Root, type: (typeof types)[number]) =>
    ((type === 'D' ? -100 : 100) * (root.byType[type] ?? 0)) / (root.totalChartsByType[type] ?? 1);

  const typeItem = (root: Root, type: (typeof types)[number], label: string) => {
    const total = root.totalChartsByType[type] ?? 0;
    return (
      total > 0 && {
        label: <SeriesLabel color={typeColor(type)}>{label}</SeriesLabel>,
        value: `${Math.abs(getTypePercent(root, type)).toFixed(1)}% (${
          root.byType[type] ?? 0
        }/${total})`,
      }
    );
  };

  return (
    <>
      <LevelBarsGraph
        data={graphData}
        keys={types}
        value={getTypePercent}
        color={typeColor}
        aspect={1.9}
        renderTooltip={(root) => (
          <KeyValueList
            items={[
              { label: lang.LEVEL, value: root.level },
              typeItem(root, 'S', lang.SINGLES),
              typeItem(root, 'D', lang.DOUBLES),
            ]}
          />
        )}
      />
      <GraphLegend
        items={[
          { label: lang.SINGLES, color: typeColor('S') },
          { label: lang.DOUBLES, color: typeColor('D') },
        ]}
      />
    </>
  );
};

export default DoubleSingleGraph;
