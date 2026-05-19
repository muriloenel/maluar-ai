import './globals.css';
import { Manrope, DM_Serif_Display, Cormorant_Garamond } from 'next/font/google';
import ClientProviders from '../components/ClientProviders';

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-manrope',
  display: 'swap',
});

const dmSerif = DM_Serif_Display({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  variable: '--font-dm-serif',
  display: 'swap',
});

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['italic', 'normal'],
  variable: '--font-cormorant',
  display: 'swap',
});

export const metadata = {
  title: 'Maluar AI — Sua Mentora de Nail Design',
  description: 'Mentoria especializada em Nail Design com IA. Aprenda, crie conteúdo e cresça seu negócio com calma e estratégia.',
  manifest: '/manifest.json',
  metadataBase: new URL('https://maluar-ai.vercel.app'),
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Maluar AI — Sua Mentora de Nail Design',
    description: 'Mentoria, atelier de imagens e estratégia de negócio — no seu ritmo.',
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Maluar AI',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Maluar AI — Sua Mentora de Nail Design',
    description: 'Mentoria, atelier de imagens e estratégia de negócio — no seu ritmo.',
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
  themeColor: '#A8536A',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className={`${manrope.variable} ${dmSerif.variable} ${cormorant.variable}`} suppressHydrationWarning>
      <head>
        {/* Anti-FOUC do tema */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('maluar-theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.classList.add('dark')}catch(e){}})()` }} />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Maluar AI" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="min-h-screen bg-surface text-text antialiased">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
