'use client';

/*
  components/PostGenerator.jsx — Redesign "Soft Feminino"
  Lógica preservada:
    - Upload + compressão + HEIC
    - Geração de legenda (3 opções), seleção, hashtags, dica
    - Geração de arte com IA (Pro/Premium only)
    - Histórico de posts no banco
    - Limites por plano (free 2 / pro 15 / premium 9999)
    - Compartilhar WhatsApp, copiar, download

  Visual:
    - Stepper editorial com 4 etapas numeradas
    - Plataformas como segmented glass control
    - Upload com drop zone hero
    - Resultado em cards glass com tabs por opção
*/

import { useState, useRef, useEffect } from 'react';
import { useToast } from './Toast';
import { dbLoadPostHistory, dbSavePost, dbDeletePost } from '../lib/db';
import { useAuth } from './SupabaseAuthProvider';
import Icon from './Icon';

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', icon: 'instagram' },
  { id: 'facebook',  label: 'Facebook',  icon: 'globe' },
  { id: 'whatsapp',  label: 'WhatsApp',  icon: 'whatsapp' },
];

const POST_TYPES = [
  { id: 'resultado',     label: 'Resultado',     icon: 'image',     hint: 'Foto final do trabalho' },
  { id: 'antesdepois',   label: 'Antes e Depois', icon: 'sparkle',   hint: 'Transformação' },
  { id: 'dica',          label: 'Dica Técnica',  icon: 'book',      hint: 'Educativo' },
  { id: 'promocao',      label: 'Promoção',      icon: 'star',      hint: 'Oferta especial' },
  { id: 'bastidor',      label: 'Bastidores',    icon: 'feather',   hint: 'Processo, rotina' },
  { id: 'depoimento',    label: 'Depoimento',    icon: 'heart',     hint: 'Fala de clienta' },
];

const POST_LIMITS = { free: 2, pro: 15, premium: 9999 };

