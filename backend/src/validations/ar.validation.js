const { z } = require('zod');

// ── Customer Schemas ──────────────────────────────────────────────────────────

const addressSchema = z.object({
  line1:       z.string().optional(),
  line2:       z.string().optional(),
  city:        z.string().optional(),
  state:       z.string().optional(),
  postalCode:  z.string().optional(),
  country:     z.string().optional(),
}).optional();

const createCustomerSchema = z.object({
  body: z.object({
    displayName:     z.string().min(1, 'Display name is required'),
    companyName:     z.string().optional(),
    email:           z.string().email('Invalid email').optional(),
    phone:           z.string().optional(),
    billingAddress:  addressSchema,
    shippingAddress: addressSchema,
    currencyCode:    z.string().length(3).optional(),
    notes:           z.string().optional(),
  }),
});

const updateCustomerSchema = z.object({
  body: z.object({
    displayName:     z.string().min(1).optional(),
    companyName:     z.string().optional(),
    email:           z.string().email().optional(),
    phone:           z.string().optional(),
    billingAddress:  addressSchema,
    shippingAddress: addressSchema,
    notes:           z.string().optional(),
    isActive:        z.boolean().optional(),
  }),
});

// ── Invoice Schemas ───────────────────────────────────────────────────────────

const invoiceItemSchema = z.object({
  productId:   z.string().uuid().optional().nullable(),
  description: z.string().min(1, 'Line item description is required'),
  quantity:    z.number().refine(val => val !== 0, 'Quantity cannot be zero'),
  unitPrice:   z.number().min(0, 'Unit price cannot be negative'),
  taxRate:     z.number().min(0).max(1, 'Tax rate must be a decimal between 0 and 1').default(0),
  lineOrder:   z.number().int().optional(),
});

const createInvoiceSchema = z.object({
  body: z.object({
    customerId:    z.string().uuid('Invalid customer ID'),
    invoiceNumber: z.string().min(1, 'Invoice number is required'),
    issueDate:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Issue date must be YYYY-MM-DD'),
    dueDate:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be YYYY-MM-DD'),
    currencyCode:  z.string().length(3).optional(),
    notes:         z.string().optional(),
    status:        z.enum(['Draft', 'Sent']).optional().default('Draft'),
    items:         z.array(invoiceItemSchema).min(1, 'At least one line item is required'),
  }).refine(d => new Date(d.dueDate) >= new Date(d.issueDate), {
    message: 'Due date must be on or after the issue date',
    path: ['dueDate'],
  }),
});

const updateInvoiceSchema = z.object({
  body: z.object({
    issueDate:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dueDate:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    notes:      z.string().optional(),
    items:      z.array(invoiceItemSchema).min(1).optional(),
  }),
});

const updateInvoiceStatusSchema = z.object({
  body: z.object({
    status: z.enum(['Draft', 'Sent', 'Paid', 'Void']),
  }),
});

module.exports = {
  createCustomerSchema,
  updateCustomerSchema,
  createInvoiceSchema,
  updateInvoiceSchema,
  updateInvoiceStatusSchema,
};
