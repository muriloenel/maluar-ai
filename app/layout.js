import './globals.css';
import ClientProviders from '../components/ClientProviders';

export const metadata = {
  title: 'Maluar AI — Sua Mentora de Nail Design',
  description: 'Assistente de IA especializada em Nail Design, criada pela Karina Oliveira.',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon-32.png',
    shortcut: '/favicon-32.png',
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Maluar AI',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#7F77DD',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Maluar AI" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icon-192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icon-512.png" />
        <link rel="preload" href="/logo-icon.webp" as="image" type="image/webp" />
      </head>
      <body className="min-h-screen bg-surface text-text antialiased">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
