import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '../../../../lib/admin';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminSb = (supabaseUrl && supabaseServiceKey) ? createClient(supabaseUrl, supabaseServiceKey) : null;

export async function POST(req) {
  try {
    const authUser = await getAuthUser(req).catch(() => null);
    if (!authUser) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body?.chatId || !body?.message) {
      return Response.json({ error: 'chatId e message são obrigatórios' }, { status: 400 });
    }

    const { chatId, message } = body;
    const userMessage = String(message).slice(0, 500);

    // Gerar título com Haiku (modelo mais barato)
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 30,
      temperature: 0.3,
      system: 'Gere um título curto (máximo 5 palavras, em português) que resuma O TEMA REAL da conversa. Analise a pergunta do usuário E a resposta do assistente para identificar o ASSUNTO CONCRETO. Exemplos bons: "Dúvida gel construtor", "Preço alongamento fibra", "Como captar clientes", "Análise unha 3D", "Kit iniciante nail design". NUNCA use saudações, "Oi", "Bem-vindo", "Conversa sobre" ou títulos genéricos. Se o contexto mencionar vários temas, escolha o PRINCIPAL. Responda APENAS com o título, sem aspas, sem pontuação final.',
      messages: [{ role: 'user', content: userMessage }],
    });

    const title = (response.content?.[0]?.text || '').trim().slice(0, 60) || 'Novo chat';

    // Salvar no banco
    if (adminSb) {
      await adminSb
        .from('chats')
        .update({ title, updated_at: new Date().toISOString() })
        .eq('id', chatId)
        .eq('user_id', authUser.id);
    }

    return Response.json({ title });
  } catch (err) {
    console.error('[TITLE] Erro:', err?.message || err);
    return Response.json({ error: 'Erro ao gerar título' }, { status: 500 });
  }
}
