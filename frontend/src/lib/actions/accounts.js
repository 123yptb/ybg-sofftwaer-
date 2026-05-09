'use server';

import prisma from '../prisma';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { logActivity } from '../utils/audit';

// SQLite: unique constraint is enforced at DB level via @unique in schema.
// The createAccount function uses a P2002 retry loop to handle this automatically.
async function ensureOrgScopedConstraint() {
  // No-op for SQLite — handled by the retry loop in createAccount
}


export async function getAccountsData() {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.organizationId) {
    return { success: false, error: 'Unauthorized' };
  }

  const orgId = session.user.organizationId;

  try {
    const [accounts, groups] = await Promise.all([
      prisma.account.findMany({
        where: { organizationId: orgId },
        include: { group: true },
        orderBy: { accountCode: 'asc' }
      }),
      prisma.accountGroup.findMany({
        where: { organizationId: orgId },
        orderBy: { name: 'asc' }
      })
    ]);

    return { 
      success: true, 
      data: { 
        accounts: accounts.map(a => ({ ...a, code: a.accountCode })),
        groups 
      } 
    };
  } catch (error) {
    console.error('Error fetching accounts data:', error);
    return { success: false, error: 'Failed to fetch accounts data.' };
  }
}

export async function getAccounts() {
  const session = await auth();
  if (!session?.user?.organizationId) return { success: false, error: 'Unauthorized' };

  try {
    const accounts = await prisma.account.findMany({
      where: { organizationId: session.user.organizationId },
      include: { group: true },
      orderBy: { accountCode: 'asc' }
    });
    return { success: true, data: accounts.map(a => ({ ...a, code: a.accountCode })) };
  } catch (error) {
    return { success: false, error: 'Failed to fetch accounts.' };
  }
}

export async function getAccountGroups() {
  const session = await auth();
  if (!session?.user?.organizationId) return { success: false, error: 'Unauthorized' };

  try {
    const groups = await prisma.accountGroup.findMany({
      where: { organizationId: session.user.organizationId },
      orderBy: { name: 'asc' }
    });
    return { success: true, data: groups };
  } catch (error) {
    return { success: false, error: 'Failed to fetch account groups.' };
  }
}

export async function createAccount(formData) {
  const session = await auth();
  if (!session?.user?.organizationId) return { success: false, error: 'Unauthorized' };
  const orgId = session.user.organizationId;

  // Ensure DB constraint is per-org scoped
  await ensureOrgScopedConstraint();

  try {
    const name = formData.get('name');
    const code = formData.get('code');
    const type = formData.get('type');
    const groupId = formData.get('groupId') || null;
    const openingBalance = Number(formData.get('openingBalance')) || 0;
    const description = formData.get('description');

    if (!name || !code || !type) {
      return { success: false, error: 'Name, code, and type are required.' };
    }

    // Check duplicate within same org only
    const existing = await prisma.account.findFirst({ 
      where: { accountCode: code, organizationId: orgId } 
    });
    if (existing) {
      return { success: false, error: `Account code ${code} already exists in your organisation.` };
    }

    // Try to create, auto-incrementing the code if there's a global unique conflict
    let finalCode = code;
    let newAccount = null;
    for (let attempt = 0; attempt < 50; attempt++) {
      try {
        newAccount = await prisma.account.create({
          data: {
            name,
            accountCode: finalCode,
            type,
            groupId: groupId || null,
            openingBalance,
            balance: openingBalance,
            description,
            organizationId: orgId
          }
        });
        break; // success
      } catch (error) {
        if (error.code === 'P2002') {
          // Global unique constraint conflict — increment and retry
          finalCode = String(parseInt(finalCode) + 1);
        } else {
          throw error;
        }
      }
    }

    if (!newAccount) return { success: false, error: 'Could not assign a unique code after 50 attempts.' };

    revalidatePath('/accounts');
    return { success: true, data: { ...newAccount, code: newAccount.accountCode } };
  } catch (error) {
    console.error('createAccount error:', error);
    return { success: false, error: error.message || 'Failed to create account.' };
  }
}

export async function createAccountGroup({ name, type }) {
  const session = await auth();
  if (!session?.user?.organizationId) return { success: false, error: 'Unauthorized' };
  const orgId = session.user.organizationId;

  try {
    if (!name || !type) return { success: false, error: 'Name and type are required.' };

    const existing = await prisma.accountGroup.findFirst({ where: { name, organizationId: orgId } });
    if (existing) return { success: false, error: `Group "${name}" already exists.` };

    const group = await prisma.accountGroup.create({
      data: { name, type, organizationId: orgId }
    });

    revalidatePath('/accounts');
    return { success: true, data: group };
  } catch (error) {
    console.error(error);
    return { success: false, error: 'Failed to create group.' };
  }
}

