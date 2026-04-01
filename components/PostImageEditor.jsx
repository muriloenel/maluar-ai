'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

const TEMPLATES = [
  { id: 'gradient', label: 'Gradiente' },
  { id: 'editorial', label: 'Editorial' },
  { id: 'highlight', label: 'Destaque' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'frame', label: 'Moldura' },
  { id: 'split', label: 'Antes/Depois' },
];

const COLOR_THEMES = [
  { id: 'dark', label: 'Dark', primary: '#000000', secondary: '#ffffff', accent: '#7F77DD' },
  { id: 'maluar', label: 'Maluar', primary: '#1A1A2E', secondary: '#FAF5FF', accent: '#7F77DD' },
  { id: 'rose', label: 'Rosé', primary: '#2e1a2e', secondary: '#FBEAF0', accent: '#D4537E' },
  { id: 'nude', label: 'Nude', primary: '#3d2e1f', secondary: '#f5ebe0', accent: '#d4a574' },
  { id: 'mint', label: 'Mint', primary: '#1a3d2e', secondary: '#f0faf5', accent: '#6ab89c' },
  { id: 'lilac', label: 'Lilás', primary: '#2e1a3d', secondary: '#EEEDFE', accent: '#AFA9EC' },
];

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawCoverImage(ctx, img, x, y, w, h) {
  const imgRatio = img.width / img.height;
  const boxRatio = w / h;
  let sx = 0, sy = 0, sw = img.width, sh = img.height;
  if (imgRatio > boxRatio) {
    sw = img.height * boxRatio;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / boxRatio;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

export default function PostImageEditor({ imageSrc, legenda, hashtags, platform }) {
  const canvasRef = useRef(null);
  const [template, setTemplate] = useState('gradient');
  const [colorTheme, setColorTheme] = useState('dark');
  const [customTitle, setCustomTitle] = useState('');
  const [showText, setShowText] = useState(true);
  const [textPosition, setTextPosition] = useState('bottom'); // bottom, center, top
  const [imageLoaded, setImageLoaded] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;
      setImageLoaded(true);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !imageLoaded) return;

    const ctx = canvas.getContext('2d');
    const isStories = platform === 'stories';
    const W = 1080;
    const H = isStories ? 1920 : 1080;
    canvas.width = W;
    canvas.height = H;

    const theme = COLOR_THEMES.find((c) => c.id === colorTheme) || COLOR_THEMES[0];
    const titleText = customTitle || legenda?.split('\n')[0]?.replace(/^\*\*|^\d+\.\s*|\*\*/g, '').slice(0, 90) || '';

    // === TEMPLATE: GRADIENT ===
    if (template === 'gradient') {
      drawCoverImage(ctx, img, 0, 0, W, H);

      // Gradient from bottom
      const gradH = showText && titleText ? 0.5 : 0.2;
      const grad = ctx.createLinearGradient(0, H * (1 - gradH), 0, H);
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(0.4, `${theme.primary}99`);
      grad.addColorStop(1, `${theme.primary}ee`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Top subtle gradient
      const topGrad = ctx.createLinearGradient(0, 0, 0, H * 0.15);
      topGrad.addColorStop(0, `${theme.primary}88`);
      topGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = topGrad;
      ctx.fillRect(0, 0, W, H * 0.15);

      if (showText && titleText) {
        ctx.textAlign = 'left';
        // Accent line
        ctx.fillStyle = theme.accent;
        ctx.fillRect(60, H - 180, 50, 4);
        // Title
        ctx.font = 'bold 44px Inter, sans-serif';
        ctx.fillStyle = theme.secondary;
        const lines = wrapText(ctx, titleText, W - 140);
        const startY = H - 130;
        lines.slice(0, 3).forEach((line, i) => {
          ctx.fillText(line, 60, startY + i * 56);
        });
      }
    }

    // === TEMPLATE: EDITORIAL ===
    if (template === 'editorial') {
      // Background color
      ctx.fillStyle = theme.secondary;
      ctx.fillRect(0, 0, W, H);

      // Image with padding and rounded corners
      const pad = 50;
      const imgW = W - pad * 2;
      const imgH = showText && titleText ? H * 0.65 : H - pad * 2;
      ctx.save();
      roundRect(ctx, pad, pad, imgW, imgH, 20);
      ctx.clip();
      drawCoverImage(ctx, img, pad, pad, imgW, imgH);
      ctx.restore();

      // Thin accent border
      ctx.strokeStyle = theme.accent;
      ctx.lineWidth = 2;
      roundRect(ctx, pad, pad, imgW, imgH, 20);
      ctx.stroke();

      if (showText && titleText) {
        const textY = pad + imgH + 40;
        // Accent dot
        ctx.fillStyle = theme.accent;
        ctx.beginPath();
        ctx.arc(80, textY + 8, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '600 36px Inter, sans-serif';
        ctx.fillStyle = theme.primary;
        ctx.textAlign = 'left';
        const lines = wrapText(ctx, titleText, W - 140);
        lines.slice(0, 3).forEach((line, i) => {
          ctx.fillText(line, 100, textY + 16 + i * 48);
        });
      }
    }

    // === TEMPLATE: HIGHLIGHT ===
    if (template === 'highlight') {
      drawCoverImage(ctx, img, 0, 0, W, H);

      // Full dark overlay
      ctx.fillStyle = `${theme.primary}66`;
      ctx.fillRect(0, 0, W, H);

      if (showText && titleText) {
        // Central card
        const cardW = W * 0.78;
        const cardH = isStories ? 300 : 240;
        const cardX = (W - cardW) / 2;
        const posY = textPosition === 'top' ? H * 0.12 : textPosition === 'center' ? (H - cardH) / 2 : H - cardH - (isStories ? 200 : 100);

        // Card bg with blur effect
        ctx.fillStyle = `${theme.secondary}e8`;
        roundRect(ctx, cardX, posY, cardW, cardH, 16);
        ctx.fill();

        // Left accent bar
        ctx.fillStyle = theme.accent;
        roundRect(ctx, cardX, posY, 6, cardH, 16);
        ctx.fill();
        ctx.fillRect(cardX + 3, posY, 3, cardH);

        // Text
        ctx.font = 'bold 40px Inter, sans-serif';
        ctx.fillStyle = theme.primary;
        ctx.textAlign = 'left';
        const lines = wrapText(ctx, titleText, cardW - 80);
        const textStartY = posY + (cardH - lines.slice(0, 3).length * 54) / 2 + 40;
        lines.slice(0, 3).forEach((line, i) => {
          ctx.fillText(line, cardX + 40, textStartY + i * 54);
        });
      }
    }

    // === TEMPLATE: MINIMAL ===
    if (template === 'minimal') {
      drawCoverImage(ctx, img, 0, 0, W, H);

      if (showText && titleText) {
        // Simple bottom text with shadow
        ctx.textAlign = 'center';
        ctx.font = 'bold 48px Inter, sans-serif';
        ctx.shadowColor = `${theme.primary}cc`;
        ctx.shadowBlur = 20;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 2;
        ctx.fillStyle = theme.secondary;
        const lines = wrapText(ctx, titleText.toUpperCase(), W - 120);
        const posY = textPosition === 'top' ? 120 : textPosition === 'center' ? H / 2 - (lines.length * 60) / 2 : H - 80 - (lines.length - 1) * 60;
        lines.slice(0, 3).forEach((line, i) => {
          // Text stroke for readability
          ctx.strokeStyle = `${theme.primary}88`;
          ctx.lineWidth = 4;
          ctx.strokeText(line, W / 2, posY + i * 60);
          ctx.fillText(line, W / 2, posY + i * 60);
        });
        ctx.shadowBlur = 0;
      }
    }

    // === TEMPLATE: FRAME ===
    if (template === 'frame') {
      // Colored background
      ctx.fillStyle = theme.primary;
      ctx.fillRect(0, 0, W, H);

      // Decorative accent border
      const borderW = 35;
      ctx.strokeStyle = theme.accent;
      ctx.lineWidth = 2;
      roundRect(ctx, borderW - 8, borderW - 8, W - (borderW - 8) * 2, H - (borderW - 8) * 2, 8);
      ctx.stroke();

      // Image inside frame
      const imgPad = borderW + 15;
      const imgW = W - imgPad * 2;
      const imgH = showText && titleText ? H * 0.68 : H - imgPad * 2;
      ctx.save();
      roundRect(ctx, imgPad, imgPad, imgW, imgH, 12);
      ctx.clip();
      drawCoverImage(ctx, img, imgPad, imgPad, imgW, imgH);
      ctx.restore();

      if (showText && titleText) {
        const textY = imgPad + imgH + 35;
        ctx.textAlign = 'center';

        // Accent line
        ctx.fillStyle = theme.accent;
        ctx.fillRect(W / 2 - 30, textY, 60, 3);

        ctx.font = '600 34px Inter, sans-serif';
        ctx.fillStyle = theme.secondary;
        const lines = wrapText(ctx, titleText, W - 140);
        lines.slice(0, 3).forEach((line, i) => {
          ctx.fillText(line, W / 2, textY + 40 + i * 46);
        });
      }
    }

    // === TEMPLATE: SPLIT (antes/depois) ===
    if (template === 'split') {
      // Left half darkened, right half normal
      drawCoverImage(ctx, img, 0, 0, W, H);
      ctx.fillStyle = `${theme.primary}44`;
      ctx.fillRect(0, 0, W / 2, H);

      // Center divider
      ctx.strokeStyle = theme.secondary;
      ctx.lineWidth = 3;
      ctx.setLineDash([12, 8]);
      ctx.beginPath();
      ctx.moveTo(W / 2, 0);
      ctx.lineTo(W / 2, H);
      ctx.stroke();
      ctx.setLineDash([]);

      // Labels with pill background
      const drawPill = (text, x, y) => {
        ctx.font = 'bold 28px Inter, sans-serif';
        const tw = ctx.measureText(text).width;
        const px = 24, py = 12;
        ctx.fillStyle = `${theme.primary}cc`;
        roundRect(ctx, x - tw / 2 - px, y - 20 - py, tw + px * 2, 40 + py * 2, 24);
        ctx.fill();
        ctx.fillStyle = theme.secondary;
        ctx.textAlign = 'center';
        ctx.fillText(text, x, y + 6);
      };

      drawPill('ANTES', W / 4, isStories ? 80 : 60);
      drawPill('DEPOIS', (W * 3) / 4, isStories ? 80 : 60);

      if (showText && titleText) {
        // Bottom bar
        const barH = 100;
        ctx.fillStyle = `${theme.primary}dd`;
        ctx.fillRect(0, H - barH, W, barH);
        ctx.font = '500 30px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = theme.secondary;
        const lines = wrapText(ctx, titleText, W - 100);
        ctx.fillText(lines[0] || '', W / 2, H - barH / 2 + 10);
      }
    }
  }, [template, colorTheme, customTitle, showText, textPosition, imageLoaded, legenda, platform]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `post-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  if (!imageSrc) return null;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-bold text-text">Montar Imagem pro Post</h3>
        <button
          onClick={handleDownload}
          className="text-xs text-white bg-accent hover:bg-accent-hover font-medium flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors shadow-soft"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Baixar
        </button>
      </div>

      {/* Template picker */}
      <div>
        <label className="block text-text text-[10px] font-medium mb-1.5 uppercase tracking-wider">
          Template
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTemplate(t.id)}
              className={`px-2 py-2 rounded-lg text-[11px] font-medium transition-all border text-center ${
                template === t.id
                  ? 'border-accent bg-accent-light text-text shadow-soft'
                  : 'border-border bg-surface-card text-text-muted hover:border-accent/40'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Color theme */}
      <div>
        <label className="block text-text text-[10px] font-medium mb-1.5 uppercase tracking-wider">
          Paleta de cores
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {COLOR_THEMES.map((c) => (
            <button
              key={c.id}
              onClick={() => setColorTheme(c.id)}
              className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] font-medium transition-all border ${
                colorTheme === c.id
                  ? 'border-accent bg-accent-light text-text shadow-soft'
                  : 'border-border bg-surface-card text-text-muted hover:border-accent/40'
              }`}
            >
              <span className="w-3.5 h-3.5 rounded-full border border-border" style={{ background: c.accent }} />
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom title */}
      <div>
        <label className="block text-text text-[10px] font-medium mb-1.5 uppercase tracking-wider">
          Texto na imagem
        </label>
        <input
          type="text"
          value={customTitle}
          onChange={(e) => setCustomTitle(e.target.value)}
          placeholder="Deixe vazio pra usar a legenda gerada"
          className="w-full bg-surface-card border border-border rounded-lg px-3 py-2 text-text placeholder-text-light focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all text-xs shadow-soft"
          maxLength={100}
        />
      </div>

      {/* Controls row */}
      <div className="flex gap-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showText}
            onChange={(e) => setShowText(e.target.checked)}
            className="w-4 h-4 accent-accent rounded"
          />
          <span className="text-xs text-text-muted">Mostrar texto</span>
        </label>

        {showText && template !== 'editorial' && template !== 'frame' && template !== 'split' && (
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-[10px] text-text-light uppercase">Posição:</span>
            {['top', 'center', 'bottom'].map((pos) => (
              <button
                key={pos}
                onClick={() => setTextPosition(pos)}
                className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${
                  textPosition === pos
                    ? 'bg-accent text-white'
                    : 'bg-surface-alt text-text-muted hover:bg-surface-card'
                }`}
              >
                {pos === 'top' ? '↑' : pos === 'center' ? '↔' : '↓'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Canvas preview */}
      <div className="bg-surface-card border border-border rounded-xl p-3 shadow-soft">
        <canvas
          ref={canvasRef}
          className="w-full h-auto rounded-lg"
          style={{ maxHeight: platform === 'stories' ? '500px' : '350px' }}
        />
      </div>

      {/* Download button */}
      <button
        onClick={handleDownload}
        className="w-full py-3 rounded-xl font-semibold text-sm transition-all bg-accent text-white hover:bg-accent-hover shadow-soft flex items-center justify-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Baixar Imagem Pronta
      </button>
    </div>
  );
}
