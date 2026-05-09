const { z } = require('zod');

const createPaymentSchema = z.object({
  body: z.object({
    entityType:    z.enum(['Customer', 'Supplier', 'Account']),
    entityId:      z.string().uuid('Invalid entity ID'),
    amount:        z.number().positive('Amount must be positive'),
    method:        z.enum(['Cash', 'Bank', 'Cheque']),
    type:          z.enum(['Receipt', 'Payment']),
    paymentDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
    referenceNo:   z.string().optional(),
    notes:         z.string().optional(),
    
    // Cheque details (required if method is 'Cheque')
    chequeDetails: z.object({
      chequeNo:     z.string().min(1, 'Cheque number is required'),
      bankName:     z.string().min(1, 'Bank name is required'),
      branch:       z.string().optional(),
      chequeDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Cheque date must be YYYY-MM-DD'),
      maturityDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Maturity date must be YYYY-MM-DD'),
    }).optional(),
  }).refine(data => {
    if (data.method === 'Cheque' && !data.chequeDetails) return false;
    return true;
  }, {
    message: 'Cheque details are required when payment method is Cheque',
    path: ['chequeDetails'],
  }),
});

const verifyChequeSchema = z.object({
  body: z.object({
    clearingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Clearing date must be YYYY-MM-DD'),
    status:       z.enum(['Cleared', 'Returned']).default('Cleared'),
  }),
});

module.exports = { createPaymentSchema, verifyChequeSchema };
