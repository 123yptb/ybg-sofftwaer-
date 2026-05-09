import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import path from 'path';

export async function GET() {
  try {
    const rootDir = path.resolve(process.cwd(), '..');
    const frontendDir = process.cwd();

    let logs = [];

    // 1. Generate root prisma
    try {
      const log1 = execSync('npx prisma generate', { cwd: rootDir }).toString();
      logs.push('ROOT GENERATE: ' + log1);
    } catch (e) {
      logs.push('ROOT ERROR: ' + e.message);
    }

    // 2. Generate frontend prisma
    try {
      const log2 = execSync('npx prisma generate', { cwd: frontendDir }).toString();
      logs.push('FRONTEND GENERATE: ' + log2);
    } catch (e) {
      logs.push('FRONTEND ERROR: ' + e.message);
    }

    return NextResponse.json({ success: true, logs });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
