'use server';

import prisma from '../prisma';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';

// ── Customers ─────────────────────────────────────────────────────────────────

export async function getCustomers() {
  const session = await auth();
  if (!session?.user?.organizationId) return { success: false, error: 'Unauthorized' };
  try {
    const customers = await prisma.contact.findMany({
      where: { organizationId: session.user.organizationId, type: 'CUSTOMER' },
      orderBy: { name: 'asc' },
    });
    return { success: true, data: customers };
  } catch (e) {
    return { success: false, error: 'Failed to fetch customers.' };
  }
}

export async function createCustomer(data) {
  const session = await auth();
  if (!session?.user?.organizationId) return { success: false, error: 'Unauthorized' };

  const { name, email, phone, address, gstin } = data;
  if (!name) return { success: false, error: 'Customer name is required.' };

  try {
    const customer = await prisma.contact.create({
      data: { type: 'CUSTOMER', name, email, phone, address, gstin, organizationId: session.user.organizationId },
    });
    revalidatePath('/invoices');
    revalidatePath('/receipts');
    return { success: true, data: customer };
  } catch (e) {
    return { success: false, error: e.message || 'Failed to create customer.' };
  }
}

// ── Invoices ──────────────────────────────────────────────────────────────────

/**
 * Generate a sequential invoice number like INV-0001
 */
async function nextInvoiceNumber(orgId) {
  const last = await prisma.invoice.findFirst({
    where: { organizationId: orgId },
    orderBy: { createdAt: 'desc' },
    select: { invoiceNumber: true },
  });
  if (!last) return 'INV-0001';
  const num = parseInt(last.invoiceNumber.replace(/\D/g, ''), 10) + 1;
  return `INV-${String(num).padStart(4, '0')}`;
}

export async function getInvoices() {
  const session = await auth();
  if (!session?.user?.organizationId) return { success: false, error: 'Unauthorized' };
  try {
    const invoices = await prisma.invoice.findMany({
      where: { organizationId: session.user.organizationId },
      include: { customer: true, lineItems: true, receipts: true },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data: invoices };
  } catch (e) {
    console.error(e);
    return { success: false, error: 'Failed to fetch invoices.' };
  }
}

export async function getInvoiceById(id) {
  const session = await auth();
  if (!session?.user?.organizationId) return { success: false, error: 'Unauthorized' };
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { customer: true, lineItems: true, receipts: { include: { customer: true } } },
    });
    if (!invoice || invoice.organizationId !== session.user.organizationId)
      return { success: false, error: 'Invoice not found.' };
    return { success: true, data: invoice };
  } catch (e) {
    return { success: false, error: 'Failed to fetch invoice.' };
  }
}

export async function createInvoice(data) {
  const session = await auth();
  if (!session?.user?.organizationId) return { success: false, error: 'Unauthorized' };
  const orgId = session.user.organizationId;

  const { customerId, dueDate, notes, lineItems } = data;

  if (!customerId) return { success: false, error: 'Customer is required.' };
  if (!dueDate)    return { success: false, error: 'Due date is required.' };
  if (!lineItems?.length) return { success: false, error: 'At least one line item is required.' };

  // Compute totals
  let subtotal  = 0;
  let taxAmount = 0;
  const items = lineItems.map(item => {
    const qty   = parseFloat(item.quantity)  || 1;
    const price = parseFloat(item.unitPrice) || 0;
    const tax   = parseFloat(item.taxRate)   || 0;
    const amount = qty * price;
    const itemTax = amount * (tax / 100);
    subtotal  += amount;
    taxAmount += itemTax;
    return { description: item.description, quantity: qty, unitPrice: price, taxRate: tax, amount, productId: item.productId || null };
  });
  const totalAmount = subtotal + taxAmount;

  let invoiceNumber = await nextInvoiceNumber(orgId);

  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      const invoice = await prisma.$transaction(async (tx) => {
        const inv = await tx.invoice.create({
          data: {
            invoiceNumber,
            customerId,
            dueDate: new Date(dueDate),
            notes,
            subtotal,
            taxAmount,
            totalAmount,
            amountDue: totalAmount,
            organizationId: orgId,
            lineItems: { create: items },
          },
          include: { customer: true, lineItems: true },
        });

        // Deduct stock for each line item that is linked to a product
        for (const item of items) {
          if (item.productId) {
            await tx.product.update({
              where: { id: item.productId },
              data: { stockQuantity: { decrement: item.quantity } }
            });
          }
        }
        return inv;
      });
      revalidatePath('/invoices');
      revalidatePath('/dashboard');
      return { success: true, data: invoice };
    } catch (e) {
      if (e.code === 'P2002' && e.meta?.target?.includes('invoiceNumber')) {
        const num = parseInt(invoiceNumber.replace('INV-', ''), 10) + 1;
        invoiceNumber = `INV-${String(num).padStart(4, '0')}`;
        continue;
      }
      console.error(e);
      return { success: false, error: e.message || 'Failed to create invoice.' };
    }
  }
  return { success: false, error: 'Failed to generate a unique invoice number after multiple attempts.' };
}

export async function updateInvoiceStatus(id, status) {
  const session = await auth();
  if (!session?.user?.organizationId) return { success: false, error: 'Unauthorized' };
  try {
    await prisma.invoice.update({
      where: { id },
      data: { status },
    });
    revalidatePath('/invoices');
    return { success: true };
  } catch (e) {
    return { success: false, error: 'Failed to update invoice status.' };
  }
}

