import { sendWelcomeEmail } from '../../../../lib/email';

export async function POST(req) {
  try {
    const { email, name } = await req.json();
    if (!email) {
      return Response.json({ error: 'Email obrigatório' }, { status: 400 });
    }
    await sendWelcomeEmail(email, name);
    return Response.json({ sent: true });
  } catch (err) {
    console.error('[WELCOME] Error:', err.message);
    return Response.json({ error: 'Erro interno' }, { status: 500 });
  }
}
