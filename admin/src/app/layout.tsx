import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FoodIME Admin',
  description: 'Painel administrativo FoodIME',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
