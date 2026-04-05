'use client';

import { useState } from 'react';
import { useToast } from './Toast';
import { UpgradeInlineBadge } from './UpgradePrompt';

const WHATSAPP_TEMPLATES = [
  {
    id: 'confirmacao',
    icon: '✅',
    label: 'Confirmação de Agendamento',
    template: `Oi [nome]! 😊

Confirmando seu horário:
📅 [dia]
⏰ [hora]
💰 Valor: R$ [valor]

Peço sinal de R$ [sinal] via PIX pra garantir.
Chave: [sua chave PIX]

Qualquer coisa me avisa com 24h de antecedência.
Te espero! 💅`,
  },
  {
    id: 'pos-atendimento',
    icon: '💕',
    label: 'Pós-Atendimento',
    template: `Oi [nome]! 💕

Amei fazer suas unhas hoje! Se puder me mandar uma fotinho depois de uns dias, adoro ver como ficou no dia a dia.

E se curtiu, me indica pras amigas! 😊
Muito obrigada pela confiança! 💅`,
  },
  {
    id: 'promocao',
    icon: '🔥',
    label: 'Promoção Relâmpago',
    template: `Oi amores! 🔥

Essa semana tenho [X] horários disponíveis com condição especial:
✨ [descreva a promoção]

Válido até [data].
Corre pra garantir! Agenda abrindo agora.

Manda mensagem pra reservar! 💅`,
  },
  {
    id: 'reativacao',
    icon: '💜',
    label: 'Reativar Clienta Sumida',
    template: `Oi [nome]! Quanto tempo! 💜

Tô com umas técnicas novas lindas aqui, acho que você ia amar!

Tenho um horário [dia] às [hora], bora colocar essas unhas em dia? 💅

Senti sua falta! 😊`,
  },
  {
    id: 'aniversario',
    icon: '🎂',
    label: 'Aniversário da Clienta',
    template: `Parabéns [nome]! 🎂🎉

Desejo tudo de mais lindo pra você!

Tenho um presente especial: [X]% de desconto no seu próximo atendimento, válido por 15 dias.

Bora comemorar com unhas novas? 💅✨`,
  },
  {
    id: 'lembrete',
    icon: '⏰',
    label: 'Lembrete (2 dias antes)',
    template: `Oi [nome]! 😊

Lembrando do seu horário:
📅 [dia] às [hora]

Confirma pra mim? 💅
Se precisar remarcar, me avisa com antecedência!`,
  },
  {
    id: 'avaliacao',
    icon: '⭐',
    label: 'Pedir Avaliação Google',
    template: `Oi [nome]! 😊

Que bom que curtiu o resultado! Fico muito feliz!

Posso te pedir um favor? Uma avaliação no Google me ajuda MUITO a alcançar mais pessoas. É rapidinho:

[link do Google Meu Negócio]

Obrigada demais! 💕`,
  },
];

