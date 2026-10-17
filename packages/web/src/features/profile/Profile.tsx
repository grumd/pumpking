import { ActionIcon, SimpleGrid, Stack } from '@mantine/core';
import { FaQuestionCircle } from 'react-icons/fa';

import { Card } from 'components/Card/Card';
import { ModalTrigger } from 'components/ModalTrigger/ModalTrigger';
import { PageContainer } from 'components/PageContainer/PageContainer';

import { useLanguage } from 'utils/context/translation';

import { Achievements } from './components/Achievements/Achievements';
import { ChartLists } from './components/ChartLists/ChartLists';
import { ExpFaq } from './components/Exp/ExpFaq';
import { ExpProgress } from './components/Exp/ExpProgress';
import { GradeGraphsCard } from './components/GradeGraphsCard';
import { LevelAchievements } from './components/LevelAchievements/LevelAchievements';
import { PpAndRankHistoryGraph } from './components/PpAndRankHistoryGraph';
import { ProfileHeader } from './components/ProfileHeader';
import { TournamentCups } from './components/TournamentCups';

const Profile = () => {
  const lang = useLanguage();
  return (
    <PageContainer>
      <ProfileHeader />
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
        <Stack gap="sm">
          <Card
            title={lang.EXP}
            actions={
              <ModalTrigger
                title={lang.EXP_FAQ_TITLE}
                size="lg"
                renderButton={({ open }) => (
                  <ActionIcon aria-label={lang.EXP_FAQ_TITLE} onClick={open}>
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
          <Card title={lang.PP_AND_RANK_HISTORY}>
            <PpAndRankHistoryGraph />
          </Card>
        </Stack>
        <GradeGraphsCard />
      </SimpleGrid>
      <TournamentCups />
      <LevelAchievements />
      <Achievements />
      <ChartLists />
    </PageContainer>
  );
};

export default Profile;
