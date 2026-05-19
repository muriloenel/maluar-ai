'use client';

/*
  components/BusinessHub.jsx — Redesign "Soft Feminino"
  Toda a lógica preservada: WhatsApp templates, planos de ação,
  ferramentas de marketing, locks de plano (free × pro), copy-to-clipboard.

  Mudanças visuais:
    - Hero gradient card destacado (Diagnóstico em primeiro plano)
    - KPIs flutuantes ao lado
    - Pills de seção viraram tabs editoriais
    - Cards em grid 2-col com gradient icons
    - Sem emojis — icon set linha-fina + tag-pills
*/

import { useState } from 'react';
import { useToast } from './Toast';
import { UpgradeInlineBadge } from './UpgradePrompt';
import Icon from './Icon';

/* ─── Conteúdo (preservado, só sem emojis) ──────────────────────── */

const WHATSAPP_TEMPLATES = [
  {
    id: 'confirmacao',
    icon: 'check',
    label: 'Confirmação de Agendamento',
    template: `Oi [nome]!

Confirmando seu horário:
Dia: [dia]
Hora: [hora]
Valor: R$ [valor]

Peço sinal de R$ [sinal] via PIX pra garantir.
Chave: [sua chave PIX]

Qualquer coisa me avisa com 24h de antecedência.
Te espero!`,
  },
  {
    id: 'pos-atendimento',
    icon: 'heart',
    label: 'Pós-Atendimento',
    template: `Oi [nome]!

Amei fazer suas unhas hoje! Se puder me mandar uma fotinho depois de uns dias, adoro ver como ficou no dia a dia.

E se curtiu, me indica pras amigas!
Muito obrigada pela confiança.`,
  },
  {
    id: 'promocao',
    icon: 'sparkle',
    label: 'Promoção Relâmpago',
    template: `Oi amores!

Essa semana tenho [X] horários disponíveis com condição especial:
— [descreva a promoção]

Válido até [data].
Corre pra garantir! Agenda abrindo agora.

Manda mensagem pra reservar.`,
  },
  {
    id: 'reativacao',
    icon: 'feather',
    label: 'Reativar Clienta Sumida',
    template: `Oi [nome]! Quanto tempo!

Tô com umas técnicas novas lindas aqui, acho que você ia amar!

Tenho um horário [dia] às [hora], bora colocar essas unhas em dia?

Senti sua falta!`,
  },
  {
    id: 'aniversario',
    icon: 'star',
    label: 'Aniversário da Clienta',
    template: `Parabéns [nome]!

Desejo tudo de mais lindo pra você!

Tenho um presente especial: [X]% de desconto no seu próximo atendimento, válido por 15 dias.

Bora comemorar com unhas novas?`,
  },
  {
    id: 'lembrete',
    icon: 'bookmark',
    label: 'Lembrete (2 dias antes)',
    template: `Oi [nome]!

Lembrando do seu horário:
Dia [dia] às [hora]

Confirma pra mim?
Se precisar remarcar, me avisa com antecedência!`,
  },
  {
    id: 'avaliacao',
    icon: 'star',
    label: 'Pedir Avaliação Google',
    template: `Oi [nome]!

Que bom que curtiu o resultado! Fico muito feliz.

Posso te pedir um favor? Uma avaliação no Google me ajuda MUITO a alcançar mais pessoas. É rapidinho:

[link do Google Meu Negócio]

Obrigada demais!`,
  },
];

