import { Button, Collapse, Stack } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { FaChevronRight } from 'react-icons/fa';

export default function CollapsibleBar({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  const [opened, { toggle }] = useDisclosure(false);

  return (
    <Stack gap="xs">
      <Button
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
