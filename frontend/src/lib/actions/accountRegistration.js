'use server';

import prisma from '../prisma';
import { revalidatePath } from 'next/cache';

export async function upsertAccount(data) {
  try {
    const { id, name, accountCode, groupId, type, openingBalance, isActive, description } = data;

    if (!name || !accountCode || !type) {
      return { success: false, error: 'Name, Account Code, and Type are required.' };
    }

    const accountData = {
      name,
      accountCode,
      type,
      groupId: groupId || null,
      openingBalance: Number(openingBalance) || 0,
      isActive: Boolean(isActive),
      description: description || ''
    };

    let result;
    if (id) {
      // Update
      const existing = await prisma.account.findUnique({ where: { accountCode } });
      if (existing && existing.id !== id) {
        return { success: false, error: `Account Code ${accountCode} is already used by another account.` };
      }
      result = await prisma.account.update({
        where: { id },
        data: accountData
      });
    } else {
      // Create
      const existing = await prisma.account.findUnique({ where: { accountCode } });
      if (existing) {
        return { success: false, error: `Account Code ${accountCode} already exists.` };
      }
      // If opening balance is supplied, initialize balance as well
      result = await prisma.account.create({
        data: {
          ...accountData,
          balance: accountData.openingBalance
        }
      });
    }

    revalidatePath('/dashboard/accounts/registration');
    return { success: true, data: result };
  } catch (error) {
    console.error('Error upserting account:', error);
    return { success: false, error: error.message || 'An error occurred while saving the account.' };
  }
}

export async function getAccountTree() {
  try {
    // 1. Fetch all groups and accounts
    const groups = await prisma.accountGroup.findMany({
      orderBy: { name: 'asc' }
    });
    
    const accounts = await prisma.account.findMany({
      orderBy: { accountCode: 'asc' }
    });

    // 2. Build Maps for fast lookup
    const groupMap = new Map();
    groups.forEach(g => {
      groupMap.set(g.id, { ...g, subGroups: [], accounts: [] });
    });

    // 3. Populate Accounts into their respective Groups
    const unassignedAccounts = [];
    accounts.forEach(a => {
      if (a.groupId && groupMap.has(a.groupId)) {
        groupMap.get(a.groupId).accounts.push(a);
      } else {
        unassignedAccounts.push(a);
      }
    });

    // 4. Build Hierarchy for Groups
    const tree = [];
    groupMap.forEach(g => {
      if (g.parentGroupId && groupMap.has(g.parentGroupId)) {
        groupMap.get(g.parentGroupId).subGroups.push(g);
      } else {
        tree.push(g);
      }
    });

    return { 
      success: true, 
      data: { tree, unassignedAccounts, allGroups: groups } 
    };
  } catch (error) {
    console.error('Error fetching account tree:', error);
    return { success: false, error: 'Failed to fetch account tree hierarchy.' };
  }
}

export async function deleteAccount(id) {
  try {
    // Basic dependency check - ensure no journal entries exist before deletion
    const account = await prisma.account.findUnique({
      where: { id },
      include: {
        _count: {
          select: { journalEntries: true }
        }
      }
    });

    if (!account) return { success: false, error: 'Account not found.' };

    if (account._count.journalEntries > 0) {
      return { success: false, error: 'Cannot delete account with existing journal entries. Mark it inactive instead.' };
    }

    await prisma.account.delete({ where: { id } });
    revalidatePath('/dashboard/accounts/registration');
    return { success: true };
  } catch (error) {
    console.error('Error deleting account:', error);
    return { success: false, error: 'Failed to delete account.' };
  }
}
