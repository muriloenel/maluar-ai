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
  maximumScale: 1,
  themeColor: '#7F77DD',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="min-h-screen bg-surface text-text antialiased">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
