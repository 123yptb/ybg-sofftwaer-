'use server';

import prisma from '../prisma';
import { revalidatePath } from 'next/cache';
import { logActivity } from '../utils/audit';
import { auth } from '@/auth';

export async function createJournalVoucher(data) {
  const { description, date, entries } = data;
  const session = await auth();

  if (!session?.user?.id || !session?.user?.organizationId) {
    return { success: false, error: 'User is not authenticated or lacks organization context.' };
  }

  const userId = session.user.id;
  const orgId  = session.user.organizationId;

  if (!description || !date || !entries || entries.length < 2) {
    return { success: false, error: 'A valid description, date, and at least two entries are required.' };
  }

  // Calculate totals for balancing check (Golden Rule #2)
  let totalDebit = 0;
  let totalCredit = 0;

  for (const entry of entries) {
    const amount = Number(entry.amount);
    if (isNaN(amount) || amount <= 0) {
      return { success: false, error: 'All entry amounts must be positive numbers.' };
    }
    if (entry.type === 'DEBIT') {
      totalDebit += amount;
    } else if (entry.type === 'CREDIT') {
      totalCredit += amount;
    } else {
      return { success: false, error: 'Invalid entry type. Must be DEBIT or CREDIT.' };
    }
  }

  // Enforce Double-Entry Balancing (Fundamental Software Logic)
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.001;

  if (!isBalanced) {
    return {
      success: false,
      error: `Journal voucher is unbalanced. Total Debit: ${totalDebit.toFixed(2)}, Total Credit: ${totalCredit.toFixed(2)}`
    };
  }

  try {
    // Crucial: Use Prisma transaction to ensure atomicity for entries, balance updates, AND Audit Logging
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the Transaction record (with Audit Trail attributes)
      const transaction = await tx.transaction.create({
        data: {
          description,
          date: new Date(date),
          reference: `JV-${Date.now().toString().slice(-6)}`,
          organizationId: orgId,
          entries: {
            create: entries.map(entry => ({
              accountId: entry.accountId,
              type: entry.type,
              amount: Number(entry.amount),
              organizationId: orgId
            }))
          }
        },
        include: { entries: true }
      });

      // 2. Update balances for each account involved (Golden Rules logic)
      for (const entry of entries) {
        const account = await tx.account.findUnique({
          where: { id: entry.accountId }
        });

        if (!account) {
          throw new Error(`Account with ID ${entry.accountId} not found.`);
        }

        let delta = 0;
        const amt = Number(entry.amount);

        // Standard accounting logic for natural balances
        // Real/Assets & Expenses increase with Debits
        // Personal/Liabilities, Equity, Nominal/Income increase with Credits
        const increasesWithDebit = ['ASSET', 'EXPENSE'].includes(account.type);

        if (increasesWithDebit) {
          delta = entry.type === 'DEBIT' ? amt : -amt;
        } else {
          delta = entry.type === 'CREDIT' ? amt : -amt;
        }

        await tx.account.update({
          where: { id: account.id },
          data: {
            balance: account.balance + delta
          }
        });
      }

      // 3. MCA Audit Trail Logging
      await logActivity({
        entityType: 'TRANSACTION',
        entityId: transaction.id,
        action: 'POSTED',
        afterState: transaction,
        organizationId: orgId,
        userId: userId,
        tx: tx
      });

      return transaction;
    });

    revalidatePath('/journals');
    revalidatePath('/accounts');

    return { success: true, data: result };
  } catch (error) {
    console.error('Transaction failed:', error);
    return { success: false, error: error.message || 'Failed to create journal voucher.' };
  }
}
