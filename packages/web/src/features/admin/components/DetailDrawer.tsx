import { Drawer } from '@mantine/core';

interface DetailDrawerProps {
  opened: boolean;
  onClose: () => void;
  title: React.ReactNode;
  wide?: boolean;
  children: React.ReactNode;
}

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
  >
    {children}
  </Drawer>
);
