import { NextRequest, NextResponse } from 'next/server';
import { syncRetailOrdersToSupabase } from '@/lib/sync';
import { RetailCrmApiError } from '@/lib/retailcrm';

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
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const stats = await syncRetailOrdersToSupabase(true);
    return NextResponse.json({ ok: true, stats });
  } catch (error) {
    if (error instanceof RetailCrmApiError) {
      return NextResponse.json(
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
        { status: 502 }
      );
    }

    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
