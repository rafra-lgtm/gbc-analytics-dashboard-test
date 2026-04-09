import { NextRequest, NextResponse } from 'next/server';
import { syncRetailOrdersToSupabase } from '@/lib/sync';
import { RetailCrmApiError } from '@/lib/retailcrm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;

  const bearer = request.headers.get('authorization')?.replace('Bearer ', '');
  const cronHeader = request.headers.get('x-cron-secret');
  const querySecret = request.nextUrl.searchParams.get('secret');

  return bearer === secret || cronHeader === secret || querySecret === secret;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return jsonNoStore({ ok: false, error: 'Unauthorized' }, 401);
  }

  try {
    const stats = await syncRetailOrdersToSupabase(true);
    return jsonNoStore({ ok: true, stats });
  } catch (error) {
    if (error instanceof RetailCrmApiError) {
      return jsonNoStore(
        {
          ok: false,
          error: error.message,
          upstream: {
            status: error.details.status ?? null,
            statusText: error.details.statusText ?? null,
            message: error.details.message ?? null,
            endpoint: error.details.endpoint,
            responseText: error.details.responseText ?? null
          }
        },
        502
      );
    }

    return jsonNoStore(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
}
