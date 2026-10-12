import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Group,
  MultiSelect,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Tabs,
  Text,
  TextInput,
  Title,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { FaCog, FaExclamationCircle } from 'react-icons/fa';
import breakpoints from 'theme/breakpoints.json';
import { appColors, gradeColorVar, gradeColors, highlightColors, pageWidths } from 'theme/tokens';

import { Card } from 'components/Card/Card';
import { ChartLabel } from 'components/ChartLabel/ChartLabel';
import { EmptyState } from 'components/EmptyState/EmptyState';
import { KeyValueList } from 'components/KeyValueList/KeyValueList';
import Loader from 'components/Loader/Loader';
import { PageContainer } from 'components/PageContainer/PageContainer';
import { Place } from 'components/Place/Place';
import { Stat } from 'components/Stat/Stat';

import css from './design-system.module.css';

// Dev-only visual reference of the tokens and blocks (DESIGN.md). Not translated on purpose

const Swatch = ({ name, color }: { name: string; color: string }) => (
  <Stack gap="xxs" align="center">
    <Box className={css.swatch} bg={color} />
    <Text size="xs" c="dimmed" ta="center">
      {name}
    </Text>
  </Stack>
);

const surfaces = ['page', 'sunken', '1', '2', 'stripe', '3'];
const states = ['red', 'green', 'yellow', 'blue', 'orange', 'grape', 'teal', 'gray'];
const spacings = ['xxs', 'xs', 'sm', 'md', 'lg', 'xl'];
const fontSizes = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'];
const labels = ['S21', 'SP3', 'D18', 'DP5', 'HD20', 'COOP2'];

const rows = [
  { place: 1, name: 'Player one', pp: 3308 },
  { place: 2, name: 'Player two', pp: 3097 },
  { place: 3, name: 'Player three', pp: 2968 },
  { place: 4, name: 'Player four', pp: 2910 },
];

