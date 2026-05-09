import { NextResponse } from 'next/server';

export async function GET() {
  const results = {};

  // 1. Check env vars
  results.env = {
    AUTH_SECRET: process.env.AUTH_SECRET ? '✓ set' : '✗ missing',
    AUTH_URL: process.env.AUTH_URL ? '✓ set' : '✗ missing',
    DATABASE_URL: process.env.DATABASE_URL || '✗ missing',
  };

  // 2. Test Prisma connection
  try {
    const { default: prisma } = await import('@/lib/prisma');
    const count = await prisma.organization.count();
    results.prisma = { status: '✓ connected', orgCount: count };
  } catch (err) {
    results.prisma = { status: '✗ error', message: err.message };
  }

  return NextResponse.json(results, { status: 200 });
}
