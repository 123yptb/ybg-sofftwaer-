'use server';

import prisma from '../prisma';
import { auth } from '@/auth';

/**
 * Fetches dashboard metrics from the local SQLite database.
 */
export async function getDashboardStats() {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return { success: false, error: 'Unauthorized' };
  }

  const orgId = session.user.organizationId;

  try {
    // Current Month start/end
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [invoices, bills, products] = await Promise.all([
      prisma.invoice.findMany({
        where: { organizationId: orgId },
        include: { customer: true }
      }),
      prisma.bill.findMany({
        where: { organizationId: orgId }
      }),
      prisma.product.findMany({
        where: { organizationId: orgId }
      })
    ]);

    // KPI computations
    const revenueMTD = invoices
      .filter(inv => inv.status === 'Paid' && inv.issueDate >= startOfMonth)
      .reduce((sum, inv) => sum + inv.totalAmount, 0);

    const totalAR = invoices
      .filter(inv => ['Draft', 'Sent', 'Overdue'].includes(inv.status))
      .reduce((sum, inv) => sum + inv.amountDue, 0);

    const totalAP = bills
      .filter(bill => ['Draft', 'Received'].includes(bill.status))
      .reduce((sum, bill) => sum + bill.amountDue, 0);

    const lowStockCount = products
      .filter(p => p.stockQuantity <= p.minStockLevel)
      .length;

    // Monthly chart data (last 6 months)
    const chartData = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      const monthLabel = d.toLocaleString('default', { month: 'short' });
      const year = d.getFullYear();
      const month = d.getMonth();

      const monthlyRevenue = invoices
        .filter(inv => 
          inv.status === 'Paid' && 
          inv.issueDate.getFullYear() === year && 
          inv.issueDate.getMonth() === month
        )
        .reduce((sum, inv) => sum + inv.totalAmount, 0);

      return { month: monthLabel, Revenue: monthlyRevenue };
    });

    return {
      success: true,
      data: {
        revenueMTD,
        totalAR,
        totalAP,
        lowStockCount,
        chartData,
        recentInvoices: invoices.slice(0, 8).map(inv => ({
          id: inv.id,
          invoice_number: inv.invoiceNumber,
          customer_name: inv.customer.name,
          issue_date: inv.issueDate,
          status: inv.status,
          total_amount: inv.totalAmount
        }))
      }
    };
  } catch (error) {
    console.error('Dashboard Stats Error:', error);
    return { success: false, error: 'Failed to fetch dashboard records.' };
  }
}
