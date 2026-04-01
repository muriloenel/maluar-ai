export const KNOWLEDGE_BASE = [
  // --- ARQUITETURA DA UNHA ---
  "Arquitetura da Unha: O que diferencia nail designer de manicure. Apex no ponto correto (1/3 superior), curvatura C perfeita, nivelamento lateral simétrico. Sem isso, qualquer design fica comprometido. É a BASE do nail design.",
  "Estrutura e Formato: Stiletto, coffin/bailarina, almond, square, squoval, edge. Cada formato exige construção diferente. Coffin e almond são os mais pedidos em 2025-2026. Nail designer domina TODOS.",
  "Nivelamento: Vista lateral da unha deve ser reta ou levemente curvada. Sem ondulações. Use régua de luz pra conferir. Diferença entre amador e profissional.",

  // --- ALONGAMENTO E CONSTRUÇÃO ---
  "Gel Moldado: Técnica principal de construção. Preparação completa, primer, base coat 30s, gel construtor com molde, curar 60s, construir apex, lixar pra nivelar, top coat. Foco na ARQUITETURA. 2h/cliente.",
  "Fibra de Vidro: Alongamento leve e flexível. Ideal pra unha natural frágil. R$120-180. Manutenção 21-30 dias. Excelente pra quem quer resultado natural.",
  "Polygel: Híbrido gel+acrílico. Sem cheiro forte. Beltrat R$60-80, Vòlia R$70-90. 1h30-2h. Boa opção pra nail designer iniciante em alongamento.",
  "Acrílico (Porcelana): Técnica clássica de escultura. Seca ao ar. Permite escultura 3D avançada. Exige mais prática. Pó acrílico + monômero. Nail designers avançadas dominam pra criar peças artísticas.",

  // --- NAIL ART E DESIGN ---
  "Nail Art Avançada: Encapsulamento (flores secas, folhas, glitter dentro do gel), hand painting com pincel fino, 3D em gel/acrílico, chrome, foil, aura nails. É onde o nail designer se diferencia e agrega VALOR.",
  "Encapsulamento: Técnica de colocar elementos (flores, folhas, glitter, foil) DENTRO das camadas de gel. Exige camada base, elementos posicionados, camada de cobertura. Resultado premium. Agrega +R$30-60 ao serviço.",
  "Técnicas Decorativas: Francesinha invertida, baby boomer (degradê), marble, watercolor, stamping avançado, pedrarias e joias de unha, line art. Cada uma agrega valor ao serviço.",
  "Baby Boomer: Degradê francesinha. R$80-150. Clássico atemporal. Toda nail designer precisa dominar. Técnica: gel branco + nude, misturar na unha com pincel ou esponja.",
  "Tendências 2025-2026: Aura nails, Chrome/espelhado, Glazed donut, Cat eye magnético, 3D escultural, Butter nails, Coquette, Milk bath, Blooming gel, Jelly nails. Cores: marrom, terracota, verde oliva, burgundy.",

  // --- PREPARAÇÃO TÉCNICA ---
  "Preparação da Unha: Etapa CRUCIAL. Cutícula com broca/pusher (estilo russo a seco), lixamento suave 180G, removedor de oleosidade, primer, desidratador. Preparação mal feita = descolamento. Staleks R$80-120, brocas de qualidade R$30-60.",
  "Blindagem: Técnica de fortalecimento da unha natural com gel, SEM alongamento. R$60-90. Banho de gel R$70-110. Ótimo serviço de entrada pra captar clientes que depois vão pra alongamento.",

  // --- PRODUTOS E MATERIAIS ---
  "Géis Construtores: VÒLIA R$45-65 (favorito BR, consistência top), BELTRAT R$35-50 (acessível e bom), HONEY GIRL R$25-40 (custo-benefício), CRYSTAL NAILS R$80-120 (premium europeu).",
  "Cabine LED/UV: Mínimo 48W. Sun SUN5 R$90-130. Pro: 80-120W R$150-300. Impacta diretamente na cura do gel e qualidade do trabalho.",
  "Kit Nail Designer Iniciante: ~R$800-1200: Cabine LED 48W R$100, géis (base, construtor, top) R$150, Staleks R$100, brocas R$60, lixas R$30, pincéis construção R$80, pincéis art R$50, tips treino R$30.",
  "Pincéis de Nail Art: Liner/stripper R$20-35, pontilhado/dotting R$15-25, leque R$15, angular R$20. Kolinsky pra art avançada R$40-80. Ferramenta do ARTISTA.",

  // --- NEGÓCIO E PRECIFICAÇÃO ---
  "Precificação Nail Designer SP 2025-2026: Blindagem R$60-90, Alongamento gel R$150-250, Alongamento + nail art R$200-350, Manutenção R$80-130, Encapsulamento R$180-280. Nail art avançada cobra ADICIONAL.",
  "Posicionamento Premium: Nail designer NÃO é manicure. Cobra por ARTE e TÉCNICA. Sinal de agendamento SIM. Cartão de visita, portfólio impecável, ateliê organizado. Cliente paga EXPERIÊNCIA + resultado.",
  "Primeiras Clientes: FASE 1: 10-15 modelos pra treino (grátis/troca). FASE 2: 50% do preço por 30 dias. FASE 3: preço de mercado após 20-30 atendimentos com portfólio consistente.",
  "Escalar Negócio: Ateliê próprio, assistente, agenda lotada, lista de espera, ticket médio alto. Diversificar: mentoria, curso, educadora de marca. Nail designer de sucesso é EMPRESÁRIA.",

  // --- MARKETING E CONTEÚDO ---
  "Instagram Nail Designer: Antes/depois, Reels de processo (timelapse), close do resultado com luz natural/ring light. 4-5 posts/semana. 11h-13h e 19h-21h. Portfólio é mais importante que seguidores.",
  "Copy Instagram: Gancho forte (pergunta/frase de impacto). Mini história do atendimento. CTA (salva/compartilha/comenta). Emojis com moderação. 20-30 hashtags no 1o comentário.",
  "Stories Nail Designer: 5-7/dia. Enquetes, caixinha de perguntas, antes/depois, bastidores, rotina do ateliê. Link pra agendamento. Humaniza a marca.",
  "Saúde: NÃO é profissional de saúde. Manchas escuras, fungo, descolamento severo, dor = dermatologista. NUNCA aplicar produto em unha infectada. Nail designer responsável sabe os limites.",
];

export function searchKnowledge(query) {
  const q = query.toLowerCase();
  const words = q.split(/\s+/).filter(w => w.length > 2);
  if (!words.length) return "";
  return KNOWLEDGE_BASE
    .map(doc => ({ doc, score: words.filter(w => doc.toLowerCase().includes(w)).length }))
    .filter(d => d.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map(d => d.doc)
    .join("\n---\n");
}
