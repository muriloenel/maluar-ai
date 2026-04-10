'use client';

import { useEffect, Component } from 'react';
import { ToastProvider } from './Toast';
import { ThemeProvider } from './ThemeProvider';
import SupabaseAuthProvider from './SupabaseAuthProvider';
import PostHogProvider from './PostHogProvider';

// ErrorBoundary para capturar erros client-side e evitar tela branca
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    console.error('ErrorBoundary:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', padding: '24px', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: '#666' }}>Ops, algo deu errado.</p>
          <button
            onClick={() => {
              // Limpar caches e recarregar
              if ('caches' in window) {
                caches.keys().then((names) => names.forEach((n) => caches.delete(n)));
              }
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
              }
              window.location.reload();
            }}
            style={{ padding: '12px 24px', borderRadius: '12px', background: '#7F77DD', color: '#fff', border: 'none', fontSize: '14px', cursor: 'pointer' }}
          >
            Recarregar app
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function ClientProviders({ children }) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Atualizar SW existente ou registrar novo
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        reg.update().catch(() => {});
      }).catch(() => {});
    }
  }, []);

  return (
    <ErrorBoundary>
      <PostHogProvider>
      <SupabaseAuthProvider>
        <ThemeProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ThemeProvider>
      </SupabaseAuthProvider>
      </PostHogProvider>
    </ErrorBoundary>
  );
}
