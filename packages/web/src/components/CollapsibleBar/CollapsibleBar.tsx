import { Button, Collapse, Stack } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { FaChevronRight } from 'react-icons/fa';

export default function CollapsibleBar({
  children,
  title,
  buttonClassName,
}: {
  children: React.ReactNode;
  title: string;
  buttonClassName?: string;
}) {
  const [opened, { toggle }] = useDisclosure(false);

  return (
    <Stack gap="xs">
      <Button
        className={buttonClassName}
        variant="light"
        justify="start"
        onClick={toggle}
        leftSection={<FaChevronRight style={opened ? { transform: 'rotate(90deg)' } : {}} />}
      >
        {title}
      </Button>
      {children && <Collapse in={opened}>{children}</Collapse>}
    </Stack>
  );
}
