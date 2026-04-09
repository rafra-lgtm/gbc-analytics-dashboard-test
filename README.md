# GBC Analytics Dashboard Test

Тестовое приложение на **Next.js 14 + TypeScript** для сценария:

1. Импорт заказов из `mock_orders.json` в RetailCRM.
2. Синхронизация заказов из RetailCRM в Supabase.
3. Мини-дашборд заказов (метрики + список + график).
4. Telegram-уведомления для заказов выше порога.

> `mock_orders.json` не удаляется и используется как источник для импорта.

## Стек

- Next.js 14 (App Router)
- TypeScript
- Supabase (`@supabase/supabase-js`)
- Recharts
- Telegram Bot API
- ESLint

## Структура

- `app/`
  - `api/cron/retail-sync/route.ts` — API для запуска синхронизации и алертов
  - `api/telegram-test/route.ts` — тест отправки Telegram
  - `page.tsx` — дашборд
- `components/orders-chart.tsx` — график
- `lib/`
  - `retailcrm.ts` — клиент RetailCRM API
  - `supabase.ts` — клиент Supabase (service role)
  - `telegram.ts` — Telegram + проверка порога
  - `types.ts` — типы
  - `utils.ts` — нормализация
  - `sync.ts` — бизнес-логика синка RetailCRM -> Supabase
- `scripts/`
  - `import-orders-to-retailcrm.ts`
  - `sync-orders-to-supabase.ts`
- `sql/init.sql` — SQL-схема
- `.env.example`

## Запуск локально

```bash
npm install
cp .env.example .env.local
npm run dev
```

Приложение будет доступно на `http://localhost:3000`.

## Env-переменные

Заполните `.env.local`:

```env
RETAILCRM_BASE_URL=
RETAILCRM_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
ALERT_THRESHOLD=50000
CRON_SECRET=
```

## Инициализация таблицы в Supabase

1. Откройте SQL Editor в Supabase.
2. Выполните SQL из `sql/init.sql`.

## Импорт заказов в RetailCRM

```bash
npm run import:retailcrm
```

Скрипт:
- читает `mock_orders.json`
- отправляет заказы по одному
- продолжает выполнение при ошибках
- печатает итог по sent/failed

## Синхронизация из RetailCRM в Supabase

```bash
npm run sync:supabase
```

Скрипт:
- получает заказы из RetailCRM постранично
- нормализует структуру заказа
- делает upsert в Supabase по `retailcrm_id`
- выводит статистику `fetched / inserted / updated / failed`

## Проверка Telegram

Тестовый запрос:

```bash
curl -X POST http://localhost:3000/api/telegram-test
```

Или автоматом через cron-sync endpoint при синке.

## Cron/API для синхронизации

Endpoint:

```text
GET /api/cron/retail-sync
```

Опциональная защита:
- `Authorization: Bearer <CRON_SECRET>`
- или `x-cron-secret: <CRON_SECRET>`
- или query `?secret=<CRON_SECRET>`

## Деплой на Vercel

1. Подключите репозиторий в Vercel.
2. Добавьте все переменные окружения из `.env.example` в Project Settings → Environment Variables.
3. (Опционально) настройте Vercel Cron на вызов `/api/cron/retail-sync`.
4. Убедитесь, что `CRON_SECRET` передаётся в запросе.

## Ограничения / что нужно уточнить

RetailCRM API в проекте сделан с допущением по типовым endpoint-ам:
- `POST /api/v5/orders/create`
- `GET /api/v5/orders`

Если в вашем аккаунте RetailCRM отличаются endpoint-ы/параметры, достаточно поправить их в одном месте: `lib/retailcrm.ts`.

## Как использовался AI

AI использовался как помощник для:
- генерации стартовой структуры проекта и файлов;
- черновиков типов и нормализации данных;
- подготовки базового SQL и README-шаблона;
- ускорения рутинной верстки дашборда.

Затыки были в предположениях по RetailCRM API и в унификации разных форматов заказов. Решение: оставить устойчивую нормализацию, явные комментарии и вынести точки интеграции в отдельные файлы (`lib/retailcrm.ts`, `lib/utils.ts`), чтобы быстро донастроить под реальные данные.
