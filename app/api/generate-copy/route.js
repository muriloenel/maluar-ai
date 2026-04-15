import Anthropic from '@anthropic-ai/sdk';
import { getAuthUser } from '../../../lib/admin';
import { getAllConfigs } from '../../../lib/config';

if (process.env.NODE_ENV !== 'production' && process.env.ALLOW_SELF_SIGNED_CERTS === '1') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Você é uma copywriter expert para nail designers brasileiras no Instagram.

TAREFA: Receba os dados do post e gere conteúdo profissional estruturado.

REGRAS:
- PT-BR, tom amigável e profissional
- Legendas persuasivas com emojis moderados (3-5) e hashtags relevantes (20-25)
- Textos curtos e impactantes para encaixar no template visual
- O headline deve ter no máximo 5 palavras (para caber na imagem)
- O subtitle deve ter no máximo 8 palavras (cursivo elegante)
- Cada bullet deve ter no máximo 4 palavras
- O CTA deve ser direto e com no máximo 5 palavras

FORMATO DE RESPOSTA (JSON puro, sem markdown):
{
  "captions": [
    {
      "legenda": "legenda completa com emojis para Instagram",
      "hashtags": "#hashtag1 #hashtag2 ...",
      "dica": "melhor horário ou formato ideal"
    },
    {
      "legenda": "segunda opção de legenda, tom diferente",
      "hashtags": "#hashtag1 #hashtag2 ...",
      "dica": "outra sugestão rápida"
    }
  ],
  "template": {
    "headline": "TÍTULO CURTO",
    "subtitle": "subtítulo elegante aqui",
    "description": "parágrafo descritivo de 1-2 linhas sobre o serviço",
    "bullets": ["Benefício 1", "Benefício 2", "Benefício 3"],
    "cta": "AGENDE SEU HORÁRIO"
  }
}`;

export async function POST(req) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json({ error: 'Erro de configuração do servidor.' }, { status: 500 });
    }

    const authUser = await getAuthUser(req).catch(() => null);
    if (!authUser) {
      return Response.json({ error: 'Faça login para usar este recurso.' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return Response.json({ error: 'Dados inválidos.' }, { status: 400 });
    }

    const { servico, titulo, subtitulo, beneficios, local, cta, tipo, imageBase64, imageMediaType } = body;

    if (!servico && !titulo && !tipo) {
      return Response.json({ error: 'Preencha ao menos o serviço, título ou tipo do post.' }, { status: 400 });
    }

    const allConfigs = await getAllConfigs();
    const SONNET = allConfigs.ai_model_complex || 'claude-sonnet-4-20250514';

    let userPrompt = `Gere conteúdo para um post de Instagram de nail designer.\n\n`;
    if (tipo) userPrompt += `Tipo de post: ${tipo}\n`;
    if (servico) userPrompt += `Serviço: ${servico}\n`;
    if (titulo) userPrompt += `Título sugerido: ${titulo}\n`;
    if (subtitulo) userPrompt += `Subtítulo sugerido: ${subtitulo}\n`;
    if (beneficios) userPrompt += `Benefícios: ${beneficios}\n`;
    if (local) userPrompt += `Localização: ${local}\n`;
    if (cta) userPrompt += `CTA desejado: ${cta}\n`;

    const messages = [{
      role: 'user',
      content: imageBase64
        ? [
            { type: 'image', source: { type: 'base64', media_type: imageMediaType || 'image/jpeg', data: imageBase64 } },
            { type: 'text', text: userPrompt + '\nAnalise a foto enviada e use-a como contexto para criar o conteúdo.' },
          ]
        : userPrompt,
    }];

    const FALLBACKS = [SONNET, 'claude-3-5-sonnet-latest', 'claude-haiku-4-5'];
    let response = null;

    for (const model of FALLBACKS) {
      try {
        response = await client.messages.create({
          model,
          max_tokens: 1200,
          temperature: 0.7,
          system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
          messages,
        });
        break;
      } catch (err) {
        if (err?.status !== 404) throw err;
      }
    }

    if (!response) {
      return Response.json({ error: 'Nenhum modelo disponível.' }, { status: 502 });
    }

    const text = response.content?.[0]?.text || '';

    // Extrair JSON da resposta
    let parsed;
    try {
      // Tentar parse direto
      parsed = JSON.parse(text);
    } catch {
      // Tentar extrair JSON de dentro de markdown
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        return Response.json({ error: 'Erro ao processar resposta da IA.', raw: text }, { status: 500 });
      }
    }

    // Garantir estrutura mínima
    if (!parsed.captions || !Array.isArray(parsed.captions)) {
      return Response.json({ error: 'Formato de resposta inesperado.', raw: text }, { status: 500 });
    }

    // Merge com dados do usuário (priorizar input do usuário se preenchido)
    if (local && parsed.template) {
      parsed.template.location = local;
    }

    return Response.json(parsed);
  } catch (error) {
    console.error('[GENERATE-COPY] Erro:', error?.message || error);
    return Response.json({ error: 'Erro ao gerar conteúdo.' }, { status: 500 });
  }
}
