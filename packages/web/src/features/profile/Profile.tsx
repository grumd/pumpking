import { ActionIcon, Group, Stack } from '@mantine/core';
import { FaQuestionCircle } from 'react-icons/fa';

import css from './profile.module.scss';

import { Card } from 'components/Card/Card';
import { ModalTrigger } from 'components/ModalTrigger/ModalTrigger';

import { useLanguage } from 'utils/context/translation';

import { Achievements } from './components/Achievements/Achievements';
import { ExpFaq } from './components/Exp/ExpFaq';
import { ExpProgress } from './components/Exp/ExpProgress';
import { GradeGraphsCard } from './components/GradeGraphsCard';
import { LevelAchievements } from './components/LevelAchievements/LevelAchievements';
import { MostPlayedCharts } from './components/MostPlayedCharts/MostPlayedCharts';
import { PpHistoryGraph } from './components/PpHistoryGraph';
import { PpRankHistoryGraph } from './components/PpRankHistoryGraph';
import { ProfileHeader } from './components/ProfileHeader';

const Profile = () => {
  const lang = useLanguage();
  return (
    <div className={css.profile}>
      <ProfileHeader />
      <Stack gap="xs">
        <Card
          title={lang.EXP}
          headerNode={
            <ModalTrigger
              title={lang.EXP_FAQ_TITLE}
              w="40em"
              renderButton={({ open }) => (
                <ActionIcon variant="subtle" aria-label="Exp FAQ" onClick={open}>
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
        <Group grow gap="xs" align="stretch">
          <GradeGraphsCard />
          <Stack gap="xs" justify="stretch">
            <Card flex="1 1 0">
              <PpHistoryGraph />
            </Card>
            <Card flex="1 1 0">
              <PpRankHistoryGraph />
            </Card>
          </Stack>
        </Group>
        <LevelAchievements />
        <Achievements />
        <MostPlayedCharts />
      </Stack>
    </div>
  );
};

export default Profile;
