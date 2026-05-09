const { z } = require('zod');

const createAccountSchema = z.object({
  body: z.object({
    accountCode: z.string().min(1, 'Account code is required'),
    name: z.string().min(1, 'Account name is required'),
    type: z.enum(['Asset', 'Liability', 'Equity', 'Revenue', 'Expense']),
    subType: z.string().optional(),
    description: z.string().optional(),
    parentAccountId: z.string().uuid('Invalid parent ID').optional().nullable(),
  }),
});

const updateAccountSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    subType: z.string().optional(),
    description: z.string().optional(),
  }),
});

const journalLineSchema = z.object({
  accountId: z.string().uuid('Invalid account ID'),
  debitAmount: z.number().min(0).default(0),
  creditAmount: z.number().min(0).default(0),
  memo: z.string().optional(),
}).refine(data => {
  // Enforce XOR pattern: only debit or credit should be > 0
  const isDebit = data.debitAmount > 0;
  const isCredit = data.creditAmount > 0;
  return isDebit !== isCredit;
}, {
  message: "Each line must have strictly a debit OR a credit amount greater than 0.",
});

const createJournalEntrySchema = z.object({
  body: z.object({
    entryNumber: z.string().min(1, 'Entry number is required'),
    description: z.string().min(1, 'Description is required'),
    transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Transaction date must be YYYY-MM-DD"),
    period: z.string().regex(/^\d{4}-\d{2}$/, "Period must be YYYY-MM"),
    lines: z.array(journalLineSchema).min(2, "At least 2 lines required for double-entry bookkeeping"),
    status: z.enum(['Draft', 'Posted']).optional().default('Draft'),
  }).refine(data => {
    // If strict API balance validation is required (even for drafts, to prevent bad data entry)
    const totalDebit = data.lines.reduce((sum, line) => sum + (line.debitAmount || 0), 0);
    const totalCredit = data.lines.reduce((sum, line) => sum + (line.creditAmount || 0), 0);
    return Number(totalDebit).toFixed(4) === Number(totalCredit).toFixed(4);
  }, { message: "Total debits must equal total credits inside the journal entry." }),
});

const updateJournalStatusSchema = z.object({
  body: z.object({
    status: z.enum(['Posted', 'Void']),
  })
});

module.exports = {
  createAccountSchema, 
  updateAccountSchema, 
  createJournalEntrySchema, 
  updateJournalStatusSchema
};
