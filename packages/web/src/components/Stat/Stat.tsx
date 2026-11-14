import { Text } from '@mantine/core';

interface StatProps {
  label: React.ReactNode;
  value: React.ReactNode;
  size?: 'sm' | 'lg';
}

export const Stat = ({ label, value, size = 'sm' }: StatProps): JSX.Element => {
  return (
    <div>
      <Text size={size === 'lg' ? 'sm' : 'xs'} c="dimmed">
        {label}
      </Text>
      <Text size={size === 'lg' ? 'xxl' : 'sm'} lh={size === 'lg' ? 'xs' : undefined}>
        {value}
      </Text>
    </div>
  );
};
