'use client';

import { useEffect } from 'react';
import { ToastProvider } from './Toast';
import { ThemeProvider } from './ThemeProvider';
import SupabaseAuthProvider from './SupabaseAuthProvider';

export default function ClientProviders({ children }) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  return (
    <SupabaseAuthProvider>
      <ThemeProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </ThemeProvider>
    </SupabaseAuthProvider>
  );
}
