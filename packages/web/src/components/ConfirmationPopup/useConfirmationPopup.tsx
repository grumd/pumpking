import { Button, Group, Modal } from '@mantine/core';
import { useRef, useState } from 'react';

import { useLanguage } from 'utils/context/translation';

interface UseConfirmationPopupOptions {
  okText?: string;
}

interface RenderPopupProps {
  content: React.ReactNode;
}

export const useConfirmationPopup = ({ okText = 'OK' }: UseConfirmationPopupOptions = {}) => {
  const [open, setOpen] = useState(false);
  const lang = useLanguage();
  const closeCallback = useRef<((isConfirmed: boolean) => void) | null>(null);

  const close = (isConfirmed: boolean) => {
    if (open) {
      setOpen(false);
      if (closeCallback.current) {
        closeCallback.current(isConfirmed);
      }
    }
  };

  return {
    renderPopup: ({ content }: RenderPopupProps) => {
      return (
        <Modal
          opened={open}
          onClose={() => close(false)}
          centered
          size="lg"
          radius="md"
          withCloseButton={false}
        >
          {content}
          <Group justify="space-between" mt="md">
            <Button color="red" onClick={() => close(false)}>
              {lang.CANCEL}
            </Button>
            <Button color="green" onClick={() => close(true)}>
              {okText}
            </Button>
          </Group>
        </Modal>
      );
    },
    confirm: () => {
      setOpen(true);
      return new Promise<void>((res, rej) => {
        closeCallback.current = (isConfirmed) => {
          isConfirmed ? res() : rej();
        };
      });
    },
  };
};
