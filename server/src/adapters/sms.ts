import { eq } from 'drizzle-orm';
import type { Tx } from '../db/index.js';
import { smsOutbox } from '../db/schema.js';
import { env } from '../env.js';

/**
 * Queue an SMS. It is written to the outbox inside the caller's transaction, so a message is never
 * sent for something that was then rolled back, and never lost because the gateway was down.
 *
 * No gateway is connected yet: in development the message is printed and marked sent. `purpose` says
 * what it was for (reset, approved, rejected…), so staff can see what went out.
 */
export async function queueSms(db: Tx, toPhone: string, text: string, purpose: string): Promise<void> {
  const [row] = await db.insert(smsOutbox).values({ toPhone, text, purpose }).returning({ id: smsOutbox.id });
  if (env.NODE_ENV === 'development' && row) {
    console.log('\n  SMS to ' + toPhone + ' (' + purpose + ')\n  ' + text + '\n');
    await db.update(smsOutbox).set({ status: 'sent', providerRef: 'development', sentAt: new Date() }).where(eq(smsOutbox.id, row.id));
  }
}
