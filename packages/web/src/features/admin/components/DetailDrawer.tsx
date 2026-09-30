import { Drawer } from '@mantine/core';

interface DetailDrawerProps {
  opened: boolean;
  onClose: () => void;
  title: React.ReactNode;
  // Wide for the views that show a screenshot next to the form
  wide?: boolean;
  children: React.ReactNode;
}

// The panel an admin list opens a row in. Which row is open is in the URL
// (e.g. #/admin/results/123), so it can be linked to and the back button closes it
export const DetailDrawer = ({
  opened,
  onClose,
  title,
  wide,
  children,
}: DetailDrawerProps): JSX.Element => (
  <Drawer
    opened={opened}
    onClose={onClose}
    position="right"
    size={wide ? '90rem' : '40rem'}
    title={title}
    styles={{ title: { fontWeight: 700, fontSize: 'var(--mantine-font-size-lg)' } }}
  >
    {children}
  </Drawer>
);
