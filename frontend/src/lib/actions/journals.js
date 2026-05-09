'use server';

import prisma from '../prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

export async function getJournals(filters = {}) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return { success: false, error: 'Unauthorized' };
  }

  const orgId = session.user.organizationId;
  const { fromDate, toDate, accountId } = filters;

  try {
    const transactions = await prisma.transaction.findMany({
      where: {
        organizationId: orgId,
        ...(fromDate || toDate ? {
          date: {
            ...(fromDate ? { gte: new Date(fromDate) } : {}),
            ...(toDate   ? { lte: new Date(toDate) } : {}),
          }
        } : {}),
        ...(accountId ? { entries: { some: { accountId } } } : {})
      },
      include: {
        entries: {
          include: { account: true },
          orderBy: { type: 'asc' }
        }
      },
      orderBy: { date: 'desc' }
    });

    return { success: true, data: transactions };
  } catch (error) {
    console.error('Error fetching journals:', error);
    return { success: false, error: 'Failed to fetch journal entries.' };
  }
}

export async function getJournalById(id) {
  const session = await auth();
  if (!session?.user?.organizationId) return { success: false, error: 'Unauthorized' };

  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id, organizationId: session.user.organizationId },
      include: { entries: { include: { account: true } } }
    });
    if (!transaction) return { success: false, error: 'Transaction not found' };
    return { success: true, data: transaction };
  } catch (error) {
    return { success: false, error: 'Failed to fetch transaction details.' };
  }
}

// ── Helper: reverse balance effects ──────────────────────────────────────────
async function reverseEntryBalances(tx, entries) {
  for (const entry of entries) {
    const account = await tx.account.findUnique({ where: { id: entry.accountId } });
    if (!account) continue;
    const amt = Number(entry.amount);
    const increasesWithDebit = ['ASSET', 'EXPENSE'].includes(account.type);
    const reverseDelta = increasesWithDebit
      ? (entry.type === 'DEBIT' ? -amt : amt)
      : (entry.type === 'CREDIT' ? -amt : amt);
    await tx.account.update({
      where: { id: account.id },
      data: { balance: account.balance + reverseDelta }
    });
  }
}

// ── Update Journal Voucher ────────────────────────────────────────────────────
export async function updateJournalVoucher(id, data) {
  const session = await auth();
  if (!session?.user?.organizationId) return { success: false, error: 'Unauthorized' };
  const orgId = session.user.organizationId;

  const { description, date, entries } = data;
  if (!entries || entries.length < 2) return { success: false, error: 'At least 2 entries required.' };

  const totalDebit  = entries.filter(e => e.type === 'DEBIT').reduce((s, e) => s + Number(e.amount), 0);
  const totalCredit = entries.filter(e => e.type === 'CREDIT').reduce((s, e) => s + Number(e.amount), 0);
  if (Math.abs(totalDebit - totalCredit) >= 0.001) {
    return { success: false, error: `Unbalanced: Debit ${totalDebit.toFixed(2)} ≠ Credit ${totalCredit.toFixed(2)}` };
  }

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Reverse old balance effects
      const existing = await tx.journalEntry.findMany({ where: { transactionId: id } });
      await reverseEntryBalances(tx, existing);

      // 2. Delete old entries
      await tx.journalEntry.deleteMany({ where: { transactionId: id } });

      // 3. Update transaction header
      await tx.transaction.update({
        where: { id, organizationId: orgId },
        data: { description: description || 'Journal Entry', date: new Date(date) }
      });

      // 4. Create new entries + apply new balance effects
      for (const entry of entries) {
        await tx.journalEntry.create({
          data: {
            transactionId: id,
            accountId: entry.accountId,
            type: entry.type,
            amount: Number(entry.amount),
            organizationId: orgId,
          }
        });

        const account = await tx.account.findUnique({ where: { id: entry.accountId } });
        if (account) {
          const amt = Number(entry.amount);
          const increasesWithDebit = ['ASSET', 'EXPENSE'].includes(account.type);
          const delta = increasesWithDebit
            ? (entry.type === 'DEBIT' ? amt : -amt)
            : (entry.type === 'CREDIT' ? amt : -amt);
          await tx.account.update({
            where: { id: account.id },
            data: { balance: account.balance + delta }
          });
        }
      }
    });

    revalidatePath('/journals');
    revalidatePath('/accounts');
    return { success: true };
  } catch (error) {
    console.error('updateJournalVoucher error:', error);
    return { success: false, error: error.message || 'Failed to update voucher.' };
  }
}

// ── Delete Journal Voucher ────────────────────────────────────────────────────
export async function deleteJournalVoucher(id) {
  const session = await auth();
  if (!session?.user?.organizationId) return { success: false, error: 'Unauthorized' };
  const orgId = session.user.organizationId;

  try {
    await prisma.$transaction(async (tx) => {
      const entries = await tx.journalEntry.findMany({ where: { transactionId: id } });
      await reverseEntryBalances(tx, entries);
      await tx.journalEntry.deleteMany({ where: { transactionId: id } });
      await tx.transaction.delete({ where: { id, organizationId: orgId } });
    });

    revalidatePath('/journals');
    revalidatePath('/accounts');
    return { success: true };
  } catch (error) {
    console.error('deleteJournalVoucher error:', error);
    return { success: false, error: error.message || 'Failed to delete voucher.' };
  }
}
