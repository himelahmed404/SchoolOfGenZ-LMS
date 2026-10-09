import type { Tx } from '../../db/index.js';
import { activityLog } from '../../db/schema.js';

/**
 * Write down what a staff member did, in the same transaction as the change itself: if the change
 * is undone, so is the entry. The log can be added to and never altered.
 */
export async function logActivity(tx: Tx, actor: { id: string; name: string }, area: string, action: string, target = '', reason = ''): Promise<void> {
  await tx.insert(activityLog).values({ actorId: actor.id, actorName: actor.name, area, action, target, reason });
}
