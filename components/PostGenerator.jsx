'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useToast } from './Toast';
import { dbLoadPostHistory, dbSavePost, dbDeletePost } from '../lib/db';
import { useAuth } from './SupabaseAuthProvider';

// ── Plataformas ────────────────────────────────────────────────────────
const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', icon: '📸' },
  { id: 'facebook', label: 'Facebook', icon: '📘' },
  { id: 'whatsapp', label: 'WhatsApp', icon: '📲' },
];

// ── Filtros estilo Instagram (CSS filter) ──────────────────────────────
const FILTERS = [
  { id: 'original', label: 'Original', css: 'none' },
  { id: 'clarendon', label: 'Clarendon', css: 'contrast(1.2) saturate(1.35)' },
  { id: 'gingham', label: 'Gingham', css: 'brightness(1.05) hue-rotate(-10deg) saturate(0.7)' },
  { id: 'moon', label: 'Moon', css: 'grayscale(0.6) brightness(1.1) contrast(0.95)' },
  { id: 'lark', label: 'Lark', css: 'brightness(1.1) saturate(0.9) contrast(1.05)' },
  { id: 'juno', label: 'Juno', css: 'contrast(1.15) saturate(1.4) brightness(1.05) sepia(0.05)' },
  { id: 'valencia', label: 'Valencia', css: 'brightness(1.08) sepia(0.15) saturate(1.2) contrast(1.05)' },
  { id: 'warm', label: 'Quente', css: 'sepia(0.2) saturate(1.3) brightness(1.05)' },
  { id: 'cool', label: 'Frio', css: 'saturate(0.85) brightness(1.1) hue-rotate(10deg)' },
  { id: 'vivid', label: 'Vívido', css: 'saturate(1.5) contrast(1.1) brightness(1.02)' },
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
  const [activeFilter, setActiveFilter] = useState('original');
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [postHistory, setPostHistory] = useState([]);
  // Editor de texto na imagem
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [overlayText, setOverlayText] = useState('');
  const [textPosition, setTextPosition] = useState('bottom'); // top, center, bottom
  const [textStyle, setTextStyle] = useState('light'); // light, dark, accent
  const canvasRef = useRef(null);
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

  // ── Upload ───────────────────────────────────────────────────────────
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Imagem muito grande! Máximo 5MB.');
      return;
    }

    const isHeic = file.type === 'image/heic' || file.type === 'image/heif'
      || /\.(heic|heif)$/i.test(file.name);
    let fileToProcess = file;

    if (isHeic) {
      try {
        const heic2any = (await import('heic2any')).default;
        const blob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 });
        fileToProcess = new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), { type: 'image/jpeg' });
      } catch {
        alert('Não foi possível converter a foto HEIF. Desative "Fotos de alta eficiência" nas configurações da câmera.');
        return;
      }
    }

    if (!fileToProcess.type.startsWith('image/') && !isHeic) {
      alert('Envie apenas imagens.');
      return;
    }

    setImageMediaType(fileToProcess.type || 'image/jpeg');
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result);
      setImageBase64(reader.result.split(',')[1]);
    };
    reader.readAsDataURL(fileToProcess);
    e.target.value = '';
    setActiveFilter('original');
    setResult(null);
  };

  // ── Renderizar canvas com filtro + texto ─────────────────────────────
  const renderCanvas = useCallback((img) => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    const f = FILTERS.find(x => x.id === activeFilter);
    ctx.filter = f?.css || 'none';
    ctx.drawImage(img, 0, 0);
    ctx.filter = 'none';
    // Texto overlay
    if (overlayText.trim()) {
      const lines = overlayText.split('\n').filter(Boolean);
      const fontSize = Math.max(24, Math.round(img.width / 16));
      const padding = Math.round(img.width * 0.06);
      const lineHeight = fontSize * 1.3;
      const totalTextH = lines.length * lineHeight;
      // Posição vertical
      let startY;
      if (textPosition === 'top') startY = padding + fontSize;
      else if (textPosition === 'center') startY = (img.height - totalTextH) / 2 + fontSize;
      else startY = img.height - padding - totalTextH + fontSize;
      // Fundo semi-transparente
      const bgPad = fontSize * 0.4;
      const maxW = lines.reduce((max, line) => {
        ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;
        return Math.max(max, ctx.measureText(line).width);
      }, 0);
      const bgX = (img.width - maxW) / 2 - bgPad;
      const bgY = startY - fontSize - bgPad;
      const bgH = totalTextH + bgPad * 2;
      ctx.fillStyle = textStyle === 'dark' ? 'rgba(0,0,0,0.65)' : textStyle === 'accent' ? 'rgba(127,119,221,0.75)' : 'rgba(255,255,255,0.75)';
      ctx.beginPath();
      const r = fontSize * 0.3;
      ctx.roundRect(bgX, bgY, maxW + bgPad * 2, bgH, r);
      ctx.fill();
      // Texto
      ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = textStyle === 'dark' ? '#ffffff' : textStyle === 'accent' ? '#ffffff' : '#1a1a1a';
      lines.forEach((line, i) => {
        ctx.fillText(line, img.width / 2, startY + i * lineHeight);
      });
    }
    return canvas;
  }, [activeFilter, overlayText, textPosition, textStyle]);

  // ── Download foto com filtro + texto ──────────────────────────────────
  const downloadFiltered = useCallback(() => {
    if (!imagePreview) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = renderCanvas(img);
      const link = document.createElement('a');
      link.download = `maluar-${activeFilter}-${Date.now()}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.95);
      link.click();
      toast?.('Foto baixada!');
    };
    img.src = imagePreview;
  }, [imagePreview, activeFilter, renderCanvas, toast]);

  // ── Gerar legenda ────────────────────────────────────────────────────
  const generatePost = async () => {
    if (!postType) {
      toast?.('Selecione o tipo de post');
      return;
    }
    setIsLoading(true);
    setResult(null);

    const typeLabel = POST_TYPES.find(t => t.id === postType)?.label?.replace(/^.+\s/, '') || postType;
    const platformLabel = PLATFORMS.find(p => p.id === platform)?.label || 'Instagram';

    // Regras específicas por plataforma
    const platformRules = {
      instagram: `- Plataforma: Instagram Feed/Carousel
- Legenda até 2200 chars, mas ideal 150-300 palavras
- 20-30 hashtags relevantes (misture populares + nicho)
- Use emojis com moderação (2-4)
- CTA: "Link na bio", "Salve pra depois", "Marque uma amiga"`,
      facebook: `- Plataforma: Facebook
- Texto mais conversacional e pessoal, como se falasse com uma amiga
- Menos hashtags (3-5 no máximo, Facebook não depende de hashtags)
- Pode ser mais longo e storytelling
- CTA: "Curte", "Compartilha", "Comenta aqui embaixo"`,
      whatsapp: `- Plataforma: Status/Broadcast do WhatsApp
- Texto CURTO e direto (máx 100 palavras)
- SEM hashtags (WhatsApp não usa)
- Tom íntimo, como mensagem pra cliente
- Pode usar mais emojis (3-6)
- CTA: "Chama no inbox", "Agenda comigo", "Responde esse status"`,
    };

    const systemPrompt = `Você é uma expert em social media para nail designers brasileiras. Crie conteúdo profissional, autêntico e envolvente.

REGRAS:
- PT-BR, tom amigável e profissional
- Se tiver foto: descreva o que vê e crie conteúdo baseado nela
- Tipo de post: ${typeLabel}
${platformRules[platform] || platformRules.instagram}

FORMATO DE RESPOSTA (use exatamente estas seções):
**LEGENDA:**
(legenda completa pronta pra copiar)

${platform !== 'whatsapp' ? '**HASHTAGS:**\n(hashtags separadas por espaço, prontas pra copiar)\n\n' : ''}**DICA:**
(1-2 frases: melhor horário, formato ideal ou sugestão rápida)`;

    let promptText = `Crie um post para ${platformLabel}, tipo: ${typeLabel}.`;
    if (extraInfo) promptText += ` Contexto: ${extraInfo}`;
    if (!imageBase64) promptText += ' Não tenho foto, crie baseado no tipo.';

    const messages = [{
      role: 'user',
      content: imageBase64
        ? [
            { type: 'image', source: { type: 'base64', media_type: imageMediaType, data: imageBase64 } },
            { type: 'text', text: promptText },
          ]
        : promptText,
    }];

    try {
      const token = getAccessToken ? await getAccessToken() : null;
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({ messages, system: systemPrompt }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erro na API');
      }

      const data = await res.json();
      const text = data.content?.[0]?.text || 'Não consegui gerar. Tenta de novo!';
      setResult(text);

      if (!text.startsWith('Erro') && userId) {
        const saved = await dbSavePost(userId, {
          platform: platformLabel,
          postType: typeLabel,
          content: text,
        }).catch(() => null);
        if (saved) setPostHistory(prev => [saved, ...prev]);
      }
    } catch (err) {
      setResult(`Erro: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Helpers ──────────────────────────────────────────────────────────
  const extractSection = (section) => {
    if (!result) return '';
    const regex = new RegExp(`\\*\\*${section}[:\\s]*\\*\\*\\s*([\\s\\S]*?)(?=\\*\\*[A-ZÁÉÍÓÚÂ]|$)`, 'i');
    const match = result.match(regex);
    return match ? match[1].trim() : '';
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast?.('Copiado!');
  };

  const shareOnWhatsApp = () => {
    const legenda = extractSection('LEGENDA') || result?.replace(/\*\*/g, '') || '';
    const hashtags = extractSection('HASHTAGS');
    window.open(`https://wa.me/?text=${encodeURIComponent(`${legenda}\n\n${hashtags}`.trim())}`, '_blank');
  };

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-surface">
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-xl mx-auto space-y-5">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-bold text-text">Criar Post</h2>
              <p className="text-text-muted text-xs mt-0.5">Foto + filtro + legenda pronta pra postar</p>
            </div>
            {postHistory.length > 0 && (
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="text-xs text-accent hover:text-accent-hover font-medium flex items-center gap-1"
              >
                📋 Histórico ({postHistory.length})
              </button>
            )}
          </div>

          {/* Histórico */}
          {showHistory && postHistory.length > 0 && (
            <div className="bg-surface-card border border-border rounded-xl p-3 space-y-2 max-h-48 overflow-y-auto animate-fade-in">
              {postHistory.map((item) => (
                <div key={item.id} className="flex items-start gap-2 group">
                  <button
                    onClick={() => { setResult(item.content); setShowHistory(false); }}
                    className="flex-1 text-left text-xs text-text-muted hover:text-accent px-2 py-1.5 rounded-lg hover:bg-accent-bg transition-colors"
                  >
                    <span className="font-medium text-text block">{item.post_type}</span>
                    <span className="line-clamp-1">{item.content?.slice(0, 80)}...</span>
                  </button>
                  <button
                    onClick={async () => {
                      await dbDeletePost(item.id);
                      setPostHistory(prev => prev.filter(p => p.id !== item.id));
                    }}
                    className="opacity-0 group-hover:opacity-100 shrink-0 text-text-light hover:text-rose mt-1"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Plataforma */}
          <div className="flex gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p.id}
                onClick={() => { setPlatform(p.id); setResult(null); }}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                  platform === p.id
                    ? 'border-accent bg-accent-light text-text shadow-soft'
                    : 'border-border bg-surface-card text-text-muted hover:border-accent/40'
                }`}
              >
                <span>{p.icon}</span> {p.label}
              </button>
            ))}
          </div>

          {/* ① FOTO */}
          <div>
            {imagePreview ? (
              <div className="space-y-3">
                {/* Preview com filtro + texto overlay */}
                <div className="relative rounded-xl overflow-hidden border border-border shadow-soft">
                  <img
                    src={imagePreview}
                    alt="Sua foto"
                    className="w-full max-h-[400px] object-contain bg-black"
                    style={{ filter: FILTERS.find(f => f.id === activeFilter)?.css || 'none' }}
                  />
                  {/* Overlay de texto (preview) */}
                  {overlayText.trim() && (
                    <div className={`absolute inset-x-0 px-4 flex ${
                      textPosition === 'top' ? 'top-4' : textPosition === 'center' ? 'top-1/2 -translate-y-1/2' : 'bottom-4'
                    }`}>
                      <div className={`mx-auto px-4 py-2 rounded-lg text-center max-w-[85%] ${
                        textStyle === 'dark' ? 'bg-black/65 text-white' : textStyle === 'accent' ? 'bg-accent/75 text-white' : 'bg-white/75 text-gray-900'
                      }`}>
                        {overlayText.split('\n').map((line, i) => (
                          <p key={i} className="font-bold text-sm leading-snug">{line}</p>
                        ))}
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setImagePreview(null);
                      setImageBase64(null);
                      setActiveFilter('original');
                      setResult(null);
                    }}
                    className="absolute top-2 right-2 w-7 h-7 bg-black/60 text-white rounded-full flex items-center justify-center text-xs hover:bg-black/80 transition-colors"
                  >
                    ✕
                  </button>
                </div>

                {/* Filtros — strip horizontal */}
                <div>
                  <p className="text-[11px] text-text-light font-medium mb-2 uppercase tracking-wide">Filtro</p>
                  <div className="flex gap-2 overflow-x-auto pb-1.5 -mx-1 px-1 scrollbar-hide">
                    {FILTERS.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setActiveFilter(f.id)}
                        className={`shrink-0 flex flex-col items-center gap-1 transition-all ${
                          activeFilter === f.id ? 'scale-105' : 'opacity-70 hover:opacity-100'
                        }`}
                      >
                        <div className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-colors ${
                          activeFilter === f.id ? 'border-accent' : 'border-transparent'
                        }`}>
                          <img
                            src={imagePreview}
                            alt={f.label}
                            className="w-full h-full object-cover"
                            style={{ filter: f.css }}
                          />
                        </div>
                        <span className={`text-[10px] font-medium ${
                          activeFilter === f.id ? 'text-accent' : 'text-text-light'
                        }`}>
                          {f.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Baixar foto / Adicionar texto */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowTextEditor(!showTextEditor)}
                    className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${showTextEditor ? 'text-accent' : 'text-text-muted hover:text-accent'}`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    Adicionar texto
                  </button>
                  {(activeFilter !== 'original' || overlayText.trim()) && (
                    <button
                      onClick={downloadFiltered}
                      className="flex items-center gap-1.5 text-xs text-accent hover:text-accent-hover font-medium transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Baixar imagem
                    </button>
                  )}
                </div>

                {/* Editor de texto na imagem */}
                {showTextEditor && (
                  <div className="bg-surface-card border border-border rounded-xl p-3 space-y-2.5 animate-fade-in">
                    <textarea
                      value={overlayText}
                      onChange={(e) => setOverlayText(e.target.value)}
                      placeholder="Ex: Alongamento Gel • Agende já!"
                      rows={2}
                      maxLength={120}
                      className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text placeholder-text-light focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all resize-none"
                    />
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <p className="text-[10px] text-text-light mb-1">Posição</p>
                        <div className="flex gap-1">
                          {[{ id: 'top', label: '↑ Topo' }, { id: 'center', label: '― Centro' }, { id: 'bottom', label: '↓ Base' }].map(pos => (
                            <button
                              key={pos.id}
                              onClick={() => setTextPosition(pos.id)}
                              className={`flex-1 text-[10px] py-1 rounded-md transition-colors ${textPosition === pos.id ? 'bg-accent text-white' : 'bg-surface text-text-muted hover:bg-accent-bg'}`}
                            >{pos.label}</button>
                          ))}
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] text-text-light mb-1">Estilo</p>
                        <div className="flex gap-1">
                          {[{ id: 'light', label: 'Claro' }, { id: 'dark', label: 'Escuro' }, { id: 'accent', label: 'Roxo' }].map(s => (
                            <button
                              key={s.id}
                              onClick={() => setTextStyle(s.id)}
                              className={`flex-1 text-[10px] py-1 rounded-md transition-colors ${textStyle === s.id ? 'bg-accent text-white' : 'bg-surface text-text-muted hover:bg-accent-bg'}`}
                            >{s.label}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <label
                htmlFor="post-file-input"
                className="flex flex-col items-center gap-3 px-6 py-8 border-2 border-dashed border-border rounded-xl text-text-muted hover:border-accent hover:text-accent hover:bg-accent-bg transition-all cursor-pointer"
              >
                <svg className="w-10 h-10 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-medium">Toque pra enviar sua foto</span>
                <span className="text-[11px] text-text-light">JPG, PNG ou HEIC — Máximo 5MB</span>
              </label>
            )}
            <input
              id="post-file-input"
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="sr-only"
            />
          </div>

          {/* ② TIPO + CONTEXTO */}
          <div className="space-y-3">
            <div>
              <label className="block text-text text-xs font-medium mb-1.5">Tipo de post</label>
              <select
                value={postType}
                onChange={(e) => { setPostType(e.target.value); setResult(null); }}
                className="w-full bg-surface-card border border-border rounded-xl px-3 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all appearance-none"
              >
                <option value="" disabled>Selecione...</option>
                {POST_TYPES.map(t => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-text text-xs font-medium mb-1.5">
                Sobre o que é? <span className="text-text-light font-normal">(opcional)</span>
              </label>
              <textarea
                value={extraInfo}
                onChange={(e) => setExtraInfo(e.target.value)}
                placeholder="Ex: Alongamento gel, a cliente amou, ficou 2h..."
                rows={2}
                maxLength={500}
                className="w-full bg-surface-card border border-border rounded-xl px-3 py-2.5 text-sm text-text placeholder-text-light focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all resize-none"
              />
            </div>
          </div>

          {/* ③ GERAR */}
          {atLimit ? (
            <div className="rounded-xl border border-accent/20 bg-accent-bg p-4 text-center">
              <p className="text-xs font-semibold text-text mb-1">
                Limite de posts atingido ({dailyLimit}/{dailyLimit})
              </p>
              <p className="text-[11px] text-text-muted mb-3">
                Upgrade pra gerar até {POST_LIMITS.pro} posts/dia
              </p>
              <button
                onClick={onUpgrade}
                className="px-4 py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent-hover transition-colors"
              >
                Fazer upgrade 💅
              </button>
            </div>
          ) : (
            <div>
              {isFree && (
                <p className="text-[11px] text-text-light text-center mb-1.5">
                  {postsRemaining} de {dailyLimit} restantes hoje
                </p>
              )}
              <button
                onClick={generatePost}
                disabled={isLoading || !postType}
                className="w-full py-3 rounded-xl font-semibold text-sm transition-all bg-accent text-white hover:bg-accent-hover shadow-soft disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Gerando legenda...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Gerar legenda e hashtags
                  </>
                )}
              </button>
            </div>
          )}

          {/* ④ RESULTADO */}
          {result && (
            <div className="animate-fade-in space-y-3 pb-6">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-bold text-text">Pronto pra postar!</h3>
                <div className="flex items-center gap-3">
                  <button
                    onClick={shareOnWhatsApp}
                    className="text-xs text-green-600 hover:text-green-700 font-medium"
                  >
                    📲 WhatsApp
                  </button>
                  <button
                    onClick={() => copyToClipboard(result.replace(/\*\*/g, ''))}
                    className="text-xs text-accent hover:text-accent-hover font-medium"
                  >
                    📋 Copiar tudo
                  </button>
                </div>
              </div>

              {/* Legenda */}
              {extractSection('LEGENDA') && (
                <div className="bg-surface-card border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-medium text-accent uppercase tracking-wide">Legenda</span>
                    <button
                      onClick={() => copyToClipboard(extractSection('LEGENDA'))}
                      className="text-[11px] text-text-light hover:text-accent"
                    >
                      Copiar
                    </button>
                  </div>
                  <p className="text-sm text-text whitespace-pre-wrap leading-relaxed">
                    {extractSection('LEGENDA')}
                  </p>
                </div>
              )}

              {/* Hashtags */}
              {extractSection('HASHTAGS') && (
                <div className="bg-surface-card border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-medium text-accent uppercase tracking-wide">Hashtags</span>
                    <button
                      onClick={() => copyToClipboard(extractSection('HASHTAGS'))}
                      className="text-[11px] text-text-light hover:text-accent"
                    >
                      Copiar
                    </button>
                  </div>
                  <p className="text-sm text-accent/80">{extractSection('HASHTAGS')}</p>
                </div>
              )}

              {/* Dica */}
              {extractSection('DICA') && (
                <div className="bg-accent-bg border border-accent/10 rounded-xl p-3">
                  <p className="text-xs text-text-muted">
                    <span className="font-semibold text-accent">💡 Dica:</span> {extractSection('DICA')}
                  </p>
                </div>
              )}

              {/* Fallback */}
              {!extractSection('LEGENDA') && (
                <div className="bg-surface-card border border-border rounded-xl p-4">
                  <p className="text-sm text-text whitespace-pre-wrap">{result}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
