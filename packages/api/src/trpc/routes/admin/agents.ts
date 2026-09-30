import {
  createAgent,
  getAgentToken,
  listAgents,
  rotateAgentToken,
  updateAgent,
} from 'services/admin/agents';
import { adminProcedure, router } from 'trpc/trpc';
import { z } from 'zod';

const agentFields = z.object({ name: z.string().max(30), title: z.string().max(30) });

export const agents = router({
  list: adminProcedure.query(() => listAgents()),
  token: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getAgentToken(input.id)),
  create: adminProcedure.input(agentFields).mutation(({ input }) => createAgent(input)),
  update: adminProcedure
    .input(z.object({ id: z.number(), fields: agentFields }))
    .mutation(({ input }) => updateAgent(input.id, input.fields)),
  rotateToken: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => rotateAgentToken(input.id)),
});
