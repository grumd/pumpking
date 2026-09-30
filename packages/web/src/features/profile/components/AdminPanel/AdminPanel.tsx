import { Button } from '@mantine/core';
import { FaUserCog } from 'react-icons/fa';
import { Link, useParams } from 'react-router-dom';

import { Card } from 'components/Card/Card';

import { routes } from 'constants/routes';

import { useUser } from 'hooks/useUser';

import { useLanguage } from 'utils/context/translation';

// For admins: opens this player in the admin section
export const AdminPanel = (): JSX.Element | null => {
  const params = useParams();
  const lang = useLanguage();
  const user = useUser();
  const playerId = params.id ? Number(params.id) : undefined;

  if (!user.data?.is_admin || !playerId) {
    return null;
  }

  return (
    <Card title={lang.ADMIN_PANEL} mb="xs">
      <Button
        component={Link}
        to={routes.admin.players.getPath({ id: playerId })}
        leftSection={<FaUserCog />}
        variant="default"
      >
        Edit player
      </Button>
    </Card>
  );
};
