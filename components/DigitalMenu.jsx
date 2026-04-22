'use client';

import { useState, useRef, useCallback } from 'react';
import { useAuth } from './SupabaseAuthProvider';
import { useToast } from './Toast';

const SERVICE_PRESETS = [
  { name: 'Esmaltação em Gel', duration: 60, price: 60 },
  { name: 'Alongamento Fibra de Vidro', duration: 120, price: 150 },
  { name: 'Alongamento Gel Moldado', duration: 150, price: 180 },
  { name: 'Manutenção', duration: 90, price: 100 },
  { name: 'Banho de Gel', duration: 60, price: 80 },
  { name: 'Nail Art Simples', duration: 30, price: 30 },
  { name: 'Nail Art Elaborada', duration: 60, price: 60 },
  { name: 'Spa dos Pés', duration: 60, price: 70 },
  { name: 'Remoção', duration: 30, price: 30 },
];

const THEMES = [
  { id: 'elegant', label: '🖤 Elegante', bg: '#0c0c0e', text: '#faf9f6', accent: '#c9a96e', card: 'rgba(255,255,255,0.06)' },
  { id: 'maluar', label: '💜 Maluar', bg: '#12101e', text: '#f5f0ff', accent: '#9b8cdb', card: 'rgba(155,140,219,0.08)' },
  { id: 'rose', label: '🌸 Rosé', bg: '#1a0f14', text: '#fdf2f5', accent: '#d4698a', card: 'rgba(212,105,138,0.08)' },
  { id: 'nude', label: '✨ Nude', bg: '#1a150f', text: '#faf4ec', accent: '#c9a06e', card: 'rgba(201,160,110,0.08)' },
  { id: 'white', label: '🤍 Clean', bg: '#fafafa', text: '#1a1a2e', accent: '#7F77DD', card: 'rgba(0,0,0,0.04)' },
];

function wrapCanvasText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; }
    else { line = test; }
  }
  if (line) lines.push(line);
  return lines;
}