export default function DesignSystem(): JSX.Element {
  return (
    <PageContainer>
      <Title order={2}>Design system</Title>

      <Card title="surfaces">
        <Group gap="md">
          {surfaces.map((surface) => (
            <Swatch
              key={surface}
              name={`surface-${surface}`}
              color={`var(--pk-surface-${surface})`}
            />
          ))}
        </Group>
      </Card>

      <Card title="text">
        <Stack gap="xxs">
          <Text>default text</Text>
          <Text c="var(--pk-text-strong)" fw={700}>
            strong text
          </Text>
          <Text c="dimmed">dimmed text</Text>
          <Text c="fresh">fresh result</Text>
          <TextInput label="input" placeholder="placeholder" />
        </Stack>
      </Card>

      <Card title="app colors">
        <Group gap="md">
          {Object.keys(appColors).map((name) => (
            <Swatch key={name} name={name} color={name} />
          ))}
        </Group>
      </Card>

      <Card title="state colors">
        <Group gap="md">
          {states.map((name) => (
            <Swatch key={name} name={name} color={name} />
          ))}
        </Group>
      </Card>

      <Card title="grades and highlights">
        <Stack gap="sm">
          <Group gap="md">
            {Object.keys(gradeColors).map((grade) => (
              <Swatch
                key={grade}
                name={grade}
                color={gradeColorVar(grade as keyof typeof gradeColors)}
              />
            ))}
          </Group>
          <Group gap="md">
            {highlightColors.map((_, index) => (
              <Swatch key={index} name={`${index}`} color={`var(--pk-highlight-${index})`} />
            ))}
          </Group>
        </Stack>
      </Card>

      <Card title="spacing">
        <Stack gap="xxs">
          {spacings.map((spacing) => (
            <Group key={spacing} gap="sm">
              <Text size="sm" w="3rem">
                {spacing}
              </Text>
              <Box className={css.spacingBar} w={`var(--mantine-spacing-${spacing})`} />
            </Group>
          ))}
        </Stack>
      </Card>

      <Card title="type">
        <Stack gap="xxs">
          {fontSizes.map((size) => (
            <Text key={size} size={size}>
              {size}: The quick brown fox
            </Text>
          ))}
          <Text size="sm" c="dimmed">
            Root font 18px, 14px below md. Breakpoints:{' '}
            {Object.entries(breakpoints)
              .map(([name, value]) => `${name} ${value}`)
              .join(', ')}
            . Page widths:{' '}
            {Object.entries(pageWidths)
              .map(([name, value]) => `${name} ${value}`)
              .join(', ')}
          </Text>
        </Stack>
      </Card>

      <Card
        title="Card (level 1) with actions"
        actions={
          <ActionIcon variant="subtle" aria-label="Settings">
            <FaCog />
          </ActionIcon>
        }
      >
        <Stack gap="xxs">
          <Card level={2}>Card level 2</Card>
          <Card level={2}>Card level 2</Card>
        </Stack>
      </Card>

      <Card title="Stat, KeyValueList, Place">
        <Stack gap="sm">
          <Group gap="xl">
            <Stat size="lg" label="rank" value="#9" />
            <Stat size="lg" label="pp" value="2507.78" />
            <Stat label="agent" value="kyiv_garage" />
            <Stat label="mix" value="Phoenix" />
          </Group>
          <KeyValueList
            items={[
              { label: 'player', value: 'Player one' },
              { label: 'pp', value: '42.26pp' },
              false,
              { label: 'mods', value: 'AV645 BGADARK' },
            ]}
          />
          <Group gap="sm">
            {[1, 2, 3, 4, 12].map((place) => (
              <Place key={place} place={place} medals />
            ))}
            <Place place={7} />
          </Group>
        </Stack>
      </Card>

      <Card title="ChartLabel">
        <Group gap="xs">
          {labels.map((label) => (
            <ChartLabel key={label} label={label} />
          ))}
          <ChartLabel label="S21" same />
          <Badge color="mix27">PH</Badge>
          <Badge color="mix28">PH2</Badge>
        </Group>
      </Card>

      <Card title="Table variant=rows">
        <Table variant="rows">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>rank</Table.Th>
              <Table.Th>name</Table.Th>
              <Table.Th visibleFrom="md">hidden on phones</Table.Th>
              <Table.Th ta="right">pp</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((row) => (
              <Table.Tr key={row.place} data-selected={row.place === 3 || undefined}>
                <Table.Td>
                  <Place place={row.place} medals />
                </Table.Td>
                <Table.Td>{row.name}</Table.Td>
                <Table.Td visibleFrom="md">secondary</Table.Td>
                <Table.Td ta="right" fw={700}>
                  {row.pp}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>

      <Card title="Table striped / default">
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <Table striped>
            <Table.Tbody>
              {rows.map((row) => (
                <Table.Tr key={row.place}>
                  <Table.Td>
                    <Place place={row.place} />
                  </Table.Td>
                  <Table.Td>{row.name}</Table.Td>
                  <Table.Td ta="right">{row.pp}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
          <Table highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>name</Table.Th>
                <Table.Th ta="right">pp</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map((row) => (
                <Table.Tr
                  key={row.place}
                  data-selected={row.place === 2 || undefined}
                  data-clickable
                >
                  <Table.Td>{row.name}</Table.Td>
                  <Table.Td ta="right">{row.pp}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </SimpleGrid>
      </Card>

      <Card title="Mantine components with theme defaults">
        <Stack gap="sm">
          <Group gap="xs">
            <Button>Button</Button>
            <Button variant="default">Default</Button>
            <Button color="red">Delete</Button>
            <Button color="discord">Discord</Button>
            <Tooltip label="A tooltip opens on hover, focus and touch">
              <UnstyledButton>tooltip target</UnstyledButton>
            </Tooltip>
          </Group>
          <Group gap="xs">
            <Badge color="green">Live</Badge>
            <Badge color="gray">Ended</Badge>
            <Badge color="orange" size="xs">
              HJ
            </Badge>
            <Badge color="gold" size="xs">
              gold
            </Badge>
          </Group>
          <Switch label="Switch" defaultChecked />
          <MultiSelect label="MultiSelect" data={['Phoenix', 'Phoenix 2', 'XX']} />
          <Tabs variant="pills" defaultValue="a">
            <Tabs.List>
              <Tabs.Tab value="a">Pill tab</Tabs.Tab>
              <Tabs.Tab value="b">Pill tab</Tabs.Tab>
            </Tabs.List>
          </Tabs>
          <Alert color="red" title="Error" icon={<FaExclamationCircle />}>
            Something went wrong
          </Alert>
          <Alert color="yellow">A warning</Alert>
          <EmptyState>Nothing found</EmptyState>
          <Loader />
        </Stack>
      </Card>
    </PageContainer>
  );
}