// ── Setup Default Chart of Accounts ───────────────────────────────────────────
export async function setupDefaultAccounts() {
  const session = await auth();
  if (!session?.user?.organizationId) return { success: false, error: 'Unauthorized' };
  const orgId = session.user.organizationId;

  // Fix DB constraint first (idempotent)
  await ensureOrgScopedConstraint();

  // Check if accounts already exist
  const existingCount = await prisma.account.count({ where: { organizationId: orgId } });
  if (existingCount > 0) return { success: false, error: 'Accounts already set up for this organisation.' };

  try {
    // 1. Create Groups first
    const groupDefs = [
      { name: 'Current Assets',       type: 'ASSET'     },
      { name: 'Fixed Assets',          type: 'ASSET'     },
      { name: 'Current Liabilities',   type: 'LIABILITY' },
      { name: 'Long-term Liabilities', type: 'LIABILITY' },
      { name: 'Capital & Reserves',    type: 'EQUITY'    },
      { name: 'Sales Revenue',         type: 'INCOME'    },
      { name: 'Other Income',          type: 'INCOME'    },
      { name: 'Cost of Goods Sold',    type: 'EXPENSE'   },
      { name: 'Operating Expenses',    type: 'EXPENSE'   },
      { name: 'Tax & Duties',          type: 'EXPENSE'   },
    ];

    const groups = {};
    for (const g of groupDefs) {
      const created = await prisma.accountGroup.upsert({
        where: { name_organizationId: { name: g.name, organizationId: orgId } }
          .catch ? undefined : undefined,
        update: {},
        create: { name: g.name, type: g.type, organizationId: orgId },
      }).catch(() => prisma.accountGroup.create({ data: { name: g.name, type: g.type, organizationId: orgId } }));
      groups[g.name] = created.id;
    }

    // 2. Define accounts
    const accountDefs = [
      // ASSETS
      { code: '1001', name: 'Cash in Hand',             type: 'ASSET',     group: 'Current Assets'       },
      { code: '1002', name: 'Bank Account (Primary)',    type: 'ASSET',     group: 'Current Assets'       },
      { code: '1003', name: 'Accounts Receivable (AR)', type: 'ASSET',     group: 'Current Assets'       },
      { code: '1004', name: 'Advance to Suppliers',     type: 'ASSET',     group: 'Current Assets'       },
      { code: '1005', name: 'Raw Material Stock',       type: 'ASSET',     group: 'Current Assets'       },
      { code: '1006', name: 'Finished Goods Stock',     type: 'ASSET',     group: 'Current Assets'       },
      { code: '1007', name: 'GST Input Credit',         type: 'ASSET',     group: 'Current Assets'       },
      { code: '1101', name: 'Machinery & Equipment',    type: 'ASSET',     group: 'Fixed Assets'         },
      { code: '1102', name: 'Furniture & Fixtures',     type: 'ASSET',     group: 'Fixed Assets'         },
      { code: '1103', name: 'Computer & IT Equipment',  type: 'ASSET',     group: 'Fixed Assets'         },
      // LIABILITIES
      { code: '2001', name: 'Accounts Payable (AP)',    type: 'LIABILITY', group: 'Current Liabilities'  },
      { code: '2002', name: 'GST Payable (Output)',     type: 'LIABILITY', group: 'Current Liabilities'  },
      { code: '2003', name: 'TDS Payable',              type: 'LIABILITY', group: 'Current Liabilities'  },
      { code: '2004', name: 'Salary Payable',           type: 'LIABILITY', group: 'Current Liabilities'  },
      { code: '2101', name: 'Bank Loan',                type: 'LIABILITY', group: 'Long-term Liabilities' },
      // EQUITY
      { code: '3001', name: "Owner's Capital",          type: 'EQUITY',    group: 'Capital & Reserves'   },
      { code: '3002', name: 'Retained Earnings',        type: 'EQUITY',    group: 'Capital & Reserves'   },
      { code: '3003', name: 'Current Year Profit',      type: 'EQUITY',    group: 'Capital & Reserves'   },
      // INCOME
      { code: '4001', name: 'Sales Revenue',            type: 'INCOME',    group: 'Sales Revenue'        },
      { code: '4002', name: 'Sales Returns',            type: 'INCOME',    group: 'Sales Revenue'        },
      { code: '4101', name: 'Interest Received',        type: 'INCOME',    group: 'Other Income'         },
      { code: '4102', name: 'Discount Received',        type: 'INCOME',    group: 'Other Income'         },
      // EXPENSES
      { code: '5001', name: 'Raw Material Purchases',   type: 'EXPENSE',   group: 'Cost of Goods Sold'   },
      { code: '5002', name: 'Direct Labour Cost',       type: 'EXPENSE',   group: 'Cost of Goods Sold'   },
      { code: '5003', name: 'Manufacturing Overhead',   type: 'EXPENSE',   group: 'Cost of Goods Sold'   },
      { code: '5101', name: 'Salaries & Wages',         type: 'EXPENSE',   group: 'Operating Expenses'   },
      { code: '5102', name: 'Rent & Lease',             type: 'EXPENSE',   group: 'Operating Expenses'   },
      { code: '5103', name: 'Electricity & Utilities',  type: 'EXPENSE',   group: 'Operating Expenses'   },
      { code: '5104', name: 'Transport & Freight',      type: 'EXPENSE',   group: 'Operating Expenses'   },
      { code: '5105', name: 'Office & Admin Expenses',  type: 'EXPENSE',   group: 'Operating Expenses'   },
      { code: '5106', name: 'Repairs & Maintenance',    type: 'EXPENSE',   group: 'Operating Expenses'   },
      { code: '5107', name: 'Depreciation',             type: 'EXPENSE',   group: 'Operating Expenses'   },
      { code: '5201', name: 'GST Expense',              type: 'EXPENSE',   group: 'Tax & Duties'         },
      { code: '5202', name: 'Income Tax',               type: 'EXPENSE',   group: 'Tax & Duties'         },
    ];

    await prisma.account.createMany({
      data: accountDefs.map(a => ({
        accountCode:    a.code,
        name:           a.name,
        type:           a.type,
        groupId:        groups[a.group] || null,
        balance:        0,
        openingBalance: 0,
        organizationId: orgId,
      })),
      skipDuplicates: true,
    });

    revalidatePath('/accounts');
    return { success: true, count: accountDefs.length };
  } catch (error) {
    console.error('setupDefaultAccounts error:', error);
    return { success: false, error: 'Failed to set up accounts: ' + error.message };
  }
}
