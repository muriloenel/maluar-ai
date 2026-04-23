'use client';

import { useEffect, useState } from 'react';

const PLAN_LABELS = {
  pro: { name: 'Pro', icon: '💅', color: 'text-purple-600' },
  premium: { name: 'Premium', icon: '✨', color: 'text-amber-500' },
};

function getToken() {
  try {
    const raw = localStorage.getItem('maluar-auth');
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed?.access_token || null;
    }
  } catch {}
  return null;
}

export default function CheckoutSuccess() {
  const [plan, setPlan] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | success | boleto_pending | redirecting

  useEffect(() => {
    let cancelled = false;

    const activate = async () => {
      let token = getToken();

      // Sem token — tentar once mais após 1s (redirect pode ter perdido)
      if (!token) {
        await new Promise(r => setTimeout(r, 1000));
        token = getToken();
      }

      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

      // ── PASSO 1: Verificar direto no Stripe via session_id (instantâneo) ──
      const sessionId = new URLSearchParams(window.location.search).get('session_id');
      if (sessionId && token) {
        try {
          const res = await fetch(`/api/stripe/verify-session?session_id=${encodeURIComponent(sessionId)}`, { headers });
          if (res.ok) {
            const data = await res.json();
            // Boleto pendente — mostrar instrução pro cliente
            if (data.pending_boleto) {
              setPlan(data.plan || null);
              setStatus('boleto_pending');
              return;
            }
            if (data.plan && data.plan !== 'free') {
              setPlan(data.plan);
              setStatus('success');
              try { sessionStorage.setItem('maluar-confirmed-plan', data.plan); } catch {}
              setTimeout(() => {
                if (!cancelled) { setStatus('redirecting'); window.location.href = '/'; }
              }, 2500);
              return;
            }
          }
        } catch {}
      }

      // ── PASSO 2: Fallback — poll /api/account/plan (caso verify-session falhe) ──
      for (let i = 0; i < 20 && !cancelled; i++) {
        try {
          const res = await fetch('/api/account/plan', { headers });
          if (res.ok) {
            const data = await res.json();
            if (data.plan && data.plan !== 'free') {
              setPlan(data.plan);
              setStatus('success');
              try { sessionStorage.setItem('maluar-confirmed-plan', data.plan); } catch {}
              setTimeout(() => {
                if (!cancelled) { setStatus('redirecting'); window.location.href = '/'; }
              }, 2500);
              return;
            }
          }
        } catch {}
        await new Promise(r => setTimeout(r, 1500));
      }

      // Timeout — redirecionar mesmo assim
      if (!cancelled) {
        setStatus('redirecting');
        window.location.href = '/';
      }
    };

    // Iniciar imediatamente (sem delay artificial)
    activate();
    return () => { cancelled = true; };
  }, []);

  const planInfo = PLAN_LABELS[plan] || { name: plan, icon: '🎉', color: 'text-purple-600' };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="max-w-md w-full text-center">
        {status === 'loading' ? (
          <div className="flex flex-col items-center gap-4 animate-scale-in">
            <div className="w-20 h-20 rounded-full bg-accent-light flex items-center justify-center">
              <div className="spinner" />
            </div>
            <h1 className="text-xl font-bold text-text">Ativando seu plano...</h1>
            <p className="text-sm text-text-muted">Isso pode levar alguns segundos</p>
          </div>
        ) : status === 'boleto_pending' ? (
          <div className="flex flex-col items-center gap-5 animate-scale-in">
            <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <span className="text-4xl">🧾</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text mb-2">Boleto gerado!</h1>
              <p className="text-base text-text-muted">
                Seu boleto foi emitido com sucesso. Pague em até <strong>3 dias úteis</strong> para ativar seu plano.
              </p>
            </div>
            <div className="bg-surface-card border border-border-light rounded-xl p-4 w-full text-left">
              <p className="text-sm text-text-muted mb-2">📌 <strong>Próximos passos:</strong></p>
              <ul className="text-sm text-text-muted space-y-1.5 list-disc list-inside">
                <li>Pague o boleto no app do banco, lotérica ou internet banking</li>
                <li>Após o pagamento, seu plano será ativado automaticamente</li>
                <li>A confirmação pode levar até 1 dia útil</li>
              </ul>
            </div>
            <button
              onClick={() => { window.location.href = '/'; }}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold btn-gradient mt-2"
            >
              Voltar para o app
            </button>
          </div>
        ) : status === 'success' ? (
          <div className="flex flex-col items-center gap-5 animate-scale-in">
            <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <span className="text-4xl">{planInfo.icon}</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text mb-2">Parabéns! 🎉</h1>
              <p className="text-base text-text-muted">
                Seu plano <span className={`font-bold ${planInfo.color}`}>{planInfo.name}</span> está ativo!
              </p>
            </div>
            <div className="bg-surface-card border border-border-light rounded-xl p-4 w-full">
              <p className="text-sm text-text-muted">
                Agora você tem acesso a todos os recursos do plano {planInfo.name}.
                Aproveite ao máximo! 💅
              </p>
            </div>
            <p className="text-xs text-text-light">Redirecionando em instantes...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="spinner" />
            <p className="text-sm text-text-muted">Redirecionando...</p>
          </div>
        )}
      </div>
    </div>
  );
}
