import { createClient } from '@supabase/supabase-js';

const STRIPE_SECRET = (process.env.STRIPE_SECRET_KEY || '').trim();
const STRIPE_WEBHOOK_SECRET = (process.env.STRIPE_WEBHOOK_SECRET || '').trim();
const STRIPE_API = 'https://api.stripe.com/v1';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

async function verifyStripeSignature(req) {
  const signature = req.headers.get('stripe-signature');
  if (!signature || !STRIPE_WEBHOOK_SECRET) return null;

  const body = await req.text();
  const parts = {};
  for (const part of signature.split(',')) {
    const [key, value] = part.split('=');
    parts[key] = value;
  }

  const timestamp = parts['t'];
  const expectedSig = parts['v1'];
  if (!timestamp || !expectedSig) return null;

  // Verificar timestamp (tolerância de 5 min)
  const age = Math.abs(Date.now() / 1000 - parseInt(timestamp));
  if (age > 300) return null;

  // Verificar HMAC
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(STRIPE_WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const payload = `${timestamp}.${body}`;
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const hexSig = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');

  if (hexSig !== expectedSig) return null;
  return JSON.parse(body);
}

async function stripeGet(endpoint) {
  const res = await fetch(`${STRIPE_API}${endpoint}`, {
    headers: { 'Authorization': `Bearer ${STRIPE_SECRET}` },
  });
  return res.json();
}

export async function POST(req) {
  try {
    console.log('[WEBHOOK] Recebido evento');

    if (!STRIPE_SECRET || !supabaseServiceKey) {
      console.error('[WEBHOOK] Configuração incompleta:', { hasSecret: !!STRIPE_SECRET, hasServiceKey: !!supabaseServiceKey });
      return Response.json({ error: 'Configuração incompleta' }, { status: 500 });
    }

    const event = await verifyStripeSignature(req);
    if (!event) {
      console.error('[WEBHOOK] Assinatura inválida');
      return Response.json({ error: 'Assinatura inválida' }, { status: 400 });
    }

    console.log(`[WEBHOOK] Evento: ${event.type}`);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.user_id || session.client_reference_id;
        const plan = session.metadata?.plan;
        console.log(`[WEBHOOK] checkout.session.completed: userId=${userId}, plan=${plan}, customer=${session.customer}, subscription=${session.subscription}`);
        console.log(`[WEBHOOK] session.metadata:`, JSON.stringify(session.metadata));
        if (userId && plan) {
          // Primeiro, verificar se o profile existe
          const { data: existingProfile, error: selectError } = await supabase
            .from('profiles')
            .select('id, plan')
            .eq('id', userId)
            .single();
          console.log(`[WEBHOOK] Profile existente:`, existingProfile, 'selectError:', selectError?.message || 'none');

          if (!existingProfile) {
            console.error(`[WEBHOOK] Profile NÃO encontrado para userId=${userId}`);
            break;
          }

          // Update com .select() para confirmar que retornou dados
          const { data: updated, error: updateError } = await supabase
            .from('profiles')
            .update({
              plan,
              stripe_customer_id: session.customer,
              stripe_subscription_id: session.subscription,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId)
            .select('id, plan, stripe_customer_id')
            .single();

          if (updateError) {
            console.error(`[WEBHOOK] Erro ao atualizar profile:`, updateError);
          } else if (!updated) {
            console.error(`[WEBHOOK] Update retornou null — nenhuma row afetada para userId=${userId}`);
          } else {
            console.log(`[WEBHOOK] Plano atualizado com sucesso:`, JSON.stringify(updated));
          }

          // Verificação final: ler o profile de novo pra confirmar
          const { data: verification } = await supabase
            .from('profiles')
            .select('id, plan, stripe_customer_id')
            .eq('id', userId)
            .single();
          console.log(`[WEBHOOK] Verificação final:`, JSON.stringify(verification));
        } else {
          console.warn(`[WEBHOOK] userId ou plan faltando: userId=${userId}, plan=${plan}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const customerId = sub.customer;
        // Buscar usuário pelo customer_id
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (profile) {
          const status = sub.status;
          if (status === 'active') {
            // Manter plano ativo
          } else if (status === 'canceled' || status === 'unpaid' || status === 'past_due') {
            await supabase
              .from('profiles')
              .update({ plan: 'free', updated_at: new Date().toISOString() })
              .eq('id', profile.id);
            console.log(`[STRIPE] Plano revertido para free: ${profile.id}`);
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', sub.customer)
          .single();

        if (profile) {
          await supabase
            .from('profiles')
            .update({ plan: 'free', stripe_subscription_id: null, updated_at: new Date().toISOString() })
            .eq('id', profile.id);
          console.log(`[STRIPE] Assinatura cancelada: ${profile.id}`);
        }
        break;
      }
    }

    return Response.json({ received: true });
  } catch (err) {
    console.error('[STRIPE WEBHOOK] Error:', err.message);
    return Response.json({ error: 'Erro interno' }, { status: 500 });
  }
}
