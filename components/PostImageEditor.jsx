'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

// ── Fontes profissionais via Google Fonts ──────────────────────────────
const FONTS_LOADED = { current: false };
async function ensureFonts() {
  if (FONTS_LOADED.current) return;
  try {
    const montBold = new FontFace('Montserrat', 'url(https://fonts.gstatic.com/s/montserrat/v29/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCuM70w-Y3tcoqK5.woff2)', { weight: '800', style: 'normal' });
    const montMed = new FontFace('Montserrat', 'url(https://fonts.gstatic.com/s/montserrat/v29/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCtZ70w-Y3tcoqK5.woff2)', { weight: '500', style: 'normal' });
    const montLight = new FontFace('Montserrat', 'url(https://fonts.gstatic.com/s/montserrat/v29/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCvr70w-Y3tcoqK5.woff2)', { weight: '300', style: 'normal' });
    const playfair = new FontFace('Playfair Display', 'url(https://fonts.gstatic.com/s/playfairdisplay/v37/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKd3vXDXbtXK-F2qC0s.woff2)', { weight: '700', style: 'italic' });
    const greatVibes = new FontFace('Great Vibes', 'url(https://fonts.gstatic.com/s/greatvibes/v19/RWmMoKWR9v4ksMfaWd_JN9XFiaQ.woff2)', { weight: '400', style: 'normal' });
    const [f1, f2, f3, f4, f5] = await Promise.all([montBold.load(), montMed.load(), montLight.load(), playfair.load(), greatVibes.load()]);
    document.fonts.add(f1); document.fonts.add(f2); document.fonts.add(f3); document.fonts.add(f4); document.fonts.add(f5);
    FONTS_LOADED.current = true;
  } catch {
    FONTS_LOADED.current = true;
  }
}

// ── Templates ──────────────────────────────────────────────────────────
const TEMPLATES = [
  { id: 'stories', label: '📲 Stories Pro' },
  { id: 'promo', label: '📢 Promoção' },
  { id: 'portfolio', label: '💎 Portfólio' },
  { id: 'card', label: '📋 Card Info' },
  { id: 'split', label: '🔄 Antes/Depois' },
  { id: 'minimal', label: '✨ Minimalista' },
  { id: 'depoimento', label: '💬 Depoimento' },
];

// ── Paletas profissionais ──────────────────────────────────────────────
const COLOR_THEMES = [
  { id: 'dark',   label: 'Clássico',  bg: '#0c0c0e', text: '#faf9f6', accent: '#c9a96e', card: 'rgba(255,255,255,0.07)', cardBorder: 'rgba(201,169,110,0.25)' },
  { id: 'maluar', label: 'Maluar',    bg: '#12101e', text: '#f5f0ff', accent: '#9b8cdb', card: 'rgba(155,140,219,0.08)', cardBorder: 'rgba(155,140,219,0.2)' },
  { id: 'rose',   label: 'Rosé',      bg: '#1a0f14', text: '#fdf2f5', accent: '#d4698a', card: 'rgba(212,105,138,0.08)', cardBorder: 'rgba(212,105,138,0.2)' },
  { id: 'nude',   label: 'Nude',      bg: '#1a150f', text: '#faf4ec', accent: '#c9a06e', card: 'rgba(201,160,110,0.08)', cardBorder: 'rgba(201,160,110,0.2)' },
  { id: 'ocean',  label: 'Oceano',    bg: '#0a1218', text: '#f0f7fc', accent: '#5ba4d9', card: 'rgba(91,164,217,0.08)', cardBorder: 'rgba(91,164,217,0.2)' },
  { id: 'forest', label: 'Floresta',  bg: '#0f1a12', text: '#f0faf3', accent: '#6ab87a', card: 'rgba(106,184,122,0.08)', cardBorder: 'rgba(106,184,122,0.2)' },
];