export default function PostGenerator({ user, userId, initialPrompt, plan = 'free', onUpgrade }) {
  const [platform, setPlatform] = useState('instagram');
  const [postType, setPostType] = useState('');
  const [extraInfo, setExtraInfo] = useState(initialPrompt || '');
  const [imagePreview, setImagePreview] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [imageMediaType, setImageMediaType] = useState('image/jpeg');
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [postHistory, setPostHistory] = useState([]);
  const [captionOptions, setCaptionOptions] = useState(null);
  const [selectedCaption, setSelectedCaption] = useState(0);
  const [isGeneratingArt, setIsGeneratingArt] = useState(false);
  const [artImage, setArtImage] = useState(null);
  const { getAccessToken } = useAuth();
  const fileInputRef = useRef(null);
  const toast = useToast();

  const isFree = plan === 'free' || !plan;
  const dailyLimit = POST_LIMITS[plan] || POST_LIMITS.free;
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayPosts = postHistory.filter(p => p.created_at?.slice(0, 10) === todayStr).length;
  const postsRemaining = Math.max(0, dailyLimit - todayPosts);
  const atLimit = postsRemaining <= 0 && isFree;

  useEffect(() => {
    if (userId) dbLoadPostHistory(userId).then(setPostHistory).catch(() => {});
  }, [userId]);

  // ─── Upload ─────────────────────────────────────────────────────
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('Imagem muito grande. Máximo 5MB.'); return; }
    const isHeic = file.type === 'image/heic' || file.type === 'image/heif' || /\.(heic|heif)$/i.test(file.name);
    let fileToProcess = file;
    if (isHeic) {
      try {
        const heic2any = (await import('heic2any')).default;
        const blob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 });
        fileToProcess = new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), { type: 'image/jpeg' });
      } catch { alert('Não foi possível converter a foto HEIF.'); return; }
    }
    if (!fileToProcess.type.startsWith('image/') && !isHeic) { alert('Envie apenas imagens.'); return; }
    setImageMediaType(fileToProcess.type || 'image/jpeg');
    const reader = new FileReader();
    reader.onload = () => { setImagePreview(reader.result); setImageBase64(reader.result.split(',')[1]); };
    reader.readAsDataURL(fileToProcess);
    e.target.value = '';
    setResult(null);
    setArtImage(null);
  };

  // ─── Geração ────────────────────────────────────────────────────
  const generatePost = async () => {
    if (!postType) { toast?.('Selecione o tipo de post'); return; }
    setIsLoading(true); setResult(null); setCaptionOptions(null); setSelectedCaption(0); setArtImage(null);
    const typeMeta = POST_TYPES.find(t => t.id === postType);
    const typeLabel = typeMeta?.label || postType;
    const platformLabel = PLATFORMS.find(p => p.id === platform)?.label || 'Instagram';
    try {
      const token = getAccessToken ? await getAccessToken() : null;
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/generate-copy', {
        method: 'POST', headers,
        body: JSON.stringify({
          tipo: typeLabel,
          servico: extraInfo || '',
          imageBase64: imageBase64 || undefined,
          imageMediaType: imageMediaType || undefined,
        }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Erro na API'); }
      const data = await res.json();
      if (data.captions?.length) { setCaptionOptions(data); setResult(data.captions[0].legenda); }
      else { setResult('Não consegui gerar. Tenta de novo.'); }
      if (userId) {
        const saved = await dbSavePost(userId, {
          platform: platformLabel, postType: typeLabel,
          content: data.captions?.[0]?.legenda || 'Post gerado',
        }).catch(() => null);
        if (saved) setPostHistory(prev => [saved, ...prev]);
      }
    } catch (err) { setResult(`Erro: ${err.message}`); }
    finally { setIsLoading(false); }
  };

  const generateArt = async () => {
    if (!imageBase64) { toast?.('Envie uma foto primeiro'); return; }
    if (!captionOptions?.captions?.[selectedCaption]) { toast?.('Gere a legenda primeiro'); return; }
    setIsGeneratingArt(true); setArtImage(null);
    try {
      const token = getAccessToken ? await getAccessToken() : null;
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const caption = captionOptions.captions[selectedCaption];
      const lines = caption.legenda?.split('\n').filter(Boolean) || [];
      const title = lines[0]?.replace(/^[\p{Emoji}\s]+/u, '').slice(0, 60) || 'Nail Art';
      const subtitle = lines.slice(1).join(' ').slice(0, 80) || '';
      const res = await fetch('/api/image/enhance', {
        method: 'POST', headers,
        body: JSON.stringify({
          action: 'post-art', imageBase64,
          postData: { title, subtitle, cta: platform === 'whatsapp' ? 'Agende agora!' : 'Saiba mais', style: 'feed' },
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (err.upgrade) { toast?.('Recurso exclusivo para assinantes Pro/Premium'); return; }
        throw new Error(err.error || 'Erro ao gerar arte');
      }
      const data = await res.json();
      if (data.b64) setArtImage(`data:image/png;base64,${data.b64}`);
      else if (data.url) setArtImage(data.url);
      else throw new Error('Nenhuma imagem retornada');
      toast?.('Arte gerada com sucesso!');
    } catch (err) { toast?.(err.message || 'Erro ao gerar arte'); }
    finally { setIsGeneratingArt(false); }
  };

  const downloadArt = () => {
    if (!artImage) return;
    const a = document.createElement('a');
    a.href = artImage; a.download = `post-${platform}-${Date.now()}.png`; a.click();
  };
  const copyToClipboard = (text) => { navigator.clipboard.writeText(text); toast?.('Copiado!'); };
  const shareOnWhatsApp = () => {
    const legenda = captionOptions?.captions?.[selectedCaption]?.legenda || result || '';
    const hashtags = captionOptions?.captions?.[selectedCaption]?.hashtags || '';
    window.open(`https://wa.me/?text=${encodeURIComponent(`${legenda}\n\n${hashtags}`.trim())}`, '_blank');
  };

  // ─── UI ────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-surface relative overflow-hidden">
      {/* Atmospheric backdrop */}
      <div className="absolute inset-0 pointer-events-none opacity-40" style={{
        background: 'radial-gradient(ellipse 50% 35% at 100% 0%, rgba(168,83,106,0.14) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 0% 100%, rgba(200,149,124,0.12) 0%, transparent 60%)',
      }} />

      <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-8 sm:py-10 relative">
        <div className="max-w-2xl mx-auto space-y-7">

          {/* ─── Hero ─── */}
          <header className="flex items-start justify-between gap-4 animate-fade-in">
            <div className="flex-1">
              <p className="kicker mb-2">atelier de imagens</p>
              <h1 className="font-display text-3xl sm:text-4xl tracking-tight leading-tight">
                Criar post <span className="font-italic-display text-accent">do zero</span>
              </h1>
              <p className="text-sm text-text-muted mt-2 max-w-md leading-relaxed">
                Sua foto + legenda pronta + hashtags. Em segundos.
              </p>
            </div>
            {postHistory.length > 0 && (
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-full glass-soft text-[12px] font-semibold text-text hover:text-accent transition-colors"
              >
                <Icon name="bookmark" size={13} />
                <span>{postHistory.length}</span>
              </button>
            )}
          </header>

          {/* ─── Histórico (drawer inline) ─── */}
          {showHistory && postHistory.length > 0 && (
            <div className="glass-card rounded-2xl p-3 space-y-1 max-h-64 overflow-y-auto animate-fade-in">
              <p className="kicker px-2 py-1 mb-1">últimos posts</p>
              {postHistory.map((item) => (
                <div key={item.id} className="flex items-start gap-2 group rounded-xl hover:bg-accent-bg transition-colors px-2 py-1.5">
                  <button
                    onClick={() => { setResult(item.content); setCaptionOptions(null); setShowHistory(false); }}
                    className="flex-1 text-left text-xs text-text-muted hover:text-accent"
                  >
                    <span className="text-[13px] font-semibold text-text block">{item.post_type}</span>
                    <span className="line-clamp-1 mt-0.5 text-text-muted">{item.content?.slice(0, 80)}…</span>
                  </button>
                  <button
                    onClick={async () => { await dbDeletePost(item.id); setPostHistory(prev => prev.filter(p => p.id !== item.id)); }}
                    className="opacity-0 group-hover:opacity-100 shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-text-light hover:text-accent hover:bg-accent-light transition-all"
                    aria-label="Excluir post do histórico"
                  >
                    <Icon name="close" size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ─── Step 1 · Plataforma ─── */}
          <Step number="01" title="Onde vai postar?">
            <div className="flex gap-2 p-1 rounded-2xl glass-soft">
              {PLATFORMS.map(p => {
                const active = platform === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => { setPlatform(p.id); setResult(null); }}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
                      active ? 'bg-surface-card text-accent shadow-card' : 'text-text-muted hover:text-text'
                    }`}
                  >
                    <Icon name={p.icon} size={14} />
                    {p.label}
                  </button>
                );
              })}
            </div>
          </Step>

          {/* ─── Step 2 · Foto ─── */}
          <Step number="02" title="Sua foto" subtitle="opcional · até 5MB">
            {imagePreview ? (
              <div className="relative rounded-2xl overflow-hidden glass-soft">
                <img src={imagePreview} alt="Sua foto" className="w-full max-h-[380px] object-contain bg-black/80" />
                <button
                  onClick={() => { setImagePreview(null); setImageBase64(null); setResult(null); setArtImage(null); }}
                  className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                  aria-label="Remover foto"
                >
                  <Icon name="close" size={15} />
                </button>
              </div>
            ) : (
              <label htmlFor="post-file-input" className="block cursor-pointer">
                <div className="flex flex-col items-center gap-3 px-6 py-10 rounded-2xl border-2 border-dashed border-border bg-white/40 dark:bg-white/[0.02] hover:border-accent/50 hover:bg-accent-bg transition-all">
                  <div className="w-14 h-14 rounded-2xl ai-avatar text-white flex items-center justify-center">
                    <Icon name="image" size={22} />
                  </div>
                  <div className="text-center">
                    <p className="text-[14px] font-semibold text-text">Toque pra enviar sua foto</p>
                    <p className="text-[11px] text-text-light mt-1">JPG, PNG ou HEIC — máximo 5MB</p>
                  </div>
                </div>
              </label>
            )}
            <input id="post-file-input" ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="sr-only" />
          </Step>

          {/* ─── Step 3 · Tipo + contexto ─── */}
          <Step number="03" title="Sobre o que é?">
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {POST_TYPES.map(t => {
                  const active = postType === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => { setPostType(t.id); setResult(null); }}
                      className={`flex flex-col items-start gap-1.5 p-3 rounded-xl border text-left transition-all ${
                        active
                          ? 'border-accent bg-accent-bg ring-1 ring-accent/20'
                          : 'border-border-light glass-soft hover:border-accent/30'
                      }`}
                    >
                      <Icon name={t.icon} size={16} className={active ? 'text-accent' : 'text-text-muted'} />
                      <span className={`text-[12.5px] font-semibold ${active ? 'text-accent' : 'text-text'}`}>{t.label}</span>
                      <span className="text-[10px] text-text-light">{t.hint}</span>
                    </button>
                  );
                })}
              </div>

              <textarea
                value={extraInfo}
                onChange={(e) => setExtraInfo(e.target.value)}
                placeholder="Conta o contexto: alongamento gel rosê, cliente amou, durou 3h…"
                rows={3}
                maxLength={500}
                className="w-full glass-soft rounded-2xl px-4 py-3 text-[13.5px] text-text placeholder-text-light focus:outline-none focus:ring-2 focus:ring-accent/25 focus:border-accent transition-all resize-none font-italic-display italic"
              />
              {extraInfo.length > 0 && (
                <p className="text-[10px] text-text-light text-right">{extraInfo.length} / 500</p>
              )}
            </div>
          </Step>

          {/* ─── Step 4 · Gerar ─── */}
          <Step number="04" title="Gerar legendas">
            {atLimit ? (
              <div className="glass-card rounded-2xl p-5 text-center">
                <div className="w-12 h-12 rounded-2xl ai-avatar mx-auto mb-3 flex items-center justify-center text-white">
                  <Icon name="lock" size={18} />
                </div>
                <p className="font-display text-xl text-text mb-1">Limite atingido</p>
                <p className="text-[12.5px] text-text-muted mb-4 max-w-sm mx-auto">
                  Você usou seus {dailyLimit} posts de hoje. Faça upgrade pra gerar até {POST_LIMITS.pro} por dia.
                </p>
                <button onClick={onUpgrade} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full btn-gradient text-[13px]">
                  Fazer upgrade <Icon name="arrowRight" size={13} />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={generatePost}
                  disabled={isLoading || !postType}
                  className="w-full py-4 rounded-2xl btn-gradient flex items-center justify-center gap-2.5 text-[14px] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Gerando legendas…
                    </>
                  ) : (
                    <>
                      <Icon name="sparkle" size={16} />
                      Gerar legenda e hashtags
                    </>
                  )}
                </button>
                {isFree && (
                  <p className="text-[11px] text-text-light text-center">
                    {postsRemaining} de {dailyLimit} posts restantes hoje
                  </p>
                )}
              </div>
            )}
          </Step>

          {/* ─── Resultado ─── */}
          {result && (
            <section className="animate-fade-in space-y-3 pb-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl text-text">
                  Suas <span className="font-italic-display text-accent">legendas</span>
                </h2>
                <div className="flex items-center gap-1">
                  <button
                    onClick={shareOnWhatsApp}
                    title="Compartilhar no WhatsApp"
                    className="w-9 h-9 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                  >
                    <Icon name="whatsapp" size={16} />
                  </button>
                  <button
                    onClick={() => copyToClipboard(
                      (captionOptions?.captions?.[selectedCaption]?.legenda || result) +
                      '\n\n' + (captionOptions?.captions?.[selectedCaption]?.hashtags || '')
                    )}
                    title="Copiar legenda + hashtags"
                    className="w-9 h-9 rounded-full flex items-center justify-center text-accent hover:bg-accent-bg transition-colors"
                  >
                    <Icon name="bookmark" size={16} />
                  </button>
                </div>
              </div>

              {/* Tabs de opções */}
              {captionOptions?.captions?.length > 1 && (
                <div className="flex gap-2 p-1 rounded-2xl glass-soft">
                  {captionOptions.captions.map((_, i) => {
                    const active = selectedCaption === i;
                    return (
                      <button
                        key={i}
                        onClick={() => setSelectedCaption(i)}
                        className={`flex-1 py-2 rounded-xl text-[12px] font-semibold transition-all ${
                          active ? 'bg-surface-card text-accent shadow-card' : 'text-text-muted hover:text-text'
                        }`}
                      >
                        Opção {i + 1}
                      </button>
                    );
                  })}
                </div>
              )}

              {captionOptions?.captions?.[selectedCaption] ? (
                <>
                  {/* Legenda */}
                  <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="kicker">legenda</span>
                      <button
                        onClick={() => copyToClipboard(captionOptions.captions[selectedCaption].legenda)}
                        className="text-[11px] font-semibold text-text-muted hover:text-accent transition-colors inline-flex items-center gap-1.5"
                      >
                        <Icon name="bookmark" size={11} /> Copiar
                      </button>
                    </div>
                    <p className="text-[14px] text-text whitespace-pre-wrap leading-relaxed">
                      {captionOptions.captions[selectedCaption].legenda}
                    </p>
                  </div>

                  {/* Hashtags */}
                  {captionOptions.captions[selectedCaption].hashtags && (
                    <div className="glass-card rounded-2xl p-5">
                      <div className="flex items-center justify-between mb-3">
                        <span className="kicker">hashtags</span>
                        <button
                          onClick={() => copyToClipboard(captionOptions.captions[selectedCaption].hashtags)}
                          className="text-[11px] font-semibold text-text-muted hover:text-accent transition-colors inline-flex items-center gap-1.5"
                        >
                          <Icon name="bookmark" size={11} /> Copiar
                        </button>
                      </div>
                      <p className="text-[13px] text-accent/85 leading-relaxed break-words">
                        {captionOptions.captions[selectedCaption].hashtags}
                      </p>
                    </div>
                  )}

                  {/* Dica */}
                  {captionOptions.captions[selectedCaption].dica && (
                    <div className="rounded-2xl p-4 flex items-start gap-3" style={{
                      background: 'var(--color-accent-bg)', border: '1px solid var(--color-accent-light)',
                    }}>
                      <div className="w-9 h-9 rounded-xl ai-avatar flex items-center justify-center text-white flex-shrink-0">
                        <Icon name="sparkle" size={14} />
                      </div>
                      <div className="flex-1">
                        <p className="kicker mb-1">dica</p>
                        <p className="text-[13px] text-text-muted leading-relaxed">
                          {captionOptions.captions[selectedCaption].dica}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="glass-card rounded-2xl p-5">
                  <p className="text-[14px] text-text whitespace-pre-wrap leading-relaxed">{result}</p>
                </div>
              )}

              {/* ─── Gerar arte com IA ─── */}
              {imageBase64 && !isFree && (
                <div className="pt-2">
                  <button
                    onClick={generateArt}
                    disabled={isGeneratingArt}
                    className="w-full py-3.5 rounded-2xl text-[13px] font-semibold text-accent border-2 border-accent flex items-center justify-center gap-2 hover:bg-accent hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGeneratingArt ? (
                      <>
                        <span className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                        Gerando arte com IA…
                      </>
                    ) : (
                      <><Icon name="sparkle" size={15} /> Gerar arte do post com IA</>
                    )}
                  </button>
                  <p className="text-[11px] text-text-light text-center mt-2">
                    A IA cria a arte pronta com sua foto e a legenda escolhida.
                  </p>
                </div>
              )}
              {imageBase64 && isFree && (
                <div className="glass-card rounded-2xl p-5 text-center">
                  <div className="w-11 h-11 rounded-xl ai-avatar mx-auto mb-3 flex items-center justify-center text-white">
                    <Icon name="diamond" size={16} />
                  </div>
                  <p className="font-display text-lg text-text mb-1">
                    Gere a <span className="font-italic-display text-accent">arte pronta</span>
                  </p>
                  <p className="text-[12px] text-text-muted mb-3 max-w-xs mx-auto">
                    A IA cria a imagem final pronta pra postar — recurso exclusivo do plano Pro.
                  </p>
                  <button onClick={onUpgrade} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full btn-gradient text-[12.5px]">
                    Fazer upgrade <Icon name="arrowRight" size={12} />
                  </button>
                </div>
              )}

              {/* ─── Arte gerada ─── */}
              {artImage && (
                <div className="animate-fade-in space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-2xl text-text">
                      Arte <span className="font-italic-display text-accent">pronta</span>
                    </h3>
                    <button
                      onClick={downloadArt}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-soft text-[12px] font-semibold text-accent hover:bg-accent-bg transition-colors"
                    >
                      <Icon name="download" size={13} /> Baixar
                    </button>
                  </div>
                  <div className="rounded-2xl overflow-hidden glass-soft">
                    <img src={artImage} alt="Arte gerada" className="w-full object-contain bg-black/80" />
                  </div>
                </div>
              )}
            </section>
          )}

        </div>
      </div>
    </div>
  );
}

/* ─── Step wrapper ─────────────────────────────────────────────── */
function Step({ number, title, subtitle, children }) {
  return (
    <section className="animate-fade-in">
      <div className="flex items-baseline gap-3 mb-3">
        <span className="font-display text-[28px] text-accent leading-none">{number}.</span>
        <div className="flex items-baseline gap-2 flex-1">
          <h2 className="font-display text-[20px] text-text tracking-tight">{title}</h2>
          {subtitle && <span className="text-[11px] text-text-light font-italic-display italic">{subtitle}</span>}
        </div>
      </div>
      {children}
    </section>
  );
}