export default function DigitalMenu({ plan = 'free', onUpgrade }) {
  const [services, setServices] = useState([]);
  const [businessName, setBusinessName] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [businessInsta, setBusinessInsta] = useState('');
  const [selectedTheme, setSelectedTheme] = useState('elegant');
  const [showPresets, setShowPresets] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newService, setNewService] = useState({ name: '', duration: 60, price: 0, description: '' });
  const [generating, setGenerating] = useState(false);
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [generatedImage, setGeneratedImage] = useState(null);
  const canvasRef = useRef(null);
  const resultRef = useRef(null);
  const { getAccessToken } = useAuth();
  const toast = useToast();

  const addPreset = (preset) => {
    if (services.some(s => s.name === preset.name)) return;
    setServices(prev => [...prev, { ...preset, description: '', id: Date.now() + Math.random() }]);
    toast?.('Serviço adicionado!');
  };

  const addCustomService = () => {
    if (!newService.name.trim()) return;
    setServices(prev => [...prev, {
      ...newService,
      price: parseFloat(newService.price) || 0,
      duration: parseInt(newService.duration) || 60,
      id: Date.now() + Math.random(),
    }]);
    setNewService({ name: '', duration: 60, price: 0, description: '' });
    setShowAddForm(false);
    toast?.('Serviço adicionado!');
  };

  const removeService = (id) => {
    setServices(prev => prev.filter(s => s.id !== id));
  };

  const updateService = (id, field, value) => {
    setServices(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  // IA sugere descrições profissionais para os serviços
  const aiSuggestDescriptions = async () => {
    if (services.length === 0) return;
    setAiSuggesting(true);
    try {
      const token = getAccessToken ? await getAccessToken() : null;
      const serviceList = services.map(s => `${s.name} (R$${s.price}, ${s.duration}min)`).join('\n');
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: `Gere uma descrição curta e profissional (máximo 15 palavras cada) para cada serviço do meu catálogo de nail design. Responda APENAS no formato JSON array: [{"name": "Nome", "description": "Descrição"}]. Serviços:\n${serviceList}` }],
          system: 'Você gera descrições curtas e elegantes para catálogos de nail design. Responda APENAS JSON válido, sem markdown, sem explicações.',
        }),
      });
      if (!res.ok) throw new Error('Erro na IA');

      // Ler streaming
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
        for (const line of lines) {
          const data = line.slice(6);
          if (data === '[DONE]') break;
          try { const parsed = JSON.parse(data); if (parsed.text) fullText += parsed.text; } catch {}
        }
      }

      // Extrair JSON da resposta
      const jsonMatch = fullText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const suggestions = JSON.parse(jsonMatch[0]);
        setServices(prev => prev.map(s => {
          const match = suggestions.find(sg => sg.name?.toLowerCase() === s.name?.toLowerCase());
          return match?.description ? { ...s, description: match.description } : s;
        }));
        toast?.('Descrições geradas pela IA!');
      }
    } catch {
      toast?.('Erro ao gerar descrições. Tente novamente.');
    } finally {
      setAiSuggesting(false);
    }
  };

  // Gerar imagem do catálogo via Canvas
  const generateMenuImage = useCallback(() => {
    if (services.length === 0) return;
    setGenerating(true);

    const theme = THEMES.find(t => t.id === selectedTheme) || THEMES[0];
    const W = 1080;
    const padding = 60;
    const serviceHeight = 100;
    const headerHeight = 220;
    const footerHeight = businessPhone || businessInsta ? 140 : 60;
    const H = headerHeight + services.length * serviceHeight + footerHeight + 40;

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, W, H);

    // Decorative line top
    const grad = ctx.createLinearGradient(padding, 0, W - padding, 0);
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(0.3, theme.accent);
    grad.addColorStop(0.7, theme.accent);
    grad.addColorStop(1, 'transparent');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(padding, 50);
    ctx.lineTo(W - padding, 50);
    ctx.stroke();

    // Sparkle decorations
    const drawSparkle = (x, y, size) => {
      ctx.fillStyle = theme.accent + '60';
      ctx.beginPath();
      ctx.moveTo(x, y - size);
      ctx.quadraticCurveTo(x + size * 0.15, y - size * 0.15, x + size, y);
      ctx.quadraticCurveTo(x + size * 0.15, y + size * 0.15, x, y + size);
      ctx.quadraticCurveTo(x - size * 0.15, y + size * 0.15, x - size, y);
      ctx.quadraticCurveTo(x - size * 0.15, y - size * 0.15, x, y - size);
      ctx.closePath();
      ctx.fill();
    };
    drawSparkle(padding + 20, 80, 8);
    drawSparkle(W - padding - 20, 80, 6);
    drawSparkle(W / 2 + 100, 110, 5);

    // Header — business name
    ctx.fillStyle = theme.accent;
    ctx.font = '600 14px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '4px';
    ctx.fillText('✦  C A T Á L O G O  ✦', W / 2, 90);

    ctx.fillStyle = theme.text;
    ctx.font = '700 42px "Segoe UI", sans-serif';
    ctx.fillText(businessName || 'Meu Ateliê', W / 2, 145);

    ctx.fillStyle = theme.accent;
    ctx.font = '400 16px "Segoe UI", sans-serif';
    ctx.fillText('───  Nail Design  ───', W / 2, 180);

    // Decorative line under header
    ctx.strokeStyle = theme.accent + '40';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, headerHeight - 10);
    ctx.lineTo(W - padding, headerHeight - 10);
    ctx.stroke();

    // Services
    let y = headerHeight + 10;
    services.forEach((service, i) => {
      // Card background
      ctx.fillStyle = theme.card;
      const rx = padding;
      const ry = y;
      const rw = W - padding * 2;
      const rh = serviceHeight - 12;
      const r = 12;
      ctx.beginPath();
      ctx.moveTo(rx + r, ry); ctx.lineTo(rx + rw - r, ry);
      ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + r); ctx.lineTo(rx + rw, ry + rh - r);
      ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - r, ry + rh); ctx.lineTo(rx + r, ry + rh);
      ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - r); ctx.lineTo(rx, ry + r);
      ctx.quadraticCurveTo(rx, ry, rx + r, ry);
      ctx.closePath();
      ctx.fill();

      // Accent border left
      ctx.fillStyle = theme.accent + '60';
      ctx.beginPath();
      ctx.moveTo(rx, ry + r); ctx.lineTo(rx + 3, ry + r); ctx.lineTo(rx + 3, ry + rh - r); ctx.lineTo(rx, ry + rh - r);
      ctx.closePath();
      ctx.fill();

      // Service name
      ctx.textAlign = 'left';
      ctx.fillStyle = theme.text;
      ctx.font = '600 20px "Segoe UI", sans-serif';
      ctx.fillText(service.name, padding + 20, y + 30);

      // Description
      if (service.description) {
        ctx.fillStyle = theme.text + 'aa';
        ctx.font = '400 14px "Segoe UI", sans-serif';
        const descLines = wrapCanvasText(ctx, service.description, W - padding * 2 - 200);
        descLines.slice(0, 1).forEach((line, li) => {
          ctx.fillText(line, padding + 20, y + 52 + li * 18);
        });
      }

      // Duration
      ctx.fillStyle = theme.text + '80';
      ctx.font = '400 13px "Segoe UI", sans-serif';
      ctx.fillText(`⏱ ${service.duration}min`, padding + 20, y + 72);

      // Price
      ctx.textAlign = 'right';
      ctx.fillStyle = theme.accent;
      ctx.font = '700 24px "Segoe UI", sans-serif';
      ctx.fillText(`R$ ${Number(service.price).toFixed(0)}`, W - padding - 20, y + 50);

      y += serviceHeight;
    });

    // Footer
    y += 10;
    ctx.strokeStyle = theme.accent + '40';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(W - padding, y);
    ctx.stroke();

    y += 30;
    ctx.textAlign = 'center';
    ctx.fillStyle = theme.text + 'cc';
    ctx.font = '400 15px "Segoe UI", sans-serif';
    if (businessPhone) {
      ctx.fillText(`📱 ${businessPhone}`, W / 2, y);
      y += 25;
    }
    if (businessInsta) {
      ctx.fillText(`📸 @${businessInsta.replace('@', '')}`, W / 2, y);
      y += 25;
    }

    ctx.fillStyle = theme.accent + '60';
    ctx.font = '400 11px "Segoe UI", sans-serif';
    ctx.fillText('Feito com 💜 Maluar AI', W / 2, H - 20);

    const dataUrl = canvas.toDataURL('image/png');
    setGeneratedImage(dataUrl);
    setGenerating(false);
    toast?.('Catálogo gerado!');
    // Auto-scroll para o resultado
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }, [services, businessName, businessPhone, businessInsta, selectedTheme, toast]);

  const handleDownload = () => {
    if (!generatedImage) return;
    const a = document.createElement('a');
    a.href = generatedImage;
    a.download = `catalogo-${(businessName || 'maluar').replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.png`;
    a.click();
    toast?.('Download iniciado!');
  };

  const handleShare = async () => {
    if (!generatedImage) return;
    try {
      const [header, b64] = generatedImage.split(',');
      const mime = header.match(/:(.*?);/)?.[1] || 'image/png';
      const bin = atob(b64);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      const blob = new Blob([arr], { type: mime });
      const file = new File([blob], 'catalogo.png', { type: mime });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Meu Catálogo de Serviços' });
      } else {
        handleDownload();
      }
    } catch {
      handleDownload();
    }
  };

  const isFree = plan === 'free' || !plan;

  if (isFree) {
    return (
      <div className="flex flex-col h-full bg-surface">
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="max-w-sm w-full text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent-bg mb-4">
              <span className="text-3xl">📋</span>
            </div>
            <h2 className="text-xl font-bold text-text mb-2">Catálogo de Serviços</h2>
            <p className="text-sm text-text-muted mb-6">
              Monte seu catálogo profissional com seus serviços, preços e compartilhe com suas clientes.
            </p>
            <div className="bg-surface-card border border-border-light rounded-xl p-4 mb-6 text-left space-y-2">
              <p className="text-xs font-semibold text-text">O que você ganha:</p>
              <div className="text-xs text-text-muted space-y-1.5">
                <p>✅ Catálogo visual profissional</p>
                <p>✅ Descrições geradas por IA</p>
                <p>✅ 5 temas de cores</p>
                <p>✅ Baixar e compartilhar no WhatsApp</p>
              </div>
            </div>
            <button
              onClick={onUpgrade}
              className="w-full py-3 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent-hover transition-colors shadow-soft"
            >
              💎 Desbloquear com Pro
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-surface">
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-xl mx-auto space-y-5">

          {/* Header */}
          <div>
            <h2 className="font-display text-xl font-bold text-text flex items-center gap-2">
              📋 Catálogo de Serviços
            </h2>
            <p className="text-text-muted text-sm mt-0.5">
              Monte seu catálogo profissional e compartilhe com suas clientes
            </p>
          </div>

          {/* Dados do negócio */}
          <div className="bg-surface-card border border-border-light rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-text">Seus dados</h3>
            <input
              type="text"
              value={businessName}
              onChange={e => setBusinessName(e.target.value)}
              placeholder="Nome do seu ateliê / estúdio"
              maxLength={40}
              className="w-full bg-surface border border-border-light rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-light focus:ring-2 focus:ring-accent focus:border-transparent"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="tel"
                value={businessPhone}
                onChange={e => setBusinessPhone(e.target.value)}
                placeholder="WhatsApp"
                maxLength={20}
                className="bg-surface border border-border-light rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-light focus:ring-2 focus:ring-accent focus:border-transparent"
              />
              <input
                type="text"
                value={businessInsta}
                onChange={e => setBusinessInsta(e.target.value)}
                placeholder="@instagram"
                maxLength={30}
                className="bg-surface border border-border-light rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-light focus:ring-2 focus:ring-accent focus:border-transparent"
              />
            </div>
          </div>

          {/* Adicionar serviços */}
          <div className="bg-surface-card border border-border-light rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text">Serviços ({services.length})</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowPresets(!showPresets)}
                  className="text-xs font-medium text-accent hover:text-accent/80 transition-colors"
                >
                  {showPresets ? 'Fechar' : '+ Sugestões'}
                </button>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="text-xs font-medium text-accent hover:text-accent/80 transition-colors"
                >
                  {showAddForm ? 'Fechar' : '+ Personalizado'}
                </button>
              </div>
            </div>

            {/* Presets rápidos */}
            {showPresets && (
              <div className="flex flex-wrap gap-1.5">
                {SERVICE_PRESETS.map((preset, i) => {
                  const added = services.some(s => s.name === preset.name);
                  return (
                    <button
                      key={i}
                      onClick={() => addPreset(preset)}
                      disabled={added}
                      className={`text-xs px-2.5 py-1.5 rounded-full border transition-colors ${
                        added
                          ? 'border-green-300 bg-green-50 text-green-600 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : 'border-border-light text-text-muted hover:border-accent hover:text-accent'
                      }`}
                    >
                      {added ? '✓' : '+'} {preset.name}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Formulário personalizado */}
            {showAddForm && (
              <div className="space-y-2 p-3 bg-surface rounded-lg border border-border-light">
                <input
                  type="text"
                  value={newService.name}
                  onChange={e => setNewService(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nome do serviço"
                  maxLength={50}
                  className="w-full bg-surface-card border border-border-light rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-light focus:ring-2 focus:ring-accent focus:border-transparent"
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-text-light uppercase">Preço (R$)</label>
                    <input
                      type="number"
                      value={newService.price}
                      onChange={e => setNewService(prev => ({ ...prev, price: e.target.value }))}
                      min="0"
                      className="w-full bg-surface-card border border-border-light rounded-lg px-3 py-2 text-sm text-text focus:ring-2 focus:ring-accent focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-text-light uppercase">Duração (min)</label>
                    <input
                      type="number"
                      value={newService.duration}
                      onChange={e => setNewService(prev => ({ ...prev, duration: e.target.value }))}
                      min="15"
                      step="15"
                      className="w-full bg-surface-card border border-border-light rounded-lg px-3 py-2 text-sm text-text focus:ring-2 focus:ring-accent focus:border-transparent"
                    />
                  </div>
                </div>
                <button
                  onClick={addCustomService}
                  disabled={!newService.name.trim()}
                  className="w-full py-2 rounded-lg text-xs font-semibold bg-accent text-white hover:bg-accent/90 disabled:opacity-40 transition-all"
                >
                  Adicionar serviço
                </button>
              </div>
            )}

            {/* Lista de serviços */}
            {services.length === 0 ? (
              <p className="text-center text-text-light text-xs py-4">
                👆 Toque nos serviços acima para adicioná-los ao catálogo
              </p>
            ) : (
              <div className="space-y-2">
                {services.map(service => (
                  <div key={service.id} className="flex items-center gap-3 p-2.5 bg-surface rounded-lg border border-border-light group">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-text truncate">{service.name}</span>
                        <span className="text-[10px] text-text-light">⏱ {service.duration}min</span>
                      </div>
                      {service.description && (
                        <p className="text-xs text-text-muted mt-0.5 truncate">{service.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={service.price}
                        onChange={e => updateService(service.id, 'price', parseFloat(e.target.value) || 0)}
                        min="0"
                        className="w-16 text-right bg-surface-card border border-border-light rounded px-2 py-1 text-xs font-semibold text-accent focus:ring-1 focus:ring-accent"
                      />
                      <button
                        onClick={() => removeService(service.id)}
                        className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-600 transition-all"
                        title="Remover"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}

                {/* Botão IA: gerar descrições */}
                <button
                  onClick={aiSuggestDescriptions}
                  disabled={aiSuggesting || services.length === 0}
                  className="w-full py-2 rounded-lg text-xs font-medium border border-accent/30 text-accent hover:bg-accent-bg transition-all disabled:opacity-40 flex items-center justify-center gap-1.5"
                >
                  {aiSuggesting ? (
                    <>
                      <span className="animate-spin w-3 h-3 border-2 border-accent border-t-transparent rounded-full" />
                      Gerando descrições...
                    </>
                  ) : (
                    <>✨ IA: Gerar descrições profissionais</>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Tema */}
          <div className="bg-surface-card border border-border-light rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-text">Tema do catálogo</h3>
            <div className="flex flex-wrap gap-2">
              {THEMES.map(theme => (
                <button
                  key={theme.id}
                  onClick={() => setSelectedTheme(theme.id)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                    selectedTheme === theme.id
                      ? 'border-accent bg-accent-bg text-accent font-semibold'
                      : 'border-border-light text-text-muted hover:border-accent/50'
                  }`}
                >
                  {theme.label}
                </button>
              ))}
            </div>
          </div>

          {/* Gerar */}
          <button
            onClick={generateMenuImage}
            disabled={services.length === 0 || generating}
            className="w-full py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-accent to-rose text-white shadow-lg hover:shadow-xl disabled:opacity-40 transition-all flex items-center justify-center gap-2"
          >
            {generating ? (
              <>
                <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                Gerando...
              </>
            ) : services.length === 0 ? (
              <>👆 Selecione serviços acima para gerar</>
            ) : (
              <>📋 Gerar Catálogo ({services.length} serviços)</>
            )}
          </button>

          {/* Preview / Resultado */}
          {generatedImage && (
            <div ref={resultRef} className="bg-surface-card border border-border-light rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-text">Seu catálogo</h3>
              <img
                src={generatedImage}
                alt="Catálogo de Serviços"
                className="w-full rounded-lg border border-border-light shadow-soft"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleDownload}
                  className="flex-1 py-2.5 rounded-lg text-xs font-semibold bg-accent text-white hover:bg-accent/90 transition-all flex items-center justify-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Baixar
                </button>
                <button
                  onClick={handleShare}
                  className="flex-1 py-2.5 rounded-lg text-xs font-semibold border border-accent text-accent hover:bg-accent-bg transition-all flex items-center justify-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Compartilhar
                </button>
              </div>
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>
      </div>
    </div>
  );
}
