'use server';

import prisma from '../prisma';
import { revalidatePath } from 'next/cache';

/**
 * Calculates the Trial Balance for an organization.
 * Fetches all active accounts and sums debits/credits from journal entries.
 */
export async function getTrialBalance(organizationId) {
  if (!organizationId) {
    return { success: false, error: 'Organization ID is required.' };
  }

  try {
    const entries = await prisma.journalEntry.findMany({
      where: { 
        organizationId,
        isArchived: false,
        transaction: { status: 'POSTED' } 
      },
      select: { type: true, amount: true }
    });

    let totalDebit = 0;
    let totalCredit = 0;

    entries.forEach(entry => {
      if (entry.type === 'DEBIT') totalDebit += entry.amount;
      else totalCredit += entry.amount;
    });

    // Handle floating point precision
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

    return {
      success: true,
      data: {
        totalDebit: Number(totalDebit.toFixed(2)),
        totalCredit: Number(totalCredit.toFixed(2)),
        isBalanced,
        difference: Number(Math.abs(totalDebit - totalCredit).toFixed(2))
      }
    };
  } catch (error) {
    console.error('Failed to calculate trial balance:', error);
    return { success: false, error: 'Failed to generate trial balance.' };
  }
}

/**
 * Executes the Year-End Migration.
 * 1. Checks if the service is PAID.
 * 2. Updates Account.openingBalance = Account.balance.
 * 3. Marks active transactions/entries as isArchived.
 */
export async function migrateToNewYear(organizationId) {
  if (!organizationId) {
    return { success: false, error: 'Organization ID is required.' };
  }

  try {
    // 1. Verify Service Payment
    const paidRequest = await prisma.serviceRequest.findFirst({
      where: {
        organizationId,
        type: 'YEAR_END',
        status: 'PAID'
      }
    });

    if (!paidRequest) {
      return { 
        success: false, 
        error: 'Migration Tool locked. Please pay the Year-End Migration fee in the Service Center.' 
      };
    }

    // 2. Perform Migration in a Transaction
    const result = await prisma.$transaction(async (tx) => {
      // Get all accounts
      const accounts = await tx.account.findMany({
        where: { organizationId }
      });

      // Update opening balances
      for (const account of accounts) {
        await tx.account.update({
          where: { id: account.id },
          data: {
            openingBalance: account.balance
            // Note: In strict accounting, we would zero out Income/Expense here, 
            // but we follow user's instruction to set opening to current balance.
          }
        });
      }

      // Archive historical data
      await tx.transaction.updateMany({
        where: { organizationId, isArchived: false },
        data: { isArchived: true }
      });

      await tx.journalEntry.updateMany({
        where: { organizationId, isArchived: false },
        data: { isArchived: true }
      });

      return { migratedCount: accounts.length };
    });

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/services');
    revalidatePath('/accounts');

    return { success: true, data: result };
  } catch (error) {
    console.error('Migration failed:', error);
    return { success: false, error: error.message || 'Failed to execute migration.' };
  }
}
