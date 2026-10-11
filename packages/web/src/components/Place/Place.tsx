import { Text } from '@mantine/core';

const medalColors = ['gold', 'silver', 'bronze'] as const;

interface PlaceProps {
  place: number;
  // Places 1-3 bold in medal colors
  medals?: boolean;
}

// A place in a ranking: #N
export const Place = ({ place, medals = false }: PlaceProps): JSX.Element => {
  const medal = medals ? medalColors[place - 1] : undefined;
  return (
    <Text span inherit c={medal ?? 'dimmed'} fw={medal ? 700 : undefined}>
      #{place}
    </Text>
  );
};
