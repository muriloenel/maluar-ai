'use client';

import { useState } from 'react';

const PLANS = [
  {
    id: 'free',
    name: 'Grátis',
    price: 'R$ 0',
    period: '/mês',
    description: 'Pra experimentar a Maluar AI',
    features: [
      '50 mensagens por dia',
      'Análise de fotos (básica)',
      'Templates WhatsApp',
      'Calculadora de preço',
    ],
    cta: 'Plano atual',
    accent: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 'R$ 29,90',
    period: '/mês',
    description: 'Pra quem quer crescer de verdade',
    features: [
      '150 mensagens por dia',
      'Análise de fotos (avançada)',
      'Templates WhatsApp',
      'Planos de ação personalizados',
      'Gerador de posts',
      'Calculadora de preço',
      'Suporte prioritário',
    ],
    cta: 'Assinar Pro',
    accent: true,
    popular: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 'R$ 59,90',
    period: '/mês',
    description: 'Pra profissionais que querem o máximo',
    features: [
      'Mensagens ilimitadas',
      'Análise de fotos (avançada)',
      'Templates WhatsApp',
      'Planos de ação personalizados',
      'Gerador de posts ilimitado',
      'Calculadora de preço',
      'Meu Negócio (completo)',
      'Suporte VIP',
    ],
    cta: 'Assinar Premium',
    accent: false,
  },
];

export default function PricingPlans({ currentPlan = 'free', getAccessToken, onManageSubscription }) {
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState(null);

  const handleUpgrade = async (planId) => {
    if (planId === 'free' || planId === currentPlan) return;
    setLoading(planId);
    setError(null);

    try {
      console.log('[PRICING] Iniciando upgrade para:', planId);

      const token = getAccessToken ? await getAccessToken() : null;
      console.log('[PRICING] Token obtido:', token ? 'SIM' : 'NÃO');
      if (!token) {
        setError('Faça login para assinar um plano.');
        return;
      }

      console.log('[PRICING] Chamando /api/stripe/checkout...');
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ plan: planId }),
      });

      console.log('[PRICING] Resposta:', res.status);
      const data = await res.json();
      console.log('[PRICING] Data:', JSON.stringify(data));

      if (!res.ok) {
        setError(data.error || `Erro ${res.status} ao iniciar pagamento.`);
        return;
      }

      if (data.url) {
        console.log('[PRICING] Redirecionando para Stripe...');
        window.location.href = data.url;
      } else {
        setError('Stripe não retornou URL de checkout.');
      }
    } catch (err) {
      console.error('[PRICING] Erro:', err);
      setError(`Erro de conexão: ${err.message}`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="font-display text-2xl font-bold text-text mb-2">
            Escolha seu plano 💅
          </h2>
          <p className="text-sm text-text-muted max-w-md mx-auto">
            Desbloqueie mais mensagens e recursos pra turbinar seu negócio de nail design.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="max-w-md mx-auto mb-6 px-4 py-3 rounded-xl bg-rose/10 border border-rose/20 text-rose text-sm text-center">
            {error}
          </div>
        )}

        {/* Plans grid */}
        <div className="grid md:grid-cols-3 gap-4 max-w-3xl mx-auto">
          {PLANS.map((plan) => {
            const isCurrent = plan.id === currentPlan;
            const isDowngrade = currentPlan === 'premium' && plan.id === 'pro';

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border p-5 flex flex-col transition-all ${
                  plan.accent
                    ? 'border-accent bg-accent-bg shadow-elevated scale-[1.02]'
                    : 'border-border bg-surface-card hover:border-accent/30'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-accent text-white text-[10px] font-bold rounded-full uppercase tracking-wider">
                    Mais popular
                  </div>
                )}

                <div className="mb-4">
                  <h3 className={`font-display text-lg font-bold ${plan.accent ? 'text-accent' : 'text-text'}`}>
                    {plan.name}
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">{plan.description}</p>
                </div>

                <div className="mb-4">
                  <span className="text-3xl font-extrabold text-text">{plan.price}</span>
                  <span className="text-sm text-text-muted">{plan.period}</span>
                </div>

                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map((feat, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-text-muted">
                      <svg className={`w-4 h-4 shrink-0 mt-0.5 ${plan.accent ? 'text-accent' : 'text-green-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <div className="text-center">
                    <span className="inline-block px-4 py-2.5 rounded-xl bg-surface-alt text-text-muted text-sm font-medium w-full">
                      ✓ Plano atual
                    </span>
                    {currentPlan !== 'free' && onManageSubscription && (
                      <button
                        onClick={onManageSubscription}
                        className="mt-2 text-xs text-text-muted hover:text-accent transition-colors underline"
                      >
                        Gerenciar assinatura
                      </button>
                    )}
                  </div>
                ) : isDowngrade ? (
                  <button
                    disabled
                    className="w-full py-2.5 rounded-xl bg-surface-alt text-text-light text-sm font-medium cursor-not-allowed"
                  >
                    Já incluído no Premium
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={loading === plan.id}
                    className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      plan.accent
                        ? 'bg-accent text-white hover:bg-accent-hover shadow-soft'
                        : 'bg-surface-alt text-text hover:bg-accent hover:text-white border border-border hover:border-accent'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {loading === plan.id ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                          <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" className="opacity-75" />
                        </svg>
                        Processando...
                      </span>
                    ) : (
                      plan.cta
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* FAQ */}
        <div className="mt-10 max-w-md mx-auto text-center space-y-3">
          <p className="text-xs text-text-light">
            💳 Pagamento seguro via Stripe. Cancele quando quiser.
          </p>
          <p className="text-xs text-text-light">
            7 dias de garantia — se não gostar, devolvemos seu dinheiro.
          </p>
        </div>
      </div>
    </div>
  );
}
