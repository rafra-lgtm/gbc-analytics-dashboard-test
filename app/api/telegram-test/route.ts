import { NextResponse } from 'next/server';
import { sendTelegramMessage } from '@/lib/telegram';

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

export async function POST() {
  try {
    await sendTelegramMessage('✅ Тестовое сообщение: Telegram интеграция настроена');
    return jsonNoStore({ ok: true, message: 'Telegram test sent' });
  } catch (error) {
    return jsonNoStore(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
}
