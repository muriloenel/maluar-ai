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
        prompt: `You are a professional beauty photographer. Enhance this nail design photograph to absolute studio quality.

LIGHTING:
- Apply soft, diffused studio lighting with natural-looking highlights on the nails
- Add subtle rim light to make the nail edges pop
- Remove any harsh shadows or uneven lighting

COLOR & DETAIL:
- Make nail colors more vibrant, saturated, and true-to-life
- Enhance the sharpness and fine details of the nail art/design
- Ensure skin tones look natural and healthy (not orange or grey)

BACKGROUND:
- Clean up or replace the background with a soft, elegant out-of-focus (bokeh) surface
- If the background is already nice, just soften it slightly to draw focus to the nails

CRITICAL RULES:
- Keep the EXACT same nail design, shape, and art — only improve photography quality
- Do NOT change the nail color, pattern, or style
- Do NOT add any text, logos, watermarks, or decorative elements
- Do NOT modify the hand pose or composition
- The result must look like a professional beauty salon photoshoot`,
        size: '1024x1024',
        quality: 'high',
      });

    } else if (action === 'post-art') {
      // ═══ GERAR ARTE PRO POST ═══
      if (!postData) {
        return Response.json({ error: 'Dados do post não fornecidos' }, { status: 400 });
      }

      const { title, subtitle, location, cta, style, visualStyle } = postData;
      const isStories = style === 'stories';
      const size = isStories ? '1024x1536' : '1024x1024';

      const imageBuffer = Buffer.from(imageBase64, 'base64');
      const file = new File([imageBuffer], 'photo.png', { type: 'image/png' });

      // Estilos visuais pré-definidos com prompts otimizados
      const VISUAL_STYLES = {
        luxury: {
          name: 'Luxo Elegante',
          prompt: `Dark luxury aesthetic. Black/dark background with gold, champagne, or rose-gold metallic accents. Elegant serif typography. Subtle sparkle and shimmer effects. Think: high-end jewelry brand aesthetic.`,
        },
        modern: {
          name: 'Moderno Clean',
          prompt: `Modern minimalist design. Clean white or very light background. Bold sans-serif typography in black. Accent color: soft blush pink or lavender. Geometric shapes and clean lines. Think: Apple/Glossier brand aesthetic.`,
        },
        neon: {
          name: 'Neon Vibrante',
          prompt: `Vibrant neon aesthetic. Dark background (deep purple or black) with glowing neon pink, purple, and cyan accents. Neon light effects on text. Energetic, youthful. Think: nightlife beauty brand.`,
        },
        romantic: {
          name: 'Romântico Floral',
          prompt: `Romantic botanical aesthetic. Soft pastel tones (blush, cream, sage green). Delicate watercolor flower decorations around the edges. Elegant script typography. Think: wedding invitation style, feminine and dreamy.`,
        },
        editorial: {
          name: 'Editorial Fashion',
          prompt: `High-fashion editorial style. Bold contrasting layout. Magazine-quality typography with large impactful headlines. Black & white with one accent color. Think: Vogue beauty editorial page.`,
        },
        tropical: {
          name: 'Tropical Chic',
          prompt: `Tropical paradise aesthetic. Warm golden tones, turquoise accents, palm leaf silhouettes. Sunset gradient backgrounds. Fun, vibrant, summer vibes. Think: Brazilian beach resort brand.`,
        },
      };

      const selectedStyle = VISUAL_STYLES[visualStyle] || VISUAL_STYLES.luxury;

      const promptParts = [
        `You are a world-class graphic designer. Create a stunning, professional Instagram ${isStories ? 'story (vertical 9:16 ratio)' : 'post (square 1:1 ratio)'} for a nail designer / nail artist.`,
        ``,
        `PHOTO INSTRUCTIONS:`,
        `- The provided nail photo MUST be the HERO element, prominently displayed and clearly visible`,
        `- Frame the photo beautifully — it should occupy at least 40-50% of the design`,
        `- Do NOT crop or distort the nail photo`,
        ``,
        `VISUAL STYLE:`,
        selectedStyle.prompt,
        ``,
        `TEXT CONTENT (all text in Portuguese/Brazilian):`,
        title ? `- MAIN HEADLINE (large, bold, impactful): "${title}"` : '',
        subtitle ? `- SUBTITLE (smaller, elegant): "${subtitle}"` : '',
        location ? `- LOCATION with pin icon: "📍 ${location}"` : '',
        cta ? `- CALL-TO-ACTION BUTTON at bottom (rounded pill shape, high contrast): "${cta}"` : '',
        ``,
        `DESIGN RULES:`,
        `- Typography must be SHARP, READABLE with excellent contrast`,
        `- Text hierarchy: headline largest, subtitle medium, CTA button prominent`,
        `- Use professional layout with balanced whitespace`,
        `- Add subtle design elements: thin lines, dots, small decorative accents that match the style`,
        `- The overall result should look like it was made by a professional agency`,
        `- Do NOT add any WhatsApp icons, phone icons, or emoji unless in the CTA text`,
        `- Do NOT add random watermarks or logos`,
        `- Keep the design CLEAN — less is more`,
      ].filter(Boolean).join('\n');

      result = await getOpenAI().images.edit({
        model: 'gpt-image-1',
        image: file,
        prompt: promptParts,
        size,
        quality: 'high',
      });

    } else if (action === 'recreate') {
      // ═══ RECRIAR DESIGN A PARTIR DA FOTO ═══
      const { description } = body;
      const userPrompt = (description || '').slice(0, 500);

      const imageBuffer = Buffer.from(imageBase64, 'base64');
      const file = new File([imageBuffer], 'photo.png', { type: 'image/png' });

      const recreatePrompt = `You are a professional nail art photographer. Based on this reference photo, create a NEW stunning nail design photograph.

${userPrompt ? `CLIENT REQUEST: ${userPrompt}` : 'Recreate this nail design with enhanced professional quality.'}

PHOTOGRAPHY STYLE:
- Ultra-realistic photograph, NOT illustration or digital art
- Professional studio lighting: soft key light with subtle fill
- Close-up composition showing beautifully manicured nails on elegant, natural-looking hands
- Sharp focus on nails with soft bokeh background
- Magazine-quality beauty photography

RULES:
- Only show hands and nails — NO faces, NO full body
- NO text, logos, watermarks, or any overlay
- Background should be clean, elegant (marble, silk, soft gradient, or bokeh)
- Skin must look natural and healthy
- Nails must look realistic and physically accurate`;

      result = await getOpenAI().images.edit({
        model: 'gpt-image-1',
        image: file,
        prompt: recreatePrompt,
        size: '1024x1024',
        quality: 'high',
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