const BUSINESS_ACTIONS = [
  {
    id: 'diagnostico',
    icon: '🔍',
    label: 'Diagnóstico do Meu Negócio',
    description: 'Descubra onde você está e o que fazer pra crescer',
    prompt: 'Quero fazer um diagnóstico do meu negócio de nail design. Me faz as perguntas certas pra entender minha situação e depois me dá um plano de ação personalizado de 4 semanas.',
  },
  {
    id: 'captacao',
    icon: '🎯',
    label: 'Plano de Captação 30 Dias',
    description: 'Consiga clientes reais em 4 semanas',
    prompt: 'Monta um plano completo de captação de clientes pra 30 dias. Quero ações práticas dia a dia: o que postar, onde divulgar, como abordar, parcerias. Tudo detalhado pra eu só seguir o passo a passo.',
  },
  {
    id: 'financeiro',
    icon: '💰',
    label: 'Organizar Minhas Finanças',
    description: 'Saiba quanto ganha de verdade e planeje',
    prompt: 'Me ajuda a organizar as finanças do meu negócio de nail design. Quero entender: como calcular meu custo real, como separar dinheiro pessoal de empresa, como definir meta de faturamento e controlar meu fluxo de caixa. Me dá um passo a passo prático.',
  },
  {
    id: 'rotina',
    icon: '⏰',
    label: 'Montar Minha Rotina',
    description: 'Organize trabalho + casa + filhos',
    prompt: 'Sou mãe e nail designer, preciso de ajuda pra montar uma rotina que funcione. Me ajuda a organizar: horários de atendimento, cuidar da casa e filhos, criar conteúdo pro Instagram, e ainda ter tempo pra descansar. Quero algo real e possível.',
  },
  {
    id: 'instagram',
    icon: '📱',
    label: 'Plano de Conteúdo Mensal',
    description: 'Calendário completo pro seu Instagram',
    prompt: 'Cria um calendário de conteúdo completo pro meu Instagram de nail design pro próximo mês. Quero: o que postar cada dia (feed, stories, reels), legendas prontas, horários ideais, e datas comemorativas. Tudo pronto pra eu só executar.',
  },
  {
    id: 'mei',
    icon: '📋',
    label: 'Como Formalizar (MEI)',
    description: 'Passo a passo pra abrir seu MEI',
    prompt: 'Me explica tudo sobre MEI pra nail designer: como abrir, quanto custa por mês, qual categoria, limite de faturamento, benefícios, e quando devo migrar pra ME. Quero um guia completo e prático.',
  },
  {
    id: 'subir-preco',
    icon: '📈',
    label: 'Subir Meu Preço',
    description: 'Estratégia pra cobrar mais sem perder clientes',
    prompt: 'Quero aumentar meus preços mas tenho medo de perder clientes. Me dá uma estratégia completa: como comunicar o aumento, quando fazer, quanto subir, como agregar mais valor pra justificar. Quero fazer isso de forma segura.',
  },
  {
    id: 'atelie',
    icon: '🏠',
    label: 'Montar Meu Ateliê',
    description: 'Checklist e custos pra seu espaço',
    prompt: 'Quero montar meu ateliê de nail design. Me dá: checklist completo do que preciso, estimativa de custos, dicas de organização e decoração, como fazer o espaço vender por si só. Posso começar em casa mesmo.',
  },
];

