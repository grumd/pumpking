import { ActionIcon, Box, Group, type PaperProps } from '@mantine/core';
import { FaQuestionCircle } from 'react-icons/fa';

import { Card } from 'components/Card/Card';
import { ModalTrigger } from 'components/ModalTrigger/ModalTrigger';

import { useLanguage } from 'utils/context/translation';

import { ExpFaq } from './ExpFaq';
import { ExpProgress } from './ExpProgress';

export const ExpCard = (props: PaperProps): JSX.Element => {
  const lang = useLanguage();
  return (
    <Card p="xs" {...props}>
      <Group gap="xs" wrap="nowrap" align="start">
        <Box flex="1 1 auto">
          <ExpProgress />
        </Box>
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
      </Group>
    </Card>
  );
};
