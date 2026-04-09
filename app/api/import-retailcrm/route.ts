import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { RetailCrmApiError, createRetailOrder } from '@/lib/retailcrm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type RawOrder = Record<string, unknown>;
type ImportSuccess = {
  email?: string;
  id: number | string;
  number?: number | string;
  site?: string;
};

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
};

function jsonNoStore(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(
    {
      ...body,
      executedAt: new Date().toISOString()
    },
    { status, headers: NO_STORE_HEADERS }
  );
}

function shortOrderError(index: number, order: RawOrder, error: unknown) {
  const identifier =
    (typeof order.email === 'string' && order.email) ||
    (typeof order.phone === 'string' && order.phone) ||
    `#${index + 1}`;

  if (error instanceof RetailCrmApiError) {
    const baseError = error.details.message ?? error.message;
    const responseText = error.details.responseText ? `; responseText=${error.details.responseText}` : '';

    return `Order ${identifier}: ${baseError}${responseText}`;
  }

  if (error instanceof Error) {
    return `Order ${identifier}: ${error.message}`;
  }

  return `Order ${identifier}: Unknown error`;
}

export async function GET() {
  if (!process.env.RETAILCRM_BASE_URL || !process.env.RETAILCRM_API_KEY) {
    return jsonNoStore(
      {
        ok: false,
        error: 'Missing RETAILCRM_BASE_URL or RETAILCRM_API_KEY. Set both environment variables and retry.'
      },
      500
    );
  }

  try {
    const filePath = path.join(process.cwd(), 'mock_orders.json');
    const fileContent = await readFile(filePath, 'utf-8');
    const parsed = JSON.parse(fileContent) as unknown;

    if (!Array.isArray(parsed)) {
      return jsonNoStore(
        {
          ok: false,
          error: 'mock_orders.json must contain an array of orders'
        },
        500
      );
    }

    const orders = parsed as RawOrder[];
    let imported = 0;
    let failed = 0;
    const successes: ImportSuccess[] = [];
    const errors: string[] = [];

    for (const [index, order] of orders.entries()) {
      try {
        const result = await createRetailOrder(order);
        const id = result.id ?? (result.order?.id as number | string | undefined);
        const number = result.number ?? (result.order?.number as number | string | undefined);
        const site = result.site ?? (typeof order.site === 'string' ? order.site : undefined);

        const created =
          result.success === true &&
          (typeof id === 'string' || typeof id === 'number' || (result.order && typeof result.order === 'object'));

        if (!created || (typeof id !== 'string' && typeof id !== 'number')) {
          failed += 1;
          errors.push(
            `Order ${
              (typeof order.email === 'string' && order.email) ||
              (typeof order.phone === 'string' && order.phone) ||
              `#${index + 1}`
            }: RetailCRM did not return created order id`
          );
          continue;
        }

        imported += 1;
        successes.push({
          email: typeof order.email === 'string' ? order.email : undefined,
          id,
          number: typeof number === 'string' || typeof number === 'number' ? number : undefined,
          site
        });
      } catch (error) {
        failed += 1;
        errors.push(shortOrderError(index, order, error));
      }
    }

    return jsonNoStore({
      ok: true,
      imported,
      failed,
      successes,
      errors
    });
  } catch (error) {
    return jsonNoStore(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to import orders'
      },
      500
    );
  }
}
