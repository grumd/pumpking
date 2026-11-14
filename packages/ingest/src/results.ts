import type { AgentCall } from './agentApi';
import { checkResult } from './ingestion/checkResult';
import { addToPurgatory } from './ingestion/purgatory';
import { storeResult } from './ingestion/storeResult';
import { splitResults } from './screen';
import { db } from '@pumpking/database/db';
import createDebug from 'debug';

const debug = createDebug('ingest:results');

export type SubmitMode = 'screen' | 'manual';

export const submitResults = async (call: AgentCall, mode: SubmitMode) => {
  const isManual = mode === 'manual';
  const updates: object[] = [];
  for (const data of splitResults(call)) {
    const checked = await checkResult(db, data);
    switch (checked.outcome) {
      case 'valid':
        updates.push(
          await db
            .transaction()
            .execute((trx) =>
              storeResult(trx, checked, { isManual, checkOnly: false, report: call.report })
            )
        );
        break;
      case 'unrecognized':
        if (isManual) {
          debug(`Rejecting result: ${checked.reason}`);
          updates.push({ status: 'discarded', reason: checked.reason });
        } else {
          debug(`Adding result to purgatory: ${checked.reason}`);
          updates.push(await addToPurgatory(db, data, checked.reason));
        }
        break;
      case 'discarded':
        updates.push({ status: 'discarded', reason: checked.reason });
        break;
    }
  }
  return { updates };
};

export const validateResults = async (call: AgentCall, mode: SubmitMode) => {
  const isManual = mode === 'manual';
  const validation: object[] = [];
  for (const data of splitResults(call)) {
    const checked = await checkResult(db, data);
    switch (checked.outcome) {
      case 'valid': {
        const update = await storeResult(db, checked, {
          isManual,
          checkOnly: true,
          report: call.report,
        });
        validation.push({ valid: true, update });
        break;
      }
      case 'unrecognized':
        validation.push({ valid: false, reason: checked.reason });
        break;
      case 'discarded':
        validation.push({ valid: true, discardReason: checked.reason });
        break;
    }
  }
  return { validation };
};
