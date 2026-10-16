import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MailForge — Transactional Email Infrastructure',
  description: 'A developer-first transactional email service with full control over your sending infrastructure.',
  openGraph: {
    title: 'MailForge — Transactional Email Infrastructure',
    description: 'A developer-first transactional email service with full control over your sending infrastructure.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  );
}
