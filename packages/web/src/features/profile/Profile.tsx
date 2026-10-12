import { ActionIcon, SimpleGrid, Stack } from '@mantine/core';
import { FaQuestionCircle } from 'react-icons/fa';

import { Card } from 'components/Card/Card';
import { ModalTrigger } from 'components/ModalTrigger/ModalTrigger';
import { PageContainer } from 'components/PageContainer/PageContainer';

import { useLanguage } from 'utils/context/translation';

import { Achievements } from './components/Achievements/Achievements';
import { AdminPanel } from './components/AdminPanel/AdminPanel';
import { ExpFaq } from './components/Exp/ExpFaq';
import { ExpProgress } from './components/Exp/ExpProgress';
import { GradeGraphsCard } from './components/GradeGraphsCard';
import { HighestPpCharts } from './components/HighestPpCharts/HighestPpCharts';
import { LevelAchievements } from './components/LevelAchievements/LevelAchievements';
import { MostPlayedCharts } from './components/MostPlayedCharts/MostPlayedCharts';
import { PpHistoryGraph } from './components/PpHistoryGraph';
import { PpRankHistoryGraph } from './components/PpRankHistoryGraph';
import { ProfileHeader } from './components/ProfileHeader';
import { TournamentCups } from './components/TournamentCups';

const Profile = () => {
  const lang = useLanguage();
  return (
    <PageContainer>
      <ProfileHeader />
      <AdminPanel />
      <Card
        title={lang.EXP}
        actions={
          <ModalTrigger
            title={lang.EXP_FAQ_TITLE}
            size="lg"
            renderButton={({ open }) => (
              <ActionIcon variant="subtle" aria-label={lang.EXP_FAQ_TITLE} onClick={open}>
                <FaQuestionCircle />
              </ActionIcon>
            )}
          >
            <ExpFaq />
          </ModalTrigger>
        }
      >
        <ExpProgress />
      </Card>
      <TournamentCups />
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
        <GradeGraphsCard />
        <Stack gap="sm">
          <Card flex={1}>
            <PpHistoryGraph />
          </Card>
          <Card flex={1}>
            <PpRankHistoryGraph />
          </Card>
        </Stack>
      </SimpleGrid>
      <LevelAchievements />
      <Achievements />
      <MostPlayedCharts />
      <HighestPpCharts />
    </PageContainer>
  );
};

export default Profile;