const MARKETING_TOOLS = [
  {
    id: 'calendario',
    icon: '📅',
    label: 'Calendário de Conteúdo Semanal',
    description: 'Plano completo de posts pro Instagram da semana',
    prompt: `Cria um calendário de conteúdo completo pro meu Instagram de nail design pra próxima semana (segunda a domingo). Pra cada dia me dê:

- Tipo de post (Feed, Reels, Stories, Carrossel)
- Tema/assunto específico
- Legenda PRONTA pra copiar (com emojis e CTA)
- Hashtags (10-15 relevantes)
- Melhor horário pra postar
- Dica de gravação/foto

Quero um mix de: resultados, dicas técnicas, bastidores, depoimentos, promoção, tendência e conteúdo pessoal. Tudo pensado pra engajar e atrair novas clientes.`,
  },
  {
    id: 'bio',
    icon: '✍️',
    label: 'Gerador de Bio Instagram',
    description: 'Bio otimizada que atrai clientes e converte',
    prompt: `Me ajuda a criar a bio perfeita pro meu Instagram de nail design. Quero 5 opções diferentes de bio, cada uma com:

- Nome formatado com emojis estratégicos
- Linha 1: O que eu faço (especialidade)
- Linha 2: Diferencial / proposta de valor
- Linha 3: Cidade + bairro
- Linha 4: CTA (agendar, WhatsApp, link)

Regras: máximo 150 caracteres total, usar emojis com estratégia, incluir palavras-chave que as clientes buscam, e ter um CTA claro. Me dá também dicas de foto de perfil e destaques dos stories.`,
  },
  {
    id: 'hashtags',
    icon: '#️⃣',
    label: 'Pacote de Hashtags',
    description: '5 pacotes de hashtags prontos pra cada tipo de post',
    prompt: `Cria 5 pacotes de hashtags pra eu usar no meu Instagram de nail design. Cada pacote deve ter 20-25 hashtags mix de alta, média e baixa competição:

1. PACOTE RESULTADO — pra posts de antes/depois e trabalhos finalizados
2. PACOTE DICA — pra posts educativos e técnicos
3. PACOTE BASTIDORES — pra mostrar processo e rotina
4. PACOTE PROMOÇÃO — pra ofertas e descontos
5. PACOTE TENDÊNCIA — pra nail art, cores da moda, inspiração

Pra cada pacote, separe em: hashtags grandes (>100k posts), médias (10k-100k) e pequenas (<10k). Todas prontas pra copiar e colar. Foque em hashtags brasileiras e em português.`,
  },
  {
    id: 'reels-roteiro',
    icon: '🎬',
    label: 'Roteiros de Reels',
    description: '5 roteiros de Reels que viralizam no nicho de nails',
    prompt: `Cria 5 roteiros de Reels prontos pra eu gravar pro meu Instagram de nail design. Cada roteiro deve ter:

- Título/hook (os 3 primeiros segundos que prendem atenção)
- Duração ideal (15s, 30s ou 60s)
- Passo a passo do que mostrar/falar
- Texto na tela (legendas/captions)
- Áudio sugerido (tipo: música trending, voz original, remix)
- Legenda do post pronta pra copiar
- Hashtags específicas

Quero roteiros pra: 1) Transformação/antes e depois, 2) "Day in my life" de nail designer, 3) Dica técnica rápida, 4) Trend adaptada pro nicho, 5) Depoimento/react de clienta. Foque em conteúdo que viraliza e atrai clientes.`,
  },
  {
    id: 'stories-strategy',
    icon: '📱',
    label: 'Estratégia de Stories',
    description: 'Sequência de stories pra engajar e vender',
    prompt: `Monta uma estratégia completa de Instagram Stories pra minha semana como nail designer. Quero:

SEGUNDA A SEXTA:
- Sequência matinal (3-5 stories pra abrir o dia)
- Stories durante atendimento (o que mostrar, como filmar)
- Sequência de fechamento (CTA pra agendamento)

SÁBADO:
- Sequência de bastidores + resultados da semana

DOMINGO:
- Stories pessoais + enquetes + caixinha de perguntas

Pra cada sequência, me dê: tipo (foto, vídeo, enquete, caixinha, quiz), texto/legenda, stickers recomendados, e objetivo (engajar, humanizar, vender). Me dê também dicas de destaques organizados.`,
  },
];

