import { Stack } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';

import css from './profile.module.scss';

import { ExpCard } from './components/Exp/ExpCard';
import { GradeGraphsCard } from './components/GradeGraphsCard';
import { GraphTabs } from './components/GraphTabs';
import { ProfileHeader } from './components/ProfileHeader';
import { ResultsTabs } from './components/ResultsTabs/ResultsTabs';
import { TournamentCups } from './components/TournamentCups';

// The same width as the one-column layout in profile.module.scss
const narrowQuery = '(max-width: 600px)';

const Profile = () => {
  const isNarrow = useMediaQuery(narrowQuery, window.matchMedia(narrowQuery).matches, {
    getInitialValueInEffect: false,
  });
  return (
    <div className={css.profile}>
      <Stack gap="xs">
        <ProfileHeader />
        <div className={css.top}>
          <Stack gap="xs">
            <ExpCard />
            <GraphTabs withGrades={isNarrow} />
          </Stack>
          {/* On phones the grades are a tab of the graphs instead */}
          {!isNarrow && <GradeGraphsCard />}
        </div>
        <TournamentCups />
        <ResultsTabs />
      </Stack>
    </div>
  );
};

export default Profile;
