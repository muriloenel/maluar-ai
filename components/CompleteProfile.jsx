'use client';

import { useState } from 'react';
import { useAuth } from './SupabaseAuthProvider';
import { useToast } from './Toast';

const levels = [
  { id: 'iniciante', label: 'Iniciante', desc: 'Tô começando do zero', icon: '🌱' },
  { id: 'intermediario', label: 'Intermediária', desc: 'Já faço algumas unhas', icon: '💅' },
  { id: 'avancada', label: 'Avançada', desc: 'Já atendo clientes', icon: '✨' },
];

export default function CompleteProfile({ onComplete }) {
  const { user, supabase } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user?.user_metadata?.full_name || user?.user_metadata?.name || '');
  const [phone, setPhone] = useState('');
  const [level, setLevel] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const formatPhone = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Preencha seu nome.'); return; }
    if (!level) { setError('Escolha seu nível.'); return; }
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      setError('Telefone inválido. Use DDD + número (ex: 11 99999-9999)');
      return;
    }
    setLoading(true);
    setError('');

    const timeout = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));

    try {
      // Upsert profile no banco (com timeout de 8s)
      const dbPromise = supabase
        .from('profiles')
        .upsert({
          id: user.id,
          name: name.trim(),
          phone: phoneDigits,
          level,
        }, { onConflict: 'id' })
        .select('id, phone')
        .single();

      const { data, error: dbError } = await Promise.race([dbPromise, timeout(8000)]);

      if (dbError) {
        console.error('CompleteProfile DB error:', dbError);
        setError('Erro ao salvar. Tente novamente.');
        setLoading(false);
        return;
      }

      console.log('CompleteProfile saved:', data);

      // Atualizar user_metadata (fire-and-forget, não bloqueia)
      supabase.auth.updateUser({
        data: { name: name.trim(), phone: phoneDigits, level },
      }).catch(() => {});

      toast?.('Perfil completo! Bem-vinda ao Maluar 💅');
      onComplete?.({ name: name.trim(), phone: phoneDigits, level });
    } catch (err) {
      console.error('CompleteProfile error:', err);
      if (err.message === 'timeout') {
        setError('Demorou demais. Verifique sua conexão e tente novamente.');
      } else {
        setError('Erro inesperado. Tente novamente.');
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface px-4 py-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.03] via-transparent to-rose/[0.03]" />

      <div className="w-full max-w-sm relative">
        <div className="text-center mb-6 animate-scale-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent-bg mb-4">
            <span className="text-3xl">✨</span>
          </div>
          <h2 className="text-xl font-bold text-text mb-1">Quase lá!</h2>
          <p className="text-sm text-text-muted">
            Complete seu perfil para personalizar sua experiência.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 animate-slide-up delay-200">
          <div>
            <label className="block text-text text-sm font-medium mb-1.5">Seu nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Como posso te chamar?"
              className="w-full bg-surface-card border border-border rounded-xl px-4 py-3 text-text placeholder-text-light focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all shadow-soft"
              maxLength={50}
              required
            />
          </div>

          <div>
            <label className="block text-text text-sm font-medium mb-1.5">WhatsApp / Telefone <span className="text-rose">*</span></label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              placeholder="(11) 99999-9999"
              className="w-full bg-surface-card border border-border rounded-xl px-4 py-3 text-text placeholder-text-light focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all shadow-soft"
              required
            />
          </div>

          <div>
            <label className="block text-text text-sm font-medium mb-2">Qual seu nível?</label>
            <div className="space-y-2">
              {levels.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setLevel(l.id)}
                  className={`w-full flex items-center gap-3 text-left px-4 py-3 rounded-xl border transition-all shadow-soft ${
                    level === l.id
                      ? 'border-accent bg-accent-light text-text ring-2 ring-accent/20'
                      : 'border-border bg-surface-card text-text-muted hover:border-accent/40 hover:bg-accent-bg'
                  }`}
                >
                  <span className="text-lg">{l.icon}</span>
                  <div>
                    <span className="font-medium text-sm text-text">{l.label}</span>
                    <span className="text-xs text-text-muted block">{l.desc}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-rose text-xs font-medium">{error}</p>}

          <button
            type="submit"
            disabled={loading || !name.trim() || !level || !phone.replace(/\D/g, '')}
            className="w-full py-3.5 rounded-xl font-semibold text-sm btn-gradient shadow-soft"
          >
            {loading ? 'Salvando...' : 'Começar a usar o Maluar'}
          </button>
        </form>
      </div>
    </div>
  );
}
