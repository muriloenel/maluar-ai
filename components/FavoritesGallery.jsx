'use client';

import { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useToast } from './Toast';

function generateCardImage(content) {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d');

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 1080, 1080);
  grad.addColorStop(0, '#FAF5FF');
  grad.addColorStop(1, '#EEEDFE');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1080, 1080);

  // Accent strip top
  ctx.fillStyle = '#7F77DD';
  ctx.fillRect(0, 0, 1080, 6);

  // Logo area
  ctx.fillStyle = '#7F77DD';
  ctx.font = 'bold 28px Inter, system-ui, sans-serif';
  ctx.fillText('💅 Maluar AI', 60, 70);

  // Divider
  ctx.strokeStyle = '#d8d4e8';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(60, 100);
  ctx.lineTo(1020, 100);
  ctx.stroke();

  // Content text
  ctx.fillStyle = '#1A1A2E';
  ctx.font = '500 26px Inter, system-ui, sans-serif';
  const cleanContent = content.replace(/\*\*/g, '').replace(/#{1,3}\s/g, '');
  const lines = [];
  const words = cleanContent.split(/\s+/);
  let currentLine = '';
  for (const word of words) {
    const test = currentLine ? currentLine + ' ' + word : word;
    if (ctx.measureText(test).width > 920) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = test;
    }
  }
  if (currentLine) lines.push(currentLine);

  const maxLines = 28;
  const displayLines = lines.slice(0, maxLines);
  if (lines.length > maxLines) displayLines.push('...');

  displayLines.forEach((line, i) => {
    ctx.fillText(line, 60, 150 + i * 34);
  });

  // Footer
  ctx.fillStyle = '#6B7280';
  ctx.font = '400 20px Inter, system-ui, sans-serif';
  ctx.fillText('Gerado por Maluar AI · @maluar.nails', 60, 1040);

  return canvas.toDataURL('image/png');
}

export default function FavoritesGallery({ favorites, onDelete, onUsePrompt }) {
  const [expandedId, setExpandedId] = useState(null);
  const toast = useToast();

  if (!favorites || favorites.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-xs animate-scale-in">
          <div className="w-20 h-20 ai-avatar rounded-3xl flex items-center justify-center mx-auto mb-5 opacity-80">
            <span className="text-4xl">⭐</span>
          </div>
          <h3 className="font-display text-xl font-bold text-text mb-2">Nenhum favorito ainda</h3>
          <p className="text-sm text-text-muted leading-relaxed mb-4">
            Salve respostas da Maluar AI clicando no ⭐ nas mensagens do chat.
          </p>
          <div className="flex flex-col gap-2 text-[12px] text-text-light">
            <div className="flex items-center gap-2 justify-center">
              <span className="w-5 h-5 bg-accent-light rounded-md flex items-center justify-center text-[10px]">💬</span>
              Converse com a Maluar AI
            </div>
            <div className="flex items-center gap-2 justify-center">
              <span className="w-5 h-5 bg-accent-light rounded-md flex items-center justify-center text-[10px]">⭐</span>
              Clique na estrela para salvar
            </div>
            <div className="flex items-center gap-2 justify-center">
              <span className="w-5 h-5 bg-accent-light rounded-md flex items-center justify-center text-[10px]">📸</span>
              Exporte como imagem ou PDF
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-display text-base font-bold text-text">
          ⭐ Meus Favoritos ({favorites.length})
        </h2>
      </div>

      {favorites.map((fav) => {
        const isExpanded = expandedId === fav.id;
        const preview = fav.content?.slice(0, 150) + (fav.content?.length > 150 ? '...' : '');
        const date = new Date(fav.savedAt).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: 'short',
        });

        return (
          <div
            key={fav.id}
            className="bg-surface-card border border-border-light rounded-xl shadow-soft overflow-hidden animate-fade-in card-glow"
          >
            {/* Header */}
            <div
              className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-surface-alt/50 transition-colors"
              onClick={() => setExpandedId(isExpanded ? null : fav.id)}
            >
              <div className="w-8 h-8 bg-accent-light rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-sm">
                  {fav.type === 'recria' ? '📸' : fav.type === 'post' ? '📱' : '💅'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-text leading-relaxed line-clamp-2">{preview}</p>
                <p className="text-[10px] text-text-light mt-1">{date}</p>
              </div>
              <svg
                className={`w-4 h-4 text-text-light shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {/* Expanded content */}
            {isExpanded && (
              <div className="px-4 pb-3 border-t border-border-light">
                {fav.imageUrl && (
                  <img
                    src={fav.imageUrl}
                    alt="Design salvo"
                    className="w-full max-h-48 object-cover rounded-lg mt-3 mb-2"
                  />
                )}
                <div className="markdown-body text-[13px] mt-3 max-h-80 overflow-y-auto">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{fav.content}</ReactMarkdown>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border-light flex-wrap">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(fav.content);
                      toast?.('Copiado!');
                    }}
                    className="flex items-center gap-1.5 text-[11px] font-medium text-text-muted hover:text-accent transition-colors px-2 py-1.5 rounded-lg hover:bg-accent-bg"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copiar
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const dataUrl = generateCardImage(fav.content);
                      const link = document.createElement('a');
                      link.download = `maluar-favorito-${fav.id}.png`;
                      link.href = dataUrl;
                      link.click();
                      toast?.('Imagem salva! 📸');
                    }}
                    className="flex items-center gap-1.5 text-[11px] font-medium text-text-muted hover:text-accent transition-colors px-2 py-1.5 rounded-lg hover:bg-accent-bg"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Salvar como imagem
                  </button>
                  {onUsePrompt && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onUsePrompt('Me fala mais sobre: ' + fav.content.slice(0, 80));
                      }}
                      className="flex items-center gap-1.5 text-[11px] font-medium text-text-muted hover:text-accent transition-colors px-2 py-1.5 rounded-lg hover:bg-accent-bg"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      Usar no chat
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(fav.id);
                    }}
                    className="flex items-center gap-1.5 text-[11px] font-medium text-text-muted hover:text-rose transition-colors px-2 py-1.5 rounded-lg hover:bg-rose-50 ml-auto"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Excluir
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