const BUSINESS_ACTIONS = [
  {
    id: 'diagnostico',
    icon: 'search',
    label: 'Diagnóstico do Meu Negócio',
    description: 'Descubra onde você está e o que fazer pra crescer.',
    prompt: 'Quero fazer um diagnóstico do meu negócio de nail design. Me faz as perguntas certas pra entender minha situação e depois me dá um plano de ação personalizado de 4 semanas.',
    hero: true,
  },
  {
    id: 'captacao',
    icon: 'trend',
    label: 'Plano de Captação 30 Dias',
    description: 'Consiga clientes reais em 4 semanas.',
    prompt: 'Monta um plano completo de captação de clientes pra 30 dias. Quero ações práticas dia a dia: o que postar, onde divulgar, como abordar, parcerias. Tudo detalhado pra eu só seguir o passo a passo.',
  },
  {
    id: 'financeiro',
    icon: 'calculator',
    label: 'Organizar Minhas Finanças',
    description: 'Saiba quanto ganha de verdade e planeje.',
    prompt: 'Me ajuda a organizar as finanças do meu negócio de nail design. Quero entender: como calcular meu custo real, como separar dinheiro pessoal de empresa, como definir meta de faturamento e controlar meu fluxo de caixa. Me dá um passo a passo prático.',
  },
  {
    id: 'rotina',
    icon: 'book',
    label: 'Montar Minha Rotina',
    description: 'Organize trabalho, casa e filhos sem culpa.',
    prompt: 'Sou mãe e nail designer, preciso de ajuda pra montar uma rotina que funcione. Me ajuda a organizar: horários de atendimento, cuidar da casa e filhos, criar conteúdo pro Instagram, e ainda ter tempo pra descansar. Quero algo real e possível.',
  },
  {
    id: 'instagram',
    icon: 'instagram',
    label: 'Plano de Conteúdo Mensal',
    description: 'Calendário completo pro seu Instagram.',
    prompt: 'Cria um calendário de conteúdo completo pro meu Instagram de nail design pro próximo mês. Quero: o que postar cada dia (feed, stories, reels), legendas prontas, horários ideais, e datas comemorativas. Tudo pronto pra eu só executar.',
  },
  {
    id: 'mei',
    icon: 'briefcase',
    label: 'Como Formalizar (MEI)',
    description: 'Passo a passo pra abrir seu MEI.',
    prompt: 'Me explica tudo sobre MEI pra nail designer: como abrir, quanto custa por mês, qual categoria, limite de faturamento, benefícios, e quando devo migrar pra ME. Quero um guia completo e prático.',
  },
  {
    id: 'subir-preco',
    icon: 'diamond',
    label: 'Subir Meu Preço',
    description: 'Estratégia pra cobrar mais sem perder clientes.',
    prompt: 'Quero aumentar meus preços mas tenho medo de perder clientes. Me dá uma estratégia completa: como comunicar o aumento, quando fazer, quanto subir, como agregar mais valor pra justificar. Quero fazer isso de forma segura.',
  },
  {
    id: 'atelie',
    icon: 'globe',
    label: 'Montar Meu Ateliê',
    description: 'Checklist e custos pra montar seu espaço.',
    prompt: 'Quero montar meu ateliê de nail design. Me dá: checklist completo do que preciso, estimativa de custos, dicas de organização e decoração, como fazer o espaço vender por si só. Posso começar em casa mesmo.',
  },
];

