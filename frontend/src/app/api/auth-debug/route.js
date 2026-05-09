import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const authModule = await import('@/auth');
    return NextResponse.json({ 
      status: '✓ auth module loaded',
      exports: Object.keys(authModule)
    });
  } catch (err) {
    return NextResponse.json({ 
      status: '✗ auth module FAILED',
      error: err.message,
      cause: err.cause?.message || null,
    }, { status: 200 });
  }
}
