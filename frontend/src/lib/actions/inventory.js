'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

// ── Global Inventory ──────────────────────────────────────────────────────────

export async function getGlobalInventory() {
  const session = await auth();
  if (!session?.user?.organizationId) return { success: false, error: 'Unauthorized' };
  try {
    const products = await prisma.product.findMany({
      where: { organizationId: session.user.organizationId },
      orderBy: [
        { type: 'asc' },
        { name: 'asc' }
      ]
    });
    return { success: true, data: products };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function createProduct(input) {
  const session = await auth();
  if (!session?.user?.organizationId) return { success: false, error: 'Unauthorized' };
  try {
    const data = await prisma.product.create({
      data: {
        name: input.name.trim(),
        description: input.description || null,
        type: input.type || 'FINISHED_GOOD',
        unit: input.unit || 'pcs',
        sku: input.sku || null,
        purchasePrice: parseFloat(input.purchasePrice) || 0,
        salePrice: parseFloat(input.salePrice) || 0,
        stockQuantity: parseFloat(input.stockQuantity) || 0,
        minStockLevel: parseFloat(input.minStockLevel) || 0,
        organizationId: session.user.organizationId,
      }
    });

    if (data.stockQuantity > 0) {
      await prisma.stockLedger.create({
        data: {
          productId: data.id,
          type: 'PURCHASE', // Initial stock treated as purchase/inbound
          quantity: data.stockQuantity,
          description: 'Initial Stock',
          organizationId: session.user.organizationId,
        }
      });
    }

    revalidatePath('/inventory');
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function updateProduct(id, input) {
  const session = await auth();
  if (!session?.user?.organizationId) return { success: false, error: 'Unauthorized' };
  try {
    const data = await prisma.product.update({
      where: { id, organizationId: session.user.organizationId },
      data: {
        name: input.name.trim(),
        description: input.description || null,
        type: input.type || 'FINISHED_GOOD',
        unit: input.unit || 'pcs',
        sku: input.sku || null,
        purchasePrice: parseFloat(input.purchasePrice) || 0,
        salePrice: parseFloat(input.salePrice) || 0,
        minStockLevel: parseFloat(input.minStockLevel) || 0,
      }
    });
    revalidatePath('/inventory');
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function deleteProduct(id) {
  const session = await auth();
  if (!session?.user?.organizationId) return { success: false, error: 'Unauthorized' };
  try {
    await prisma.product.delete({
      where: { id, organizationId: session.user.organizationId },
    });
    revalidatePath('/inventory');
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ── Production Studio ─────────────────────────────────────────────────────────

export async function getBOMTemplates() {
  const session = await auth();
  if (!session?.user?.organizationId) return { success: false, error: 'Unauthorized' };
  try {
    const templates = await prisma.billOfMaterial.findMany({
      where: { organizationId: session.user.organizationId },
      include: {
        product: true,
        items: {
          include: { rawMaterial: true }
        }
      }
    });
    return { success: true, data: templates };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function createProductionEntry(input) {
  const session = await auth();
  if (!session?.user?.organizationId) return { success: false, error: 'Unauthorized' };
  
  const orgId = session.user.organizationId;
  
  try {
    const lastOrder = await prisma.productionOrder.findFirst({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      select: { orderNumber: true },
    });
    const lastNum = lastOrder ? parseInt(lastOrder.orderNumber.replace('PO-', ''), 10) || 0 : 0;
    const orderNumber = `PO-${String(lastNum + 1).padStart(4, '0')}`;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the Production Order
      const order = await tx.productionOrder.create({
        data: {
          orderNumber,
          productId: input.finishedGoodId,
          quantityYield: parseFloat(input.quantityYield),
          status: 'COMPLETED',
          notes: input.notes || 'Produced via Production Studio',
          organizationId: orgId,
          materials: {
            create: input.materials.map(m => ({
              productId: m.rawMaterialId,
              quantityConsumed: parseFloat(m.quantityConsumed)
            }))
          }
        },
        include: { materials: true }
      });

      // 2. Add Stock Ledger & Product updates for Raw Materials (Deduction)
      for (const mat of order.materials) {
        // Decrease RM stock
        await tx.product.update({
          where: { id: mat.productId },
          data: { stockQuantity: { decrement: mat.quantityConsumed } }
        });

        // Add Ledger Entry
        await tx.stockLedger.create({
          data: {
            productId: mat.productId,
            type: 'PRODUCTION_OUT',
            quantity: -mat.quantityConsumed,
            referenceId: order.id,
            description: `Consumed for ${orderNumber}`,
            organizationId: orgId,
          }
        });
      }

      // 3. Add Stock Ledger & Product updates for Finished Good (Addition)
      await tx.product.update({
        where: { id: order.productId },
        data: { stockQuantity: { increment: order.quantityYield } }
      });

      await tx.stockLedger.create({
        data: {
          productId: order.productId,
          type: 'PRODUCTION_IN',
          quantity: order.quantityYield,
          referenceId: order.id,
          description: `Yield from ${orderNumber}`,
          organizationId: orgId,
        }
      });

      return order;
    });

    revalidatePath('/inventory');
    revalidatePath('/production-studio');
    return { success: true, data: result };

  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function createBOMTemplate(input) {
  const session = await auth();
  if (!session?.user?.organizationId) return { success: false, error: 'Unauthorized' };
  try {
    const bom = await prisma.billOfMaterial.create({
      data: {
        productId: input.finishedGoodId,
        organizationId: session.user.organizationId,
        items: {
          create: input.items.map(i => ({
            rawMaterialId: i.rawMaterialId,
            quantityRequired: parseFloat(i.quantityRequired)
          }))
        }
      }
    });
    return { success: true, data: bom };
  } catch (e) {
    return { success: false, error: e.message };
  }
}
