import { sendWelcomeEmail } from '../../../../lib/email';
import { getAuthUser } from '../../../../lib/admin';

export async function POST(req) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { email, name } = await req.json();
    if (!email || email !== user.email) {
      return Response.json({ error: 'Email inválido' }, { status: 400 });
    }
    await sendWelcomeEmail(email, name);
    return Response.json({ sent: true });
  } catch (err) {
    return Response.json({ error: 'Erro interno' }, { status: 500 });
  }
}
