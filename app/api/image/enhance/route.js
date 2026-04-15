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

    // Verificar plano e quota (compartilha com image/generate)
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
        error: 'Recurso exclusivo para assinantes Pro e Premium',
        upgrade: true
      }, { status: 403 });
    }

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

    const body = await req.json();
    const { action, imageBase64, postData } = body;

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return Response.json({ error: 'Imagem não fornecida' }, { status: 400 });
    }

    // Limitar tamanho da imagem (max ~4MB em base64)
    if (imageBase64.length > 5_500_000) {
      return Response.json({ error: 'Imagem muito grande (máx 4MB)' }, { status: 400 });
    }

    let result;

    if (action === 'enhance') {
      // ═══ MELHORAR FOTO ═══
      const imageBuffer = Buffer.from(imageBase64, 'base64');
      const file = new File([imageBuffer], 'photo.png', { type: 'image/png' });

      result = await getOpenAI().images.edit({
        model: 'gpt-image-1',
        image: file,
        prompt: `Enhance this nail design photograph to professional studio quality.
- Improve lighting: soft, even studio lighting with subtle highlights on the nails
- Enhance sharpness and clarity of the nail details
- Make colors more vibrant yet natural
- Clean up the background to a soft, elegant bokeh or clean surface
- Keep the EXACT same nails, hands and nail design - only improve photography quality
- The result should look like a professional beauty/nail salon photoshoot
- Do NOT add any text, logos, or watermarks`,
        size: '1024x1024',
      });

    } else if (action === 'post-art') {
      // ═══ GERAR ARTE PRO POST ═══
      if (!postData) {
        return Response.json({ error: 'Dados do post não fornecidos' }, { status: 400 });
      }

      const { title, subtitle, location, cta, style } = postData;
      const isStories = style === 'stories';
      const size = isStories ? '1024x1536' : '1024x1024';

      const imageBuffer = Buffer.from(imageBase64, 'base64');
      const file = new File([imageBuffer], 'photo.png', { type: 'image/png' });

      const promptParts = [
        `Create a professional, elegant Instagram ${isStories ? 'story (vertical 9:16)' : 'post (square 1:1)'} design for a nail designer's social media.`,
        `Use the provided nail photo as the MAIN visual element — it should be prominently featured and recognizable.`,
        title ? `Main title text: "${title}"` : '',
        subtitle ? `Subtitle or description: "${subtitle}"` : '',
        location ? `Location info: 📍 ${location}` : '',
        cta ? `Call-to-action button text: "${cta}"` : '',
        `Design style requirements:`,
        `- Luxurious, sophisticated aesthetic with dark or elegant tones`,
        `- Professional typography: large bold title, elegant script or italic for subtitle`,
        `- Subtle design elements: sparkles, gold accents, soft gradients`,
        `- The nail photo should be the hero/focal point of the design`,
        `- Include a CTA button at the bottom if CTA text is provided`,
        `- Overall look: like a high-end beauty brand social media post`,
        `- All text must be in Portuguese (Brazilian)`,
        `- Do NOT include any WhatsApp or phone icons unless specifically in the CTA`,
        `- Make text READABLE with good contrast against the background`,
      ].filter(Boolean).join('\n');

      result = await getOpenAI().images.edit({
        model: 'gpt-image-1',
        image: file,
        prompt: promptParts,
        size,
      });

    } else if (action === 'recreate') {
      // ═══ RECRIAR DESIGN A PARTIR DA FOTO ═══
      const { description } = body;
      const userPrompt = (description || '').slice(0, 500);

      const imageBuffer = Buffer.from(imageBase64, 'base64');
      const file = new File([imageBuffer], 'photo.png', { type: 'image/png' });

      const recreatePrompt = `Based on this nail design reference photo, create a NEW professional nail design photo.
${userPrompt ? `User request: ${userPrompt}` : 'Recreate this nail design with professional studio quality.'}
Style: ultra-realistic photograph, studio lighting, close-up of beautifully manicured nails on elegant hands.
Quality: 4K, sharp focus, soft bokeh background, beauty photography style.
Important: Only show hands and nails, no faces. No text, logos, or watermarks. Clean, professional aesthetic.`;

      result = await getOpenAI().images.edit({
        model: 'gpt-image-1',
        image: file,
        prompt: recreatePrompt,
        size: '1024x1024',
      });

    } else {
      return Response.json({ error: 'Ação inválida. Use "enhance", "post-art" ou "recreate".' }, { status: 400 });
    }

    // Extrair imagem do resultado
    const imageData = result.data?.[0];
    if (!imageData) {
      return Response.json({ error: 'Não foi possível processar a imagem' }, { status: 500 });
    }

    // Incrementar uso
    if (!isAdmin) {
      const updateData = { images_today: imagesToday + 1 };
      if (isNewDay) updateData.images_reset_at = now.toISOString();
      await sb.from('profiles').update(updateData).eq('id', authUser.id);
    }

    // Responder com URL ou base64
    return Response.json({
      url: imageData.url || null,
      b64: imageData.b64_json || null,
      remaining: isAdmin ? 999 : Math.max(0, limit - imagesToday - 1),
    });

  } catch (err) {
    if (err?.error?.code === 'content_policy_violation') {
      return Response.json({
        error: 'A imagem foi bloqueada pela política de conteúdo. Tente com outra foto.'
      }, { status: 400 });
    }
    const errMsg = err?.error?.message || err?.message || 'Erro desconhecido';
    console.error('[IMAGE-ENHANCE] Erro:', errMsg, JSON.stringify(err?.error || {}));
    return Response.json({ error: `Erro ao processar imagem: ${errMsg}` }, { status: 500 });
  }
}
