import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

let _openai;
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const UNLIMITED_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

// Limites diários de geração de imagem por plano
const IMAGE_LIMITS = { free: 0, pro: 5, premium: 20 };

export async function POST(req) {
  try {
    // Auth
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token || !supabaseUrl) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const sb = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user: authUser }, error: authError } = await sb.auth.getUser(token);
    if (authError || !authUser) {
      return Response.json({ error: 'Token inválido' }, { status: 401 });
    }

    // Verificar plano e quota
    const isAdmin = UNLIMITED_EMAILS.includes(authUser.email?.toLowerCase());
    let profileResult;
    try {
      profileResult = await sb.from('profiles').select('plan, images_today, images_reset_at').eq('id', authUser.id).single();
    } catch {
      profileResult = await sb.from('profiles').select('plan').eq('id', authUser.id).single();
    }
    const profile = profileResult?.data;
    const plan = profile?.plan || 'free';
    const limit = IMAGE_LIMITS[plan] || 0;

    if (!isAdmin && plan === 'free') {
      return Response.json({
        error: 'Geração de imagem é exclusiva para assinantes Pro e Premium',
        upgrade: true
      }, { status: 403 });
    }

    // Reset diário
    const now = new Date();
    const resetAt = profile?.images_reset_at ? new Date(profile.images_reset_at) : new Date(0);
    const isNewDay = now.toDateString() !== resetAt.toDateString();
    const imagesToday = isNewDay ? 0 : (profile?.images_today || 0);

    if (!isAdmin && imagesToday >= limit) {
      return Response.json({
        error: `Limite diário atingido (${limit} imagens/dia no plano ${plan})`,
        quota: { used: imagesToday, limit }
      }, { status: 429 });
    }

    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== 'string' || prompt.length > 1000) {
      return Response.json({ error: 'Prompt inválido (máx 1000 caracteres)' }, { status: 400 });
    }

    // Prompt de segurança + qualidade nail design
    const enhancedPrompt = `Professional nail design photo: ${prompt}. 
Style: ultra-realistic photograph, studio lighting, close-up of beautifully manicured nails on elegant hands. 
Quality: 4K, sharp focus, soft bokeh background, beauty photography style. 
Important: Only show hands and nails, no faces. Clean, professional aesthetic.`;

    const result = await getOpenAI().images.generate({
      model: 'dall-e-3',
      prompt: enhancedPrompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
      response_format: 'url',
    });

    const imageUrl = result.data?.[0]?.url;
    if (!imageUrl) {
      return Response.json({ error: 'Não foi possível gerar a imagem' }, { status: 500 });
    }

    // Incrementar uso
    if (!isAdmin) {
      const updateData = { images_today: imagesToday + 1 };
      if (isNewDay) updateData.images_reset_at = now.toISOString();
      await sb.from('profiles').update(updateData).eq('id', authUser.id);
    }

    return Response.json({
      url: imageUrl,
      remaining: isAdmin ? 999 : Math.max(0, limit - imagesToday - 1),
      limit,
    });

  } catch (err) {
    // OpenAI content policy error
    if (err?.error?.code === 'content_policy_violation') {
      return Response.json({
        error: 'A descrição foi bloqueada pela política de conteúdo. Tente reformular.'
      }, { status: 400 });
    }
    const errMsg = err?.error?.message || err?.message || 'Erro desconhecido';
    const errCode = err?.error?.code || err?.code || err?.status || '';
    console.error('[IMAGE-GEN] Erro:', errMsg, '| Code:', errCode, '| Full:', JSON.stringify(err?.error || err?.response?.data || {}));
    return Response.json({ error: `Erro ao gerar imagem: ${errMsg}` }, { status: 500 });
  }
}