// ── Helpers ────────────────────────────────────────────────────────────
function wrapText(ctx, text, maxWidth) {
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

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawCoverImage(ctx, img, x, y, w, h) {
  const imgRatio = img.width / img.height;
  const boxRatio = w / h;
  let sx = 0, sy = 0, sw = img.width, sh = img.height;
  if (imgRatio > boxRatio) { sw = img.height * boxRatio; sx = (img.width - sw) / 2; }
  else { sh = img.width / boxRatio; sy = (img.height - sh) / 2; }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function drawSparkle(ctx, x, y, size, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.quadraticCurveTo(x + size * 0.15, y - size * 0.15, x + size, y);
  ctx.quadraticCurveTo(x + size * 0.15, y + size * 0.15, x, y + size);
  ctx.quadraticCurveTo(x - size * 0.15, y + size * 0.15, x - size, y);
  ctx.quadraticCurveTo(x - size * 0.15, y - size * 0.15, x, y - size);
  ctx.closePath(); ctx.fill();
}

function drawBlurredBg(ctx, img, W, H, amount) {
  ctx.save();
  ctx.filter = `blur(${amount}px)`;
  drawCoverImage(ctx, img, -amount * 2, -amount * 2, W + amount * 4, H + amount * 4);
  ctx.filter = 'none';
  ctx.restore();
}

// ── Fontes ─────────────────────────────────────────────────────────────
const F = {
  headline: (s) => `800 ${s}px "Montserrat", "Segoe UI", sans-serif`,
  body:     (s) => `500 ${s}px "Montserrat", "Segoe UI", sans-serif`,
  light:    (s) => `300 ${s}px "Montserrat", "Segoe UI", sans-serif`,
  italic:   (s) => `italic 700 ${s}px "Playfair Display", Georgia, serif`,
  cursive:  (s) => `400 ${s}px "Great Vibes", "Pinyon Script", cursive`,
};

// ═══════════════════════════════════════════════════════════════════════
export default function PostImageEditor({ imageSrc, legenda, platform, structuredData, plan, onUpgrade, getAccessToken, imageBase64Source }) {
  const canvasRef = useRef(null);
  const [template, setTemplate] = useState('stories');
  const [colorTheme, setColorTheme] = useState('dark');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [fontsReady, setFontsReady] = useState(false);
  const imgRef = useRef(null);
  const [generatingArt, setGeneratingArt] = useState(false);
  const [aiArtResult, setAiArtResult] = useState(null);
  const [aiVisualStyle, setAiVisualStyle] = useState('luxury');

  const [headline, setHeadline] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [bullets, setBullets] = useState(['', '', '']);
  const [location, setLocation] = useState('');
  const [ctaText, setCtaText] = useState('');
  const [brandName, setBrandName] = useState('');

  useEffect(() => { ensureFonts().then(() => setFontsReady(true)); }, []);

  useEffect(() => {
    if (!structuredData) return;
    if (structuredData.headline) setHeadline(structuredData.headline);
    if (structuredData.subtitle) setSubtitle(structuredData.subtitle);
    if (structuredData.bullets?.length) setBullets(structuredData.bullets.concat(['', '', '']).slice(0, 3));
    if (structuredData.location) setLocation(structuredData.location);
    if (structuredData.cta) setCtaText(structuredData.cta);
    if (structuredData.brand) setBrandName(structuredData.brand);
    if (structuredData.description) setDescription(structuredData.description);
  }, [structuredData]);

  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { imgRef.current = img; setImageLoaded(true); };
    img.src = imageSrc;
  }, [imageSrc]);

  // ═══════════════════════════════════════════════════════════════════
  // CANVAS RENDER
  // ═══════════════════════════════════════════════════════════════════
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !imageLoaded) return;

    const ctx = canvas.getContext('2d');
    const S = platform === 'stories'; // stories mode
    const W = 1080;
    const H = S ? 1920 : 1350;
    canvas.width = W;
    canvas.height = H;

    const t = COLOR_THEMES.find((c) => c.id === colorTheme) || COLOR_THEMES[0];
    const titleText = legenda?.split('\n')[0]?.replace(/^\*\*|^\d+\.\s*|\*\*/g, '').slice(0, 90) || '';
    const hl = headline || titleText;
    const sub = subtitle;
    const desc = description;
    const bArr = bullets.filter(Boolean);
    const loc = location;
    const cta = ctaText;
    const brand = brandName;

    // ═════════════════════════════════════════════════════════════
    // STORIES PRO (referência: foto full-bleed + título gigante + script + card checkmarks + CTA)
    // ═════════════════════════════════════════════════════════════
    if (template === 'stories') {
      // Força 9:16
      const sW = 1080, sH = 1920;
      canvas.width = sW; canvas.height = sH;

      // 1. Foto full-bleed
      drawCoverImage(ctx, img, 0, 0, sW, sH);

      // 2. Overlay escuro gradiente (mais escuro embaixo)
      const ov = ctx.createLinearGradient(0, 0, 0, sH);
      ov.addColorStop(0, 'rgba(0,0,0,0.25)');
      ov.addColorStop(0.3, 'rgba(0,0,0,0.35)');
      ov.addColorStop(0.55, 'rgba(0,0,0,0.50)');
      ov.addColorStop(1, 'rgba(0,0,0,0.75)');
      ctx.fillStyle = ov;
      ctx.fillRect(0, 0, sW, sH);

      const pad = 65;
      let y = 120;

      // 3. Sparkles decorativos no canto
      drawSparkle(ctx, sW - pad - 10, y + 20, 20, `${t.accent}cc`);
      drawSparkle(ctx, sW - pad - 45, y - 5, 12, `${t.accent}66`);
      drawSparkle(ctx, sW - pad + 15, y + 50, 8, `${t.accent}44`);

      // 4. Título gigante uppercase
      if (hl) {
        const sz = 82;
        ctx.font = F.headline(sz);
        ctx.fillStyle = t.text;
        ctx.textAlign = 'left';
        const hlLines = wrapText(ctx, hl.toUpperCase(), sW - pad * 2 - 60);
        hlLines.slice(0, 3).forEach((ln, i) => {
          ctx.fillText(ln, pad, y + i * sz * 1.05);
        });
        y += Math.min(hlLines.length, 3) * sz * 1.05 + 10;
      }

      // 5. Subtítulo em script/cursivo elegante (Great Vibes)
      if (sub) {
        const sz = 56;
        ctx.font = F.cursive(sz);
        ctx.fillStyle = `${t.accent}ee`;
        ctx.textAlign = 'left';
        const subLines = wrapText(ctx, sub, sW - pad * 2);
        subLines.slice(0, 2).forEach((ln, i) => {
          ctx.fillText(ln, pad, y + i * sz * 1.3);
        });
        y += Math.min(subLines.length, 2) * sz * 1.3 + 30;
      }

      // 6. Parágrafo descritivo
      if (desc) {
        const sz = 28;
        ctx.font = F.light(sz);
        ctx.fillStyle = `${t.text}dd`;
        ctx.textAlign = 'left';
        const descLines = wrapText(ctx, desc, sW - pad * 2 - 280);
        descLines.slice(0, 5).forEach((ln, i) => {
          ctx.fillText(ln, pad, y + i * sz * 1.55);
        });
        y += Math.min(descLines.length, 5) * sz * 1.55 + 40;
      }

      // 7. Card com borda — checkmarks coloridos
      if (bArr.length > 0) {
        const bH = 88, cpV = 35, cpH = 30;
        const cH = bArr.length * bH + cpV * 2;
        const cX = pad, cW = sW - pad * 2;

        // Card background semi-transparente
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        roundRect(ctx, cX, y, cW, cH, 22);
        ctx.fill();
        // Borda accent
        ctx.strokeStyle = `${t.accent}50`;
        ctx.lineWidth = 1.5;
        roundRect(ctx, cX, y, cW, cH, 22);
        ctx.stroke();

        bArr.forEach((bullet, i) => {
          const by = y + cpV + bH / 2 + i * bH;
          const cr = 18, cx = cX + cpH + cr + 5;

          // Círculo checkmark com cor accent
          const cg = ctx.createRadialGradient(cx, by, 0, cx, by, cr);
          cg.addColorStop(0, t.accent);
          cg.addColorStop(1, `${t.accent}cc`);
          ctx.fillStyle = cg;
          ctx.beginPath(); ctx.arc(cx, by, cr, 0, Math.PI * 2); ctx.fill();

          // Sombra glow
          ctx.shadowColor = `${t.accent}40`; ctx.shadowBlur = 12;
          ctx.beginPath(); ctx.arc(cx, by, cr, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;

          // Checkmark branco
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(cx - cr * 0.3, by + 1);
          ctx.lineTo(cx - cr * 0.02, by + cr * 0.3);
          ctx.lineTo(cx + cr * 0.35, by - cr * 0.25);
          ctx.stroke();

          // Texto do bullet
          ctx.font = F.body(26);
          ctx.fillStyle = t.text;
          ctx.textAlign = 'left';
          // Suporte a negrito parcial com **texto**
          const parts = bullet.split(/(\*\*[^*]+\*\*)/g);
          let tx = cx + cr + 20;
          parts.forEach((part) => {
            const isBold = part.startsWith('**') && part.endsWith('**');
            const cleanText = isBold ? part.slice(2, -2) : part;
            ctx.font = isBold ? F.headline(26) : F.body(26);
            ctx.fillText(cleanText, tx, by + 9);
            tx += ctx.measureText(cleanText).width;
          });
        });
        y += cH + 40;
      }

      // 8. Localização com pin
      if (loc) {
        const ly = Math.max(y, sH - 250);
        ctx.font = F.body(28);
        // Pin icon
        ctx.fillStyle = t.accent;
        const pinX = pad;
        ctx.beginPath(); ctx.arc(pinX + 10, ly - 10, 7, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(pinX + 3, ly - 5); ctx.lineTo(pinX + 17, ly - 5); ctx.lineTo(pinX + 10, ly + 7); ctx.closePath(); ctx.fill();
        // Texto
        ctx.fillStyle = t.text;
        ctx.textAlign = 'left';
        ctx.fillText(loc, pad + 35, ly);
      }

      // 9. Botão CTA estilo WhatsApp / dourado
      if (cta) {
        const bh = 72, bw = sW - pad * 2, by = sH - 130;

        // Fundo accent
        ctx.shadowColor = `${t.accent}44`; ctx.shadowBlur = 18; ctx.shadowOffsetY = 4;
        ctx.fillStyle = t.accent;
        roundRect(ctx, pad, by, bw, bh, bh / 2); ctx.fill();
        ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

        // Highlight gradiente
        const bg = ctx.createLinearGradient(0, by, 0, by + bh);
        bg.addColorStop(0, 'rgba(255,255,255,0.15)'); bg.addColorStop(1, 'rgba(0,0,0,0.05)');
        ctx.fillStyle = bg;
        roundRect(ctx, pad, by, bw, bh, bh / 2); ctx.fill();

        // Ícone WhatsApp (círculo branco com telefone simplificado)
        const iconX = pad + 55, iconY = by + bh / 2;
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(iconX, iconY, 16, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = t.accent;
        ctx.beginPath(); ctx.arc(iconX, iconY, 12, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        // Telefone simplificado
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('✆', iconX, iconY + 6);

        // Texto CTA
        ctx.font = F.headline(22);
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(cta.toUpperCase(), pad + bw / 2 + 15, by + bh / 2 + 8);
      }

      // Marca discreta
      if (brand) {
        ctx.font = F.light(17);
        ctx.fillStyle = `${t.text}30`;
        ctx.textAlign = 'center';
        ctx.fillText(brand, sW / 2, sH - 35);
      }
    }

    // ═════════════════════════════════════════════════════════════
    // PROMOÇÃO
    // ═════════════════════════════════════════════════════════════
    if (template === 'promo') {
      // Fundo: foto com blur
      drawBlurredBg(ctx, img, W, H, 30);
      // Overlay escuro
      const g1 = ctx.createLinearGradient(0, 0, 0, H);
      g1.addColorStop(0, `${t.bg}e8`);
      g1.addColorStop(0.3, `${t.bg}bb`);
      g1.addColorStop(0.5, `${t.bg}aa`);
      g1.addColorStop(1, `${t.bg}f5`);
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, W, H);

      // Foto principal
      const pW = W * 0.85, pH = H * 0.40;
      const pX = (W - pW) / 2, pY = S ? 150 : 70;
      ctx.save();
      roundRect(ctx, pX, pY, pW, pH, 24);
      ctx.clip();
      drawCoverImage(ctx, img, pX, pY, pW, pH);
      ctx.restore();
      ctx.strokeStyle = `${t.accent}35`;
      ctx.lineWidth = 1.5;
      roundRect(ctx, pX, pY, pW, pH, 24);
      ctx.stroke();

      // Sparkles
      drawSparkle(ctx, pX + pW - 25, pY - 12, 16, `${t.accent}cc`);
      drawSparkle(ctx, pX + pW - 55, pY - 28, 9, `${t.accent}66`);
      drawSparkle(ctx, pX + pW + 8, pY + 22, 7, `${t.accent}44`);

      const pad = 80;
      let y = pY + pH + (S ? 65 : 45);

      // Título
      if (hl) {
        const sz = S ? 68 : 54;
        ctx.font = F.headline(sz);
        ctx.fillStyle = t.text;
        ctx.textAlign = 'left';
        wrapText(ctx, hl.toUpperCase(), W - pad * 2).slice(0, 2).forEach((ln, i) => {
          ctx.fillText(ln, pad, y + i * sz * 1.18);
        });
        y += Math.min(wrapText(ctx, hl.toUpperCase(), W - pad * 2).length, 2) * sz * 1.18 + 8;
      }

      // Subtítulo itálico
      if (sub) {
        const sz = S ? 36 : 28;
        ctx.font = F.italic(sz);
        ctx.fillStyle = t.accent;
        ctx.textAlign = 'left';
        wrapText(ctx, sub, W - pad * 2).slice(0, 2).forEach((ln, i) => {
          ctx.fillText(ln, pad, y + i * sz * 1.4);
        });
        y += Math.min(wrapText(ctx, sub, W - pad * 2).length, 2) * sz * 1.4 + (S ? 35 : 25);
      }

      // Card bullets
      if (bArr.length > 0) {
        const bH = S ? 72 : 58, cpV = S ? 32 : 24, cpH = S ? 32 : 24;
        const cH = bArr.length * bH + cpV * 2;
        const cX = pad, cW = W - pad * 2;

        ctx.fillStyle = t.card;
        roundRect(ctx, cX, y, cW, cH, 18);
        ctx.fill();
        ctx.strokeStyle = t.cardBorder;
        ctx.lineWidth = 1;
        roundRect(ctx, cX, y, cW, cH, 18);
        ctx.stroke();

        bArr.forEach((bullet, i) => {
          const by = y + cpV + bH / 2 + i * bH;
          const cr = S ? 17 : 14, cx = cX + cpH + cr;

          // Check circle com gradiente
          const cg = ctx.createRadialGradient(cx, by, 0, cx, by, cr);
          cg.addColorStop(0, t.accent);
          cg.addColorStop(1, `${t.accent}bb`);
          ctx.fillStyle = cg;
          ctx.beginPath(); ctx.arc(cx, by, cr, 0, Math.PI * 2); ctx.fill();

          // Sombra
          ctx.shadowColor = `${t.accent}40`; ctx.shadowBlur = 10;
          ctx.beginPath(); ctx.arc(cx, by, cr, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;

          // Checkmark
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(cx - cr * 0.32, by + 1);
          ctx.lineTo(cx - cr * 0.02, by + cr * 0.32);
          ctx.lineTo(cx + cr * 0.38, by - cr * 0.28);
          ctx.stroke();

          // Texto
          ctx.font = F.body(S ? 27 : 22);
          ctx.fillStyle = t.text;
          ctx.textAlign = 'left';
          ctx.fillText(bullet, cx + cr + 16, by + (S ? 10 : 8));
        });
        y += cH + (S ? 30 : 22);
      }

      // Localização
      if (loc) {
        const ly = Math.max(y + 10, H - (S ? 195 : 155));
        ctx.font = F.body(S ? 25 : 21);
        ctx.fillStyle = t.accent;
        const pinX = pad + 2;
        ctx.beginPath(); ctx.arc(pinX + 7, ly - 8, 5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(pinX + 2, ly - 5); ctx.lineTo(pinX + 12, ly - 5); ctx.lineTo(pinX + 7, ly + 5); ctx.closePath(); ctx.fill();
        ctx.fillStyle = `${t.text}bb`;
        ctx.textAlign = 'left';
        ctx.fillText(loc, pad + 28, ly);
      }

      // Botão CTA
      if (cta) {
        const bh = S ? 68 : 56, bw = W - pad * 2, by = H - (S ? 100 : 78);
        ctx.shadowColor = `${t.accent}55`; ctx.shadowBlur = 18; ctx.shadowOffsetY = 4;
        ctx.fillStyle = t.accent;
        roundRect(ctx, pad, by, bw, bh, bh / 2); ctx.fill();
        ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
        // Gradiente highlight
        const bg = ctx.createLinearGradient(0, by, 0, by + bh);
        bg.addColorStop(0, 'rgba(255,255,255,0.12)'); bg.addColorStop(1, 'rgba(0,0,0,0.08)');
        ctx.fillStyle = bg;
        roundRect(ctx, pad, by, bw, bh, bh / 2); ctx.fill();
        ctx.font = F.headline(S ? 21 : 17);
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(cta.toUpperCase(), W / 2, by + bh / 2 + (S ? 8 : 6));
      }

      // Marca
      if (brand) {
        ctx.font = F.light(S ? 17 : 14);
        ctx.fillStyle = `${t.text}35`;
        ctx.textAlign = 'right';
        ctx.fillText(brand, W - pad, H - (S ? 28 : 18));
      }
    }

    // ═════════════════════════════════════════════════════════════
    // PORTFÓLIO
    // ═════════════════════════════════════════════════════════════
    if (template === 'portfolio') {
      ctx.fillStyle = t.bg;
      ctx.fillRect(0, 0, W, H);

      // Textura sutil
      ctx.strokeStyle = `${t.accent}08`;
      ctx.lineWidth = 0.5;
      for (let i = -H; i < W + H; i += 40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + H, H); ctx.stroke(); }

      // Moldura externa
      ctx.strokeStyle = `${t.accent}18`;
      ctx.lineWidth = 0.5;
      roundRect(ctx, 28, 28, W - 56, H - 56, 4); ctx.stroke();

      // Foto
      const ip = 55, iw = W - ip * 2, ih = S ? H * 0.58 : H * 0.6, iy = S ? 75 : 48;
      ctx.save();
      roundRect(ctx, ip, iy, iw, ih, 14); ctx.clip();
      drawCoverImage(ctx, img, ip, iy, iw, ih);
      ctx.restore();
      ctx.strokeStyle = `${t.accent}28`;
      ctx.lineWidth = 1;
      roundRect(ctx, ip, iy, iw, ih, 14); ctx.stroke();

      drawSparkle(ctx, W - ip - 6, iy - 8, 18, `${t.accent}bb`);
      drawSparkle(ctx, W - ip + 18, iy + 28, 10, `${t.accent}55`);
      drawSparkle(ctx, W - ip - 32, iy - 22, 8, `${t.accent}40`);

      const ty = iy + ih + (S ? 50 : 35);

      // Ornamento
      ctx.strokeStyle = `${t.accent}40`; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(W / 2 - 80, ty - 12); ctx.lineTo(W / 2 + 80, ty - 12); ctx.stroke();
      ctx.fillStyle = t.accent;
      ctx.beginPath();
      ctx.moveTo(W / 2, ty - 17); ctx.lineTo(W / 2 + 5, ty - 12);
      ctx.lineTo(W / 2, ty - 7); ctx.lineTo(W / 2 - 5, ty - 12);
      ctx.closePath(); ctx.fill();

      // Título
      const dt = brand || hl;
      if (dt) { ctx.textAlign = 'center'; ctx.font = F.headline(S ? 48 : 40); ctx.fillStyle = t.text; ctx.fillText(dt, W / 2, ty + 22); }

      // Subtítulo itálico
      const sd = sub || titleText;
      if (sd) {
        const sz = S ? 28 : 23;
        ctx.font = F.italic(sz);
        ctx.fillStyle = `${t.accent}cc`;
        ctx.textAlign = 'center';
        wrapText(ctx, sd, W - 140).slice(0, 2).forEach((ln, i) => {
          ctx.fillText(ln, W / 2, ty + (S ? 75 : 62) + i * sz * 1.5);
        });
      }

      if (loc) { ctx.font = F.light(S ? 21 : 17); ctx.fillStyle = `${t.text}55`; ctx.textAlign = 'center'; ctx.fillText(`📍 ${loc}`, W / 2, H - (S ? 95 : 75)); }
      if (cta) { ctx.font = F.body(S ? 21 : 17); ctx.fillStyle = t.accent; ctx.textAlign = 'center'; ctx.fillText(cta, W / 2, H - (S ? 52 : 38)); }
    }

    // ═════════════════════════════════════════════════════════════
    // CARD INFO
    // ═════════════════════════════════════════════════════════════
    if (template === 'card') {
      const ir = S ? 0.47 : 0.5, iH = H * ir;
      drawCoverImage(ctx, img, 0, 0, W, iH + 60);
      const tg = ctx.createLinearGradient(0, iH - 100, 0, iH + 60);
      tg.addColorStop(0, 'transparent'); tg.addColorStop(0.6, `${t.bg}cc`); tg.addColorStop(1, t.bg);
      ctx.fillStyle = tg; ctx.fillRect(0, iH - 100, W, 160);
      ctx.fillStyle = t.bg; ctx.fillRect(0, iH + 60, W, H);

      const p = 70;
      let cy = iH + (S ? 28 : 8);
      ctx.fillStyle = t.accent; roundRect(ctx, p, cy, 42, 4, 2); ctx.fill();
      cy += 38;

      if (hl) {
        const sz = S ? 50 : 40;
        ctx.textAlign = 'left'; ctx.font = F.headline(sz); ctx.fillStyle = t.text;
        wrapText(ctx, hl, W - p * 2).slice(0, 2).forEach((ln, i) => { ctx.fillText(ln, p, cy + i * sz * 1.22); });
        cy += Math.min(wrapText(ctx, hl, W - p * 2).length, 2) * sz * 1.22 + 10;
      }
      if (sub) {
        const sz = S ? 26 : 21;
        ctx.font = F.light(sz); ctx.fillStyle = `${t.text}90`; ctx.textAlign = 'left';
        wrapText(ctx, sub, W - p * 2).slice(0, 3).forEach((ln, i) => { ctx.fillText(ln, p, cy + i * sz * 1.6); });
        cy += Math.min(wrapText(ctx, sub, W - p * 2).length, 3) * sz * 1.6 + 22;
      }

      // Separador
      ctx.strokeStyle = `${t.accent}1a`; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(p, cy); ctx.lineTo(W - p, cy); ctx.stroke();
      cy += 22;

      if (bArr.length > 0) {
        const bs = S ? 25 : 20, bl = S ? 50 : 38;
        bArr.forEach((b, i) => {
          ctx.fillStyle = t.accent; ctx.beginPath(); ctx.arc(p + 6, cy + i * bl - bs * 0.12, 4, 0, Math.PI * 2); ctx.fill();
          ctx.font = F.body(bs); ctx.fillStyle = `${t.text}bb`; ctx.textAlign = 'left';
          ctx.fillText(b, p + 22, cy + i * bl);
        });
        cy += bArr.length * bl + 12;
      }

      const botY = H - (S ? 65 : 50);
      if (loc) { ctx.font = F.light(S ? 21 : 16); ctx.fillStyle = `${t.text}55`; ctx.textAlign = 'left'; ctx.fillText(`📍 ${loc}`, p, botY); }
      if (cta) { ctx.font = F.headline(S ? 19 : 15); ctx.fillStyle = t.accent; ctx.textAlign = 'right'; ctx.fillText(cta.toUpperCase(), W - p, botY); }
      if (brand) { ctx.font = F.light(S ? 15 : 12); ctx.fillStyle = `${t.text}28`; ctx.textAlign = 'center'; ctx.fillText(brand, W / 2, H - (S ? 22 : 15)); }
    }

    // ═════════════════════════════════════════════════════════════
    // ANTES / DEPOIS
    // ═════════════════════════════════════════════════════════════
    if (template === 'split') {
      ctx.fillStyle = t.bg;
      ctx.fillRect(0, 0, W, H);

      // Header
      const hY = S ? 80 : 50;
      if (hl) {
        ctx.textAlign = 'center'; ctx.font = F.headline(S ? 42 : 34); ctx.fillStyle = t.text;
        ctx.fillText(hl.toUpperCase(), W / 2, hY);
      }
      if (sub) {
        ctx.textAlign = 'center'; ctx.font = F.italic(S ? 24 : 20); ctx.fillStyle = `${t.accent}cc`;
        ctx.fillText(sub, W / 2, hY + (S ? 38 : 32));
      }

      // Duas fotos lado a lado
      const gap = 16, topPad = hY + (sub ? (S ? 65 : 55) : (S ? 35 : 25));
      const photoW = (W - gap - 100) / 2, photoH = S ? H * 0.55 : H * 0.58;
      const lX = 50, rX = lX + photoW + gap;

      // Foto esquerda (antes)
      ctx.save(); roundRect(ctx, lX, topPad, photoW, photoH, 16); ctx.clip();
      drawCoverImage(ctx, img, lX, topPad, photoW, photoH); ctx.restore();
      // Overlay sutil no "antes"
      ctx.fillStyle = `${t.bg}33`; roundRect(ctx, lX, topPad, photoW, photoH, 16); ctx.fill();
      ctx.strokeStyle = `${t.accent}20`; ctx.lineWidth = 1;
      roundRect(ctx, lX, topPad, photoW, photoH, 16); ctx.stroke();

      // Foto direita (depois)
      ctx.save(); roundRect(ctx, rX, topPad, photoW, photoH, 16); ctx.clip();
      drawCoverImage(ctx, img, rX, topPad, photoW, photoH); ctx.restore();
      ctx.strokeStyle = `${t.accent}35`; ctx.lineWidth = 1.5;
      roundRect(ctx, rX, topPad, photoW, photoH, 16); ctx.stroke();

      // Labels
      const pillY = topPad + photoH - 40;
      const drawLabel = (txt, x, w2) => {
        const pw = 120, ph = 32, px = x + (w2 - pw) / 2;
        ctx.fillStyle = `${t.bg}dd`; roundRect(ctx, px, pillY, pw, ph, ph / 2); ctx.fill();
        ctx.strokeStyle = `${t.accent}40`; ctx.lineWidth = 0.8;
        roundRect(ctx, px, pillY, pw, ph, ph / 2); ctx.stroke();
        ctx.font = F.headline(S ? 15 : 13); ctx.fillStyle = t.text; ctx.textAlign = 'center';
        ctx.fillText(txt, px + pw / 2, pillY + ph / 2 + (S ? 5 : 4));
      };
      drawLabel('ANTES', lX, photoW);
      drawLabel('DEPOIS', rX, photoW);

      // Seta central
      const arrowY = topPad + photoH / 2;
      ctx.fillStyle = t.accent;
      ctx.beginPath();
      ctx.arc(W / 2, arrowY, S ? 22 : 18, 0, Math.PI * 2); ctx.fill();
      ctx.font = F.headline(S ? 18 : 14); ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
      ctx.fillText('→', W / 2, arrowY + (S ? 7 : 5));

      // Footer
      const fY = topPad + photoH + (S ? 55 : 40);
      if (loc) { ctx.font = F.light(S ? 21 : 17); ctx.fillStyle = `${t.text}55`; ctx.textAlign = 'center'; ctx.fillText(`📍 ${loc}`, W / 2, fY); }
      if (cta) {
        const bh = S ? 60 : 48, bw = W * 0.6, bx = (W - bw) / 2, by = H - (S ? 90 : 70);
        ctx.fillStyle = t.accent; roundRect(ctx, bx, by, bw, bh, bh / 2); ctx.fill();
        ctx.font = F.headline(S ? 18 : 15); ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
        ctx.fillText(cta.toUpperCase(), W / 2, by + bh / 2 + (S ? 7 : 5));
      }
      if (brand) { ctx.font = F.light(S ? 16 : 13); ctx.fillStyle = `${t.text}30`; ctx.textAlign = 'center'; ctx.fillText(brand, W / 2, H - (S ? 25 : 18)); }
    }

    // ═════════════════════════════════════════════════════════════
    // MINIMALISTA
    // ═════════════════════════════════════════════════════════════
    if (template === 'minimal') {
      // Foto full bleed
      drawCoverImage(ctx, img, 0, 0, W, H);

      // Gradiente inferior suave
      const g = ctx.createLinearGradient(0, H * 0.45, 0, H);
      g.addColorStop(0, 'transparent');
      g.addColorStop(0.5, `${t.bg}88`);
      g.addColorStop(1, `${t.bg}ee`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

      // Gradiente superior sutil
      const g2 = ctx.createLinearGradient(0, 0, 0, H * 0.12);
      g2.addColorStop(0, `${t.bg}66`); g2.addColorStop(1, 'transparent');
      ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H * 0.12);

      // Linha accent
      const pad = 70;
      ctx.fillStyle = t.accent;
      ctx.fillRect(pad, H - (S ? 250 : 210), 45, 3);

      // Título
      if (hl) {
        const sz = S ? 56 : 44;
        ctx.font = F.headline(sz); ctx.fillStyle = t.text; ctx.textAlign = 'left';
        wrapText(ctx, hl, W - pad * 2).slice(0, 2).forEach((ln, i) => {
          ctx.fillText(ln, pad, H - (S ? 200 : 170) + i * sz * 1.18);
        });
      }

      // Subtítulo
      if (sub) {
        const sz = S ? 26 : 21;
        ctx.font = F.italic(sz); ctx.fillStyle = `${t.accent}cc`; ctx.textAlign = 'left';
        ctx.fillText(sub, pad, H - (S ? 100 : 85));
      }

      // Marca discreta no canto
      if (brand) { ctx.font = F.light(S ? 16 : 13); ctx.fillStyle = `${t.text}40`; ctx.textAlign = 'right'; ctx.fillText(brand, W - pad, H - (S ? 38 : 28)); }
      if (loc) { ctx.font = F.light(S ? 17 : 14); ctx.fillStyle = `${t.text}50`; ctx.textAlign = 'left'; ctx.fillText(`📍 ${loc}`, pad, H - (S ? 38 : 28)); }
    }

    // ═════════════════════════════════════════════════════════════
    // DEPOIMENTO
    // ═════════════════════════════════════════════════════════════
    if (template === 'depoimento') {
      ctx.fillStyle = t.bg;
      ctx.fillRect(0, 0, W, H);

      // Foto circular grande
      const cr = S ? 180 : 150, cx = W / 2, cy2 = S ? 280 : 200;
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy2, cr, 0, Math.PI * 2); ctx.clip();
      drawCoverImage(ctx, img, cx - cr, cy2 - cr, cr * 2, cr * 2);
      ctx.restore();

      // Borda accent na foto
      ctx.strokeStyle = `${t.accent}40`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy2, cr + 3, 0, Math.PI * 2); ctx.stroke();

      // Sparkles
      drawSparkle(ctx, cx + cr + 15, cy2 - cr + 20, 14, `${t.accent}aa`);
      drawSparkle(ctx, cx + cr - 8, cy2 - cr - 12, 8, `${t.accent}55`);

      // Aspas decorativas
      const qY = cy2 + cr + (S ? 60 : 45);
      ctx.font = F.italic(S ? 72 : 56); ctx.fillStyle = `${t.accent}30`; ctx.textAlign = 'center';
      ctx.fillText('"', W / 2, qY);

      // Texto do depoimento (usa headline como texto do depoimento)
      const depText = hl || 'Amei o resultado! Super profissional.';
      const depY = qY + (S ? 25 : 18);
      const depSz = S ? 30 : 24;
      ctx.font = F.italic(depSz); ctx.fillStyle = t.text; ctx.textAlign = 'center';
      wrapText(ctx, depText, W - 140).slice(0, 3).forEach((ln, i) => {
        ctx.fillText(ln, W / 2, depY + i * depSz * 1.6);
      });

      // Nome da cliente (usa subtitle)
      const nLines = Math.min(wrapText(ctx, depText, W - 140).length, 3);
      const nameY = depY + nLines * depSz * 1.6 + (S ? 35 : 25);
      if (sub) {
        ctx.font = F.headline(S ? 22 : 18); ctx.fillStyle = t.accent; ctx.textAlign = 'center';
        ctx.fillText(`— ${sub}`, W / 2, nameY);
      }

      // Estrelas de avaliação
      const starY = nameY + (S ? 40 : 30);
      ctx.font = `${S ? 28 : 22}px sans-serif`; ctx.textAlign = 'center';
      ctx.fillText('⭐⭐⭐⭐⭐', W / 2, starY);

      // Footer
      if (loc) { ctx.font = F.light(S ? 21 : 17); ctx.fillStyle = `${t.text}55`; ctx.textAlign = 'center'; ctx.fillText(`📍 ${loc}`, W / 2, H - (S ? 110 : 90)); }
      if (cta) {
        const bh = S ? 60 : 48, bw = W * 0.6, bx = (W - bw) / 2, by = H - (S ? 80 : 60);
        ctx.fillStyle = t.accent; roundRect(ctx, bx, by, bw, bh, bh / 2); ctx.fill();
        ctx.font = F.headline(S ? 18 : 15); ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
        ctx.fillText(cta.toUpperCase(), W / 2, by + bh / 2 + (S ? 7 : 5));
      }
      if (brand) { ctx.font = F.light(S ? 15 : 12); ctx.fillStyle = `${t.text}28`; ctx.textAlign = 'center'; ctx.fillText(brand, W / 2, H - (S ? 22 : 15)); }
    }

  }, [template, colorTheme, imageLoaded, legenda, platform, headline, subtitle, description, bullets, location, ctaText, brandName, fontsReady]);

  useEffect(() => { drawCanvas(); }, [drawCanvas]);

  const handleDownload = () => {
    const c = canvasRef.current; if (!c) return;
    const l = document.createElement('a');
    l.download = `post-${Date.now()}.png`;
    l.href = c.toDataURL('image/png');
    l.click();
  };

  const handleDownloadAiArt = () => {
    if (!aiArtResult) return;
    const l = document.createElement('a');
    l.download = `post-pro-${Date.now()}.png`;
    l.href = aiArtResult;
    l.click();
  };

  const generateAiArt = async () => {
    if (generatingArt) return;
    // Precisa do base64 da imagem original
    let base64 = imageBase64Source;
    if (!base64 && imageSrc?.startsWith('data:')) {
      base64 = imageSrc.split(',')[1];
    }
    if (!base64) return;
    setGeneratingArt(true);
    setAiArtResult(null);
    try {
      const token = getAccessToken ? await getAccessToken() : null;
      const res = await fetch('/api/image/enhance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          action: 'post-art',
          imageBase64: base64,
          postData: {
            title: headline || 'Nail Design',
            subtitle: subtitle || description || '',
            location: location || '',
            cta: ctaText || '',
            style: platform === 'stories' ? 'stories' : 'square',
            visualStyle: aiVisualStyle,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Erro ao gerar arte');
        return;
      }
      if (data.b64) {
        setAiArtResult(`data:image/png;base64,${data.b64}`);
      } else if (data.url) {
        setAiArtResult(data.url);
      }
    } catch {
      alert('Erro ao gerar arte. Tente novamente.');
    } finally {
      setGeneratingArt(false);
    }
  };

  if (!imageSrc) return null;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-bold text-text">Montar Imagem pro Post</h3>
        <button onClick={aiArtResult ? handleDownloadAiArt : handleDownload} className="text-xs text-white bg-accent hover:bg-accent-hover font-medium flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors shadow-soft">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          Baixar
        </button>
      </div>

      {/* Resultado da arte IA */}
      {aiArtResult && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-accent uppercase tracking-wider">✨ Arte gerada com IA</span>
            <button onClick={() => setAiArtResult(null)} className="text-[10px] text-text-light hover:text-text transition-colors">(voltar pro editor)</button>
          </div>
          <div className="bg-surface-card border border-accent/20 rounded-xl p-2 shadow-soft">
            <img src={aiArtResult} alt="Arte gerada com IA" className="w-full h-auto rounded-lg" />
          </div>
          <button onClick={handleDownloadAiArt} className="w-full py-3 rounded-xl font-semibold text-sm transition-all bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 shadow-soft flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Baixar Arte Pro
          </button>
        </div>
      )}

      {/* Preview Canvas (editor manual) */}
      {!aiArtResult && (<>
      <div className="bg-surface-card border border-border rounded-xl p-2 shadow-soft">
        <canvas ref={canvasRef} className="w-full h-auto rounded-lg" style={{ maxHeight: platform === 'stories' ? '500px' : '400px' }} />
      </div>

      {/* Templates */}
      <div>
        <label className="block text-text text-[10px] font-medium mb-1.5 uppercase tracking-wider">Template</label>
        <div className="grid grid-cols-3 gap-1.5">
          {TEMPLATES.map((tp) => (
            <button key={tp.id} onClick={() => setTemplate(tp.id)}
              className={`px-2 py-2 rounded-lg text-[11px] font-medium transition-all border text-center ${template === tp.id ? 'border-accent bg-accent-light text-text shadow-soft' : 'border-border bg-surface-card text-text-muted hover:border-accent/40'}`}>
              {tp.label}
            </button>
          ))}
        </div>
      </div>

      {/* Paleta */}
      <div>
        <label className="block text-text text-[10px] font-medium mb-1.5 uppercase tracking-wider">Paleta de cores</label>
        <div className="grid grid-cols-3 gap-1.5">
          {COLOR_THEMES.map((c) => (
            <button key={c.id} onClick={() => setColorTheme(c.id)}
              className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] font-medium transition-all border ${colorTheme === c.id ? 'border-accent bg-accent-light text-text shadow-soft' : 'border-border bg-surface-card text-text-muted hover:border-accent/40'}`}>
              <span className="w-3.5 h-3.5 rounded-full border border-border" style={{ background: c.accent }} />
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Campos do Post */}
      <div className="space-y-2.5 bg-surface-card border border-border rounded-xl p-3">
          <span className="text-[10px] font-medium text-accent uppercase tracking-wider block">Conteúdo do Post</span>
          <div>
            <label className="block text-text text-[10px] font-medium mb-1 opacity-70">Título principal</label>
            <input type="text" value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Ex: Banho de gel com nail art" className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-text placeholder-text-light focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all text-xs" maxLength={80} />
          </div>
          <div>
            <label className="block text-text text-[10px] font-medium mb-1 opacity-70">Subtítulo (cursivo)</label>
            <input type="text" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Ex: Alongamento em gel com design exclusivo" className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-text placeholder-text-light focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all text-xs" maxLength={120} />
          </div>
          {(template === 'stories') && (
            <div>
              <label className="block text-text text-[10px] font-medium mb-1 opacity-70">Parágrafo descritivo</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Busco modelo para manutenção em banho de gel com foco em fotos e vídeos para as redes sociais." className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-text placeholder-text-light focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all text-xs resize-none" rows={3} maxLength={250} />
            </div>
          )}
          {template !== 'portfolio' && (
            <div className="space-y-1.5">
              <label className="block text-text text-[10px] font-medium opacity-70">
                Destaques (checkmarks)
                {template === 'stories' && <span className="text-text-light ml-1">— use **negrito** para destacar</span>}
              </label>
              {bullets.map((b, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-accent text-xs">✓</span>
                  <input type="text" value={b} onChange={(e) => { const n = [...bullets]; n[i] = e.target.value; setBullets(n); }}
                    placeholder={['Serviço profissional', 'Material de qualidade', 'Resultado garantido'][i]}
                    className="flex-1 bg-surface border border-border rounded-lg px-3 py-1.5 text-text placeholder-text-light focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all text-xs" maxLength={60} />
                </div>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-text text-[10px] font-medium mb-1 opacity-70">Local</label>
              <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Cidade - UF" className="w-full bg-surface border border-border rounded-lg px-3 py-1.5 text-text placeholder-text-light focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all text-xs" maxLength={40} />
            </div>
            <div>
              <label className="block text-text text-[10px] font-medium mb-1 opacity-70">Botão CTA</label>
              <input type="text" value={ctaText} onChange={(e) => setCtaText(e.target.value)} placeholder="Agende pelo WhatsApp" className="w-full bg-surface border border-border rounded-lg px-3 py-1.5 text-text placeholder-text-light focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all text-xs" maxLength={40} />
            </div>
          </div>
          <div>
            <label className="block text-text text-[10px] font-medium mb-1 opacity-70">Sua marca (opcional)</label>
            <input type="text" value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="@seunome ou nome do estúdio" className="w-full bg-surface border border-border rounded-lg px-3 py-1.5 text-text placeholder-text-light focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all text-xs" maxLength={30} />
          </div>
      </div>

      <button onClick={handleDownload} className="w-full py-3 rounded-xl font-semibold text-sm transition-all bg-accent text-white hover:bg-accent-hover shadow-soft flex items-center justify-center gap-2">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
        Baixar Imagem Pronta
      </button>
      </>)}

      {/* Botão Gerar Arte Pro com IA */}
      {!aiArtResult && (
        <div className="border-t border-border pt-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-bold text-text-light uppercase tracking-wider">ou</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Estilo Visual IA */}
          <div className="mb-3">
            <label className="block text-text text-[10px] font-medium mb-1.5 uppercase tracking-wider">Estilo Visual da IA</label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'luxury', label: '✨ Luxo', color: '#c9a96e' },
                { id: 'modern', label: '🤍 Clean', color: '#94a3b8' },
                { id: 'neon', label: '💜 Neon', color: '#a855f7' },
                { id: 'romantic', label: '🌸 Romântico', color: '#f9a8d4' },
                { id: 'editorial', label: '📰 Editorial', color: '#1e293b' },
                { id: 'tropical', label: '🌴 Tropical', color: '#f59e0b' },
              ].map((s) => (
                <button key={s.id} onClick={() => setAiVisualStyle(s.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[11px] font-medium transition-all border ${aiVisualStyle === s.id ? 'border-accent bg-accent-light text-text shadow-soft ring-1 ring-accent/30' : 'border-border bg-surface-card text-text-muted hover:border-accent/40'}`}>
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {plan && plan !== 'free' ? (
            <button
              onClick={generateAiArt}
              disabled={generatingArt || (!headline && !subtitle)}
              className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 shadow-soft disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {generatingArt ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Gerando arte profissional...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  ✨ Gerar Arte Pro com IA
                </>
              )}
            </button>
          ) : (
            <button
              onClick={onUpgrade}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all border border-accent/20 bg-accent-bg text-text hover:border-accent/40 flex items-center justify-center gap-2"
            >
              ✨ Gerar Arte Pro com IA <span className="text-[10px] bg-accent/15 text-accent px-2 py-0.5 rounded-full font-bold">PRO</span>
            </button>
          )}
          <p className="text-[10px] text-text-light text-center mt-1.5">Preencha o título acima antes de gerar</p>
        </div>
      )}
    </div>
  );
}
