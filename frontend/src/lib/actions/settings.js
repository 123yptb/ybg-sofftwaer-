'use server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';

export async function updateBusinessType(businessType) {
  const session = await auth();
  if (!session?.user?.organizationId) return { success: false, error: 'Unauthorized' };

  const allowed = ['MANUFACTURING', 'SERVICE', 'TRADING'];
  if (!allowed.includes(businessType)) return { success: false, error: 'Invalid business type' };

  try {
    const org = await prisma.organization.findUnique({ where: { id: session.user.organizationId } });
    if (!org) return { success: false, error: 'Organization not found. Please sign out and sign back in.' };

    await prisma.organization.update({
      where: { id: session.user.organizationId },
      data: { businessType },
    });
    return { success: true };
  } catch (error) {
    if (error.code === 'P2025') return { success: false, error: 'Organization not found. Please sign out.' };
    return { success: false, error: error.message };
  }
}

export async function getOrganizationSettings() {
  const session = await auth();
  if (!session?.user?.organizationId) return { success: false, error: 'Unauthorized' };

  try {
    const org = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
    });
    return { success: true, data: org };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function updateOrganizationSettings(data) {
  const session = await auth();
  if (!session?.user?.organizationId) return { success: false, error: 'Unauthorized' };

  try {
    const exists = await prisma.organization.findUnique({ where: { id: session.user.organizationId } });
    if (!exists) return { success: false, error: 'Organization not found. Please sign out and sign back in.' };

    const org = await prisma.organization.update({
      where: { id: session.user.organizationId },
      data: {
        name:           data.name,
        gstin:          data.gstin,
        panNumber:      data.panNumber,
        address:        data.address,
        phone:          data.phone,
        email:          data.email,
        currency:       data.currency,
        state:          data.state,
      },
    });
    return { success: true, data: org };
  } catch (error) {
    if (error.code === 'P2025') return { success: false, error: 'Organization not found. Please sign out.' };
    return { success: false, error: error.message };
  }
}
