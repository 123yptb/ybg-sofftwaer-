'use server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';

// ── Raw Materials ─────────────────────────────────────────────────────────────

export async function getAllStock() {
  const session = await auth();
  if (!session?.user?.organizationId) return { success: false, error: 'Unauthorized' };
  try {
    const data = await prisma.product.findMany({
      where: { organizationId: session.user.organizationId, isActive: true },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ],
    });
    return { success: true, data };
  } catch (e) { return { success: false, error: e.message }; }
}

export async function getRawMaterials() {
  const session = await auth();
  if (!session?.user?.organizationId) return { success: false, error: 'Unauthorized' };
  try {
    const data = await prisma.product.findMany({
      where: { organizationId: session.user.organizationId, category: 'RAW_MATERIAL', isActive: true },
      orderBy: { name: 'asc' },
    });
    return { success: true, data };
  } catch (e) { return { success: false, error: e.message }; }
}

export async function createRawMaterial(input) {
  const session = await auth();
  if (!session?.user?.organizationId) return { success: false, error: 'Unauthorized' };
  try {
    // Duplicate name check (case-insensitive)
    const existing = await prisma.product.findFirst({
      where: {
        organizationId: session.user.organizationId,
        category: 'RAW_MATERIAL',
        name: input.name.trim(),
      },
    });
    if (existing) return { success: false, error: `Raw material "${existing.name}" already exists.` };

    const data = await prisma.product.create({
      data: {
        name:           input.name.trim(),
        sku:            input.sku || null,
        description:    input.description || null,
        category:       'RAW_MATERIAL',
        unit:           input.unit || 'kg',
        costPrice:      parseFloat(input.costPrice) || 0,
        unitPrice:      parseFloat(input.costPrice) || 0,
        stockQuantity:  parseFloat(input.stockQuantity) || 0,
        minStockLevel:  parseFloat(input.minStockLevel) || 5,
        organizationId: session.user.organizationId,
      },
    });
    return { success: true, data };
  } catch (e) { return { success: false, error: e.message }; }
}

export async function updateRawMaterialStock(id, delta) {
  const session = await auth();
  if (!session?.user?.organizationId) return { success: false, error: 'Unauthorized' };
  try {
    const data = await prisma.product.update({
      where: { id },
      data: { stockQuantity: { increment: delta } },
    });
    return { success: true, data };
  } catch (e) { return { success: false, error: e.message }; }
}

// ── Finished Goods ────────────────────────────────────────────────────────────

export async function getFinishedGoods() {
  const session = await auth();
  if (!session?.user?.organizationId) return { success: false, error: 'Unauthorized' };
  try {
    const data = await prisma.product.findMany({
      where: { organizationId: session.user.organizationId, category: 'FINISHED_GOOD', isActive: true },
      orderBy: { name: 'asc' },
    });
    return { success: true, data };
  } catch (e) { return { success: false, error: e.message }; }
}

// ── Suppliers ─────────────────────────────────────────────────────────────────

export async function getSuppliers() {
  const session = await auth();
  if (!session?.user?.organizationId) return { success: false, error: 'Unauthorized' };
  try {
    const data = await prisma.contact.findMany({
      where: { organizationId: session.user.organizationId, type: 'SUPPLIER' },
      orderBy: { name: 'asc' },
    });
    return { success: true, data };
  } catch (e) { return { success: false, error: e.message }; }
}

export async function createSupplier(input) {
  const session = await auth();
  if (!session?.user?.organizationId) return { success: false, error: 'Unauthorized' };
  try {
    // Duplicate name check (case-insensitive)
    const existing = await prisma.contact.findFirst({
      where: {
        organizationId: session.user.organizationId,
        type: 'SUPPLIER',
        name: input.name.trim(),
      },
    });
    if (existing) return { success: false, error: `Supplier "${existing.name}" already exists.` };

    const data = await prisma.contact.create({
      data: {
        type:           'SUPPLIER',
        name:           input.name.trim(),
        email:          input.email || null,
        phone:          input.phone || null,
        gstin:          input.gstin || null,
        address:        input.address || null,
        organizationId: session.user.organizationId,
      },
    });
    return { success: true, data };
  } catch (e) { return { success: false, error: e.message }; }
}

