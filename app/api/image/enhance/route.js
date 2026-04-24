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
        prompt: `IMPORTANT: This is a REAL photograph. Your #1 priority is to PRESERVE the natural, authentic look of the photo.

MINIMAL RETOUCHING ONLY:
- Slightly improve brightness and white balance so the image looks well-lit
- Gently sharpen the focus on the nails/nail art
- If the background is messy, softly blur it (natural bokeh) to draw attention to the nails
- Subtly even out skin tone if it looks off due to bad lighting

ABSOLUTE RULES — DO NOT VIOLATE:
- Do NOT smooth or airbrush the skin — keep all natural skin texture, pores, and fine lines
- Do NOT change skin color or make it look plasticky/filtered
- Do NOT alter the nail design, color, shape, or art in ANY way
- Do NOT add any glow, sparkle, shimmer, or special effects
- Do NOT add text, logos, borders, frames, or any overlay
- Do NOT change the hand pose, angle, or composition
- Do NOT make it look like a render, illustration, or AI-generated image
- The final result must be INDISTINGUISHABLE from a real phone photo taken in good lighting
- Think of this as a subtle Lightroom edit, NOT Photoshop manipulation`,
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
          prompt: `Dark background (black or charcoal) around the photo. Gold or champagne-colored text. Thin gold border or line accents. Elegant serif font for headline. Minimalist luxury feel.`,
        },
        modern: {
          name: 'Moderno Clean',
          prompt: `Clean white or very light grey background around the photo. Black text in modern sans-serif font. One accent color: soft blush pink. Simple geometric lines. Minimalist, airy layout.`,
        },
        neon: {
          name: 'Neon Vibrante',
          prompt: `Dark purple or black background around the photo. Neon pink and cyan colored text with subtle glow effect. Bold modern font. Energetic, youthful feel.`,
        },
        romantic: {
          name: 'Romântico Floral',
          prompt: `Soft pastel background (blush pink, cream) around the photo. Small delicate watercolor flowers as corner decorations. Elegant script font for headline. Feminine and dreamy.`,
        },
        editorial: {
          name: 'Editorial Fashion',
          prompt: `White background with bold black typography around the photo. One strong accent color. Large impactful headline text. High-contrast, magazine-style layout.`,
        },
        tropical: {
          name: 'Tropical Chic',
          prompt: `Warm background with golden/sunset gradient around the photo. Turquoise accent color for text. Optional subtle palm leaf silhouette in corner. Summer vibes, fun and vibrant.`,
        },
      };

      const selectedStyle = VISUAL_STYLES[visualStyle] || VISUAL_STYLES.luxury;

      const promptParts = [
        `You are a professional social media designer. Create a ${isStories ? 'vertical story (9:16)' : 'square post (1:1)'} ad for a nail artist's Instagram/WhatsApp.`,
        ``,
        `CRITICAL — PHOTO PRESERVATION:`,
        `- The provided photograph is REAL and must remain 100% UNTOUCHED and UNMODIFIED`,
        `- Do NOT redraw, repaint, filter, smooth, recolor, or alter the photo in ANY way`,
        `- Do NOT change skin texture, nail colors, lighting, or any detail of the original photo`,
        `- The photo must look EXACTLY as it was taken — a real, authentic photograph`,
        `- Place the original photo as-is, occupying 50-60% of the design area`,
        `- Frame it cleanly: simple border, rounded corners, or a subtle drop shadow is fine`,
        ``,
        `DESIGN AROUND THE PHOTO (not on top of it):`,
        selectedStyle.prompt,
        ``,
        `TEXT (in Portuguese/Brazilian):`,
        title ? `- HEADLINE: "${title}" — bold, clear, easy to read` : '',
        subtitle ? `- SUBTITLE: "${subtitle}" — smaller, secondary` : '',
        location ? `- LOCATION: "📍 ${location}"` : '',
        cta ? `- CTA BUTTON (pill shape at bottom): "${cta}"` : '',
        ``,
        `LAYOUT RULES:`,
        `- Text and design elements go AROUND the photo, not overlaid on it`,
        `- Keep generous whitespace / breathing room`,
        `- Typography must be sharp, legible, and properly contrasted`,
        `- The design should look professional but simple — like a real salon's Instagram`,
        `- Do NOT add fake phone mockups, device frames, or UI elements`,
        `- Do NOT add random decorative emojis or clip art`,
        `- The overall result should look like a clean, modern social media ad`,
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

      const recreatePrompt = `Recreate this nail design as a realistic photograph taken with a good smartphone camera.

${userPrompt ? `CLIENT REQUEST: ${userPrompt}` : 'Recreate this nail design with better lighting and angle.'}

REALISM IS MANDATORY:
- This must look like a REAL photo taken by a person, NOT a render or illustration
- Natural skin texture with visible pores, fine lines, and natural imperfections — do NOT smooth
- Natural nail cuticles and nail bed — nails should look physically real, not plastic
- Real-world lighting: natural daylight or warm indoor light, with natural shadows
- Slight natural imperfections are OK and desirable (makes it look authentic)

COMPOSITION:
- Close-up of hands showing the nail design clearly
- Clean, simple background (table, marble surface, or natural bokeh)
- No text, logos, frames, or any overlay
- Only hands and nails — no face or body`;

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
