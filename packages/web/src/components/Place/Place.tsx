import { Text } from '@mantine/core';

const medalColors = ['gold', 'silver', 'bronze'] as const;

interface PlaceProps {
  place: number;
  medals?: boolean;
}

export const Place = ({ place, medals = false }: PlaceProps): JSX.Element => {
  const medal = medals ? medalColors[place - 1] : undefined;
  return (
    <Text span inherit c={medal ?? 'dimmed'} fw={medal ? 700 : undefined}>
      #{place}
    </Text>
  );
};
