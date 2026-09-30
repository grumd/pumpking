import { Container, Stack, Tabs } from '@mantine/core';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';

import { routes } from 'constants/routes';

import { useLanguage } from 'utils/context/translation';

import { FilesTab } from './files/FilesTab';

// The admin section: one tab per area of the legacy admin desktop tool, added as they're
// ported. Only admins get this page (see Root); the API checks is_admin on every call
const Admin = (): JSX.Element => {
  const lang = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  const tabs = [{ path: routes.admin.files.path, label: lang.ADMIN_FILES }];
  const activeTab = tabs.find((tab) => location.pathname.startsWith(tab.path));

  return (
    <Container component="main" size="lg" p="sm" w="100%">
      <Stack gap="md">
        <Tabs value={activeTab?.path ?? null} onChange={(path) => path && navigate(path)}>
          <Tabs.List>
            {tabs.map((tab) => (
              <Tabs.Tab key={tab.path} value={tab.path}>
                {tab.label}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs>
        <Routes>
          <Route index element={<Navigate to={routes.admin.files.path} replace />} />
          <Route path="files" element={<FilesTab />} />
          <Route path="*" element={<Navigate to={routes.admin.path} replace />} />
        </Routes>
      </Stack>
    </Container>
  );
};

export default Admin;
