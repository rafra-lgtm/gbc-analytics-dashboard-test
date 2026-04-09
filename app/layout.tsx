import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GBC Analytics Dashboard',
  description: 'Test task skeleton for RetailCRM + Supabase + Telegram sync'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