export async function updateInvoice(id, data) {
  const session = await auth();
  if (!session?.user?.organizationId) return { success: false, error: 'Unauthorized' };
  const { customerId, dueDate, notes, status, lineItems } = data;
  try {
    let subtotal = 0, taxAmount = 0;
    const items = (lineItems || []).map(item => {
      const qty   = parseFloat(item.quantity)  || 1;
      const price = parseFloat(item.unitPrice) || 0;
      const tax   = parseFloat(item.taxRate)   || 0;
      const amount = qty * price;
      subtotal  += amount;
      taxAmount += amount * (tax / 100);
      return { description: item.description, quantity: qty, unitPrice: price, taxRate: tax, amount, productId: item.productId || null };
    });
    const totalAmount = subtotal + taxAmount;

    const invoice = await prisma.$transaction(async (tx) => {
      // Get old line items and add stock back
      const oldItems = await tx.invoiceLineItem.findMany({ where: { invoiceId: id } });
      for (const oldItem of oldItems) {
        if (oldItem.productId) {
          await tx.product.update({
            where: { id: oldItem.productId },
            data: { stockQuantity: { increment: oldItem.quantity } }
          });
        }
      }

      // Delete old line items and recreate
      await tx.invoiceLineItem.deleteMany({ where: { invoiceId: id } });
      const updatedInv = await tx.invoice.update({
        where: { id },
        data: {
          customerId,
          dueDate:     new Date(dueDate),
          notes:       notes || null,
          status:      status || 'Draft',
          subtotal,
          taxAmount,
          totalAmount,
          amountDue:   totalAmount,
          lineItems:   { create: items },
        },
        include: { customer: true, lineItems: true },
      });

      // Deduct stock for new items
      for (const item of items) {
        if (item.productId) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stockQuantity: { decrement: item.quantity } }
          });
        }
      }
      return updatedInv;
    });
    revalidatePath('/invoices');
    return { success: true, data: invoice };
  } catch (e) {
    return { success: false, error: e.message || 'Failed to update invoice.' };
  }
}

// ── Receipts ──────────────────────────────────────────────────────────────────

async function nextReceiptNumber(orgId) {
  const last = await prisma.receipt.findFirst({
    where: { organizationId: orgId },
    orderBy: { createdAt: 'desc' },
    select: { receiptNumber: true },
  });
  if (!last) return 'RCP-0001';
  const num = parseInt(last.receiptNumber.replace(/\D/g, ''), 10) + 1;
  return `RCP-${String(num).padStart(4, '0')}`;
}

export async function getReceipts() {
  const session = await auth();
  if (!session?.user?.organizationId) return { success: false, error: 'Unauthorized' };
  try {
    const receipts = await prisma.receipt.findMany({
      where: { organizationId: session.user.organizationId },
      include: { customer: true, invoice: true },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data: receipts };
  } catch (e) {
    return { success: false, error: 'Failed to fetch receipts.' };
  }
}

// ── Delete Actions ────────────────────────────────────────────────────────────

export async function deleteInvoice(id) {
  const session = await auth();
  if (!session?.user?.organizationId) return { success: false, error: 'Unauthorized' };
  
  try {
    // Delete the invoice (Prisma will cascade delete LineItems if configured, otherwise we should delete them first)
    // Wait, let's delete line items first to be safe, or just rely on cascade
    await prisma.invoiceLineItem.deleteMany({ where: { invoiceId: id } });
    await prisma.invoice.delete({ where: { id, organizationId: session.user.organizationId } });
    
    revalidatePath('/invoices');
    return { success: true };
  } catch (error) {
    console.error('Delete Invoice Error:', error);
    return { success: false, error: 'Failed to delete invoice.' };
  }
}

export async function createReceipt(data) {
  const session = await auth();
  if (!session?.user?.organizationId) return { success: false, error: 'Unauthorized' };
  const orgId = session.user.organizationId;

  const { customerId, invoiceId, amount, method, reference, notes, date } = data;

  if (!customerId) return { success: false, error: 'Customer is required.' };
  if (!amount || parseFloat(amount) <= 0) return { success: false, error: 'Amount must be greater than 0.' };

  try {
    const receiptNumber = await nextReceiptNumber(orgId);

    const receipt = await prisma.$transaction(async (tx) => {
      const r = await tx.receipt.create({
        data: {
          receiptNumber,
          customerId,
          invoiceId: invoiceId || null,
          amount: parseFloat(amount),
          method: method || 'Cash',
          reference: reference || null,
          notes: notes || null,
          date: date ? new Date(date) : new Date(),
          organizationId: orgId,
        },
        include: { customer: true, invoice: true },
      });

      // If linked to an invoice, update its amountPaid / amountDue / status
      if (invoiceId) {
        const inv = await tx.invoice.findUnique({ where: { id: invoiceId } });
        if (inv) {
          const newPaid = inv.amountPaid + parseFloat(amount);
          const newDue  = Math.max(0, inv.totalAmount - newPaid);
          const newStatus = newDue <= 0 ? 'Paid' : inv.status;
          await tx.invoice.update({
            where: { id: invoiceId },
            data: { amountPaid: newPaid, amountDue: newDue, status: newStatus },
          });
        }
      }

      return r;
    });

    revalidatePath('/receipts');
    revalidatePath('/invoices');
    revalidatePath('/dashboard');
    return { success: true, data: receipt };
  } catch (e) {
    console.error(e);
    return { success: false, error: e.message || 'Failed to create receipt.' };
  }
}
