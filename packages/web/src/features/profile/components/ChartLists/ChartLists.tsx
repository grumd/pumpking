import { Tabs } from '@mantine/core';

import { Card } from 'components/Card/Card';

import { useLanguage } from 'utils/context/translation';

import { BestScores } from './BestScores';
import { MostPlayedCharts } from './MostPlayedCharts';
import { PpBreakdown } from './PpBreakdown';

// The player's charts: best scores, what makes up the total pp, most played
export const ChartLists = (): JSX.Element => {
  const lang = useLanguage();

  return (
    <Card>
      {/* Only the open tab is mounted, so only its list is loaded */}
      <Tabs variant="pills" defaultValue="best" keepMounted={false}>
        <Tabs.List mb="xs">
          <Tabs.Tab value="best">{lang.BEST_SCORES}</Tabs.Tab>
          <Tabs.Tab value="breakdown">{lang.PP_BREAKDOWN}</Tabs.Tab>
          <Tabs.Tab value="played">{lang.MOST_PLAYED_CHARTS}</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="best">
          <BestScores />
        </Tabs.Panel>
        <Tabs.Panel value="breakdown">
          <PpBreakdown />
        </Tabs.Panel>
        <Tabs.Panel value="played">
          <MostPlayedCharts />
        </Tabs.Panel>
      </Tabs>
    </Card>
  );
};
