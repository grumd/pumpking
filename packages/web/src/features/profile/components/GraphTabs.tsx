import { Tabs } from '@mantine/core';
import { upperFirst } from '@mantine/hooks';
import { useState } from 'react';

import { Card } from 'components/Card/Card';

import { useLanguage } from 'utils/context/translation';

import { GradeGraphsCard } from './GradeGraphsCard';
import { PpHistoryGraph } from './PpHistoryGraph';
import { PpRankHistoryGraph } from './PpRankHistoryGraph';
import tabsCss from './profile-tabs.module.css';

// The PP and place graphs; on phones also the grades, which otherwise have their own column
export const GraphTabs = ({ withGrades }: { withGrades: boolean }): JSX.Element => {
  const lang = useLanguage();
  const [tab, setTab] = useState<string | null>('pp');
  // The grades tab goes away when the window gets wider
  const value = tab === 'grades' && !withGrades ? 'pp' : tab;

  return (
    <Card p="xs">
      {/* keepMounted={false}: a graph in a hidden panel would be drawn at zero size */}
      <Tabs
        variant="pills"
        value={value}
        onChange={setTab}
        keepMounted={false}
        classNames={{ tab: tabsCss.tab }}
      >
        <Tabs.List mb="xs">
          <Tabs.Tab value="pp">{lang.PP_GRAPH}</Tabs.Tab>
          <Tabs.Tab value="place">{lang.PLACE_GRAPH}</Tabs.Tab>
          {withGrades && <Tabs.Tab value="grades">{upperFirst(lang.GRADES)}</Tabs.Tab>}
        </Tabs.List>
        <Tabs.Panel value="pp">
          <PpHistoryGraph />
        </Tabs.Panel>
        <Tabs.Panel value="place">
          <PpRankHistoryGraph />
        </Tabs.Panel>
        {withGrades && (
          <Tabs.Panel value="grades">
            <GradeGraphsCard />
          </Tabs.Panel>
        )}
      </Tabs>
    </Card>
  );
};
