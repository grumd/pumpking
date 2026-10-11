import { Center, Stack, Title } from '@mantine/core';
import { pageWidths } from 'theme/tokens';

interface LoginLayoutProps {
  children: React.ReactNode;
}

// The logged-out screens: the site name over a column centered on the page, no top bar
export function LoginLayout({ children }: LoginLayoutProps) {
  return (
    <Center component="main" mih="100%" px={{ base: 'xs', sm: 'sm' }} py="sm">
      <Stack align="center" gap="md" w="100%" maw={pageWidths.narrow}>
        <Title order={1} mb="xs">
          pumpking
        </Title>
        {children}
      </Stack>
    </Center>
  );
}
