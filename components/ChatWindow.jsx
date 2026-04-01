'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Message from './Message';
import { searchKnowledge } from '../lib/knowledge-base';
import { buildSystemPrompt } from '../lib/system-prompt';
import { dbSaveMessage, dbUpdateChatTitle, dbSaveFavorite, dbDeleteErrorMessages, dbCheckMessageQuota, dbIncrementMessageCount } from '../lib/db';

export default function ChatWindow({ user, userId, pendingPrompt, chatId, initialMessages, onChatUpdated, onFavoritesChanged }) {
  const [messages, setMessages] = useState(initialMessages || []);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [lastFailedMsg, setLastFailedMsg] = useState(null);
  const [pendingFile, setPendingFile] = useState(null); // { base64, mediaType, dataUrl, name }
  const [isDragging, setIsDragging] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const chatAreaRef = useRef(null);
  const titleSetRef = useRef(false);
  const msgIdRef = useRef(0);
  const nextId = () => ++msgIdRef.current;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    if (pendingPrompt) {
      sendMessage(pendingPrompt);
    }
  }, [pendingPrompt]);

  // Set welcome message only for brand new chats (no initialMessages)
  useEffect(() => {
    if (initialMessages && initialMessages.length > 0) {
      setMessages(initialMessages);
      titleSetRef.current = true;
      return;
    }
    // Only show welcome if messages are empty (avoid resetting during conversation)
    if (messages.length > 1) return;
    titleSetRef.current = false;
    const welcome = {
      role: 'assistant',
      content: `Falaaaaa Amiga Naiuus, Nails... Se ta boa? 💅\n\n${user.name}, sou a Maluar AI, criada pela Karina Oliveira pra te ajudar nessa jornada.\n\n${
        user.level === 'iniciante'
          ? 'Vi que tá começando — bora do zero juntas!'
          : user.level === 'intermediario'
          ? 'Já faz umas unhas né? Bora subir de nível!'
          : 'Já atende clientes — vamos refinar sua técnica!'
      }\n\nMe pergunta sobre técnicas, produtos, preços ou manda foto pra eu analisar.`,
    };
    setMessages([welcome]);
  }, [user, initialMessages]);

  // Persist messages to Supabase
  const persistMessage = useCallback(
    async (msg) => {
      if (chatId) {
        await dbSaveMessage(chatId, msg);
        onChatUpdated?.();
      }
    },
    [chatId, onChatUpdated]
  );

  const sendMessage = async (text, imageBase64 = null, mediaType = 'image/jpeg', imageDataUrl = null) => {
    if ((!text.trim() && !imageBase64) || isLoading || isStreaming) return;

    // Verificar quota de mensagens diárias
    if (userId) {
      try {
        const quota = await dbCheckMessageQuota(userId);
        if (!quota.allowed) {
          setMessages((prev) => [...prev, {
            _id: nextId(), role: 'assistant', content: `⚠️ Você atingiu o limite diário de **${quota.limit} mensagens** do seu plano. Aguarde até amanhã ou faça upgrade para continuar.`, isError: true, timestamp: Date.now()
          }]);
          return;
        }
      } catch {}
    }

    const userContent = imageBase64
      ? [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
          { type: 'text', text: text || 'Analisa essa unha seguindo o MÉTODO DE ANÁLISE OBRIGATÓRIO: primeiro descreva LITERALMENTE o que vê (cores, formas, se há sombras/volume ou não), depois identifique as técnicas baseando-se SOMENTE nas observações. Lembre: sem sombra = não é 3D, é pintura plana.' },
        ]
      : text;

    const userMessage = { role: 'user', content: userContent };
    const displayText = imageBase64 ? `${text || 'Foto enviada para análise'}` : text;

    // Set chat title from first user message
    if (!titleSetRef.current && chatId) {
      dbUpdateChatTitle(chatId, displayText);
      titleSetRef.current = true;
      onChatUpdated?.();
    }

    const newUserMsg = { _id: nextId(), role: 'user', content: displayText, imagePreview: imageDataUrl || null, timestamp: Date.now() };
    setMessages((prev) => [...prev, newUserMsg]);
    // Persist user message to DB
    persistMessage({ role: 'user', content: displayText, imagePreview: imageDataUrl || null });
    setInput('');
    setIsLoading(true);
    setLastFailedMsg(null);

    try {
      const knowledgeContext = searchKnowledge(typeof userContent === 'string' ? userContent : text);
      const systemPrompt = buildSystemPrompt(user.name, user.level, knowledgeContext);

      const allMessages = [
        ...messages.filter((m) => m.role !== 'assistant' || messages.indexOf(m) !== 0),
        userMessage,
      ].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const apiMessages = allMessages.slice(-6);

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          system: systemPrompt,
          stream: true,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro na API');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';
      const assistantId = nextId();

      setMessages((prev) => [...prev, { _id: assistantId, role: 'assistant', content: '', timestamp: Date.now() }]);
      setIsLoading(false);
      setIsStreaming(true);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter((l) => l.startsWith('data: '));

        for (const line of lines) {
          const data = line.slice(6);
          if (data === '[DONE]') break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              assistantText += parsed.text;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: assistantText };
                return updated;
              });
            }
          } catch {}
        }
      }

      setIsStreaming(false);
      // Persist final assistant message to DB
      setMessages((prev) => {
        const final = [...prev];
        const finalContent = assistantText || 'Ops, não consegui processar. Tenta de novo!';
        if (!assistantText) {
          final[final.length - 1] = { _id: assistantId, role: 'assistant', content: finalContent, timestamp: Date.now() };
        }
        persistMessage({ role: 'assistant', content: finalContent });
        return final;
      });
      // Incrementar quota
      if (userId) dbIncrementMessageCount(userId).catch(() => {});
    } catch (err) {
      setIsStreaming(false);
      setLastFailedMsg({ text, imageBase64, mediaType, imageDataUrl });
      const errContent = err.message || 'Eita, deu um erro aqui. Tenta mandar de novo! 💅';
      setMessages((prev) => {
        const updated = [
          ...prev,
          { _id: nextId(), role: 'assistant', content: errContent, isError: true, timestamp: Date.now() },
        ];
        return updated;
      });
      persistMessage({ role: 'assistant', content: errContent, isError: true });
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    if (!lastFailedMsg) return;
    // Remove last error message
    setMessages((prev) => prev.filter((m) => !m.isError));
    if (chatId) dbDeleteErrorMessages(chatId);
    const { text, imageBase64, mediaType, imageDataUrl } = lastFailedMsg;
    setLastFailedMsg(null);
    sendMessage(text, imageBase64, mediaType, imageDataUrl);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const processFile = (file) => {
    if (file.size > 5 * 1024 * 1024) {
      alert('Arquivo muito grande! Máximo 5MB.');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      alert('Formato não suportado. Use JPG, PNG, WebP ou GIF.');
      return;
    }

    const mimeType = file.type || 'image/jpeg';
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const base64 = dataUrl.split(',')[1];
      setPendingFile({ base64, mediaType: mimeType, dataUrl, name: file.name });
      inputRef.current?.focus();
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePendingFile = () => {
    setPendingFile(null);
  };

  const handleSubmitWithFile = (e) => {
    e.preventDefault();
    if (pendingFile) {
      sendMessage(input || '', pendingFile.base64, pendingFile.mediaType, pendingFile.dataUrl);
      setPendingFile(null);
    } else {
      sendMessage(input);
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === chatAreaRef.current) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div
      ref={chatAreaRef}
      className={`flex flex-col h-full bg-surface relative ${isDragging ? 'ring-2 ring-accent ring-inset' : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-accent/10 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div className="bg-surface-card border-2 border-dashed border-accent rounded-2xl px-8 py-6 text-center shadow-elevated">
            <svg className="w-10 h-10 text-accent mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-accent font-semibold text-sm">Solte a imagem aqui</p>
            <p className="text-text-light text-xs mt-1">JPG, PNG, WebP ou GIF (máx 5MB)</p>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-1">
          {messages.map((msg, i) => (
            <Message key={msg._id || `m-${i}`} role={msg.role} content={msg.content} imagePreview={msg.imagePreview} timestamp={msg.timestamp} isError={msg.isError} onRetry={msg.isError ? handleRetry : undefined} onSaveFavorite={msg.role === 'assistant' && !msg.isError ? async (content) => { await dbSaveFavorite(userId, { type: 'chat', content }); onFavoritesChanged?.(); } : undefined} />
          ))}
          {isLoading && <Message isTyping />}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Occasion quick chips — only show for new chats with just the welcome msg */}
      {messages.length <= 1 && !isLoading && !isStreaming && (
        <div className="px-4 pb-3">
          <div className="max-w-2xl mx-auto">
            <p className="text-[11px] text-text-light mb-2 font-medium uppercase tracking-wide">Comece por uma ocasião</p>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: '💍 Casamento', prompt: 'Quero sugestões de nail design para casamento' },
                { label: '🎉 Festa', prompt: 'Ideias de unha para festa/balada' },
                { label: '💼 Trabalho', prompt: 'Design de unha elegante para o dia a dia no trabalho' },
                { label: '🌴 Dia-a-dia', prompt: 'Design simples e bonito para o dia a dia' },
                { label: '🎄 Natal/Ano Novo', prompt: 'Nail art temática para Natal e Ano Novo' },
                { label: '📸 Recria um Design', prompt: 'Quero recriar um nail design, vou te mandar a foto' },
              ].map((item, idx) => (
                <button
                  key={item.label}
                  onClick={() => sendMessage(item.prompt)}
                  className={`text-xs px-3 py-1.5 rounded-full border border-border-light bg-surface-card text-text-muted hover:border-accent hover:text-accent hover:bg-accent-bg transition-all card-glow animate-fade-in-delayed delay-${(idx + 1) * 100}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border-light bg-surface-card/80 backdrop-blur-sm">
        <form onSubmit={handleSubmitWithFile} className="max-w-2xl mx-auto p-4">
          {/* Pending file preview */}
          {pendingFile && (
            <div className="mb-2 flex items-center gap-2 bg-surface border border-border-light rounded-xl px-3 py-2">
              <img
                src={pendingFile.dataUrl}
                alt="Preview"
                className="w-14 h-14 object-cover rounded-lg border border-border-light"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-text truncate">{pendingFile.name}</p>
                <p className="text-[10px] text-text-light">Pronto pra enviar — escreva algo antes ou envie direto</p>
              </div>
              <button
                type="button"
                onClick={handleRemovePendingFile}
                className="shrink-0 w-6 h-6 rounded-full bg-surface-alt flex items-center justify-center text-text-light hover:text-rose hover:bg-rose/10 transition-colors"
                aria-label="Remover arquivo"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          <div className="flex gap-2 items-center bg-surface border border-border rounded-2xl px-3 py-1.5 shadow-soft focus-within:ring-2 focus-within:ring-accent/20 focus-within:border-accent transition-all">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-text-light hover:text-accent hover:bg-accent-bg transition-colors"
              title="Enviar foto"
              aria-label="Enviar foto"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleImageUpload}
              className="hidden"
            />
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={pendingFile ? 'Escreva algo sobre a foto (opcional)...' : 'Pergunta qualquer coisa...'}
              className="flex-1 bg-transparent py-2.5 text-text placeholder-text-light focus:outline-none text-sm"
              disabled={isLoading || isStreaming}
              maxLength={2000}
            />
            <button
              type="submit"
              disabled={(!input.trim() && !pendingFile) || isLoading || isStreaming}
              className="shrink-0 w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white hover:bg-accent-hover transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
              aria-label="Enviar mensagem"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
