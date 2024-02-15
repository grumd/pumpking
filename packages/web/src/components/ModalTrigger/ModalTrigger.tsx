import { Modal, type ModalProps } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';

interface ModalTriggerProps extends Omit<ModalProps, 'opened' | 'onClose'> {
  renderButton: ({ open }: { open: () => void }) => React.ReactNode;
  children: React.ReactNode;
}

export const ModalTrigger = ({
  renderButton,
  children,
  ...rest
}: ModalTriggerProps): JSX.Element => {
  const [opened, { open, close }] = useDisclosure(false);
  return (
    <>
      {renderButton({ open })}
      <Modal size="auto" centered radius="md" {...rest} opened={opened} onClose={close}>
        {children}
      </Modal>
    </>
  );
};
