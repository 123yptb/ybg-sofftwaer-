import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/setup
 * Checks and patches the DB schema if needed (adds businessType column etc.)
 * Safe to call multiple times — idempotent.
 */
export async function GET() {
  const results = [];

  try {
    // Check if businessType column exists on Organization
    try {
      await prisma.$queryRaw`SELECT businessType FROM Organization LIMIT 1`;
      results.push('businessType column: OK');
    } catch {
      // Column missing — add it
      await prisma.$executeRaw`ALTER TABLE Organization ADD COLUMN businessType TEXT NOT NULL DEFAULT 'TRADING'`;
      results.push('businessType column: ADDED');
    }

    // Check if Organization has other new columns
    const orgCols = ['gstin', 'panNumber', 'address', 'phone', 'email', 'currency', 'state'];
    for (const col of orgCols) {
      try {
        await prisma.$queryRawUnsafe(`SELECT ${col} FROM Organization LIMIT 1`);
        results.push(`${col}: OK`);
      } catch {
        const defaultVal = col === 'currency' ? "'INR'" : 'NULL';
        try {
          await prisma.$executeRawUnsafe(
            `ALTER TABLE Organization ADD COLUMN ${col} TEXT DEFAULT ${defaultVal}`
          );
          results.push(`${col}: ADDED`);
        } catch (e2) {
          results.push(`${col}: ERROR - ${e2.message}`);
        }
      }
    }

    // Check Product category column
    try {
      await prisma.$queryRaw`SELECT category FROM Product LIMIT 1`;
      results.push('Product.category: OK');
    } catch {
      await prisma.$executeRaw`ALTER TABLE Product ADD COLUMN category TEXT NOT NULL DEFAULT 'PRODUCT'`;
      results.push('Product.category: ADDED');
    }

    // Check Product.unit column
    try {
      await prisma.$queryRaw`SELECT unit FROM Product LIMIT 1`;
      results.push('Product.unit: OK');
    } catch {
      await prisma.$executeRaw`ALTER TABLE Product ADD COLUMN unit TEXT NOT NULL DEFAULT 'pcs'`;
      results.push('Product.unit: ADDED');
    }

    // Check Product.costPrice column
    try {
      await prisma.$queryRaw`SELECT costPrice FROM Product LIMIT 1`;
      results.push('Product.costPrice: OK');
    } catch {
      await prisma.$executeRaw`ALTER TABLE Product ADD COLUMN costPrice REAL NOT NULL DEFAULT 0`;
      results.push('Product.costPrice: ADDED');
    }

    // Create ProductionOrder table if missing
    try {
      await prisma.$queryRaw`SELECT id FROM ProductionOrder LIMIT 1`;
      results.push('ProductionOrder table: OK');
    } catch {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS ProductionOrder (
          id TEXT NOT NULL PRIMARY KEY,
          orderNumber TEXT NOT NULL UNIQUE,
          status TEXT NOT NULL DEFAULT 'Planned',
          finishedGoodName TEXT NOT NULL,
          finishedGoodSku TEXT,
          quantityToProduce REAL NOT NULL,
          quantityProduced REAL NOT NULL DEFAULT 0,
          unitCost REAL NOT NULL DEFAULT 0,
          notes TEXT,
          startDate DATETIME,
          completedDate DATETIME,
          finishedProductId TEXT,
          organizationId TEXT NOT NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT ProductionOrder_finishedProductId_fkey FOREIGN KEY (finishedProductId) REFERENCES Product(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT ProductionOrder_organizationId_fkey FOREIGN KEY (organizationId) REFERENCES Organization(id) ON DELETE CASCADE ON UPDATE CASCADE
        )`;
      results.push('ProductionOrder table: CREATED');
    }

    // Create ProductionMaterial table if missing
    try {
      await prisma.$queryRaw`SELECT id FROM ProductionMaterial LIMIT 1`;
      results.push('ProductionMaterial table: OK');
    } catch {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS ProductionMaterial (
          id TEXT NOT NULL PRIMARY KEY,
          quantityNeeded REAL NOT NULL,
          quantityUsed REAL NOT NULL DEFAULT 0,
          productionOrderId TEXT NOT NULL,
          rawMaterialId TEXT NOT NULL,
          organizationId TEXT NOT NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT ProductionMaterial_productionOrderId_fkey FOREIGN KEY (productionOrderId) REFERENCES ProductionOrder(id) ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT ProductionMaterial_rawMaterialId_fkey FOREIGN KEY (rawMaterialId) REFERENCES Product(id) ON DELETE RESTRICT ON UPDATE CASCADE,
          CONSTRAINT ProductionMaterial_organizationId_fkey FOREIGN KEY (organizationId) REFERENCES Organization(id) ON DELETE CASCADE ON UPDATE CASCADE
        )`;
      results.push('ProductionMaterial table: CREATED');
    }

    // Create BillLineItem table if missing
    try {
      await prisma.$queryRaw`SELECT id FROM BillLineItem LIMIT 1`;
      results.push('BillLineItem table: OK');
    } catch {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS BillLineItem (
          id TEXT NOT NULL PRIMARY KEY,
          billId TEXT NOT NULL,
          description TEXT NOT NULL,
          quantity REAL NOT NULL DEFAULT 1,
          unitPrice REAL NOT NULL DEFAULT 0,
          taxRate REAL NOT NULL DEFAULT 0,
          amount REAL NOT NULL DEFAULT 0,
          productId TEXT,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT BillLineItem_billId_fkey FOREIGN KEY (billId) REFERENCES Bill(id) ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT BillLineItem_productId_fkey FOREIGN KEY (productId) REFERENCES Product(id) ON DELETE SET NULL ON UPDATE CASCADE
        )`;
      results.push('BillLineItem table: CREATED');
    }

    // Add subtotal/taxAmount to Bill if missing
    try {
      await prisma.$queryRaw`SELECT subtotal FROM Bill LIMIT 1`;
      results.push('Bill.subtotal: OK');
    } catch {
      await prisma.$executeRaw`ALTER TABLE Bill ADD COLUMN subtotal REAL NOT NULL DEFAULT 0`;
      await prisma.$executeRaw`ALTER TABLE Bill ADD COLUMN taxAmount REAL NOT NULL DEFAULT 0`;
      results.push('Bill.subtotal + taxAmount: ADDED');
    }

    // Add fields to InvoiceLineItem if missing
    try {
      await prisma.$queryRaw`SELECT productId FROM InvoiceLineItem LIMIT 1`;
      results.push('InvoiceLineItem.productId: OK');
    } catch {
      await prisma.$executeRaw`ALTER TABLE InvoiceLineItem ADD COLUMN productId TEXT`;
      results.push('InvoiceLineItem.productId: ADDED');
    }

    // Regenerate Prisma client to pick up schema changes
    // (Can't do this from API — user needs to run: npx prisma generate)

    return NextResponse.json({ ok: true, results });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message, results }, { status: 500 });
  }
}
