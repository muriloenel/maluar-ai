import { getAuthUser, getServiceClient } from '../../../lib/admin';

export async function POST(req) {
  try {
    const user = await getAuthUser(req);
    if (!user) return Response.json({ ok: false }, { status: 401 });

    const supabase = getServiceClient();
    if (!supabase) return Response.json({ ok: true });

    // Atualizar last_seen_at (fire-and-forget pattern, não bloqueia UX)
    await supabase
      .from('profiles')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', user.id);

    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: true });
  }
}
