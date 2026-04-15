'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Message from './Message';
import { searchKnowledge } from '../lib/knowledge-base';
import { buildSystemPrompt } from '../lib/system-prompt';
import { dbSaveMessage, dbUpdateChatTitle, dbSaveFavorite, dbDeleteErrorMessages, dbIncrementMessageCount, dbCreateChat } from '../lib/db';
import { trackEvent } from './PostHogProvider';

export default function ChatWindow({ user, userId, userEmail, pendingPrompt, onPromptConsumed, chatId, initialMessages, onChatUpdated, onChatCreated, onFavoritesChanged, onOpenSidebar, getAccessToken, onAuthExpired, onUpgrade }) {
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
  const userMsgCountRef = useRef(0); // conta msgs do user pra gerar título na 2ª
  const chatIdRef = useRef(null);
  const msgIdRef = useRef(0);
  const messagesRef = useRef(messages);
  const abortRef = useRef(null);
  const busyRef = useRef(false); // ref real pra saber se está ocupado (evita stale closure)
  const realChatIdRef = useRef(null); // ID real do chat no banco (criado na 1ª msg)
  const nextId = () => ++msgIdRef.current;

  // Manter ref sincronizado com state
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Cleanup: abortar streaming e parar reconhecimento de voz ao desmontar
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      recognitionRef.current?.abort();
    };
  }, []);

  // Voice input (STT) via Web Speech API
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
        if (event.results[i].isFinal) { finalTranscript += t; } else { interim = t; }
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

  // Set welcome message only for brand new chats (no initialMessages)
  useEffect(() => {
    // Only reset messages when chatId actually changes
    if (chatIdRef.current === chatId && messages.length > 1) return;
    chatIdRef.current = chatId;

    // CRITICAL: abortar request em andamento e resetar estado de loading
    abortRef.current?.abort();
    busyRef.current = false;
    setIsLoading(false);
    setIsStreaming(false);
    setInput('');
    setLastFailedMsg(null);
    msgIdRef.current = 0; // Resetar IDs ao trocar de conversa
    // Resetar referência do chat real — se chatId é um ID persistido, usar direto
    realChatIdRef.current = (chatId && !chatId.startsWith('new-') && !chatId.startsWith('local-')) ? chatId : null;

    if (initialMessages && initialMessages.length > 0) {
      setMessages(initialMessages);
      titleSetRef.current = true;
      return;
    }
    titleSetRef.current = false;
    userMsgCountRef.current = 0;
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
    const firstName = (user.name || '').split(' ')[0] || 'amiga';
    const welcome = {
      role: 'assistant',
      content: `${greeting}, ${firstName}! 💅 Como posso te ajudar hoje?`,
    };
    setMessages([welcome]);
  }, [chatId, initialMessages]);

  // Handle pendingPrompt — DEVE vir DEPOIS do chatId effect
  const processedPromptRef = useRef(null);
  useEffect(() => {
    if (!pendingPrompt) return;
    if (pendingPrompt === processedPromptRef.current) return;
    processedPromptRef.current = pendingPrompt;
    const text = typeof pendingPrompt === 'string' ? pendingPrompt : pendingPrompt.text;
    if (!text) return;

    const timer = setTimeout(() => {
      sendMessage(text);
      onPromptConsumed?.();
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPrompt]);

  // Persist messages to Supabase — cria chat no banco na primeira mensagem real
  const persistMessage = useCallback(
    async (msg) => {
      // Se chatId é temporário (new-* ou local-*), criar chat real primeiro
      if (!realChatIdRef.current) {
        if (chatId?.startsWith('new-') && userId) {
          try {
            const chat = await dbCreateChat(userId);
            if (chat) {
              realChatIdRef.current = chat.id;
              onChatCreated?.(chat);
            }
          } catch {}
        } else if (chatId && !chatId.startsWith('local-') && !chatId.startsWith('new-')) {
          realChatIdRef.current = chatId;
        }
      }
      const targetChatId = realChatIdRef.current;
      if (targetChatId) {
        try {
          await dbSaveMessage(targetChatId, msg);
          onChatUpdated?.();
        } catch {}
      }
    },
    [chatId, userId, onChatUpdated, onChatCreated]
  );

  // ── Detecção de intenção quando usuária envia foto ──
  const IMAGE_INTENT_PATTERNS = {
    enhance: /\b(melhora|melhore|melhorar|enhance|aprimora|aprimorar|qualidade|mais bonita|mais n[ií]tida|ilumina|profissional)\b/i,
    'post-art': /\b(post|arte|stories|story|propaganda|divulga[çr]|feed|instagram|insta|rede social|social media|marketing)\b/i,
    recreate: /\b(gera|gerar|cria|criar|recria|recriar|recrie|faz|fazer|fa[çz]a|transforma|transformar|inspira|inspirar|como seria|cri[ae] uma?|gera uma?|faz uma?|baseada?|nova imagem|outra vers[aã]o)\b/i,
  };

  function detectImageIntent(text) {
    if (!text || !text.trim()) return null;
    const t = text.toLowerCase();
    // Prioridade: enhance > post-art > recreate
    if (IMAGE_INTENT_PATTERNS.enhance.test(t)) return 'enhance';
    if (IMAGE_INTENT_PATTERNS['post-art'].test(t)) return 'post-art';
    if (IMAGE_INTENT_PATTERNS.recreate.test(t)) return 'recreate';
    return null;
  }

  // ── Handler para geração/edição de imagem via chat ──
  const handleImageGeneration = async (imageBase64, action, userText, displayText) => {
    const assistantId = nextId();
    const loadingLabels = {
      enhance: '✨ Melhorando sua foto com IA...',
      'post-art': '🎨 Criando arte para seu post...',
      recreate: '💅 Recriando esse design com IA...',
    };

    setMessages((prev) => [...prev, { _id: assistantId, role: 'assistant', content: loadingLabels[action] || '🎨 Gerando imagem...', isImageLoading: true, timestamp: Date.now() }]);

    try {
      const authToken = getAccessToken ? await getAccessToken().catch(() => null) : null;
      const fetchHeaders = { 'Content-Type': 'application/json' };
      if (authToken) fetchHeaders['Authorization'] = `Bearer ${authToken}`;

      const body = { action, imageBase64 };
      if (action === 'recreate') body.description = userText || '';
      if (action === 'post-art') {
        body.postData = {
          title: userText || 'Nail Design',
          subtitle: '',
          location: '',
          cta: 'Agende seu horário!',
          style: 'feed',
        };
      }

      const res = await fetch('/api/image/enhance', {
        method: 'POST',
        headers: fetchHeaders,
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.upgrade) {
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              _id: assistantId, role: 'assistant',
              content: '🔒 Essa função é exclusiva para assinantes **Pro** e **Premium**. Faça upgrade para desbloquear!',
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
        enhance: '✨ Foto melhorada com sucesso! Aqui está o resultado:',
        'post-art': '🎨 Arte do post criada! Aqui está:',
        recreate: '💅 Design recriado! Veja como ficou:',
      };

      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          _id: assistantId, role: 'assistant',
          content: successLabels[action] || 'Imagem gerada!',
          generatedImage: imageUrl,
          timestamp: Date.now(),
        };
        return updated;
      });
      persistMessage({ role: 'assistant', content: `${successLabels[action]} [imagem gerada]`, generatedImage: imageUrl });
      if (userId) dbIncrementMessageCount(userId).catch(() => {});
      trackEvent('image_generated_chat', { action });

      // Gerar título se necessário
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
          content: err.message || 'Erro ao gerar imagem. Tente novamente!',
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

  const sendMessage = async (text, imageBase64 = null, mediaType = 'image/jpeg', imageDataUrl = null) => {
    if ((!text.trim() && !imageBase64)) return;
    // Usar REF pra checar estado real (evita stale closure do useEffect)
    // Safety: se ficou travado por mais de 30s, desbloqueia
    if (busyRef.current) {
      if (Date.now() - (busyRef.since || 0) > 30000) {
        busyRef.current = false;
      } else {
        return;
      }
    }
    busyRef.current = true;
    busyRef.since = Date.now();
    setIsLoading(true);
    trackEvent('message_sent', { has_image: !!imageBase64 });

    // ── Detectar intenção de gerar/editar imagem quando usuária envia foto ──
    const imageIntent = imageBase64 ? detectImageIntent(text) : null;

    try {
      // Se é um pedido de geração/edição de imagem, usar fluxo especial
      if (imageBase64 && imageIntent) {
        const displayText = text || (imageIntent === 'enhance' ? 'Melhora essa foto' : imageIntent === 'post-art' ? 'Gera um post com essa foto' : 'Recria esse design');
        const newUserMsg = { _id: nextId(), role: 'user', content: displayText, imagePreview: imageDataUrl || null, timestamp: Date.now() };
        setMessages((prev) => [...prev, newUserMsg]);
        persistMessage({ role: 'user', content: displayText, imagePreview: imageDataUrl || null });
        setInput('');
        if (inputRef.current) inputRef.current.style.height = 'auto';

        await handleImageGeneration(imageBase64, imageIntent, text, displayText);
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

      // Contar mensagens do user — título será gerado quando tiver assunto real
      userMsgCountRef.current++;
      const isGreeting = /^\s*(oi|ol[aá]|hey|hi|boa\s*(tarde|noite|dia)|e\s*a[ií]|tudo\s*bem|opa|eae)\s*[!?.\s]*$/i.test(text.trim());
      // Gerar título: na 2ª msg do user OU na 1ª se NÃO for saudação
      const shouldGenerateTitle = !titleSetRef.current && (userMsgCountRef.current >= 2 || !isGreeting);

      const newUserMsg = { _id: nextId(), role: 'user', content: displayText, imagePreview: imageDataUrl || null, timestamp: Date.now() };
      setMessages((prev) => [...prev, newUserMsg]);
      persistMessage({ role: 'user', content: displayText, imagePreview: imageDataUrl || null });
      setInput('');
      if (inputRef.current) inputRef.current.style.height = 'auto';
      setLastFailedMsg(null);

      // Preparar tudo em paralelo (quota, auth, knowledge) para reduzir latência
      const knowledgeContext = searchKnowledge(typeof userContent === 'string' ? userContent : text);
      const systemPrompt = buildSystemPrompt(user.name, user.level, knowledgeContext);

      // Auth token (quota verificada no backend — sem query duplicada)
      const authToken = getAccessToken ? await getAccessToken().catch(() => null) : null;

      const currentMessages = messagesRef.current;
      const allMessages = [
        ...currentMessages.filter((m, idx) => m.role !== 'assistant' || idx !== 0),
        userMessage,
      ].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Enviar apenas últimas 8 mensagens para manter respostas focadas e concisas
      const apiMessages = allMessages.slice(-8);
      while (apiMessages.length > 0 && apiMessages[0].role !== 'user') {
        apiMessages.shift();
      }

      // Cancelar streaming anterior se existir
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const fetchHeaders = { 'Content-Type': 'application/json' };
      if (authToken) fetchHeaders['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: fetchHeaders,
        body: JSON.stringify({
          messages: apiMessages,
          system: systemPrompt,
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        // Se 401, a sessão expirou — informar e forçar re-login
        if (res.status === 401) {
          const errorMsg = {
            role: 'assistant',
            content: '⚠️ Sua sessão expirou. Você será redirecionado para o login...',
            isError: true,
            timestamp: Date.now(),
          };
          setMessages(prev => [...prev, errorMsg]);
          setTimeout(() => onAuthExpired?.(), 2000);
          return;
        }
        // Se 429, quota excedida no server — mostrar modal
        if (res.status === 429 && errorData.quota) {
          setQuotaModal({ limit: errorData.quota.limit || 15 });
          return;
        }
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

      // Persist final assistant message to DB
      const finalContent = assistantText || 'Ops, não consegui processar. Tenta de novo!';
      if (!assistantText) {
        setMessages((prev) => {
          const final = [...prev];
          final[final.length - 1] = { _id: assistantId, role: 'assistant', content: finalContent, timestamp: Date.now() };
          return final;
        });
      }
      persistMessage({ role: 'assistant', content: finalContent });
      if (userId) dbIncrementMessageCount(userId).catch(() => {});

      // Gerar título com IA (async, não bloqueia UX) — usa realChatIdRef
      const targetChatId = realChatIdRef.current;
      if (shouldGenerateTitle && targetChatId) {
        titleSetRef.current = true;
        const tempTitle = displayText.slice(0, 40) + (displayText.length > 40 ? '…' : '');
        dbUpdateChatTitle(targetChatId, tempTitle).catch(() => {});
        onChatUpdated?.();
        // Enviar contexto da conversa (pergunta + resposta) para título mais preciso
        const contextForTitle = `Usuária: ${displayText}\nAssistente: ${finalContent.slice(0, 300)}`;
        const authToken = getAccessToken ? await getAccessToken().catch(() => null) : null;
        fetch('/api/chat/title', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({ chatId: targetChatId, message: contextForTitle }),
        })
          .then(() => onChatUpdated?.())
          .catch(() => {}); // fallback silencioso — título temporário permanece
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      setLastFailedMsg({ text, imageBase64, mediaType, imageDataUrl });
      const errContent = err.message || 'Eita, deu um erro aqui. Tenta mandar de novo! 💅';
      setMessages((prev) => [
        ...prev,
        { _id: nextId(), role: 'assistant', content: errContent, isError: true, timestamp: Date.now() },
      ]);
      persistMessage({ role: 'assistant', content: errContent, isError: true });
    } finally {
      // SEMPRE resetar — nunca fica preso
      busyRef.current = false;
      setIsLoading(false);
      setIsStreaming(false);
      // Auto-focus no input para manter o fluxo de conversa
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleSaveFavorite = useCallback(async (content) => {
    await dbSaveFavorite(userId, { type: 'chat', content });
    onFavoritesChanged?.();
  }, [userId, onFavoritesChanged]);

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

  // Comprime imagem via Canvas para caber no limite de 5MB
  const compressImage = (file, maxSizeMB = 4.5, maxDim = 2048) => {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width, height } = img;
        // Redimensionar se exceder dimensão máxima
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        // Tentar diferentes qualidades até caber no limite
        let quality = 0.85;
        const tryCompress = () => {
          canvas.toBlob(
            (blob) => {
              if (!blob) return reject(new Error('Falha ao comprimir imagem'));
              if (blob.size > maxSizeMB * 1024 * 1024 && quality > 0.3) {
                quality -= 0.15;
                tryCompress();
              } else if (blob.size > maxSizeMB * 1024 * 1024) {
                reject(new Error('Não foi possível comprimir a imagem o suficiente'));
              } else {
                resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
              }
            },
            'image/jpeg',
            quality
          );
        };
        tryCompress();
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Erro ao carregar imagem'));
      };
      img.src = url;
    });
  };

  const processFile = async (file) => {
    // Rejeitar arquivos absurdamente grandes (>20MB) logo de cara
    if (file.size > 20 * 1024 * 1024) {
      alert('Arquivo muito grande! Máximo 20MB.');
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
      alert('Envie apenas imagens (JPG, PNG, WebP, GIF, HEIC...).');
      return;
    }

    // Comprimir automaticamente se a imagem for maior que 4.5MB
    if (fileToProcess.size > 4.5 * 1024 * 1024) {
      try {
        fileToProcess = await compressImage(fileToProcess);
      } catch (err) {
        console.error('[Maluar] Image compression failed:', err);
        alert('Não foi possível comprimir a imagem. Tente uma foto menor.');
        return;
      }
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
      className={`flex flex-col flex-1 min-h-0 bg-surface relative ${isDragging ? 'ring-2 ring-accent ring-inset' : ''}`}
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
            <p className="text-text-light text-xs mt-1">Qualquer formato de imagem (compressão automática)</p>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 relative">
        {/* Floating sidebar button removed — mobile uses tab bar + header menu */}
        <div className="max-w-2xl mx-auto space-y-1">
          {messages.map((msg, i) => (
            <Message key={msg._id || `m-${i}`} role={msg.role} content={msg.content} imagePreview={msg.imagePreview} generatedImage={msg.generatedImage} isImageLoading={msg.isImageLoading} isUpgradeHint={msg.isUpgradeHint} timestamp={msg.timestamp} isError={msg.isError} onRetry={msg.isError ? handleRetry : undefined} onSaveFavorite={msg.role === 'assistant' && !msg.isError ? handleSaveFavorite : undefined} onUpgrade={onUpgrade} />
          ))}
          {isLoading && <Message isTyping />}
          <div ref={messagesEndRef} />
        </div>
      </div>

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
          <div className="flex gap-2 items-end bg-surface border border-border rounded-2xl px-3 py-1.5 shadow-soft focus-within:ring-2 focus-within:ring-accent/20 focus-within:border-accent transition-all">
            <label
              htmlFor="chat-file-input"
              className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-text-light hover:text-accent hover:bg-accent-bg transition-colors cursor-pointer"
              title="Enviar foto"
              aria-label="Enviar foto da galeria"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </label>
            <input
              id="chat-file-input"
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="sr-only"
            />
            <button
              type="button"
              onClick={toggleVoiceInput}
              className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                isListening
                  ? 'bg-rose-100 text-rose-500 animate-pulse'
                  : 'text-text-light hover:text-accent hover:bg-accent-bg'
              }`}
              title={isListening ? 'Parar gravação' : 'Falar com a Maluar'}
              aria-label={isListening ? 'Parar gravação de voz' : 'Enviar mensagem por voz'}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isListening ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4M12 15a3 3 0 003-3V5a3 3 0 00-6 0v7a3 3 0 003 3z" />
                )}
              </svg>
            </button>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                // Auto-resize: ajustar altura ao conteúdo
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
              }}
              onKeyDown={(e) => {
                // Enter envia, Shift+Enter quebra linha
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (input.trim() || pendingFile) {
                    handleSubmitWithFile(e);
                  }
                }
              }}
              placeholder={pendingFile ? 'Escreva algo sobre a foto (opcional)...' : 'Pergunta qualquer coisa...'}
              className="flex-1 bg-transparent py-2.5 text-text placeholder-text-light focus:outline-none text-sm resize-none overflow-hidden"
              style={{ minHeight: '40px', maxHeight: '150px' }}
              disabled={isLoading}
              maxLength={2000}
              rows={1}
            />
            <button
              type="submit"
              disabled={(!input.trim() && !pendingFile) || isLoading}
              className="shrink-0 w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white hover:bg-accent-hover transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
              aria-label="Enviar mensagem"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </form>
        <p className="text-[10px] text-text-light text-center pb-2 -mt-1">
          A Maluar pode cometer erros. Revise informações importantes.
        </p>
      </div>

      {/* Modal de quota excedida */}
      {quotaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-surface-card rounded-2xl shadow-elevated max-w-sm w-full p-6 text-center space-y-4 animate-fade-in">
            <div className="text-4xl">⚠️</div>
            <h3 className="font-display text-lg font-bold text-text">
              Limite diário atingido
            </h3>
            <p className="text-sm text-text-muted leading-relaxed">
              Você usou todas as suas <strong className="text-text">{quotaModal.limit} mensagens</strong> de hoje.
            </p>
            <div className="bg-accent-bg rounded-xl px-4 py-3">
              <p className="text-xs text-text-muted">Suas mensagens serão resetadas</p>
              <p className="text-base font-bold text-accent mt-0.5">Amanhã à meia-noite (00:00)</p>
            </div>
            {!quotaModal.isGuest && (
              <div className="space-y-2">
                <p className="text-xs text-text-light">
                  Quer mais mensagens? Faça upgrade do seu plano!
                </p>
                <button
                  onClick={() => { setQuotaModal(null); onUpgrade?.(); }}
                  className="w-full py-2.5 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent-hover transition-colors shadow-soft"
                >
                  💎 Ver planos
                </button>
              </div>
            )}
            <button
              onClick={() => setQuotaModal(null)}
              className="w-full py-2.5 rounded-xl border border-border text-text-muted font-medium text-sm hover:bg-surface-alt transition-colors"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
