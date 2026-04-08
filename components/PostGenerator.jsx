'use client';

import { useState, useRef, useEffect } from 'react';
import PostImageEditor from './PostImageEditor';
import { useToast } from './Toast';
import { dbLoadPostHistory, dbSavePost, dbDeletePost } from '../lib/db';
import { useAuth } from './SupabaseAuthProvider';
import UpgradePrompt from './UpgradePrompt';

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', icon: '📸' },
  { id: 'facebook', label: 'Facebook', icon: '📘' },
  { id: 'stories', label: 'Stories', icon: '📱' },
];

const POST_TYPES = [
  { id: 'resultado', label: 'Resultado / Antes e Depois' },
  { id: 'dica', label: 'Dica Técnica' },
  { id: 'promocao', label: 'Promoção / Oferta' },
  { id: 'bastidor', label: 'Bastidores / Processo' },
  { id: 'depoimento', label: 'Depoimento de Cliente' },
  { id: 'tendencia', label: 'Tendência / Inspiração' },
];

export default function PostGenerator({ user, userId, initialPrompt, plan = 'free', onUpgrade }) {
  const [platform, setPlatformRaw] = useState('instagram');
  const [postType, setPostTypeRaw] = useState('resultado');

  const setPlatform = (val) => { setPlatformRaw(val); setResult(null); };
  const setPostType = (val) => { setPostTypeRaw(val); setResult(null); };
  const [extraInfo, setExtraInfo] = useState(initialPrompt || '');
  const [imagePreview, setImagePreview] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [imageMediaType, setImageMediaType] = useState('image/jpeg');
  const [result, setResult] = useState(null);
  const [structuredData, setStructuredData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [postHistory, setPostHistory] = useState([]);
  const { getAccessToken } = useAuth();

  const isFree = plan === 'free' || !plan;
  const POST_LIMITS = { free: 2, pro: 15, premium: 9999 };
  const dailyLimit = POST_LIMITS[plan] || POST_LIMITS.free;
  // Count today's posts from history
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayPosts = postHistory.filter(p => p.created_at?.slice(0, 10) === todayStr).length;
  const postsRemaining = Math.max(0, dailyLimit - todayPosts);
  const atLimit = postsRemaining <= 0 && isFree;

  // Load post history from Supabase on mount
  useEffect(() => {
    if (userId) dbLoadPostHistory(userId).then(setPostHistory).catch(() => {});
  }, [userId]);
  const fileInputRef = useRef(null);
  const toast = useToast();

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Imagem muito grande! Máximo 5MB.');
      return;
    }

    // Detectar HEIF/HEIC por tipo ou extensão
    const isHeic = file.type === 'image/heic' || file.type === 'image/heif'
      || /\.(heic|heif)$/i.test(file.name);

    let fileToProcess = file;

    if (isHeic) {
      try {
        const heic2any = (await import('heic2any')).default;
        const blob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 });
        fileToProcess = new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), { type: 'image/jpeg' });
      } catch (err) {
        console.error('[Maluar] HEIC conversion failed:', err);
        alert('Não foi possível converter a foto HEIF. Desative "Fotos de alta eficiência" nas configurações da câmera e tente novamente.');
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
  };

  const removeImage = () => {
    setImagePreview(null);
    setImageBase64(null);
  };

  const generatePost = async () => {
    setIsLoading(true);
    setResult(null);

    const platformLabel = PLATFORMS.find((p) => p.id === platform)?.label;
    const typeLabel = POST_TYPES.find((t) => t.id === postType)?.label;

    const systemPrompt = `Você é uma expert em social media marketing para nail designers. Crie conteúdo profissional e envolvente.

REGRAS:
- Sempre em PT-BR, tom amigável e profissional
- Hashtags relevantes para nail design brasileiro
- Emojis com moderação (2-4 por post)
- Se tiver foto: descreva o que vê e crie conteúdo baseado nela
- Adapte o tom para a plataforma: ${platformLabel}
- Tipo de post: ${typeLabel}

FORMATO DE RESPOSTA (use exatamente estas seções):
**LEGENDA:**
(a legenda completa pronta pra copiar)

**HASHTAGS:**
(hashtags separadas, prontas pra copiar)

**DICA DE PUBLICAÇÃO:**
(melhor horário, formato ideal, sugestão extra)

**TEMPLATE:**
TÍTULO: (frase curta e impactante pra ser o destaque visual do post, máx 50 chars, SEM emoji)
DESCRIÇÃO: (1 frase descrevendo o serviço/resultado, máx 80 chars)
TÓPICO 1: (primeiro benefício/destaque, curto, máx 40 chars)
TÓPICO 2: (segundo benefício/destaque, curto, máx 40 chars)
TÓPICO 3: (terceiro benefício/destaque, curto, máx 40 chars)
LOCAL: (cidade se mencionada, senão deixe vazio)
CTA: (chamada pra ação curta: "Agende pelo WhatsApp", "Chame no direct", etc.)`;

    let promptText = `Crie um post para ${platformLabel}, tipo: ${typeLabel}.`;
    if (extraInfo) promptText += ` Contexto extra: ${extraInfo}`;
    if (!imageBase64) promptText += ' Não tenho foto, crie com base no tipo de post.';

    const messages = [
      {
        role: 'user',
        content: imageBase64
          ? [
              { type: 'image', source: { type: 'base64', media_type: imageMediaType, data: imageBase64 } },
              { type: 'text', text: promptText },
            ]
          : promptText,
      },
    ];

    try {
      const authToken = getAccessToken ? await getAccessToken() : null;
      const fetchHeaders = { 'Content-Type': 'application/json' };
      if (authToken) fetchHeaders['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: fetchHeaders,
        body: JSON.stringify({ messages, system: systemPrompt }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro na API');
      }

      const data = await res.json();
      const text = data.content?.[0]?.text || 'Não consegui gerar o post. Tenta de novo!';
      setResult(text);
      setStructuredData(extractTemplateData(text));
      setIsLoading(false); // Desbloqueia o botão IMEDIATAMENTE após gerar

      // Save to history (não bloqueia a UI)
      if (!text.startsWith('Erro') && userId) {
        try {
          const platformLabel2 = PLATFORMS.find((p) => p.id === platform)?.label;
          const typeLabel2 = POST_TYPES.find((t) => t.id === postType)?.label;
          const saved = await dbSavePost(userId, { platform: platformLabel2, postType: typeLabel2, content: text });
          if (saved) setPostHistory(prev => [saved, ...prev]);
        } catch (saveErr) {
          // Silently fail — post já foi gerado, salvar é secundário
        }
      }
    } catch (err) {
      setResult(`Erro: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast?.('Copiado!');
  };

  // Extrair dados estruturados da seção TEMPLATE da resposta da IA
  const extractTemplateData = (text) => {
    const templateMatch = text.match(/\*\*TEMPLATE[^*]*\*\*\s*([\s\S]*?)$/i);
    if (!templateMatch) return null;
    const section = templateMatch[1];
    const get = (key) => {
      const m = section.match(new RegExp(`${key}:\\s*(.+)`, 'i'));
      return m ? m[1].trim() : '';
    };
    return {
      headline: get('TÍTULO') || get('TITULO'),
      subtitle: get('DESCRIÇÃO') || get('DESCRICAO'),
      bullets: [get('TÓPICO 1') || get('TOPICO 1'), get('TÓPICO 2') || get('TOPICO 2'), get('TÓPICO 3') || get('TOPICO 3')].filter(Boolean),
      location: get('LOCAL'),
      cta: get('CTA'),
    };
  };

  const shareOnWhatsApp = () => {
    if (!result) return;
    const legenda = extractSection('LEGENDA') || result.replace(/\*\*/g, '');
    const hashtags = extractSection('HASHTAGS');
    const text = encodeURIComponent(`${legenda}\n\n${hashtags}`.trim());
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const extractSection = (section) => {
    if (!result) return '';
    const regex = new RegExp(`\\*\\*${section}:\\*\\*\\s*([\\s\\S]*?)(?=\\*\\*[A-Z]|$)`, 'i');
    const match = result.match(regex);
    return match ? match[1].trim() : '';
  };

  return (
    <div className="flex flex-col h-full bg-surface">
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-xl mx-auto space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-bold text-text">Criar Post</h2>
              <p className="text-text-muted text-sm mt-0.5">
                Gere legendas e conteúdo pra suas redes sociais
              </p>
            </div>
            {postHistory.length > 0 && (
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="text-xs text-accent hover:text-accent-hover font-medium flex items-center gap-1 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Histórico ({postHistory.length})
              </button>
            )}
          </div>

          {/* Post History */}
          {showHistory && postHistory.length > 0 && (
            <div className="bg-surface-card border border-border rounded-xl p-3 space-y-2 max-h-60 overflow-y-auto animate-fade-in">
              <div className="text-[10px] font-medium text-text-light uppercase tracking-wider">Últimas gerações</div>
              {postHistory.map((item) => (
                <div key={item.id} className="flex items-start gap-2 group">
                  <button
                    onClick={() => {
                      setResult(item.content);
                      setShowHistory(false);
                    }}
                    className="flex-1 text-left text-xs text-text-muted hover:text-accent px-2 py-2 rounded-lg hover:bg-accent-bg transition-colors"
                  >
                    <span className="font-medium text-text block">{item.platform} · {item.post_type}</span>
                    <span className="line-clamp-2">{item.content?.slice(0, 100)}...</span>
                    <span className="text-[10px] text-text-light block mt-0.5">
                      {new Date(item.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    </span>
                  </button>
                  <button
                    onClick={async () => {
                      await dbDeletePost(item.id);
                      setPostHistory(prev => prev.filter(p => p.id !== item.id));
                    }}
                    className="opacity-0 group-hover:opacity-100 shrink-0 w-5 h-5 flex items-center justify-center text-text-light hover:text-rose transition-all mt-2"
                    title="Excluir"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Platform */}
          <div>
            <label className="block text-text text-xs font-medium mb-2 uppercase tracking-wide">
              Plataforma
            </label>
            <div className="flex gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPlatform(p.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                    platform === p.id
                      ? 'border-accent bg-accent-light text-text shadow-soft'
                      : 'border-border bg-surface-card text-text-muted hover:border-accent/40'
                  }`}
                >
                  <span>{p.icon}</span>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Post type */}
          <div>
            <label className="block text-text text-xs font-medium mb-2 uppercase tracking-wide">
              Tipo de Post
            </label>
            <div className="grid grid-cols-2 gap-2">
              {POST_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setPostType(t.id)}
                  className={`px-3 py-2.5 rounded-xl text-xs font-medium transition-all border text-left ${
                    postType === t.id
                      ? 'border-accent bg-accent-light text-text shadow-soft'
                      : 'border-border bg-surface-card text-text-muted hover:border-accent/40'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Image upload */}
          <div>
            <label className="block text-text text-xs font-medium mb-2 uppercase tracking-wide">
              Foto (opcional)
            </label>
            {imagePreview ? (
              <div className="relative inline-block">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-32 h-32 object-cover rounded-xl border border-border shadow-soft"
                />
                <button
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-rose text-white rounded-full flex items-center justify-center text-xs shadow-soft hover:scale-110 transition-transform"
                >
                  ✕
                </button>
              </div>
            ) : (
              <label
                htmlFor="post-file-input"
                className="flex items-center gap-3 px-4 py-4 border-2 border-dashed border-border rounded-xl text-text-muted hover:border-accent hover:text-accent hover:bg-accent-bg transition-all w-full cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm">Toque pra enviar uma foto da galeria</span>
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

          {/* Extra context */}
          <div>
            <label className="block text-text text-xs font-medium mb-2 uppercase tracking-wide">
              Informação extra (opcional)
            </label>
            <textarea
              value={extraInfo}
              onChange={(e) => setExtraInfo(e.target.value)}
              placeholder="Ex: Alongamento em gel, cliente amou, serviço durou 2h..."
              rows={2}
              className="w-full bg-surface-card border border-border rounded-xl px-4 py-3 text-text placeholder-text-light focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all text-sm shadow-soft resize-none"
              maxLength={500}
            />
          </div>

          {/* Generate button */}
          {atLimit ? (
            <div className="rounded-xl border border-accent/20 bg-accent-bg p-4 text-center">
              <p className="text-xs font-semibold text-text mb-1">Limite de posts atingido hoje ({dailyLimit}/{dailyLimit})</p>
              <p className="text-[11px] text-text-muted mb-3">Faça upgrade pra gerar até {POST_LIMITS.pro} posts/dia</p>
              <button onClick={onUpgrade} className="px-4 py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent-hover transition-colors">
                Fazer upgrade 💅
              </button>
            </div>
          ) : (
          <div>
            {isFree && (
              <p className="text-[11px] text-text-light text-center mb-1.5">
                {postsRemaining} de {dailyLimit} posts restantes hoje
              </p>
            )}
            <button
              onClick={generatePost}
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all bg-accent text-white hover:bg-accent-hover shadow-soft disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
            {isLoading ? (
              <>
                <span className="typing-dot w-1.5 h-1.5 bg-white rounded-full inline-block" />
                <span className="typing-dot w-1.5 h-1.5 bg-white rounded-full inline-block" />
                <span className="typing-dot w-1.5 h-1.5 bg-white rounded-full inline-block" />
                <span className="ml-2">Gerando...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Gerar Post
              </>
            )}
            </button>
          </div>
          )}

          {/* Image Editor - aparece com ou sem resultado da IA */}
          {imagePreview && !result && (
            <div className="bg-accent-bg border border-accent/10 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🎨</span>
                <div>
                  <p className="text-sm font-medium text-text">Quer só montar a imagem?</p>
                  <p className="text-xs text-text-muted">Use o editor abaixo pra criar seu post direto, sem precisar gerar texto.</p>
                </div>
              </div>
              <PostImageEditor
                imageSrc={imagePreview}
                legenda=""
                platform={platform}
                structuredData={null}
              />
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="animate-fade-in space-y-3 pb-6">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-text">Resultado</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={shareOnWhatsApp}
                    className="text-xs text-green-600 hover:text-green-700 font-medium flex items-center gap-1 transition-colors"
                    aria-label="Compartilhar no WhatsApp"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    WhatsApp
                  </button>
                  <button
                    onClick={() => copyToClipboard(result.replace(/\*\*/g, ''))}
                    className="text-xs text-accent hover:text-accent-hover font-medium flex items-center gap-1 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copiar tudo
                  </button>
                </div>
              </div>

              {/* Legenda */}
              {extractSection('LEGENDA') && (
                <div className="bg-surface-card border border-border rounded-xl p-4 shadow-soft">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-medium text-accent uppercase tracking-wide">Legenda</span>
                    <button
                      onClick={() => copyToClipboard(extractSection('LEGENDA'))}
                      className="text-[11px] text-text-light hover:text-accent transition-colors"
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
                <div className="bg-surface-card border border-border rounded-xl p-4 shadow-soft">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-medium text-accent uppercase tracking-wide">Hashtags</span>
                    <button
                      onClick={() => copyToClipboard(extractSection('HASHTAGS'))}
                      className="text-[11px] text-text-light hover:text-accent transition-colors"
                    >
                      Copiar
                    </button>
                  </div>
                  <p className="text-sm text-accent/80 whitespace-pre-wrap">
                    {extractSection('HASHTAGS')}
                  </p>
                </div>
              )}

              {/* Dica */}
              {extractSection('DICA DE PUBLICAÇÃO') && (
                <div className="bg-accent-bg border border-accent/10 rounded-xl p-4">
                  <span className="text-[11px] font-medium text-accent uppercase tracking-wide block mb-2">
                    Dica de Publicação
                  </span>
                  <p className="text-sm text-text-muted whitespace-pre-wrap">
                    {extractSection('DICA DE PUBLICAÇÃO')}
                  </p>
                </div>
              )}

              {/* Raw fallback */}
              {!extractSection('LEGENDA') && (
                <div className="bg-surface-card border border-border rounded-xl p-4 shadow-soft">
                  <p className="text-sm text-text whitespace-pre-wrap leading-relaxed">{result}</p>
                </div>
              )}

              {/* Image Editor */}
              {imagePreview && (
                <PostImageEditor
                  imageSrc={imagePreview}
                  legenda={extractSection('LEGENDA') || result}
                  platform={platform}
                  structuredData={structuredData}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
