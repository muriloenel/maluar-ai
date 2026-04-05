'use client';

export default function UpgradePrompt({ feature, requiredPlan = 'pro', onUpgrade }) {
  const planLabels = { pro: 'Pro', premium: 'Premium' };
  const planLabel = planLabels[requiredPlan] || 'Pro';

  return (
    <div className="flex flex-col items-center justify-center py-10 px-6 text-center animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-accent-bg flex items-center justify-center mb-4">
        <span className="text-3xl">🔒</span>
      </div>
      <h3 className="font-display text-lg font-bold text-text mb-2">
        Recurso exclusivo {planLabel}
      </h3>
      <p className="text-sm text-text-muted max-w-xs mb-1">
        <strong>{feature}</strong> está disponível no plano <strong>{planLabel}</strong> ou superior.
      </p>
      <p className="text-xs text-text-light max-w-xs mb-6">
        Faça upgrade e desbloqueie todas as ferramentas pra crescer seu negócio de nail design 💅
      </p>
      <button
        onClick={onUpgrade}
        className="px-6 py-3 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent-hover shadow-soft transition-all"
      >
        Ver planos e fazer upgrade
      </button>
    </div>
  );
}

export function UpgradeInlineBadge({ label, onUpgrade }) {
  return (
    <button
      onClick={onUpgrade}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-bg border border-accent/20 text-[10px] font-semibold text-accent hover:bg-accent-light transition-colors"
    >
      <span>🔒</span>
      <span>{label || 'Pro'}</span>
    </button>
  );
}