export async function updateSupplier(id, input) {
  const session = await auth();
  if (!session?.user?.organizationId) return { success: false, error: 'Unauthorized' };
  try {
    const data = await prisma.contact.update({
      where: { id },
      data: {
        name:           input.name?.trim(),
        email:          input.email || null,
        phone:          input.phone || null,
        gstin:          input.gstin || null,
        address:        input.address || null,
      },
    });
    return { success: true, data };
  } catch (e) { return { success: false, error: e.message }; }
}

// ── Bills (Purchase Orders) ───────────────────────────────────────────────────

export async function getBills() {
  const session = await auth();
  if (!session?.user?.organizationId) return { success: false, error: 'Unauthorized' };
  try {
    const data = await prisma.bill.findMany({
      where: { organizationId: session.user.organizationId },
      include: { supplier: true, lineItems: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data };
  } catch (e) { return { success: false, error: e.message }; }
}

// ── Next Bill Number Preview ──────────────────────────────────────────────────

export async function getNextBillNumber() {
  const session = await auth();
  if (!session?.user?.organizationId) return { success: false, error: 'Unauthorized' };
  try {
    const lastBill = await prisma.bill.findFirst({
      where: { organizationId: session.user.organizationId },
      orderBy: { createdAt: 'desc' },
      select: { billNumber: true },
    });
    const lastNum = lastBill
      ? parseInt(lastBill.billNumber.replace('BILL-', ''), 10) || 0
      : 0;
    return { success: true, data: `BILL-${String(lastNum + 1).padStart(4, '0')}` };
  } catch (e) { return { success: false, error: e.message }; }
}

export async function createBill(input) {
  const session = await auth();
  if (!session?.user?.organizationId) return { success: false, error: 'Unauthorized' };
  try {
    // Determine starting bill number — prefer form-supplied value, fall back to DB lookup
    let billNumber = (input.purchaseBillNo || '').trim();
    if (!billNumber) {
      const lastBill = await prisma.bill.findFirst({
        where: { organizationId: session.user.organizationId },
        orderBy: { createdAt: 'desc' },
        select: { billNumber: true },
      });
      const lastNum = lastBill
        ? parseInt(lastBill.billNumber.replace('BILL-', ''), 10) || 0
        : 0;
      billNumber = `BILL-${String(lastNum + 1).padStart(4, '0')}`;
    }

    const lines       = input.lineItems || [];
    const subtotal    = lines.reduce((s, l) => s + (parseFloat(l.quantity)||1) * (parseFloat(l.unitPrice)||0), 0);
    const taxAmount   = lines.reduce((s, l) => s + (parseFloat(l.quantity)||1) * (parseFloat(l.unitPrice)||0) * ((parseFloat(l.taxRate)||0)/100), 0);
    const totalAmount = subtotal + taxAmount;

    // Retry up to 20 times in case billNumber already exists in DB
    for (let attempt = 0; attempt < 20; attempt++) {
      try {
        const bill = await prisma.$transaction(async (tx) => {
          const newBill = await tx.bill.create({
            data: {
              billNumber,
              supplierId:     input.supplierId,
              dueDate:        new Date(input.dueDate),
              notes:          input.notes || null,
              subtotal,
              taxAmount,
              totalAmount,
              amountDue:      totalAmount,
              status:         'Received',
              organizationId: session.user.organizationId,
              lineItems: {
                create: lines.map(l => ({
                  description: l.description,
                  quantity:    parseFloat(l.quantity) || 1,
                  unitPrice:   parseFloat(l.unitPrice) || 0,
                  taxRate:     parseFloat(l.taxRate) || 0,
                  amount:      (parseFloat(l.quantity)||1) * (parseFloat(l.unitPrice)||0),
                  productId:   l.productId || null,
                })),
              },
            },
            include: { supplier: true, lineItems: true },
          });

          // Update raw material stock
          for (const l of lines) {
            if (l.productId) {
              await tx.product.update({
                where: { id: l.productId },
                data: { stockQuantity: { increment: parseFloat(l.quantity) || 0 } },
              });
            }
          }

          return newBill;
        });

        return { success: true, data: bill };

      } catch (err) {
        // If unique constraint on billNumber → increment and retry
        if (err?.code === 'P2002' && err?.meta?.target?.toString().includes('billNumber')) {
          const num = parseInt(billNumber.replace('BILL-', ''), 10) || 0;
          billNumber = `BILL-${String(num + 1).padStart(4, '0')}`;
          continue;
        }
        throw err; // Any other error — propagate immediately
      }
    }

    return { success: false, error: 'Could not generate a unique bill number after 20 attempts.' };
  } catch (e) { return { success: false, error: e.message }; }
}

export async function updateBill(id, input) {
  const session = await auth();
  if (!session?.user?.organizationId) return { success: false, error: 'Unauthorized' };
  try {
    const lines = input.lineItems || [];
    const subtotal    = lines.reduce((s, l) => s + (parseFloat(l.quantity)||1) * (parseFloat(l.unitPrice)||0), 0);
    const taxAmount   = lines.reduce((s, l) => s + (parseFloat(l.quantity)||1) * (parseFloat(l.unitPrice)||0) * ((parseFloat(l.taxRate)||0)/100), 0);
    const totalAmount = subtotal + taxAmount;

    const data = await prisma.$transaction(async (tx) => {
      // Delete old line items and recreate with updated values
      await tx.billLineItem.deleteMany({ where: { billId: id } });

      return tx.bill.update({
        where: { id },
        data: {
          supplierId:  input.supplierId,
          dueDate:     new Date(input.dueDate),
          notes:       input.notes || null,
          status:      input.status,
          subtotal,
          taxAmount,
          totalAmount,
          amountDue:   totalAmount,
          lineItems: {
            create: lines.map(l => ({
              description: l.description || '',
              quantity:    parseFloat(l.quantity) || 1,
              unitPrice:   parseFloat(l.unitPrice) || 0,
              taxRate:     parseFloat(l.taxRate) || 0,
              amount:      (parseFloat(l.quantity)||1) * (parseFloat(l.unitPrice)||0),
              productId:   l.productId || null,
            })),
          },
        },
        include: { supplier: true, lineItems: { include: { product: true } } },
      });
    });

    return { success: true, data };
  } catch (e) { return { success: false, error: e.message }; }
}

// ── Production Orders ─────────────────────────────────────────────────────────

export async function getProductionOrders() {
  const session = await auth();
  if (!session?.user?.organizationId) return { success: false, error: 'Unauthorized' };
  try {
    const rawData = await prisma.productionOrder.findMany({
      where: { organizationId: session.user.organizationId },
      include: {
        materials: { include: { product: true } },
        product: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = rawData.map(o => {
      let meta = { text: o.notes, laborCost: 0, overheadCost: 0 };
      try { meta = JSON.parse(o.notes); } catch(e){}
      return {
        ...o,
        finishedGoodName: o.product?.name || 'Unknown',
        finishedGoodSku: o.product?.sku || '',
        finishedGoodUnit: o.product?.unit || 'pcs',
        quantityToProduce: o.quantityYield,
        laborCost: meta.laborCost || 0,
        overheadCost: meta.overheadCost || 0,
        notes: meta.text || o.notes,
        startDate: o.date,
        materials: o.materials.map(m => ({
           id: m.id,
           rawMaterialId: m.productId,
           quantityNeeded: m.quantityConsumed,
           quantityUsed: (o.status === 'COMPLETED' || o.status === 'Completed') ? m.quantityConsumed : 0,
           rawMaterial: m.product
        }))
      };
    });

    return { success: true, data };
  } catch (e) { return { success: false, error: e.message }; }
}

export async function createProductionOrder(input) {
  const session = await auth();
  if (!session?.user?.organizationId) return { success: false, error: 'Unauthorized' };
  try {
    const lastOrder = await prisma.productionOrder.findFirst({
      where: { organizationId: session.user.organizationId },
      orderBy: { createdAt: 'desc' },
      select: { orderNumber: true },
    });
    const lastNum = lastOrder
      ? parseInt(lastOrder.orderNumber.replace('PO-', ''), 10) || 0
      : 0;
    const orderNumber = `PO-${String(lastNum + 1).padStart(4, '0')}`;

    let product = await prisma.product.findFirst({
      where: { name: input.finishedGoodName, category: 'FINISHED_GOOD', organizationId: session.user.organizationId }
    });
    if (!product) {
       product = await prisma.product.create({
         data: {
            name: input.finishedGoodName,
            sku: input.finishedGoodSku || null,
            category: 'FINISHED_GOOD',
            unit: input.finishedGoodUnit || 'pcs',
            organizationId: session.user.organizationId
         }
       });
    }

    const notesMeta = JSON.stringify({
       text: input.notes || '',
       laborCost: parseFloat(input.laborCost) || 0,
       overheadCost: parseFloat(input.overheadCost) || 0
    });

    const data = await prisma.productionOrder.create({
      data: {
        orderNumber,
        date: input.startDate ? new Date(input.startDate) : new Date(),
        productId: product.id,
        quantityYield: parseFloat(input.quantityToProduce) || 1,
        status: 'Planned',
        notes: notesMeta,
        organizationId: session.user.organizationId,
        materials: {
          create: (input.materials || []).map(m => ({
            productId: m.rawMaterialId,
            quantityConsumed: parseFloat(m.quantityNeeded) || 0
          })),
        },
      },
    });

    return { success: true, data };
  } catch (e) { return { success: false, error: e.message }; }
}

export async function completeProductionOrder(orderId) {
  const session = await auth();
  if (!session?.user?.organizationId) return { success: false, error: 'Unauthorized' };
  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.productionOrder.findUnique({
        where: { id: orderId },
        include: { materials: { include: { product: true } }, product: true },
      });
      if (!order) throw new Error('Order not found');
      if (order.status === 'COMPLETED' || order.status === 'Completed') throw new Error('Already completed');

      let meta = { text: '', laborCost: 0, overheadCost: 0 };
      try { meta = JSON.parse(order.notes); } catch(e){}

      let materialsCost = 0;
      for (const mat of order.materials) {
        if ((mat.product.stockQuantity || 0) < mat.quantityConsumed) {
          throw new Error(`Insufficient stock for ${mat.product.name}. Need ${mat.quantityConsumed}, but have ${mat.product.stockQuantity}.`);
        }
        await tx.product.update({
          where: { id: mat.productId },
          data: { stockQuantity: { decrement: mat.quantityConsumed } },
        });
        materialsCost += mat.quantityConsumed * (mat.product.costPrice || 0);
      }

      const totalCost = materialsCost + ((meta.laborCost + meta.overheadCost) * order.quantityYield);
      const newQuantity = (order.product.stockQuantity || 0) + order.quantityYield;
      const currentTotalValue = (order.product.stockQuantity || 0) * (order.product.costPrice || 0);
      const newCostPrice = newQuantity > 0 ? (currentTotalValue + totalCost) / newQuantity : order.product.costPrice;

      const updatedProduct = await tx.product.update({
        where: { id: order.productId },
        data: { 
          stockQuantity: newQuantity,
          costPrice: newCostPrice,
          unitPrice: newCostPrice * 1.3
        },
      });

      const updated = await tx.productionOrder.update({
        where: { id: orderId },
        data: { status: 'Completed' },
      });

      return { order: updated, finishedProduct: updatedProduct };
    });

    return { success: true, data: result };
  } catch (e) { return { success: false, error: e.message }; }
}

// ── Bills of Material (BOM) ───────────────────────────────────────────────────

export async function getBOMs() {
  const session = await auth();
  if (!session?.user?.organizationId) return { success: false, error: 'Unauthorized' };
  try {
    const rawData = await prisma.billOfMaterial.findMany({
      where: { organizationId: session.user.organizationId },
      include: {
        product: true,
        items: { include: { rawMaterial: true } },
      },
    });
    const data = rawData.map(b => ({
      id: b.id,
      name: b.product?.name || 'Unknown BOM',
      finishedGood: b.product,
      materials: b.items.map(i => ({
        id: i.id,
        rawMaterialId: i.rawMaterialId,
        quantity: i.quantityRequired,
        rawMaterial: i.rawMaterial
      }))
    }));
    return { success: true, data };
  } catch (e) { return { success: false, error: e.message }; }
}

export async function createBOM(input) {
  const session = await auth();
  if (!session?.user?.organizationId) return { success: false, error: 'Unauthorized' };
  try {
    let productId = input.finishedGoodId;
    if (!productId) {
      const p = await prisma.product.create({
        data: {
          name: input.name || 'New BOM Product',
          category: 'FINISHED_GOOD',
          organizationId: session.user.organizationId
        }
      });
      productId = p.id;
    }
    const data = await prisma.billOfMaterial.create({
      data: {
        productId: productId,
        organizationId: session.user.organizationId,
        items: {
          create: (input.materials || []).map(m => ({
            rawMaterialId: m.rawMaterialId,
            quantityRequired: parseFloat(m.quantity) || 0,
          })),
        },
      },
    });
    return { success: true, data };
  } catch (e) { return { success: false, error: e.message }; }
}

export async function deleteBOM(id) {
  const session = await auth();
  if (!session?.user?.organizationId) return { success: false, error: 'Unauthorized' };
  try {
    await prisma.billOfMaterial.delete({ where: { id } });
    return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
}

export async function getAllInventory() {
  const session = await auth();
  if (!session?.user?.organizationId) return { success: false, error: 'Unauthorized' };
  try {
    const data = await prisma.product.findMany({
      where: { 
        organizationId: session.user.organizationId,
        category: { in: ['RAW_MATERIAL', 'FINISHED_GOOD', 'PRODUCT'] }
      },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    });
    return { success: true, data };
  } catch (e) { return { success: false, error: e.message }; }
}

// ── Delete Actions ────────────────────────────────────────────────────────────

export async function deleteRawMaterial(id) {
  const session = await auth();
  if (!session?.user?.organizationId) return { success: false, error: 'Unauthorized' };
  try {
    await prisma.product.delete({ where: { id, organizationId: session.user.organizationId } });
    revalidatePath('/raw-materials');
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Cannot delete: Item might be in use.' };
  }
}

export async function deleteFinishedGood(id) {
  const session = await auth();
  if (!session?.user?.organizationId) return { success: false, error: 'Unauthorized' };
  try {
    await prisma.product.delete({ where: { id, organizationId: session.user.organizationId } });
    revalidatePath('/products');
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Cannot delete: Item might be in use.' };
  }
}

export async function deleteBill(id) {
  const session = await auth();
  if (!session?.user?.organizationId) return { success: false, error: 'Unauthorized' };
  try {
    await prisma.billLineItem.deleteMany({ where: { billId: id } });
    await prisma.bill.delete({ where: { id, organizationId: session.user.organizationId } });
    revalidatePath('/bills');
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to delete bill.' };
  }
}
