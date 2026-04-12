import './globals.css';
import { Plus_Jakarta_Sans, Playfair_Display } from 'next/font/google';
import ClientProviders from '../components/ClientProviders';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  style: ['normal', 'italic'],
  variable: '--font-jakarta',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  style: ['normal', 'italic'],
  variable: '--font-playfair',
  display: 'swap',
});

export const metadata = {
  title: 'Maluar AI — Sua Mentora de Nail Design',
  description: 'Assistente de IA especializada em Nail Design, criada pela Karina Oliveira. Aprenda, crie posts e gerencie seu negócio.',
  manifest: '/manifest.json',
  metadataBase: new URL('https://maluar-ai.vercel.app'),
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Maluar AI — Sua Mentora de Nail Design',
    description: 'Aprenda nail design, crie posts e gerencie seu negócio com IA.',
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Maluar AI',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Maluar AI — Sua Mentora de Nail Design',
    description: 'Aprenda nail design, crie posts e gerencie seu negócio com IA.',
  },
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
    <html lang="pt-BR" className={`${jakarta.variable} ${playfair.variable}`} suppressHydrationWarning>
      <head>
        {/* Prevenir flash de tema errado (FOUC) — roda antes do React hidratar */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('maluar-theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.classList.add('dark')}catch(e){}})()` }} />
        <meta name="mobile-web-app-capable" content="yes" />
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
