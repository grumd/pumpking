import { Button, type ButtonProps, Group, Popover, Stack, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';

interface ConfirmButtonProps extends ButtonProps {
  // What will happen, shown before it does
  question: React.ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
}

// A button for destructive actions, which asks first
export const ConfirmButton = ({
  question,
  confirmLabel,
  onConfirm,
  children,
  ...buttonProps
}: ConfirmButtonProps): JSX.Element => {
  const [opened, { toggle, close }] = useDisclosure(false);

  return (
    <Popover opened={opened} onChange={toggle} position="top" withArrow shadow="md">
      <Popover.Target>
        <Button color="red" variant="light" onClick={toggle} {...buttonProps}>
          {children}
        </Button>
      </Popover.Target>
      <Popover.Dropdown maw="22rem">
        <Stack gap="xs">
          <Text size="sm">{question}</Text>
          <Group justify="flex-end" gap="xs">
            <Button size="xs" variant="default" onClick={close}>
              Cancel
            </Button>
            <Button
              size="xs"
              color="red"
              onClick={() => {
                close();
                onConfirm();
              }}
            >
              {confirmLabel}
            </Button>
          </Group>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
};
