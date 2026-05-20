'use client';

/*
  components/ChatWindow.jsx — Redesign "Soft Feminino"
  TODA a lógica original preservada:
    - Streaming SSE, abort, busy/30s lockout
    - Detecção de intenção (enhance / post-art / recreate)
    - Upload, compressão, HEIC, drag-and-drop
    - Speech-to-text via Web Speech API
    - Persist no banco com criação lazy do chat
    - Quota modal, retry, favorite, auto-grow textarea
*/

import { useState, useRef, useEffect, useCallback } from 'react';
import Message from './Message';
import Icon from './Icon';
import MaluarMark from './MaluarMark';
import { searchKnowledge } from '../lib/knowledge-base';
import { buildSystemPrompt } from '../lib/system-prompt';
import {
  dbSaveMessage, dbUpdateChatTitle, dbSaveFavorite,
  dbDeleteErrorMessages, dbIncrementMessageCount, dbCreateChat,
} from '../lib/db';
import { trackEvent } from './PostHogProvider';

export default function ChatWindow({
  user, userId, userEmail, pendingPrompt, onPromptConsumed,
  chatId, initialMessages, onChatUpdated, onChatCreated, onFavoritesChanged,
  onOpenSidebar, getAccessToken, onAuthExpired, onUpgrade,
}) {
  const [messages, setMessages] = useState(initialMessages || []);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [lastFailedMsg, setLastFailedMsg] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [quotaModal, setQuotaModal] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const chatAreaRef = useRef(null);
  const recognitionRef = useRef(null);
  const titleSetRef = useRef(false);
  const userMsgCountRef = useRef(0);
  const chatIdRef = useRef(null);
  const msgIdRef = useRef(0);
  const messagesRef = useRef(messages);
  const abortRef = useRef(null);
  const busyRef = useRef(false);
  const realChatIdRef = useRef(null);
  const lastImageRef = useRef(null);
  const nextId = () => ++msgIdRef.current;

  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [messages, isLoading]);

  useEffect(() => () => {
    abortRef.current?.abort();
    recognitionRef.current?.abort();
  }, []);

  // ─── Voice input (STT) ─────────────────────────────────────────
  const toggleVoiceInput = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Seu navegador não suporta reconhecimento de voz. Use o Chrome ou Edge.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognitionRef.current = recognition;
    let finalTranscript = '';
    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalTranscript += t;
        else interim = t;
      }
      setInput(finalTranscript + interim);
    };
    recognition.onend = () => {
      setIsListening(false);
      if (finalTranscript.trim()) {
        setInput(finalTranscript.trim());
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    };
    recognition.onerror = (e) => {
      setIsListening(false);
      if (e.error !== 'aborted' && e.error !== 'no-speech') {
        console.warn('[Voice] Recognition error:', e.error);
      }
    };
    recognition.start();
    setIsListening(true);
  }, [isListening]);

  // ─── Chat lifecycle ─────────────────────────────────────────────
  useEffect(() => {
    if (chatIdRef.current === chatId && messages.length > 1) return;
    if (chatIdRef.current?.startsWith('new-') && chatId === realChatIdRef.current) {
      chatIdRef.current = chatId;
      return;
    }
    chatIdRef.current = chatId;
    abortRef.current?.abort();
    busyRef.current = false;
    setIsLoading(false);
    setIsStreaming(false);
    setInput('');
    setLastFailedMsg(null);
    setPendingFile(null);
    lastImageRef.current = null;
    msgIdRef.current = 0;
    realChatIdRef.current = (chatId && !chatId.startsWith('new-') && !chatId.startsWith('local-')) ? chatId : null;
    if (initialMessages && initialMessages.length > 0) {
      setMessages(initialMessages);
      titleSetRef.current = true;
      return;
    }
    titleSetRef.current = false;
    userMsgCountRef.current = 0;
    setMessages([]);
  }, [chatId, initialMessages]);

  const processedPromptRef = useRef(null);
  useEffect(() => {
    if (!pendingPrompt) return;
    if (pendingPrompt === processedPromptRef.current) return;
    processedPromptRef.current = pendingPrompt;
    const text = typeof pendingPrompt === 'string' ? pendingPrompt : pendingPrompt.text;
    if (!text) return;
    const timer = setTimeout(() => { sendMessage(text); onPromptConsumed?.(); }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPrompt]);

  const persistMessage = useCallback(async (msg) => {
    if (!realChatIdRef.current) {
      if (chatId?.startsWith('new-') && userId) {
        try {
          const chat = await dbCreateChat(userId);
          if (chat) { realChatIdRef.current = chat.id; onChatCreated?.(chat); }
        } catch {}
      } else if (chatId && !chatId.startsWith('local-') && !chatId.startsWith('new-')) {
        realChatIdRef.current = chatId;
      }
    }
    const targetChatId = realChatIdRef.current;
    if (targetChatId) {
      try { await dbSaveMessage(targetChatId, msg); onChatUpdated?.(); } catch {}
    }
  }, [chatId, userId, onChatUpdated, onChatCreated]);

  // ─── Image intent detection ─────────────────────────────────────
  const IMAGE_INTENT_PATTERNS = {
    enhance: /\b(melhora|melhore|melhorar|enhance|aprimora|aprimorar|qualidade|mais bonita|mais n[ií]tida|ilumina|profissional|mais linda|mais clara|clarear|edita|editar|retoca|retocar|ajusta|ajustar)\b/i,
    'post-art': /\b(post|arte|stories|story|propaganda|divulga[çr]|feed|instagram|insta|rede social|social media|marketing|an[uú]ncio|template|banner|card|cart[aã]o|promo[çc]|coloca.*texto|texto.*foto|texto.*imagem|escrev[ea].*foto|escrev[ea].*imagem)\b/i,
    recreate: /\b(gera|gerar|cria|criar|recria|recriar|recrie|faz|fazer|fa[çz]a|transforma|transformar|inspira|inspirar|como seria|cri[ae] uma?|gera uma?|faz uma?|baseada?|nova imagem|outra vers[aã]o|diferente|modifica|modificar|muda|mudar|altera|alterar|coloca|colocar|adiciona|adicionar|bota|botar|p[oõ]e|coloqu)\b/i,
  };
  function detectImageIntent(text) {
    if (!text || !text.trim()) return null;
    const t = text.toLowerCase();
    if (IMAGE_INTENT_PATTERNS.enhance.test(t)) return 'enhance';
    if (IMAGE_INTENT_PATTERNS['post-art'].test(t)) return 'post-art';
    if (IMAGE_INTENT_PATTERNS.recreate.test(t)) return 'recreate';
    return null;
  }

  const handleImageGeneration = async (imageBase64, action, userText, displayText) => {
    const assistantId = nextId();
    const loadingLabels = {
      enhance: 'Melhorando sua foto com IA…',
      'post-art': 'Criando arte para seu post…',
      recreate: 'Recriando esse design com IA…',
    };
    setMessages((prev) => [...prev, {
      _id: assistantId, role: 'assistant',
      content: loadingLabels[action] || 'Gerando imagem…',
      isImageLoading: true, timestamp: Date.now(),
    }]);
    try {
      const authToken = getAccessToken ? await getAccessToken().catch(() => null) : null;
      const fetchHeaders = { 'Content-Type': 'application/json' };
      if (authToken) fetchHeaders['Authorization'] = `Bearer ${authToken}`;
      const body = { action, imageBase64 };
      if (action === 'recreate') body.description = userText || '';
      if (action === 'post-art') {
        body.postData = {
          title: userText || 'Nail Design',
          subtitle: '', location: '',
          cta: 'Agende seu horário!', style: 'feed',
        };
      }
      const res = await fetch('/api/image/enhance', { method: 'POST', headers: fetchHeaders, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) {
        if (data.upgrade) {
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              _id: assistantId, role: 'assistant',
              content: 'Essa função é exclusiva para assinantes **Pro** e **Premium**. Faça upgrade para desbloquear.',
              isUpgradeHint: true, timestamp: Date.now(),
            };
            return updated;
          });
          return;
        }
        throw new Error(data.error || 'Erro ao processar imagem');
      }
      const imageUrl = data.url || (data.b64 ? `data:image/png;base64,${data.b64}` : null);
      if (!imageUrl) throw new Error('Imagem não retornada');
      const successLabels = {
        enhance: 'Foto melhorada com sucesso. Aqui está o resultado:',
        'post-art': 'Arte do post criada. Aqui está:',
        recreate: 'Design recriado. Veja como ficou:',
      };
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          _id: assistantId, role: 'assistant',
          content: successLabels[action] || 'Imagem gerada.',
          generatedImage: imageUrl, timestamp: Date.now(),
        };
        return updated;
      });
      persistMessage({ role: 'assistant', content: `${successLabels[action]} [imagem gerada]`, generatedImage: imageUrl });
      if (userId) dbIncrementMessageCount(userId).catch(() => {});
      trackEvent('image_generated_chat', { action });
      const targetChatId = realChatIdRef.current;
      if (!titleSetRef.current && targetChatId) {
        titleSetRef.current = true;
        const tempTitle = displayText.slice(0, 40) + (displayText.length > 40 ? '…' : '');
        dbUpdateChatTitle(targetChatId, tempTitle).catch(() => {});
        onChatUpdated?.();
      }
    } catch (err) {
      setLastFailedMsg({ text: userText, imageBase64, mediaType: 'image/jpeg', imageDataUrl: null });
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          _id: assistantId, role: 'assistant',
          content: err.message || 'Erro ao gerar imagem. Tente novamente.',
          isError: true, timestamp: Date.now(),
        };
        return updated;
      });
    } finally {
      busyRef.current = false;
      setIsLoading(false);
      setIsStreaming(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  // ─── Send (streaming) ───────────────────────────────────────────
  const sendMessage = async (text, imageBase64 = null, mediaType = 'image/jpeg', imageDataUrl = null) => {
    if ((!text.trim() && !imageBase64)) return;
    if (busyRef.current) {
      if (Date.now() - (busyRef.since || 0) > 30000) busyRef.current = false;
      else return;
    }
    busyRef.current = true;
    busyRef.since = Date.now();
    setIsLoading(true);
    trackEvent('message_sent', { has_image: !!imageBase64 });
    if (imageBase64) {
      lastImageRef.current = { base64: imageBase64, mediaType, dataUrl: imageDataUrl, timestamp: Date.now() };
    }
    const imageIntent = detectImageIntent(text);
    const imageForGeneration = imageBase64 || (imageIntent && lastImageRef.current?.base64) || null;
    const imageDataUrlForGen = imageDataUrl || (imageIntent && lastImageRef.current?.dataUrl) || null;
    try {
      if (imageForGeneration && imageIntent) {
        const displayText = text || (imageIntent === 'enhance' ? 'Melhora essa foto' : imageIntent === 'post-art' ? 'Gera um post com essa foto' : 'Recria esse design');
        const newUserMsg = { _id: nextId(), role: 'user', content: displayText, imagePreview: imageDataUrlForGen || null, timestamp: Date.now() };
        setMessages((prev) => [...prev, newUserMsg]);
        persistMessage({ role: 'user', content: displayText, imagePreview: imageDataUrlForGen || null });
        setInput('');
        if (inputRef.current) inputRef.current.style.height = 'auto';
        await handleImageGeneration(imageForGeneration, imageIntent, text, displayText);
        return;
      }
      const userContent = imageBase64
        ? [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
            { type: 'text', text: text || 'Analisa essa unha seguindo o MÉTODO DE ANÁLISE OBRIGATÓRIO: primeiro descreva LITERALMENTE o que vê (cores, formas, se há sombras/volume ou não), depois identifique as técnicas baseando-se SOMENTE nas observações. Lembre: sem sombra = não é 3D, é pintura plana.' },
          ]
        : text;
      const userMessage = { role: 'user', content: userContent };
      const displayText = imageBase64 ? `${text || 'Foto enviada para análise'}` : text;
      userMsgCountRef.current++;
      const isGreeting = /^\s*(oi|ol[aá]|hey|hi|boa\s*(tarde|noite|dia)|e\s*a[ií]|tudo\s*bem|opa|eae)\s*[!?.\s]*$/i.test(text.trim());
      const shouldGenerateTitle = !titleSetRef.current && (userMsgCountRef.current >= 2 || !isGreeting);
      const newUserMsg = { _id: nextId(), role: 'user', content: displayText, imagePreview: imageDataUrl || null, timestamp: Date.now() };
      setMessages((prev) => [...prev, newUserMsg]);
      persistMessage({ role: 'user', content: displayText, imagePreview: imageDataUrl || null });
      setInput('');
      if (inputRef.current) inputRef.current.style.height = 'auto';
      setLastFailedMsg(null);
      const knowledgeContext = searchKnowledge(typeof userContent === 'string' ? userContent : text);
      const systemPrompt = buildSystemPrompt(user.name, user.level, knowledgeContext);
      const authToken = getAccessToken ? await getAccessToken().catch(() => null) : null;
      const currentMessages = messagesRef.current;
      const allMessages = [
        ...currentMessages.filter((m, idx) => m.role !== 'assistant' || idx !== 0),
        userMessage,
      ].map((m) => ({ role: m.role, content: m.content }));
      const apiMessages = allMessages.slice(-8);
      while (apiMessages.length > 0 && apiMessages[0].role !== 'user') apiMessages.shift();
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const fetchHeaders = { 'Content-Type': 'application/json' };
      if (authToken) fetchHeaders['Authorization'] = `Bearer ${authToken}`;
      const res = await fetch('/api/chat', {
        method: 'POST', headers: fetchHeaders,
        body: JSON.stringify({ messages: apiMessages, system: systemPrompt, stream: true }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (res.status === 401) {
          const errorMsg = { role: 'assistant', content: 'Sua sessão expirou. Você será redirecionada para o login…', isError: true, timestamp: Date.now() };
          setMessages(prev => [...prev, errorMsg]);
          setTimeout(() => onAuthExpired?.(), 2000);
          return;
        }
        if (res.status === 429 && errorData.quota) { setQuotaModal({ limit: errorData.quota.limit || 15 }); return; }
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
                const last = updated[updated.length - 1];
                updated[updated.length - 1] = { ...last, content: assistantText };
                return updated;
              });
            }
          } catch {}
        }
      }
      const finalContent = assistantText || 'Ops, não consegui processar. Tente novamente.';
      if (!assistantText) {
        setMessages((prev) => {
          const final = [...prev];
          final[final.length - 1] = { _id: assistantId, role: 'assistant', content: finalContent, timestamp: Date.now() };
          return final;
        });
      }
      persistMessage({ role: 'assistant', content: finalContent });
      if (userId) dbIncrementMessageCount(userId).catch(() => {});
      const targetChatId = realChatIdRef.current;
      if (shouldGenerateTitle && targetChatId) {
        titleSetRef.current = true;
        const tempTitle = displayText.slice(0, 40) + (displayText.length > 40 ? '…' : '');
        dbUpdateChatTitle(targetChatId, tempTitle).catch(() => {});
        onChatUpdated?.();
        const contextForTitle = `Usuária: ${displayText}\nAssistente: ${finalContent.slice(0, 300)}`;
        const authToken2 = getAccessToken ? await getAccessToken().catch(() => null) : null;
        fetch('/api/chat/title', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(authToken2 ? { 'Authorization': `Bearer ${authToken2}` } : {}) },
          body: JSON.stringify({ chatId: targetChatId, message: contextForTitle }),
        }).then(() => onChatUpdated?.()).catch(() => {});
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      setLastFailedMsg({ text, imageBase64, mediaType, imageDataUrl });
      const errContent = err.message || 'Eita, deu um erro aqui. Tenta enviar de novo.';
      setMessages((prev) => [...prev, { _id: nextId(), role: 'assistant', content: errContent, isError: true, timestamp: Date.now() }]);
      persistMessage({ role: 'assistant', content: errContent, isError: true });
    } finally {
      busyRef.current = false;
      setIsLoading(false);
      setIsStreaming(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleSaveFavorite = useCallback(async (content) => {
    await dbSaveFavorite(userId, { type: 'chat', content });
    onFavoritesChanged?.();
  }, [userId, onFavoritesChanged]);

  const handleRetry = () => {
    if (!lastFailedMsg) return;
    setMessages((prev) => prev.filter((m) => !m.isError));
    if (chatId) dbDeleteErrorMessages(chatId);
    const { text, imageBase64, mediaType, imageDataUrl } = lastFailedMsg;
    setLastFailedMsg(null);
    sendMessage(text, imageBase64, mediaType, imageDataUrl);
  };

  // ─── File upload + compression ─────────────────────────────────
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };
  const compressImage = (file, maxSizeMB = 4.5, maxDim = 2048) => new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio); height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      let quality = 0.85;
      const tryCompress = () => {
        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error('Falha ao comprimir imagem'));
          if (blob.size > maxSizeMB * 1024 * 1024 && quality > 0.3) { quality -= 0.15; tryCompress(); }
          else if (blob.size > maxSizeMB * 1024 * 1024) reject(new Error('Não foi possível comprimir a imagem o suficiente'));
          else resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
        }, 'image/jpeg', quality);
      };
      tryCompress();
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Erro ao carregar imagem')); };
    img.src = url;
  });
  const processFile = async (file) => {
    if (file.size > 20 * 1024 * 1024) { alert('Arquivo muito grande. Máximo 20MB.'); return; }
    const isHeic = file.type === 'image/heic' || file.type === 'image/heif' || /\.(heic|heif)$/i.test(file.name);
    let fileToProcess = file;
    if (isHeic) {
      try {
        const heic2any = (await import('heic2any')).default;
        const blob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 });
        fileToProcess = new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), { type: 'image/jpeg' });
      } catch {
        alert('Não foi possível converter a foto HEIF. Desative "Fotos de alta eficiência" nas configurações da câmera e tente novamente.');
        return;
      }
    }
    if (!fileToProcess.type.startsWith('image/') && !isHeic) { alert('Envie apenas imagens (JPG, PNG, WebP, GIF, HEIC…).'); return; }
    if (fileToProcess.size > 4.5 * 1024 * 1024) {
      try { fileToProcess = await compressImage(fileToProcess); }
      catch { alert('Não foi possível comprimir a imagem. Tente uma foto menor.'); return; }
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const base64 = dataUrl.split(',')[1];
      const mediaType = fileToProcess.type || 'image/jpeg';
      setPendingFile({ base64, mediaType, dataUrl, name: file.name });
      inputRef.current?.focus();
    };
    reader.readAsDataURL(fileToProcess);
  };

  const handleRemovePendingFile = () => setPendingFile(null);
  const handleSubmitWithFile = (e) => {
    e.preventDefault();
    if (pendingFile) {
      sendMessage(input || '', pendingFile.base64, pendingFile.mediaType, pendingFile.dataUrl);
      setPendingFile(null);
    } else { sendMessage(input); }
  };
  const handleDragEnter = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); if (e.currentTarget === chatAreaRef.current) setIsDragging(false); };
  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); const f = e.dataTransfer?.files?.[0]; if (f) processFile(f); };

  // ─── Greeting helpers ──────────────────────────────────────────
  const hour = new Date().getHours();
  const firstName = (user?.name || '').split(' ')[0] || 'amiga';
  const greeting = hour >= 6 && hour < 12 ? `Bom dia, ${firstName}`
                  : hour >= 12 && hour < 18 ? `Boa tarde, ${firstName}`
                  : hour >= 18 && hour < 22 ? `Boa noite, ${firstName}`
                  : 'Conversa ao luar';
  const timeIcon = hour >= 18 || hour < 6 ? 'moon' : 'sun';

  const SUGGESTIONS = [
    { icon: 'image',      text: 'Analisar uma unha' },
    { icon: 'instagram',  text: 'Criar post pro Instagram' },
    { icon: 'calculator', text: 'Calcular meu preço' },
    { icon: 'sparkle',    text: 'Dica do dia' },
  ];

  return (
    <div
      ref={chatAreaRef}
      className={`flex flex-col flex-1 min-h-0 bg-surface relative ${isDragging ? 'ring-2 ring-accent ring-inset' : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Atmospheric backdrop */}
      <div className="absolute inset-0 pointer-events-none opacity-60" style={{
        background: 'radial-gradient(ellipse 60% 40% at 10% 0%, rgba(168,83,106,0.08) 0%, transparent 60%), radial-gradient(ellipse 70% 50% at 100% 100%, rgba(123,84,113,0.10) 0%, transparent 60%)'
      }} />

      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-accent/10 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div className="glass-card rounded-3xl px-8 py-7 text-center border-2 border-dashed border-accent">
            <Icon name="image" size={36} className="text-accent mx-auto mb-3" />
            <p className="font-display text-2xl text-text mb-1">Solte a imagem aqui</p>
            <p className="text-text-muted text-xs">Compressão automática · qualquer formato</p>
          </div>
        </div>
      )}

      {/* Messages OR Welcome */}
      <div className="flex-1 overflow-y-auto px-4 py-6 relative z-10">
        {messages.length === 0 && !isLoading && !isStreaming ? (
          /* ── Welcome Landing ── */
          <div className="flex flex-col items-center justify-center h-full animate-fade-in">
            <div className="max-w-lg w-full text-center px-4">
              {/* Brand mark with subtle glow */}
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 blur-2xl opacity-50 rounded-full" style={{ background: 'radial-gradient(circle, var(--color-accent), transparent 70%)' }} />
                <MaluarMark size={64} className="relative animate-scale-in" />
              </div>

              {/* Kicker */}
              <div className="flex items-center justify-center gap-2 mb-5">
                <Icon name={timeIcon} size={14} className="text-accent" />
                <span className="text-[11px] tracking-[0.32em] uppercase text-accent font-semibold">mentoria</span>
                <Icon name={timeIcon} size={14} className="text-accent" />
              </div>

              <h1 className="font-display text-4xl md:text-5xl tracking-tight text-text mb-3 leading-tight">
                {greeting}<span className="font-italic-display text-accent">.</span>
              </h1>
              <p className="text-base text-text-muted mb-10 max-w-md mx-auto leading-relaxed">
                Como posso te ajudar hoje? Conte tudo — técnica, preço, agenda, conteúdo, posicionamento.
              </p>

              {/* Suggestion pills */}
              <div className="flex flex-wrap justify-center gap-2 mb-3">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.text}
                    onClick={() => sendMessage(s.text)}
                    className="group flex items-center gap-2 px-4 py-2.5 rounded-full border border-border-light bg-white/70 dark:bg-white/[0.03] text-[13px] text-text hover:border-accent/40 hover:bg-accent-bg hover:text-accent transition-all backdrop-blur-sm"
                  >
                    <Icon name={s.icon} size={14} className="text-accent" />
                    <span>{s.text}</span>
                  </button>
                ))}
              </div>

              <p className="text-[11px] text-text-light mt-6 font-italic-display italic">
                ou simplesmente comece a digitar
              </p>
            </div>
          </div>
        ) : (
          /* ── Chat Messages ── */
          <div className="max-w-2xl mx-auto space-y-1">
            {messages.map((msg, i) => (
              <Message
                key={msg._id || `m-${i}`}
                role={msg.role} content={msg.content}
                imagePreview={msg.imagePreview} generatedImage={msg.generatedImage}
                isImageLoading={msg.isImageLoading} isUpgradeHint={msg.isUpgradeHint}
                timestamp={msg.timestamp} isError={msg.isError}
                onRetry={msg.isError ? handleRetry : undefined}
                onSaveFavorite={msg.role === 'assistant' && !msg.isError ? handleSaveFavorite : undefined}
                onUpgrade={onUpgrade}
              />
            ))}
            {isLoading && <Message isTyping />}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="relative z-10 px-4 pb-4 pt-2">
        <form onSubmit={handleSubmitWithFile} className="max-w-2xl mx-auto">
          {/* Pending file preview */}
          {pendingFile && (
            <div className="mb-2 flex items-center gap-3 glass-soft rounded-2xl px-3 py-2.5 animate-fade-in">
              <img src={pendingFile.dataUrl} alt="Preview" className="w-14 h-14 object-cover rounded-xl border border-border-light" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-text truncate">{pendingFile.name}</p>
                <p className="text-[11px] text-text-muted">Pronto pra enviar — escreva algo (opcional) e envie</p>
              </div>
              <button type="button" onClick={handleRemovePendingFile}
                className="shrink-0 w-7 h-7 rounded-full bg-surface-alt flex items-center justify-center text-text-light hover:text-accent hover:bg-accent-bg transition-colors"
                aria-label="Remover arquivo">
                <Icon name="close" size={14} />
              </button>
            </div>
          )}

          <div className="glass-card rounded-3xl p-2 focus-within:ring-2 focus-within:ring-accent/25 transition-all">
            <div className="flex items-end gap-1.5">
              <label htmlFor="chat-file-input"
                className="shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center text-text-muted hover:text-accent hover:bg-accent-bg transition-colors cursor-pointer"
                title="Enviar foto" aria-label="Enviar foto">
                <Icon name="image" size={18} />
              </label>
              <input id="chat-file-input" ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="sr-only" />

              <button type="button" onClick={toggleVoiceInput}
                className={`shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                  isListening
                    ? 'bg-accent text-white animate-pulse shadow-glow'
                    : 'text-text-muted hover:text-accent hover:bg-accent-bg'
                }`}
                title={isListening ? 'Parar gravação' : 'Falar com a Maluar'}
                aria-label={isListening ? 'Parar gravação' : 'Enviar mensagem por voz'}>
                <Icon name={isListening ? 'close' : 'feather'} size={isListening ? 16 : 18} />
              </button>

              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (input.trim() || pendingFile) handleSubmitWithFile(e);
                  }
                }}
                placeholder={pendingFile ? 'Escreva algo sobre a foto (opcional)…' : 'Converse com a Maluar — técnica, preço, conteúdo…'}
                className="flex-1 bg-transparent px-2 py-2.5 text-text placeholder-text-light focus:outline-none text-[15px] resize-none overflow-hidden"
                style={{ minHeight: '40px', maxHeight: '160px' }}
                disabled={isLoading}
                maxLength={2000}
                rows={1}
              />

              <button type="submit"
                disabled={(!input.trim() && !pendingFile) || isLoading}
                className="shrink-0 w-10 h-10 rounded-2xl btn-gradient flex items-center justify-center disabled:opacity-25 disabled:cursor-not-allowed disabled:shadow-none"
                aria-label="Enviar mensagem">
                <Icon name="send" size={16} />
              </button>
            </div>
          </div>

          <div className="mt-2.5 flex items-center justify-between text-[11px] text-text-light px-2">
            <span>A Maluar pode cometer erros. Revise informações importantes.</span>
            <span className="hidden md:flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" /> conectada
            </span>
          </div>
        </form>
      </div>

      {/* Quota modal */}
      {quotaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
          <div className="glass-card rounded-3xl max-w-sm w-full p-7 text-center space-y-5 animate-scale-in">
            <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center ai-avatar text-white">
              <Icon name="lock" size={22} />
            </div>
            <div>
              <h3 className="font-display text-2xl text-text mb-1">Limite diário</h3>
              <p className="text-sm text-text-muted leading-relaxed">
                Você usou suas <strong className="text-text">{quotaModal.limit} mensagens</strong> de hoje.
              </p>
            </div>
            <div className="bg-accent-bg border border-accent-light rounded-2xl px-4 py-3">
              <p className="text-[11px] tracking-[0.18em] uppercase text-text-muted font-semibold">Resetam</p>
              <p className="font-display text-lg text-accent mt-1">Amanhã à meia-noite</p>
            </div>
            {!quotaModal.isGuest && (
              <div className="space-y-2">
                <p className="text-xs text-text-light">Quer mais mensagens?</p>
                <button onClick={() => { setQuotaModal(null); onUpgrade?.(); }}
                  className="w-full py-3 rounded-2xl btn-gradient flex items-center justify-center gap-2 text-sm">
                  <Icon name="diamond" size={15} /> Ver planos
                </button>
              </div>
            )}
            <button onClick={() => setQuotaModal(null)}
              className="w-full py-2.5 rounded-2xl btn-ghost text-sm font-medium">
              Entendi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
