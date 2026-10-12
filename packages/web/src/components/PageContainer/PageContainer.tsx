import { Container, Stack } from '@mantine/core';
import { pageSidePadding, pageWidths } from 'theme/tokens';

interface PageContainerProps {
  children: React.ReactNode;
  width?: keyof typeof pageWidths;
}

// The outer wrapper of every logged-in page
export const PageContainer = ({ children, width = 'default' }: PageContainerProps): JSX.Element => {
  return (
    <Container
      component="main"
      size={pageWidths[width]}
      w="100%"
      px={pageSidePadding}
      py="sm"
    >
      <Stack gap="sm">{children}</Stack>
    </Container>
  );
};
