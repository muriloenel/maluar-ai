'use client';

import { useState, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useToast } from './Toast';

function formatTime(ts) {
  if (!ts) return null;
  const d = new Date(ts);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function MessageInner({ role, content, isTyping, imagePreview, timestamp, isError, onRetry, onSaveFavorite }) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [feedback, setFeedback] = useState(null); // 'up' | 'down' | null
  const [isSpeaking, setIsSpeaking] = useState(false);
  const toast = useToast();

  if (isTyping) {
    return (
      <div className="flex justify-start mb-3 animate-fade-in">
        <div className="shrink-0 mr-2 mt-1">
          <img src="/logo-icon.webp" alt="Maluar" className="w-7 h-7 rounded-lg object-contain" />
        </div>
        <div className="bg-surface-card border border-border-light rounded-2xl rounded-bl-sm px-4 py-3 shadow-soft card-glow" aria-label="Digitando...">
          <div className="flex gap-1.5">
            <span className="typing-dot w-1.5 h-1.5 bg-accent rounded-full inline-block" />
            <span className="typing-dot w-1.5 h-1.5 bg-accent rounded-full inline-block" />
            <span className="typing-dot w-1.5 h-1.5 bg-accent rounded-full inline-block" />
          </div>
        </div>
      </div>
    );
  }

  const isUser = role === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    toast?.('Copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportPDF = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    // Sanitizar conteúdo para evitar XSS
    const escaped = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Maluar AI — Recria Design</title><style>body{font-family:Inter,system-ui,sans-serif;max-width:700px;margin:40px auto;padding:20px;color:#1A1A2E;line-height:1.7;}h1{color:#7F77DD;font-size:1.3em;border-bottom:2px solid #7F77DD;padding-bottom:8px;}strong{color:#1A1A2E;}ul,ol{padding-left:1.5em;}li{margin-bottom:4px;}.footer{margin-top:32px;padding-top:12px;border-top:1px solid #d8d4e8;color:#6B7280;font-size:0.85em;text-align:center;}</style></head><body><h1>💅 Maluar AI — Recria Design</h1>${escaped}<div class="footer">Gerado por Maluar AI · ${new Date().toLocaleDateString('pt-BR')}</div></body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); }, 500);
  };

  const handleSpeak = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    if (!window.speechSynthesis) return;
    // Limpar markdown/emojis para leitura mais natural
    const cleanText = content
      .replace(/[#*_~`>|-]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\n{2,}/g, '. ')
      .replace(/\n/g, ' ')
      .trim();
    if (!cleanText) return;
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3 animate-fade-in group`}>
      {/* AI Avatar */}
      {!isUser && (
        <div className="shrink-0 mr-2 mt-1">
          <img src="/logo-icon.webp" alt="Maluar" className="w-7 h-7 rounded-lg object-contain" />
        </div>
      )}
      <div
        className={`rounded-2xl px-4 py-2.5 max-w-[85%] sm:max-w-[75%] leading-relaxed text-[14px] ${
          isUser
            ? 'bg-accent text-white rounded-br-sm shadow-soft'
            : isError
            ? 'bg-rose-50 border border-rose-200 text-rose-700 rounded-bl-sm shadow-soft card-glow'
            : 'bg-surface-card border border-border-light text-text rounded-bl-sm shadow-soft card-glow'
        }`}
      >
        {!isUser && !isError && (
          <div className="flex items-center justify-between mb-1">
            <span className="text-accent font-semibold text-[11px] uppercase tracking-wide">
              Maluar AI
            </span>
            <button
              onClick={handleCopy}
              className="opacity-0 group-hover:opacity-100 transition-opacity ml-3 text-text-light hover:text-accent"
              title="Copiar resposta"
              aria-label="Copiar resposta"
            >
              {copied ? (
                <svg className="w-3.5 h-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
            {onSaveFavorite && (
              <button
                onClick={() => {
                  onSaveFavorite(content);
                  setSaved(true);
                  toast?.('Salvo nos favoritos ⭐');
                  setTimeout(() => setSaved(false), 2000);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity ml-1.5 text-text-light hover:text-amber-500"
                title="Salvar nos favoritos"
                aria-label="Salvar nos favoritos"
              >
                {saved ? (
                  <svg className="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                )}
              </button>
            )}
            {/* Export PDF - for longer assistant responses */}
            {content && content.length > 200 && (
              <button
                onClick={handleExportPDF}
                className="opacity-0 group-hover:opacity-100 transition-opacity ml-1.5 text-text-light hover:text-accent"
                title="Exportar como PDF"
                aria-label="Exportar como PDF"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
            )}
            {/* Listen button - TTS */}
            {content && (
              <button
                onClick={handleSpeak}
                className={`transition-opacity ml-1.5 ${isSpeaking ? 'opacity-100 text-accent' : 'opacity-0 group-hover:opacity-100 text-text-light hover:text-accent'}`}
                title={isSpeaking ? 'Parar leitura' : 'Ouvir resposta'}
                aria-label={isSpeaking ? 'Parar leitura em voz alta' : 'Ouvir resposta em voz alta'}
              >
                {isSpeaking ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707A1 1 0 0112 5.586v12.828a1 1 0 01-1.707.707L5.586 15z" />
                  </svg>
                )}
              </button>
            )}
          </div>
        )}
        {/* Image preview for user messages with photos */}
        {isUser && imagePreview && (
          <img
            src={imagePreview}
            alt="Foto enviada"
            loading="lazy"
            onError={(e) => { e.target.style.display = 'none'; }}
            className="w-40 h-40 object-cover rounded-xl mb-2 border border-white/20"
          />
        )}
        {isUser ? (
          <span className="whitespace-pre-wrap">{content}</span>
        ) : (
          <div className="markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        )}
        {/* Retry button on error */}
        {isError && onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 flex items-center gap-1.5 text-xs font-medium text-rose-600 hover:text-rose-800 transition-colors"
            aria-label="Tentar novamente"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Tentar novamente
          </button>
        )}
        {/* Feedback emoji — assistant messages only */}
        {!isUser && !isError && !isTyping && content && (
          <div className={`flex items-center gap-1 mt-1.5 ${feedback ? '' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
            <button
              onClick={() => setFeedback('up')}
              className={`w-5 h-5 rounded flex items-center justify-center text-[11px] transition-colors ${
                feedback === 'up' ? 'bg-green-100 text-green-600' : 'text-text-light hover:text-green-500 hover:bg-green-50'
              }`}
              title="Boa resposta"
              aria-label="Boa resposta"
            >
              👍
            </button>
            <button
              onClick={() => setFeedback('down')}
              className={`w-5 h-5 rounded flex items-center justify-center text-[11px] transition-colors ${
                feedback === 'down' ? 'bg-rose-100 text-rose-600' : 'text-text-light hover:text-rose-500 hover:bg-rose-50'
              }`}
              title="Pode melhorar"
              aria-label="Pode melhorar"
            >
              👎
            </button>
            {feedback && (
              <span className="text-[10px] text-text-light ml-1">
                {feedback === 'up' ? 'Obrigada!' : 'Vou melhorar 💪'}
              </span>
            )}
          </div>
        )}
        {/* Timestamp */}
        {timestamp && (
          <div className={`text-[10px] mt-1 ${isUser ? 'text-white/50' : isError ? 'text-rose-400' : 'text-text-light/60'}`}>
            {formatTime(timestamp)}
          </div>
        )}
      </div>
    </div>
  );
}

const Message = memo(MessageInner);
export default Message;
