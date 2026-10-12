import { Badge, Group, Tabs } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';

import { PageContainer } from 'components/PageContainer/PageContainer';

import { routes } from 'constants/routes';

import { api } from 'utils/trpc';

import { ActivityDrawer } from './activity/ActivityDrawer';
import { AgentsTab } from './agents/AgentsTab';
import { PlayersTab } from './players/PlayersTab';
import { PurgatoryTab } from './purgatory/PurgatoryTab';
import { ResultsTab } from './results/ResultsTab';
import { TracksTab } from './tracks/TracksTab';

// The admin section: what the legacy desktop admin tool did, one tab per area. Only
// admins get this page (see Root); the API checks is_admin on every call. Each tab keeps
// its search and open row in the URL
const Admin = (): JSX.Element => {
  const location = useLocation();
  const navigate = useNavigate();
  const purgatory = useQuery(api.admin.purgatory.list.queryOptions());

  const tabs = [
    {
      path: routes.admin.purgatory.path,
      label: 'Purgatory',
      badge: purgatory.data?.length ? purgatory.data.length : null,
    },
    { path: routes.admin.results.path, label: 'Results' },
    { path: routes.admin.players.path, label: 'Players' },
    { path: routes.admin.tracks.path, label: 'Tracks' },
    { path: routes.admin.agents.path, label: 'Agents' },
  ];
  const activeTab = tabs.find((tab) => location.pathname.startsWith(tab.path));

  return (
    <PageContainer width="wide">
      <Tabs value={activeTab?.path ?? null} onChange={(path) => path && navigate(path)}>
        <Tabs.List>
          {tabs.map((tab) => (
            <Tabs.Tab
              key={tab.path}
              value={tab.path}
              rightSection={
                tab.badge ? (
                  <Badge size="sm" color="red" circle={tab.badge < 10}>
                    {tab.badge}
                  </Badge>
                ) : undefined
              }
            >
              {tab.label}
            </Tabs.Tab>
          ))}
          <Group ml="auto" pb="xxs">
            <ActivityDrawer />
          </Group>
        </Tabs.List>
      </Tabs>
      <Routes>
        <Route index element={<Navigate to={routes.admin.purgatory.path} replace />} />
        <Route path="purgatory/:id?" element={<PurgatoryTab />} />
        <Route path="results/:id?" element={<ResultsTab />} />
        <Route path="players/:id?" element={<PlayersTab />} />
        <Route path="tracks/:id?" element={<TracksTab />} />
        <Route path="agents" element={<AgentsTab />} />
        <Route path="*" element={<Navigate to={routes.admin.path} replace />} />
      </Routes>
    </PageContainer>
  );
};

export default Admin;
