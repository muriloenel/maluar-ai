'use client';

import { useState } from 'react';
import { useAuth } from './SupabaseAuthProvider';
import { useToast } from './Toast';

const STYLE_PRESETS = [
  { id: 'classic', label: 'Clássico', prompt: 'classic elegant nails, nude/pink tones, clean finish' },
  { id: 'bold', label: 'Ousado', prompt: 'bold artistic nail design, vibrant colors, creative patterns' },
  { id: 'french', label: 'Francesinha', prompt: 'french manicure, white tips, natural base' },
  { id: 'glam', label: 'Glamour', prompt: 'glamorous nails with rhinestones, glitter, chrome finish' },
  { id: 'natural', label: 'Natural', prompt: 'natural looking nails, soft colors, minimalist design' },
  { id: 'art', label: 'Nail Art', prompt: 'intricate nail art with hand-painted designs, detailed decoration' },
];

export default function ImageGenerator({ plan = 'free', onUpgrade }) {
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);
  const [error, setError] = useState('');
  const [remaining, setRemaining] = useState(null);
  const { getAccessToken } = useAuth();
  const toast = useToast();

  const isFree = plan === 'free' || !plan;

  const handleGenerate = async () => {
    if (!prompt.trim() && !selectedStyle) return;

    setGenerating(true);
    setError('');
    setImageUrl(null);

    try {
      const token = getAccessToken ? await getAccessToken() : null;
      const fullPrompt = selectedStyle
        ? `${STYLE_PRESETS.find(s => s.id === selectedStyle)?.prompt}. ${prompt}`.trim()
        : prompt;

      const res = await fetch('/api/image/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ prompt: fullPrompt }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.upgrade) {
          setError('upgrade');
        } else {
          setError(data.error || 'Erro ao gerar imagem');
        }
        return;
      }

      setImageUrl(data.url);
      if (data.remaining !== undefined) setRemaining(data.remaining);
      toast?.('Imagem gerada!');
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!imageUrl) return;
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `maluar-nail-design-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast?.('Download iniciado!');
    } catch {
      window.open(imageUrl, '_blank');
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface">
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-xl mx-auto space-y-5">
          {/* Header */}
          <div>
            <h2 className="font-display text-xl font-bold text-text flex items-center gap-2">
              Criar Imagem com IA
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gradient-to-r from-accent to-rose text-white uppercase tracking-wider">
                Pro
              </span>
            </h2>
            <p className="text-text-muted text-sm mt-0.5">
              Descreva o nail design dos sonhos e a IA cria pra você
            </p>
          </div>

          {/* Upgrade prompt for free users */}
          {isFree && (
            <div className="rounded-xl border border-accent/20 bg-accent-bg p-5 text-center space-y-3">
              <div className="text-3xl">✨</div>
              <h3 className="text-sm font-bold text-text">Recurso exclusivo Pro & Premium</h3>
              <p className="text-xs text-text-muted">
                Gere imagens de nail design com inteligência artificial. Descreva o que imagina e veja ganhar vida!
              </p>
              <ul className="text-xs text-text-muted space-y-1">
                <li>Pro: 5 imagens/dia</li>
                <li>Premium: 20 imagens/dia</li>
              </ul>
              <button
                onClick={onUpgrade}
                className="px-5 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent-hover transition-colors shadow-soft"
              >
                Fazer upgrade
              </button>
            </div>
          )}

          {/* Main form - shown for paid users */}
          {!isFree && (
            <>
              {/* Style presets */}
              <div>
                <label className="block text-text text-xs font-medium mb-2 uppercase tracking-wide">
                  Estilo (opcional)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {STYLE_PRESETS.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedStyle(selectedStyle === s.id ? null : s.id)}
                      className={`px-3 py-2.5 rounded-xl text-xs font-medium transition-all border ${
                        selectedStyle === s.id
                          ? 'border-accent bg-accent-light text-text shadow-soft'
                          : 'border-border bg-surface-card text-text-muted hover:border-accent/40'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prompt */}
              <div>
                <label className="block text-text text-xs font-medium mb-2 uppercase tracking-wide">
                  Descreva o design
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ex: Unhas stiletto rosa com glitter dourado e pedras de cristal na base..."
                  rows={3}
                  className="w-full bg-surface-card border border-border rounded-xl px-4 py-3 text-text placeholder-text-light focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all text-sm shadow-soft resize-none"
                  maxLength={500}
                  disabled={generating}
                />
                <p className="text-[10px] text-text-light mt-1 text-right">{prompt.length}/500</p>
              </div>

              {/* Generate button */}
              <button
                onClick={handleGenerate}
                disabled={generating || (!prompt.trim() && !selectedStyle)}
                className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all bg-accent text-white hover:bg-accent-hover shadow-soft disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <span className="typing-dot w-1.5 h-1.5 bg-white rounded-full inline-block" />
                    <span className="typing-dot w-1.5 h-1.5 bg-white rounded-full inline-block" />
                    <span className="typing-dot w-1.5 h-1.5 bg-white rounded-full inline-block" />
                    <span className="ml-2">Gerando imagem...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Gerar imagem
                  </>
                )}
              </button>

              {remaining !== null && (
                <p className="text-[11px] text-text-light text-center">
                  {remaining} {remaining === 1 ? 'imagem restante' : 'imagens restantes'} hoje
                </p>
              )}

              {/* Error */}
              {error && error !== 'upgrade' && (
                <div className="text-center py-3 px-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
                  <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
                </div>
              )}

              {error === 'upgrade' && (
                <div className="rounded-xl border border-accent/20 bg-accent-bg p-4 text-center space-y-2">
                  <p className="text-sm font-medium text-text">Recurso exclusivo Pro & Premium</p>
                  <button
                    onClick={onUpgrade}
                    className="px-4 py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent-hover transition-colors"
                  >
                    Fazer upgrade
                  </button>
                </div>
              )}

              {/* Result */}
              {imageUrl && (
                <div className="space-y-3 animate-fade-in">
                  <div className="relative rounded-xl overflow-hidden border border-border shadow-elevated">
                    <img
                      src={imageUrl}
                      alt="Nail design gerado por IA"
                      className="w-full aspect-square object-cover"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleDownload}
                      className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-accent text-accent hover:bg-accent-bg transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Baixar
                    </button>
                    <button
                      onClick={() => {
                        setImageUrl(null);
                        setError('');
                      }}
                      className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-border text-text-muted hover:bg-surface-alt transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Gerar outra
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
