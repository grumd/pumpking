import { NumberInput, Table, Text, TextInput } from '@mantine/core';

import { MIX_OPTIONS_WITH_ARCADE_NAMES } from '../scoring';

export type ArcadeNames = Record<number, { name: string; edist: number } | null>;

interface ArcadeNamesEditorProps {
  value: ArcadeNames;
  onChange: (value: ArcadeNames) => void;
  // The edit distance a new name starts with
  defaultEdist: number;
  // The mixes to show, if not all of them. A mix that has a name is shown anyway, so it can
  // be removed
  mixes?: number[];
}

// A player's or track's name on each mix's arcade screen, which ingestion matches the
// recognized name against. "Edit dist" is how far (Levenshtein distance) a recognized name
// may be off and still match. An empty name means none on that mix
export const ArcadeNamesEditor = ({
  value,
  onChange,
  defaultEdist,
  mixes,
}: ArcadeNamesEditorProps): JSX.Element => (
  <Table withRowBorders={false} verticalSpacing={4} horizontalSpacing="xs">
    <Table.Thead>
      <Table.Tr>
        <Table.Th w="7rem">Mix</Table.Th>
        <Table.Th>Arcade name</Table.Th>
        <Table.Th w="6rem">Edit dist</Table.Th>
      </Table.Tr>
    </Table.Thead>
    <Table.Tbody>
      {MIX_OPTIONS_WITH_ARCADE_NAMES.filter(
        (mix) => !mixes || mixes.includes(mix.id) || value[mix.id]
      ).map((mix) => {
        const arcadeName = value[mix.id] ?? null;
        return (
          <Table.Tr key={mix.id}>
            <Table.Td>
              <Text size="sm">{mix.name}</Text>
            </Table.Td>
            <Table.Td>
              <TextInput
                value={arcadeName?.name ?? ''}
                onChange={(event) => {
                  const name = event.currentTarget.value;
                  onChange({
                    ...value,
                    [mix.id]: name ? { name, edist: arcadeName?.edist ?? defaultEdist } : null,
                  });
                }}
                placeholder="none"
                ff="monospace"
              />
            </Table.Td>
            <Table.Td>
              <NumberInput
                value={arcadeName?.edist ?? ''}
                onChange={(edist) =>
                  arcadeName &&
                  onChange({ ...value, [mix.id]: { ...arcadeName, edist: Number(edist) || 0 } })
                }
                disabled={!arcadeName}
                min={0}
                max={10}
                allowDecimal={false}
              />
            </Table.Td>
          </Table.Tr>
        );
      })}
    </Table.Tbody>
  </Table>
);