const MARKETING_TOOLS = [
  {
    id: 'calendario',
    icon: 'book',
    label: 'Calendário de Conteúdo Semanal',
    description: 'Plano completo de posts pro Instagram da semana.',
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
    icon: 'user',
    label: 'Gerador de Bio Instagram',
    description: 'Bio otimizada que atrai clientes e converte.',
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
    icon: 'search',
    label: 'Pacote de Hashtags',
    description: '5 pacotes de hashtags prontos pra cada tipo de post.',
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
    icon: 'image',
    label: 'Roteiros de Reels',
    description: '5 roteiros de Reels que viralizam no nicho.',
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
    icon: 'instagram',
    label: 'Estratégia de Stories',
    description: 'Sequência de stories pra engajar e vender.',
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

/* ─── Componente ─────────────────────────────────────────────────── */

export default function BusinessHub({ onSendPrompt, plan = 'free', onUpgrade }) {
  const [activeSection, setActiveSection] = useState('actions');
  const [copiedTemplate, setCopiedTemplate] = useState(null);
  const toast = useToast();

  const isFree = plan === 'free';
  const FREE_TEMPLATES_LIMIT = 2;
  const FREE_ACTIONS_LIMIT = 2;

  const handleCopyTemplate = (tmpl) => {
    navigator.clipboard.writeText(tmpl.template);
    setCopiedTemplate(tmpl.id);
    toast?.('Mensagem copiada! Cole no WhatsApp');
    setTimeout(() => setCopiedTemplate(null), 2000);
  };

  const heroAction = BUSINESS_ACTIONS.find(a => a.hero);
  const restActions = BUSINESS_ACTIONS.filter(a => !a.hero);

  const SECTIONS = [
    { id: 'actions',   label: 'Planos de Ação', icon: 'briefcase' },
    { id: 'marketing', label: 'Marketing',      icon: 'trend', lock: isFree },
    { id: 'whatsapp',  label: 'WhatsApp',       icon: 'whatsapp' },
  ];

  return (
    <div className="flex flex-col h-full bg-surface relative overflow-hidden">
      {/* Atmospheric backdrop */}
      <div className="absolute inset-0 pointer-events-none opacity-50" style={{
        background: 'radial-gradient(ellipse 40% 30% at 80% -10%, rgba(168,83,106,0.14) 0%, transparent 65%), radial-gradient(ellipse 50% 40% at 0% 110%, rgba(200,149,124,0.12) 0%, transparent 65%)'
      }} />

      <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-8 sm:py-10 relative">
        <div className="max-w-3xl mx-auto space-y-8">

          {/* ─── Hero ─── */}
          <header className="space-y-3 animate-fade-in">
            <div className="kicker">caderno do negócio</div>
            <h1 className="font-display text-3xl sm:text-5xl tracking-tight leading-[1.05]">
              Cresça com{' '}
              <span className="font-italic-display text-gradient">clareza</span>{' '}
              — sem queimar etapas.
            </h1>
            <p className="text-sm sm:text-base text-text-muted max-w-xl leading-relaxed">
              Ferramentas pensadas pra você escalar seu negócio de nail design no seu ritmo.
            </p>
          </header>

          {/* ─── Hero Action: Diagnóstico ─── */}
          {heroAction && activeSection === 'actions' && (
            <div
              onClick={() => isFree ? null : onSendPrompt(heroAction.prompt)}
              className="relative overflow-hidden rounded-3xl p-7 sm:p-9 cursor-pointer group animate-slide-up"
              style={{
                background: 'linear-gradient(135deg, var(--color-accent-hover) 0%, var(--color-mauve) 55%, var(--color-accent) 100%)',
                boxShadow: '0 40px 80px -30px rgba(114,47,68,0.55), 0 16px 32px -12px rgba(42,30,37,0.25)',
              }}
            >
              {/* decorative orb */}
              <div className="absolute -top-20 -right-16 w-72 h-72 rounded-full pointer-events-none" style={{
                background: 'radial-gradient(circle, var(--color-rosegold) 0%, transparent 70%)',
                filter: 'blur(40px)', opacity: 0.55,
              }} />
              <div className="relative text-white">
                <div className="flex items-center gap-2.5 mb-5 text-[11px] tracking-[0.28em] uppercase font-semibold" style={{ color: 'var(--color-rosegold)' }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-rosegold)' }} />
                  destaque desta semana
                </div>
                <h2 className="font-display text-3xl sm:text-4xl leading-[1.05] mb-3 tracking-tight">
                  Onde seu negócio está,{' '}
                  <span className="font-italic-display" style={{ color: 'var(--color-rosegold)' }}>de verdade</span>.
                </h2>
                <p className="text-sm sm:text-[15px] leading-relaxed max-w-md mb-6" style={{ color: '#F3DDD8' }}>
                  7 minutos com a IA e você sai com clareza absoluta — fluxo de caixa, captação, posicionamento — e um plano de 4 semanas escrito pra sua realidade.
                </p>
                <button
                  onClick={(e) => { e.stopPropagation(); onSendPrompt(heroAction.prompt); }}
                  className="inline-flex items-center gap-2.5 px-5 py-3 rounded-full bg-white text-accent-hover font-semibold text-[13px] hover:scale-[1.02] transition-transform shadow-elevated"
                >
                  Iniciar diagnóstico
                  <Icon name="arrowRight" size={14} />
                </button>
              </div>
            </div>
          )}

          {/* ─── Section tabs ─── */}
          <nav className="flex gap-1 p-1 rounded-2xl glass-soft" role="tablist">
            {SECTIONS.map(s => {
              const active = activeSection === s.id;
              return (
                <button
                  key={s.id}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveSection(s.id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                    active
                      ? 'bg-surface-card text-accent shadow-card'
                      : 'text-text-muted hover:text-text'
                  }`}
                >
                  <Icon name={s.icon} size={14} />
                  <span>{s.label}</span>
                  {s.lock && <Icon name="lock" size={10} className="text-text-light" />}
                </button>
              );
            })}
          </nav>

          {/* ─── PLANOS DE AÇÃO ─── */}
          {activeSection === 'actions' && (
            <section className="space-y-3 animate-fade-in">
              <div className="flex items-baseline justify-between">
                <p className="kicker">caminhos disponíveis</p>
                <p className="text-[11px] text-text-light">{BUSINESS_ACTIONS.length} planos</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                {restActions.map((action, idx) => {
                  const locked = isFree && idx >= (FREE_ACTIONS_LIMIT - 1);
                  return (
                    <ActionCard
                      key={action.id}
                      icon={action.icon}
                      title={action.label}
                      desc={action.description}
                      locked={locked}
                      onUpgrade={onUpgrade}
                      onClick={() => locked ? onUpgrade?.() : onSendPrompt(action.prompt)}
                    />
                  );
                })}
              </div>

              {isFree && (
                <UpgradePromo
                  title={`Desbloqueie todos os ${BUSINESS_ACTIONS.length} planos de ação`}
                  subtitle="Acesso completo aos planos, marketing e templates."
                  onUpgrade={onUpgrade}
                />
              )}
            </section>
          )}

          {/* ─── MARKETING ─── */}
          {activeSection === 'marketing' && (
            <section className="space-y-3 animate-fade-in">
              <div className="flex items-baseline justify-between">
                <p className="kicker">ferramentas de marketing</p>
                <p className="text-[11px] text-text-light">{MARKETING_TOOLS.length} ferramentas{isFree && ' · exclusivo Pro'}</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                {MARKETING_TOOLS.map((tool) => (
                  <ActionCard
                    key={tool.id}
                    icon={tool.icon}
                    title={tool.label}
                    desc={tool.description}
                    locked={isFree}
                    onUpgrade={onUpgrade}
                    onClick={() => isFree ? onUpgrade?.() : onSendPrompt(tool.prompt)}
                  />
                ))}
              </div>

              {isFree && (
                <UpgradePromo
                  title="Desbloqueie ferramentas de Marketing"
                  subtitle="Calendário de conteúdo, gerador de bio, pacotes de hashtags, roteiros de Reels e mais."
                  onUpgrade={onUpgrade}
                />
              )}
            </section>
          )}

          {/* ─── WHATSAPP ─── */}
          {activeSection === 'whatsapp' && (
            <section className="space-y-3 animate-fade-in">
              <div>
                <p className="kicker">mensagens prontas</p>
                <p className="text-[12px] text-text-muted mt-1">
                  Copie e cole no WhatsApp. Substitua os <code className="bg-accent-bg text-accent px-1 py-0.5 rounded text-[11px]">[colchetes]</code> pelos dados da clienta.
                </p>
              </div>

              <div className="space-y-2">
                {WHATSAPP_TEMPLATES.map((tmpl, idx) => {
                  const locked = isFree && idx >= FREE_TEMPLATES_LIMIT;
                  return (
                    <TemplateCard
                      key={tmpl.id}
                      tmpl={tmpl}
                      locked={locked}
                      copied={copiedTemplate === tmpl.id}
                      onCopy={() => handleCopyTemplate(tmpl)}
                      onUpgrade={onUpgrade}
                    />
                  );
                })}
              </div>

              {/* Dica setup */}
              <div className="glass-card rounded-2xl p-5 mt-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl ai-avatar text-white flex items-center justify-center flex-shrink-0">
                    <Icon name="sparkle" size={16} />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-text text-sm">Configure seu WhatsApp Business</p>
                    <p className="text-[12px] text-text-muted leading-relaxed mt-1">
                      Foto profissional, bio com serviços + cidade, catálogo com fotos e preços, mensagem automática e horário de funcionamento.
                    </p>
                    <button
                      onClick={() => onSendPrompt('Me ajuda a configurar meu WhatsApp Business completo: foto, bio, catálogo, mensagem automática, horário de funcionamento. Quero que fique profissional e atraia clientes.')}
                      className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-accent hover:underline"
                    >
                      Pedir ajuda pra configurar <Icon name="arrowRight" size={12} />
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Subcomponents ──────────────────────────────────────────────── */

function ActionCard({ icon, title, desc, locked, onUpgrade, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`group relative text-left p-5 rounded-2xl glass-card hover:border-accent/30 transition-all ${
        locked ? 'opacity-65' : 'hover:-translate-y-0.5'
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-white"
          style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-mauve))', boxShadow: 'var(--shadow-glow)' }}
        >
          <Icon name={icon} size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-display text-[17px] text-text leading-tight">
              {title}
            </h3>
            {locked && <UpgradeInlineBadge label="Pro" onUpgrade={onUpgrade} />}
          </div>
          <p className="text-[12.5px] text-text-muted leading-relaxed">{desc}</p>

          <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-accent">
            {locked ? 'Desbloquear' : 'Abrir'}
            <Icon name="arrowRight" size={11} className="group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </button>
  );
}

function TemplateCard({ tmpl, locked, copied, onCopy, onUpgrade }) {
  return (
    <div className={`glass-soft rounded-2xl overflow-hidden ${locked ? 'opacity-65' : ''}`}>
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border-light">
        <div className="w-8 h-8 rounded-lg bg-accent-bg text-accent flex items-center justify-center flex-shrink-0">
          <Icon name={tmpl.icon} size={15} />
        </div>
        <span className="text-[13px] font-semibold text-text flex-1">{tmpl.label}</span>
        {locked ? (
          <UpgradeInlineBadge label="Pro" onUpgrade={onUpgrade} />
        ) : (
          <button
            onClick={onCopy}
            className={`text-[11px] font-semibold px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${
              copied
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                : 'bg-accent-bg text-accent hover:bg-accent-light'
            }`}
          >
            {copied ? <><Icon name="check" size={12} /> Copiado</> : 'Copiar'}
          </button>
        )}
      </div>
      {locked ? (
        <div className="px-4 py-4 text-[12px] text-text-light font-italic-display italic">
          Disponível com upgrade — faça Pro pra ver e copiar.
        </div>
      ) : (
        <pre className="px-4 py-3.5 text-[12.5px] text-text-muted whitespace-pre-wrap font-sans leading-relaxed">
          {tmpl.template}
        </pre>
      )}
    </div>
  );
}

function UpgradePromo({ title, subtitle, onUpgrade }) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-5 sm:p-6 text-center mt-2"
      style={{
        background: 'linear-gradient(135deg, var(--color-accent-bg), var(--color-surface-card))',
        border: '1px solid var(--color-border-light)',
      }}
    >
      <div className="w-12 h-12 rounded-2xl ai-avatar mx-auto mb-3 flex items-center justify-center text-white">
        <Icon name="diamond" size={18} />
      </div>
      <p className="font-display text-xl text-text leading-tight">{title}</p>
      <p className="text-[12.5px] text-text-muted mt-1.5 max-w-sm mx-auto">{subtitle}</p>
      <button
        onClick={onUpgrade}
        className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-full btn-gradient text-[13px]"
      >
        Conhecer o Pro <Icon name="arrowRight" size={13} />
      </button>
    </div>
  );
}
