'use client';

import { useState, useRef, useEffect } from 'react';
import { useToast } from './Toast';
import { dbLoadPostHistory, dbSavePost, dbDeletePost } from '../lib/db';
import { useAuth } from './SupabaseAuthProvider';

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', icon: '📸' },
  { id: 'facebook', label: 'Facebook', icon: '📘' },
  { id: 'whatsapp', label: 'WhatsApp', icon: '📲' },
];

const POST_TYPES = [
  { id: 'resultado', label: '📸 Resultado' },
  { id: 'antesdepois', label: '🔄 Antes e Depois' },
  { id: 'dica', label: '💡 Dica Técnica' },
  { id: 'promocao', label: '🔥 Promoção' },
  { id: 'bastidor', label: '🎬 Bastidores' },
  { id: 'depoimento', label: '💬 Depoimento' },
];

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
  const POST_LIMITS = { free: 2, pro: 15, premium: 9999 };
  const dailyLimit = POST_LIMITS[plan] || POST_LIMITS.free;
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayPosts = postHistory.filter(p => p.created_at?.slice(0, 10) === todayStr).length;
  const postsRemaining = Math.max(0, dailyLimit - todayPosts);
  const atLimit = postsRemaining <= 0 && isFree;

  useEffect(() => {
    if (userId) dbLoadPostHistory(userId).then(setPostHistory).catch(() => {});
  }, [userId]);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('Imagem muito grande! Máximo 5MB.'); return; }
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

  const generatePost = async () => {
    if (!postType) { toast?.('Selecione o tipo de post'); return; }
    setIsLoading(true); setResult(null); setCaptionOptions(null); setSelectedCaption(0); setArtImage(null);
    const typeLabel = POST_TYPES.find(t => t.id === postType)?.label?.replace(/^.+\s/, '') || postType;
    const platformLabel = PLATFORMS.find(p => p.id === platform)?.label || 'Instagram';
    try {
      const token = getAccessToken ? await getAccessToken() : null;
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/generate-copy', {
        method: 'POST', headers,
        body: JSON.stringify({ tipo: typeLabel, servico: extraInfo || '', imageBase64: imageBase64 || undefined, imageMediaType: imageMediaType || undefined }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Erro na API'); }
      const data = await res.json();
      if (data.captions?.length) { setCaptionOptions(data); setResult(data.captions[0].legenda); }
      else { setResult('Não consegui gerar. Tenta de novo!'); }
      if (userId) {
        const saved = await dbSavePost(userId, { platform: platformLabel, postType: typeLabel, content: data.captions?.[0]?.legenda || 'Post gerado' }).catch(() => null);
        if (saved) setPostHistory(prev => [saved, ...prev]);
      }
    } catch (err) { setResult(`Erro: ${err.message}`); } finally { setIsLoading(false); }
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
          action: 'post-art',
          imageBase64,
          postData: {
            title,
            subtitle,
            cta: platform === 'whatsapp' ? 'Agende agora!' : 'Saiba mais',
            style: 'feed',
          },
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (err.upgrade) { toast?.('Recurso exclusivo para assinantes Pro/Premium'); return; }
        throw new Error(err.error || 'Erro ao gerar arte');
      }
      const data = await res.json();
      if (data.b64) { setArtImage(`data:image/png;base64,${data.b64}`); }
      else if (data.url) { setArtImage(data.url); }
      else { throw new Error('Nenhuma imagem retornada'); }
      toast?.('Arte gerada com sucesso!');
    } catch (err) { toast?.(err.message || 'Erro ao gerar arte'); } finally { setIsGeneratingArt(false); }
  };

  const downloadArt = () => {
    if (!artImage) return;
    const a = document.createElement('a');
    a.href = artImage;
    a.download = `post-${platform}-${Date.now()}.png`;
    a.click();
  };

  const copyToClipboard = (text) => { navigator.clipboard.writeText(text); toast?.('Copiado!'); };
  const shareOnWhatsApp = () => {
    const legenda = captionOptions?.captions?.[selectedCaption]?.legenda || result || '';
    const hashtags = captionOptions?.captions?.[selectedCaption]?.hashtags || '';
    window.open(`https://wa.me/?text=${encodeURIComponent(`${legenda}\n\n${hashtags}`.trim())}`, '_blank');
  };

  return (
    <div className="flex flex-col h-full bg-surface">
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-xl mx-auto space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-bold text-text">Criar Post</h2>
              <p className="text-text-muted text-xs mt-0.5">Foto + legenda pronta pra postar</p>
            </div>
            {postHistory.length > 0 && (
              <button onClick={() => setShowHistory(!showHistory)} className="text-xs text-accent hover:text-accent-hover font-medium flex items-center gap-1">
                📋 Histórico ({postHistory.length})
              </button>
            )}
          </div>

          {/* Histórico */}
          {showHistory && postHistory.length > 0 && (
            <div className="bg-surface-card border border-border rounded-xl p-3 space-y-2 max-h-48 overflow-y-auto animate-fade-in">
              {postHistory.map((item) => (
                <div key={item.id} className="flex items-start gap-2 group">
                  <button onClick={() => { setResult(item.content); setCaptionOptions(null); setShowHistory(false); }}
                    className="flex-1 text-left text-xs text-text-muted hover:text-accent px-2 py-1.5 rounded-lg hover:bg-accent-bg transition-colors">
                    <span className="font-medium text-text block">{item.post_type}</span>
                    <span className="line-clamp-1">{item.content?.slice(0, 80)}...</span>
                  </button>
                  <button onClick={async () => { await dbDeletePost(item.id); setPostHistory(prev => prev.filter(p => p.id !== item.id)); }}
                    className="opacity-0 group-hover:opacity-100 shrink-0 text-text-light hover:text-rose mt-1">✕</button>
                </div>
              ))}
            </div>
          )}

          {/* Plataforma */}
          <div className="flex gap-2">
            {PLATFORMS.map((p) => (
              <button key={p.id} onClick={() => { setPlatform(p.id); setResult(null); }}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                  platform === p.id ? 'border-accent bg-accent-light text-text shadow-soft' : 'border-border bg-surface-card text-text-muted hover:border-accent/40'
                }`}>
                <span>{p.icon}</span> {p.label}
              </button>
            ))}
          </div>

          {/* ① FOTO (opcional) */}
          <div>
            {imagePreview ? (
              <div className="relative rounded-xl overflow-hidden border border-border shadow-soft">
                <img src={imagePreview} alt="Sua foto" className="w-full max-h-[350px] object-contain bg-black" />
                <button onClick={() => { setImagePreview(null); setImageBase64(null); setResult(null); setArtImage(null); }}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/60 text-white rounded-full flex items-center justify-center text-xs hover:bg-black/80 transition-colors">✕</button>
              </div>
            ) : (
              <label htmlFor="post-file-input"
                className="flex flex-col items-center gap-3 px-6 py-8 border-2 border-dashed border-border rounded-xl text-text-muted hover:border-accent hover:text-accent hover:bg-accent-bg transition-all cursor-pointer">
                <svg className="w-10 h-10 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-medium">Toque pra enviar sua foto</span>
                <span className="text-[11px] text-text-light">JPG, PNG ou HEIC — Máximo 5MB · Opcional</span>
              </label>
            )}
            <input id="post-file-input" ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="sr-only" />
          </div>

          {/* ② TIPO + CONTEXTO */}
          <div className="space-y-3">
            <div>
              <label className="block text-text text-xs font-medium mb-1.5">Tipo de post</label>
              <select value={postType} onChange={(e) => { setPostType(e.target.value); setResult(null); }}
                className="w-full bg-surface-card border border-border rounded-xl px-3 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all appearance-none">
                <option value="" disabled>Selecione...</option>
                {POST_TYPES.map(t => (<option key={t.id} value={t.id}>{t.label}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-text text-xs font-medium mb-1.5">Sobre o que é? <span className="text-text-light font-normal">(opcional)</span></label>
              <textarea value={extraInfo} onChange={(e) => setExtraInfo(e.target.value)}
                placeholder="Ex: Alongamento gel, a cliente amou, ficou 2h..." rows={2} maxLength={500}
                className="w-full bg-surface-card border border-border rounded-xl px-3 py-2.5 text-sm text-text placeholder-text-light focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all resize-none" />
            </div>
          </div>

          {/* ③ GERAR */}
          {atLimit ? (
            <div className="rounded-xl border border-accent/20 bg-accent-bg p-4 text-center">
              <p className="text-xs font-semibold text-text mb-1">Limite de posts atingido ({dailyLimit}/{dailyLimit})</p>
              <p className="text-[11px] text-text-muted mb-3">Upgrade pra gerar até {POST_LIMITS.pro} posts/dia</p>
              <button onClick={onUpgrade} className="px-4 py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent-hover transition-colors">Fazer upgrade 💅</button>
            </div>
          ) : (
            <div>
              {isFree && <p className="text-[11px] text-text-light text-center mb-1.5">{postsRemaining} de {dailyLimit} restantes hoje</p>}
              <button onClick={generatePost} disabled={isLoading || !postType}
                className="w-full py-3 rounded-xl font-semibold text-sm transition-all bg-accent text-white hover:bg-accent-hover shadow-soft disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {isLoading ? (
                  <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Gerando legenda...</>
                ) : (
                  <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> Gerar legenda e hashtags</>
                )}
              </button>
            </div>
          )}

          {/* ④ RESULTADO */}
          {result && (
            <div className="animate-fade-in space-y-3 pb-6">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-bold text-text">Legendas Geradas</h3>
                <div className="flex items-center gap-3">
                  <button onClick={shareOnWhatsApp} className="text-xs text-green-600 hover:text-green-700 font-medium">📲 WhatsApp</button>
                  <button onClick={() => copyToClipboard((captionOptions?.captions?.[selectedCaption]?.legenda || result) + '\n\n' + (captionOptions?.captions?.[selectedCaption]?.hashtags || ''))}
                    className="text-xs text-accent hover:text-accent-hover font-medium">📋 Copiar</button>
                </div>
              </div>
              {captionOptions?.captions?.length > 1 && (
                <div className="flex gap-2">
                  {captionOptions.captions.map((_, i) => (
                    <button key={i} onClick={() => setSelectedCaption(i)}
                      className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${selectedCaption === i ? 'border-accent bg-accent-light text-accent' : 'border-border bg-surface-card text-text-muted hover:border-accent/40'}`}>
                      Opção {i + 1}
                    </button>
                  ))}
                </div>
              )}
              {captionOptions?.captions?.[selectedCaption] ? (
                <>
                  <div className="bg-surface-card border border-border rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-medium text-accent uppercase tracking-wide">Legenda</span>
                      <button onClick={() => copyToClipboard(captionOptions.captions[selectedCaption].legenda)} className="text-[11px] text-text-light hover:text-accent">Copiar</button>
                    </div>
                    <p className="text-sm text-text whitespace-pre-wrap leading-relaxed">{captionOptions.captions[selectedCaption].legenda}</p>
                  </div>
                  {captionOptions.captions[selectedCaption].hashtags && (
                    <div className="bg-surface-card border border-border rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-medium text-accent uppercase tracking-wide">Hashtags</span>
                        <button onClick={() => copyToClipboard(captionOptions.captions[selectedCaption].hashtags)} className="text-[11px] text-text-light hover:text-accent">Copiar</button>
                      </div>
                      <p className="text-sm text-accent/80">{captionOptions.captions[selectedCaption].hashtags}</p>
                    </div>
                  )}
                  {captionOptions.captions[selectedCaption].dica && (
                    <div className="bg-accent-bg border border-accent/10 rounded-xl p-3">
                      <p className="text-xs text-text-muted"><span className="font-semibold text-accent">💡 Dica:</span> {captionOptions.captions[selectedCaption].dica}</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-surface-card border border-border rounded-xl p-4">
                  <p className="text-sm text-text whitespace-pre-wrap">{result}</p>
                </div>
              )}

              {/* ⑤ GERAR ARTE COM IA */}
              {imageBase64 && !isFree && (
                <div className="pt-1">
                  <button onClick={generateArt} disabled={isGeneratingArt}
                    className="w-full py-3 rounded-xl font-semibold text-sm transition-all border-2 border-accent text-accent hover:bg-accent hover:text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {isGeneratingArt ? (
                      <><span className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" /> Gerando arte com IA...</>
                    ) : (
                      <>✨ Gerar Arte do Post com IA</>
                    )}
                  </button>
                  <p className="text-[10px] text-text-light text-center mt-1">A IA cria a arte pronta com sua foto + legenda</p>
                </div>
              )}
              {imageBase64 && isFree && (
                <div className="rounded-xl border border-accent/20 bg-accent-bg p-3 text-center">
                  <p className="text-xs text-text-muted">✨ <strong>Gerar Arte com IA</strong> — exclusivo para assinantes</p>
                  <button onClick={onUpgrade} className="mt-2 px-4 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent-hover transition-colors">Fazer upgrade 💅</button>
                </div>
              )}

              {/* ⑥ ARTE GERADA */}
              {artImage && (
                <div className="animate-fade-in space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-base font-bold text-text">Arte Pronta</h3>
                    <button onClick={downloadArt} className="text-xs text-accent hover:text-accent-hover font-medium flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      Baixar imagem
                    </button>
                  </div>
                  <div className="relative rounded-xl overflow-hidden border border-border shadow-soft">
                    <img src={artImage} alt="Arte gerada" className="w-full object-contain bg-black" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