export default function BusinessHub({ onSendPrompt, plan = 'free', onUpgrade }) {
  const [activeSection, setActiveSection] = useState('actions');
  const [copiedTemplate, setCopiedTemplate] = useState(null);
  const toast = useToast();

  const isFree = plan === 'free';
  // Free: 2 primeiros templates e 2 primeiros planos de ação
  const FREE_TEMPLATES_LIMIT = 2;
  const FREE_ACTIONS_LIMIT = 2;

  const handleCopyTemplate = (template) => {
    navigator.clipboard.writeText(template.template);
    setCopiedTemplate(template.id);
    toast?.('Mensagem copiada! Cole no WhatsApp 💬');
    setTimeout(() => setCopiedTemplate(null), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-surface">
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-xl mx-auto space-y-5">
          {/* Header */}
          <div>
            <h2 className="font-display text-xl font-bold text-text">🚀 Meu Negócio</h2>
            <p className="text-text-muted text-sm mt-0.5">
              Ferramentas pra você escalar seu negócio de nail design
            </p>
          </div>

          {/* Section tabs */}
          <div className="flex bg-surface-alt rounded-lg p-0.5">
            <button
              onClick={() => setActiveSection('actions')}
              className={`flex-1 text-xs font-medium py-2 rounded-md transition-all ${
                activeSection === 'actions'
                  ? 'bg-surface-card text-text shadow-soft'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              🎯 Planos de Ação
            </button>
            <button
              onClick={() => setActiveSection('marketing')}
              className={`flex-1 text-xs font-medium py-2 rounded-md transition-all ${
                activeSection === 'marketing'
                  ? 'bg-surface-card text-text shadow-soft'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              📣 Marketing {isFree && '🔒'}
            </button>
            <button
              onClick={() => setActiveSection('whatsapp')}
              className={`flex-1 text-xs font-medium py-2 rounded-md transition-all ${
                activeSection === 'whatsapp'
                  ? 'bg-surface-card text-text shadow-soft'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              💬 WhatsApp
            </button>
          </div>

          {/* Plans of Action */}
          {activeSection === 'actions' && (
            <div className="space-y-2">
              <p className="text-[11px] text-text-light font-medium uppercase tracking-wide">
                Escolha o que precisa agora
              </p>
              {BUSINESS_ACTIONS.map((action, idx) => {
                const locked = isFree && idx >= FREE_ACTIONS_LIMIT;
                return (
                <button
                  key={action.id}
                  onClick={() => locked ? onUpgrade?.() : onSendPrompt(action.prompt)}
                  className={`w-full flex items-start gap-3 px-4 py-3.5 rounded-xl border border-border-light bg-surface-card hover:border-accent/30 hover:bg-accent-bg transition-all text-left group ${locked ? 'opacity-60' : ''}`}
                >
                  <span className="text-lg mt-0.5 shrink-0">{action.icon}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] font-semibold text-text block leading-tight group-hover:text-accent transition-colors">
                      {action.label}
                      {locked && <span className="ml-1.5 inline-flex"><UpgradeInlineBadge label="Pro" onUpgrade={onUpgrade} /></span>}
                    </span>
                    <span className="text-[11px] text-text-muted block mt-0.5">
                      {action.description}
                    </span>
                  </div>
                  {!locked && (
                  <svg className="w-4 h-4 text-text-light shrink-0 mt-1 group-hover:text-accent transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  )}
                </button>
                );
              })}
              {isFree && (
                <div className="rounded-xl border border-accent/20 bg-accent-bg p-4 text-center">
                  <p className="text-xs font-semibold text-text mb-1">Desbloqueie todos os {BUSINESS_ACTIONS.length} planos de ação</p>
                  <p className="text-[11px] text-text-muted mb-3">Faça upgrade pro plano Pro e tenha acesso completo</p>
                  <button onClick={onUpgrade} className="px-4 py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent-hover transition-colors">
                    Fazer upgrade 💅
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Marketing Tools (Pro+) */}
          {activeSection === 'marketing' && (
            isFree ? (
              <div className="space-y-4">
                <p className="text-[11px] text-text-light font-medium uppercase tracking-wide">
                  Ferramentas de Marketing — Exclusivo Pro
                </p>
                {MARKETING_TOOLS.map((tool) => (
                  <div
                    key={tool.id}
                    className="w-full flex items-start gap-3 px-4 py-3.5 rounded-xl border border-border-light bg-surface-card opacity-60"
                  >
                    <span className="text-lg mt-0.5 shrink-0">{tool.icon}</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-[13px] font-semibold text-text block leading-tight">
                        {tool.label}
                        <span className="ml-1.5 inline-flex"><UpgradeInlineBadge label="Pro" onUpgrade={onUpgrade} /></span>
                      </span>
                      <span className="text-[11px] text-text-muted block mt-0.5">
                        {tool.description}
                      </span>
                    </div>
                  </div>
                ))}
                <div className="rounded-xl border border-accent/20 bg-accent-bg p-4 text-center">
                  <p className="text-xs font-semibold text-text mb-1">Desbloqueie ferramentas de Marketing</p>
                  <p className="text-[11px] text-text-muted mb-3">Calendário de conteúdo, gerador de bio, pacotes de hashtags e mais</p>
                  <button onClick={onUpgrade} className="px-4 py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent-hover transition-colors">
                    Fazer upgrade 💅
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[11px] text-text-light font-medium uppercase tracking-wide">
                  Ferramentas de Marketing
                </p>
                {MARKETING_TOOLS.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => onSendPrompt(tool.prompt)}
                    className="w-full flex items-start gap-3 px-4 py-3.5 rounded-xl border border-border-light bg-surface-card hover:border-accent/30 hover:bg-accent-bg transition-all text-left group"
                  >
                    <span className="text-lg mt-0.5 shrink-0">{tool.icon}</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-[13px] font-semibold text-text block leading-tight group-hover:text-accent transition-colors">
                        {tool.label}
                      </span>
                      <span className="text-[11px] text-text-muted block mt-0.5">
                        {tool.description}
                      </span>
                    </div>
                    <svg className="w-4 h-4 text-text-light shrink-0 mt-1 group-hover:text-accent transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
            )
          )}

          {/* WhatsApp Templates */}
          {activeSection === 'whatsapp' && (
            <div className="space-y-3">
              <div>
                <p className="text-[11px] text-text-light font-medium uppercase tracking-wide">
                  Templates prontos — copie e cole no WhatsApp
                </p>
                <p className="text-[10px] text-text-light mt-0.5">
                  Substitua os campos entre [colchetes] pelos dados da clienta
                </p>
              </div>
              {WHATSAPP_TEMPLATES.map((tmpl, idx) => {
                const locked = isFree && idx >= FREE_TEMPLATES_LIMIT;
                return (
                <div
                  key={tmpl.id}
                  className={`rounded-xl border border-border-light bg-surface-card overflow-hidden ${locked ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border-light bg-surface-alt/50">
                    <span className="text-sm">{tmpl.icon}</span>
                    <span className="text-xs font-semibold text-text flex-1">{tmpl.label}</span>
                    {locked ? (
                      <UpgradeInlineBadge label="Pro" onUpgrade={onUpgrade} />
                    ) : (
                    <button
                      onClick={() => handleCopyTemplate(tmpl)}
                      className={`text-[10px] font-medium px-2.5 py-1 rounded-full transition-all ${
                        copiedTemplate === tmpl.id
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'bg-accent-bg text-accent hover:bg-accent-light'
                      }`}
                    >
                      {copiedTemplate === tmpl.id ? '✓ Copiado!' : 'Copiar'}
                    </button>
                    )}
                  </div>
                  {!locked && (
                  <pre className="px-4 py-3 text-xs text-text-muted whitespace-pre-wrap font-sans leading-relaxed">
                    {tmpl.template}
                  </pre>
                  )}
                  {locked && (
                    <div className="px-4 py-3 text-xs text-text-light italic">
                      Faça upgrade pra ver e copiar este template...
                    </div>
                  )}
                </div>
                );
              })}

              {/* WhatsApp Business Setup CTA */}
              <div className="rounded-xl border border-accent/20 bg-accent-bg p-4">
                <div className="flex items-start gap-3">
                  <span className="text-lg">💡</span>
                  <div>
                    <p className="text-xs font-semibold text-text">Dica: Configure o WhatsApp Business</p>
                    <p className="text-[11px] text-text-muted mt-1">
                      Foto profissional, bio com serviços + cidade, catálogo com fotos e preços, mensagem automática de boas-vindas e horário de funcionamento.
                    </p>
                    <button
                      onClick={() => onSendPrompt('Me ajuda a configurar meu WhatsApp Business completo: foto, bio, catálogo, mensagem automática, horário de funcionamento. Quero que fique profissional e atraia clientes.')}
                      className="mt-2 text-[11px] font-medium text-accent hover:underline"
                    >
                      Pedir ajuda pra configurar →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
