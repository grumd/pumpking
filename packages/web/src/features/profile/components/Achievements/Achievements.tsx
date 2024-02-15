import { SimpleGrid } from '@mantine/core';
import {
  GiBurningPassion,
  GiLifeBar,
  GiLoveSong,
  GiRank1,
  GiRank2,
  GiRank3,
  GiRetroController,
  GiSmokingFinger,
  GiSnail,
  GiTurd,
  GiWoodenPegleg,
} from 'react-icons/gi';
import { GiAllSeeingEye } from 'react-icons/gi';
import { useParams } from 'react-router';

import { Card } from 'components/Card/Card';
import Loader from 'components/Loader/Loader';

import { useLanguage } from 'utils/context/translation';
import { api } from 'utils/trpc';

import { Achievement } from './Achievement';

export const Achievements = (): JSX.Element => {
  const params = useParams();
  const lang = useLanguage();
  const achievements = api.players.achievements.useQuery(params.id ? Number(params.id) : undefined);

  return (
    <Card title={lang.ACHIEVEMENTS}>
      {achievements.isLoading && <Loader />}
      {achievements.data && (
        <SimpleGrid cols={6} spacing="xs">
          <Achievement
            icon={<GiRank1 />}
            progress={achievements.data.combo500 ? 100 : 0}
            name={lang.COMBO_500}
          />
          <Achievement
            icon={<GiRank2 />}
            progress={achievements.data.combo1000 ? 100 : 0}
            name={lang.COMBO_1000}
          />
          <Achievement
            icon={<GiRank3 />}
            progress={achievements.data.combo2000 ? 100 : 0}
            name={lang.COMBO_2000}
          />
          <Achievement
            icon={<GiSmokingFinger />}
            progress={Math.round(achievements.data.fingering * 100)}
            name={lang.FINGERING}
            desc={lang.FINGERING_DESC}
          />
          <Achievement
            icon={<GiRetroController />}
            progress={Math.round(achievements.data.bit8 * 100)}
            name={lang.EIGHT_BIT}
            desc={lang.EIGHT_BIT_DESC}
          />
          <Achievement
            icon={<GiLoveSong />}
            progress={Math.round(achievements.data.loveIs * 100)}
            name={lang.LOVE_IS}
            desc={lang.LOVE_IS_DESC}
          />
          <Achievement
            icon={<GiSnail />}
            progress={Math.round(achievements.data.snail * 100)}
            name={lang.SNAIL}
            desc={lang.SNAIL_DESC}
          />
          <Achievement
            icon={<GiTurd />}
            progress={achievements.data.brownS ? 100 : 0}
            name={lang.BROWN_S}
            desc={lang.BROWN_S_DESC}
          />
          <Achievement
            icon={<GiLifeBar />}
            progress={achievements.data.lowHealth ? 100 : 0}
            name={lang.LIFE_BAR}
            desc={lang.LIFE_BAR_DESC}
          />
          <Achievement
            icon={<GiWoodenPegleg />}
            progress={achievements.data.padMiss ? 100 : 0}
            name={lang.PAD_MISS}
            desc={lang.PAD_MISS_DESC}
          />
          <Achievement
            icon={<GiBurningPassion />}
            progress={achievements.data.weekLongTraining ? 100 : 0}
            name={lang.WEEK_LONG_TRAINING}
            desc={lang.WEEK_LONG_TRAINING_DESC}
          />
          <Achievement
            icon={<GiAllSeeingEye />}
            progress={achievements.data.sightread ? 100 : 0}
            name={lang.SIGHTREADER}
            desc={lang.SIGHTREADER_DESC}
          />
        </SimpleGrid>
      )}
    </Card>
  );
};
