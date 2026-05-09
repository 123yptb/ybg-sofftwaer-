'use server';

import prisma from '../prisma';
import { revalidatePath } from 'next/cache';

/**
 * Initiates a new service request.
 */
export async function createServiceRequest(data) {
  const { type, feeAmount, organizationId } = data;

  if (!type || !organizationId) {
    return { success: false, error: 'Missing required service information.' };
  }

  try {
    const request = await prisma.serviceRequest.create({
      data: {
        type,
        feeAmount: Number(feeAmount) || 0,
        organizationId,
        status: 'PENDING',
      },
    });

    revalidatePath('/dashboard/services');
    return { success: true, data: request };
  } catch (error) {
    console.error('Failed to create service request:', error);
    return { success: false, error: 'Failed to submit service request.' };
  }
}

/**
 * Fetches all service requests for an organization.
 */
export async function getServiceRequests(organizationId) {
  try {
    const requests = await prisma.serviceRequest.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data: requests };
  } catch (error) {
    console.error('Failed to fetch service requests:', error);
    return { success: false, error: 'Failed to load service requests.' };
  }
}

/**
 * Checks if the 'Year-End Tool' should be unlocked for an organization.
 * Unlocked if there is at least one 'PAID' ServiceRequest of type 'YEAR_END'.
 */
export async function checkYearEndToolAccess(organizationId) {
  try {
    const paidRequest = await prisma.serviceRequest.findFirst({
      where: {
        organizationId,
        type: 'YEAR_END',
        status: 'PAID',
      },
    });

    return { success: true, unlocked: !!paidRequest };
  } catch (error) {
    console.error('Failed to check tool access:', error);
    return { success: false, error: 'Failed to verify tool access.' };
  }
}
