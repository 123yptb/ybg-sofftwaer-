const { z } = require('zod');

const createSupplierSchema = z.object({
  body: z.object({
    displayName:    z.string().min(1, 'Display name is required'),
    companyName:    z.string().optional(),
    email:          z.string().email('Invalid email').optional(),
    phone:          z.string().optional(),
    billingAddress: z.object({
      line1: z.string().optional(), line2: z.string().optional(),
      city: z.string().optional(),  state: z.string().optional(),
      postalCode: z.string().optional(), country: z.string().optional(),
    }).optional(),
    currencyCode:   z.string().length(3).optional(),
    notes:          z.string().optional(),
  }),
});

const updateSupplierSchema = z.object({
  body: z.object({
    displayName:    z.string().min(1).optional(),
    companyName:    z.string().optional(),
    email:          z.string().email().optional(),
    phone:          z.string().optional(),
    billingAddress: z.object({
      line1: z.string().optional(), line2: z.string().optional(),
      city: z.string().optional(),  state: z.string().optional(),
      postalCode: z.string().optional(), country: z.string().optional(),
    }).optional(),
    notes:          z.string().optional(),
    isActive:       z.boolean().optional(),
  }),
});

const billItemSchema = z.object({
  productId:   z.string().uuid().optional().nullable(),
  description: z.string().min(1, 'Line item description is required'),
  quantity:    z.number().refine(val => val !== 0, 'Quantity cannot be zero'),
  unitCost:    z.number().min(0, 'Unit cost cannot be negative'),
  taxRate:     z.number().min(0).max(1).default(0),
  lineOrder:   z.number().int().optional(),
});

const createBillSchema = z.object({
  body: z.object({
    supplierId:   z.string().uuid('Invalid supplier ID'),
    billNumber:   z.string().min(1, 'Bill number is required'),
    supplierRef:  z.string().optional(),
    issueDate:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Issue date must be YYYY-MM-DD'),
    dueDate:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be YYYY-MM-DD'),
    currencyCode: z.string().length(3).optional(),
    notes:        z.string().optional(),
    status:       z.enum(['Draft', 'Received']).optional().default('Draft'),
    items:        z.array(billItemSchema).min(1, 'At least one line item is required'),
  }).refine(d => new Date(d.dueDate) >= new Date(d.issueDate), {
    message: 'Due date must be on or after issue date',
    path: ['dueDate'],
  }),
});

const updateBillSchema = z.object({
  body: z.object({
    issueDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dueDate:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    supplierRef: z.string().optional(),
    notes:       z.string().optional(),
    items:       z.array(billItemSchema).min(1).optional(),
  }),
});

const updateBillStatusSchema = z.object({
  body: z.object({
    status: z.enum(['Draft', 'Received', 'Paid', 'Void']),
  }),
});

module.exports = {
  createSupplierSchema,
  updateSupplierSchema,
  createBillSchema,
  updateBillSchema,
  updateBillStatusSchema,
};
