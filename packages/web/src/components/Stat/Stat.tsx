import { Text } from '@mantine/core';

interface StatProps {
  label: React.ReactNode;
  value: React.ReactNode;
  // sm: detail views. lg: page headers
  size?: 'sm' | 'lg';
}

// A label over a value
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
