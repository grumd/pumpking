import type { ApiOutputs } from '@/api/trpc/router';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Code,
  CopyButton,
  Group,
  Modal,
  Stack,
  Table,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { FaCheck, FaCopy, FaEye, FaPen, FaPlus } from 'react-icons/fa';

import Loader from 'components/Loader/Loader';

import { useLanguage } from 'utils/context/translation';
import { getLongTimeAgo } from 'utils/timeAgo';
import { api } from 'utils/trpc';

import { useAdminAction } from '../activity/activity';
import { ConfirmButton } from '../components/ConfirmButton';

type Agent = ApiOutputs['admin']['agents']['list'][number];

const TokenCode = ({ token }: { token: string }) => (
  <Group gap={4} wrap="nowrap">
    <Code>{token}</Code>
    <CopyButton value={token}>
      {({ copied, copy }) => (
        <Tooltip label={copied ? 'Copied' : 'Copy'}>
          <ActionIcon variant="subtle" size="sm" onClick={copy}>
            {copied ? <FaCheck /> : <FaCopy />}
          </ActionIcon>
        </Tooltip>
      )}
    </CopyButton>
  </Group>
);

// Shown only when asked for, so tokens don't sit on screen
const AgentToken = ({ agent }: { agent: Agent }) => {
  const queryClient = useQueryClient();
  const [shown, setShown] = useState(false);
  const token = useQuery({
    ...api.admin.agents.token.queryOptions({ id: agent.id }),
    enabled: shown,
  });
  const rotate = useAdminAction(
    api.admin.agents.rotateToken.mutationOptions({
      onSuccess: () => {
        setShown(true);
        queryClient.invalidateQueries(api.admin.agents.token.queryFilter({ id: agent.id }));
      },
    }),
    () => `Replace the token of agent #${agent.id}`
  );

  return (
    <Group gap="xs" wrap="nowrap">
      {shown && token.data ? (
        <TokenCode token={token.data.token} />
      ) : (
        <Button
          size="compact-xs"
          variant="default"
          leftSection={<FaEye />}
          onClick={() => setShown(true)}
        >
          Show token
        </Button>
      )}
      <ConfirmButton
        size="compact-xs"
        question={
          agent.id === 1
            ? 'Replace the super agent token? The legacy desktop admin tool stops working until it gets the new one.'
            : `Replace the token of '${agent.name}'? Its piu-spy stops sending results until its config has the new one.`
        }
        confirmLabel="Replace"
        onConfirm={() => rotate.mutate({ id: agent.id })}
      >
        Replace token
      </ConfirmButton>
    </Group>
  );
};

interface AgentModalProps {
  // null creates an agent
  agent: Agent | null;
  onClose: () => void;
}

const AgentModal = ({ agent, onClose }: AgentModalProps) => {
  const [name, setName] = useState(agent?.name ?? '');
  const [title, setTitle] = useState(agent?.title ?? '');
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const create = useAdminAction(
    api.admin.agents.create.mutationOptions({ onSuccess: (data) => setCreatedToken(data.token) }),
    () => `Create agent '${name}'`
  );
  const update = useAdminAction(
    api.admin.agents.update.mutationOptions({ onSuccess: onClose }),
    () => `Edit agent #${agent?.id}`
  );

  if (createdToken) {
    return (
      <Stack gap="sm">
        <Text>Agent '{name}' is created. Its piu-spy config needs this name and token:</Text>
        <TokenCode token={createdToken} />
        <Group justify="flex-end">
          <Button onClick={onClose}>Done</Button>
        </Group>
      </Stack>
    );
  }

  return (
    <Stack gap="sm">
      <TextInput
        label="Name"
        description="Letters, digits, '-', '.', '_'. Also the name of its uploads folder"
        value={name}
        onChange={(event) => setName(event.currentTarget.value)}
      />
      {agent && name !== agent.name && (
        <Alert color="yellow">
          The agent logs in with its name: its piu-spy config needs the new one. New uploads go to a
          folder with the new name; the old ones stay where they are.
        </Alert>
      )}
      <TextInput
        label="Title"
        description="Shown to players, e.g. the arcade and city"
        value={title}
        onChange={(event) => setTitle(event.currentTarget.value)}
      />
      <Group justify="flex-end">
        <Button variant="default" onClick={onClose}>
          Cancel
        </Button>
        <Button
          loading={create.isPending || update.isPending}
          disabled={!name.trim()}
          onClick={() =>
            agent
              ? update.mutate({ id: agent.id, fields: { name, title } })
              : create.mutate({ name, title })
          }
        >
          {agent ? 'Save' : 'Create agent'}
        </Button>
      </Group>
    </Stack>
  );
};

// The piu-spy installations that send results from arcades
export const AgentsTab = (): JSX.Element => {
  const lang = useLanguage();
  const agents = useQuery(api.admin.agents.list.queryOptions());
  // undefined: closed, null: a new agent
  const [editing, setEditing] = useState<Agent | null | undefined>(undefined);

  return (
    <Stack gap="sm">
      <Group justify="flex-end">
        <Button leftSection={<FaPlus />} onClick={() => setEditing(null)}>
          New agent
        </Button>
      </Group>

      {agents.isLoading && <Loader />}
      {agents.data && (
        <Table verticalSpacing="xs">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>#</Table.Th>
              <Table.Th>Name</Table.Th>
              <Table.Th>Title</Table.Th>
              <Table.Th>Last seen</Table.Th>
              <Table.Th>Token</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {agents.data.map((agent) => (
              <Table.Tr key={agent.id}>
                <Table.Td>{agent.id}</Table.Td>
                <Table.Td ff="monospace" fz="sm">
                  {agent.name}{' '}
                  {agent.id === 1 && (
                    <Badge size="sm" color="grape">
                      super agent
                    </Badge>
                  )}
                </Table.Td>
                <Table.Td>{agent.title}</Table.Td>
                <Table.Td>
                  {agent.last_seen_at ? (
                    <Tooltip label={new Date(agent.last_seen_at).toLocaleString()}>
                      <Text size="sm">{getLongTimeAgo(lang, new Date(agent.last_seen_at))}</Text>
                    </Tooltip>
                  ) : (
                    <Text size="sm" c="dimmed">
                      never
                    </Text>
                  )}
                </Table.Td>
                <Table.Td>
                  <AgentToken agent={agent} />
                </Table.Td>
                <Table.Td>
                  <ActionIcon variant="subtle" onClick={() => setEditing(agent)} title="Edit">
                    <FaPen />
                  </ActionIcon>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      <Modal
        opened={editing !== undefined}
        onClose={() => setEditing(undefined)}
        title={editing ? `Agent #${editing.id}` : 'New agent'}
      >
        {editing !== undefined && (
          <AgentModal
            key={editing?.id ?? 'new'}
            agent={editing}
            onClose={() => setEditing(undefined)}
          />
        )}
      </Modal>
    </Stack>
  );
};
