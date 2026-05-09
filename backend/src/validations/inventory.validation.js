const { z } = require('zod');

const createProductSchema = z.object({
  body: z.object({
    sku:           z.string().min(1, 'SKU is required'),
    name:          z.string().min(1, 'Product name is required'),
    description:   z.string().optional(),
    category:      z.string().optional(),
    unitPrice:     z.number().min(0, 'Unit price cannot be negative'),
    costPrice:     z.number().min(0, 'Cost price cannot be negative').default(0),
    quantityOnHand: z.number().min(0, 'Initial quantity cannot be negative').default(0),
    reorderLevel:  z.number().min(0).default(0),
    unitOfMeasure: z.string().optional().default('unit'),
    isTracked:     z.boolean().optional().default(true),
  }),
});

const updateProductSchema = z.object({
  body: z.object({
    name:          z.string().min(1).optional(),
    description:   z.string().optional(),
    category:      z.string().optional(),
    unitPrice:     z.number().min(0).optional(),
    costPrice:     z.number().min(0).optional(),
    reorderLevel:  z.number().min(0).optional(),
    unitOfMeasure: z.string().optional(),
    isTracked:     z.boolean().optional(),
    isActive:      z.boolean().optional(),
  }),
});

const stockAdjustmentSchema = z.object({
  body: z.object({
    productId:     z.string().uuid('Invalid product ID'),
    // Signed delta: positive = add stock, negative = remove stock
    quantityDelta: z.number().refine(v => v !== 0, 'Quantity delta cannot be zero'),
    movementType:  z.enum([
      'PurchaseReceipt', 'ManualAdjustment', 'WriteOff', 'Return'
      // SaleDeduction is reserved for system use; users cannot manually trigger it
    ]),
    notes:         z.string().optional(),
  }),
});

module.exports = { createProductSchema, updateProductSchema, stockAdjustmentSchema };
