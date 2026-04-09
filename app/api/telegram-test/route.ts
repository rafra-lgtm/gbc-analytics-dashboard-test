import { NextResponse } from 'next/server';
import { sendTelegramMessage } from '@/lib/telegram';

export async function POST() {
  try {
    await sendTelegramMessage('✅ Тестовое сообщение: Telegram интеграция настроена');
    return NextResponse.json({ ok: true, message: 'Telegram test sent' });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
