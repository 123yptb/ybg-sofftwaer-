import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    // Step 1: Drop the old global unique constraint (if it exists)
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Account" DROP CONSTRAINT IF EXISTS "Account_accountCode_key";
    `).catch(() => {/* already removed */});

    // Step 2: Drop any existing compound index (idempotent)
    await prisma.$executeRawUnsafe(`
      DROP INDEX IF EXISTS "Account_accountCode_organizationId_key";
    `).catch(() => {});

    // Step 3: Create the correct per-org unique index
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "Account_accountCode_organizationId_key"
      ON "Account"("accountCode", "organizationId");
    `);

    return NextResponse.json({ 
      success: true, 
      message: 'Account code constraint fixed: now unique per organisation.' 
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
