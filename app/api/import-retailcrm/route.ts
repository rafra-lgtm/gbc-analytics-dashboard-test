import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { RetailCrmApiError, createRetailOrder } from '@/lib/retailcrm';

type RawOrder = Record<string, unknown>;

function shortOrderError(index: number, order: RawOrder, error: unknown) {
  const identifier =
    (typeof order.email === 'string' && order.email) ||
    (typeof order.phone === 'string' && order.phone) ||
    `#${index + 1}`;

  if (error instanceof RetailCrmApiError) {
    return `Order ${identifier}: ${error.details.message ?? error.message}`;
  }

  if (error instanceof Error) {
    return `Order ${identifier}: ${error.message}`;
  }

  return `Order ${identifier}: Unknown error`;
}

export async function GET() {
  if (!process.env.RETAILCRM_BASE_URL || !process.env.RETAILCRM_API_KEY) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Missing RETAILCRM_BASE_URL or RETAILCRM_API_KEY. Set both environment variables and retry.'
      },
      { status: 500 }
    );
  }

  try {
    const filePath = path.join(process.cwd(), 'mock_orders.json');
    const fileContent = await readFile(filePath, 'utf-8');
    const parsed = JSON.parse(fileContent) as unknown;

    if (!Array.isArray(parsed)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'mock_orders.json must contain an array of orders'
        },
        { status: 500 }
      );
    }

    const orders = parsed as RawOrder[];
    let imported = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const [index, order] of orders.entries()) {
      try {
        await createRetailOrder(order);
        imported += 1;
      } catch (error) {
        failed += 1;
        errors.push(shortOrderError(index, order, error));
      }
    }

    return NextResponse.json({
      ok: true,
      imported,
      failed,
      errors
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to import orders'
      },
      { status: 500 }
    );
  }
}
