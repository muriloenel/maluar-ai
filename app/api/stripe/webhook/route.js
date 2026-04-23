import { createClient } from '@supabase/supabase-js';
import { sendUpgradeEmail, sendCancellationEmail, sendPaymentFailedEmail } from '../../../../lib/email';

const STRIPE_SECRET = (process.env.STRIPE_SECRET_KEY || '').trim();
const STRIPE_WEBHOOK_SECRET = (process.env.STRIPE_WEBHOOK_SECRET || '').trim();
const STRIPE_API = 'https://api.stripe.com/v1';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

// Mapa reverso: price ID → nome do plano (para subscription events que não carregam metadata)
const PRICE_TO_PLAN = {};
if (process.env.STRIPE_PRICE_PRO) PRICE_TO_PLAN[process.env.STRIPE_PRICE_PRO.trim()] = 'pro';
if (process.env.STRIPE_PRICE_PREMIUM) PRICE_TO_PLAN[process.env.STRIPE_PRICE_PREMIUM.trim()] = 'premium';

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
    if (!STRIPE_SECRET || !supabaseServiceKey) {
      console.error('[WEBHOOK] Configuração incompleta');
      return Response.json({ error: 'Configuração incompleta' }, { status: 500 });
    }

    const event = await verifyStripeSignature(req);
    if (!event) {
      console.error('[WEBHOOK] Assinatura inválida');
      return Response.json({ error: 'Assinatura inválida' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Idempotência: verificar se evento já foi processado
    const eventId = event.id;
    if (eventId) {
      const { data: existing } = await supabase
        .from('webhook_events')
        .select('id')
        .eq('event_id', eventId)
        .single();
      if (existing) {
        return Response.json({ received: true, duplicate: true });
      }
      // Registrar evento como processado (ignora erro se tabela não existir)
      await supabase.from('webhook_events').insert({ event_id: eventId }).catch(() => {});
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.user_id || session.client_reference_id;
        const plan = session.metadata?.plan;

        if (!userId || !plan) {
          console.warn(`[WEBHOOK] userId ou plan faltando`);
          break;
        }

        // Boleto: payment_status será 'unpaid' (cliente ainda não pagou)
        // Cartão: payment_status será 'paid' (pagamento instantâneo)
        if (session.payment_status !== 'paid') {
          console.log(`[WEBHOOK] checkout.session.completed com payment_status=${session.payment_status} — aguardando pagamento (boleto)`);
          break;
        }

        // Verificar se o profile existe
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', userId)
          .single();

        if (!existingProfile) {
          console.error(`[WEBHOOK] Profile não encontrado para userId=${userId}`);
          break;
        }

        // Atualizar plano
        const { data: updated, error: updateError } = await supabase
          .from('profiles')
          .update({
            plan,
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)
          .select('id, plan')
          .single();

        if (updateError) {
          console.error(`[WEBHOOK] Erro ao atualizar profile:`, updateError.message);
        } else if (!updated) {
          console.error(`[WEBHOOK] Update retornou null para userId=${userId}`);
        } else {
          // Enviar email de upgrade (async, não bloqueia)
          const customerEmail = session.customer_email || session.customer_details?.email;
          if (customerEmail) {
            sendUpgradeEmail(customerEmail, null, plan).catch(() => {});
          }
        }
        break;
      }

      case 'checkout.session.async_payment_succeeded': {
        // Boleto pago! Ativar plano agora
        const asyncSession = event.data.object;
        const asyncUserId = asyncSession.metadata?.user_id || asyncSession.client_reference_id;
        const asyncPlan = asyncSession.metadata?.plan;

        if (!asyncUserId || !asyncPlan) {
          console.warn(`[WEBHOOK] async_payment_succeeded: userId ou plan faltando`);
          break;
        }

        const { data: asyncProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', asyncUserId)
          .single();

        if (!asyncProfile) {
          console.error(`[WEBHOOK] async_payment_succeeded: Profile não encontrado para userId=${asyncUserId}`);
          break;
        }

        const { error: asyncUpdateError } = await supabase
          .from('profiles')
          .update({
            plan: asyncPlan,
            stripe_customer_id: asyncSession.customer,
            stripe_subscription_id: asyncSession.subscription,
            updated_at: new Date().toISOString(),
          })
          .eq('id', asyncUserId);

        if (asyncUpdateError) {
          console.error(`[WEBHOOK] async_payment_succeeded: Erro ao ativar plano:`, asyncUpdateError.message);
        } else {
          console.log(`[WEBHOOK] async_payment_succeeded: Plano ${asyncPlan} ativado para ${asyncUserId}`);
          const asyncEmail = asyncSession.customer_email || asyncSession.customer_details?.email;
          if (asyncEmail) {
            sendUpgradeEmail(asyncEmail, null, asyncPlan).catch(() => {});
          }
        }
        break;
      }

      case 'checkout.session.async_payment_failed': {
        // Boleto expirou ou falhou
        const failedSession = event.data.object;
        const failedEmail = failedSession.customer_email || failedSession.customer_details?.email;
        console.warn(`[WEBHOOK] async_payment_failed: Boleto expirou/falhou para ${failedEmail || 'desconhecido'}`);
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        // Tentar encontrar profile por stripe_customer_id, fallback por user_id do metadata
        let profile = null;
        const { data: byCustomer } = await supabase
          .from('profiles')
          .select('id, plan')
          .eq('stripe_customer_id', sub.customer)
          .single();
        profile = byCustomer;
        if (!profile && sub.metadata?.user_id) {
          const { data: byUserId } = await supabase
            .from('profiles')
            .select('id, plan')
            .eq('id', sub.metadata.user_id)
            .single();
          profile = byUserId;
          // Associar customer_id para próximas buscas
          if (profile) {
            await supabase.from('profiles').update({ stripe_customer_id: sub.customer }).eq('id', profile.id);
          }
        }

        if (profile) {
          const status = sub.status;
          if (status === 'canceled' || status === 'unpaid') {
            // Cancelado ou impago definitivo — rebaixar imediatamente
            await supabase
              .from('profiles')
              .update({ plan: 'free', updated_at: new Date().toISOString() })
              .eq('id', profile.id);
          } else if (status === 'past_due') {
            // Grace period: manter plano ativo, enviar alerta de pagamento
            // O rebaixamento acontece apenas em 'unpaid' ou 'canceled' (Stripe escala automaticamente)
            const customer = await stripeGet(`/customers/${sub.customer}`).catch(() => null);
            if (customer?.email) {
              sendPaymentFailedEmail(customer.email, customer.name).catch(() => {});
            }
            console.log(`[WEBHOOK] past_due para ${profile.id} — grace period, plano mantido`);
          } else if (status === 'active' || status === 'trialing') {
            // Assinatura ativa — garantir que o plano está correto no DB
            // Resolve caso checkout.session.completed tenha falhado
            const priceId = sub.items?.data?.[0]?.price?.id;
            const correctPlan = sub.metadata?.plan || PRICE_TO_PLAN[priceId];
            if (correctPlan && profile.plan !== correctPlan) {
              console.log(`[WEBHOOK] Corrigindo plano: ${profile.plan} → ${correctPlan} para ${profile.id}`);
              await supabase
                .from('profiles')
                .update({ plan: correctPlan, updated_at: new Date().toISOString() })
                .eq('id', profile.id);
            }
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        let delProfile = null;
        const { data: delByCustomer } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', sub.customer)
          .single();
        delProfile = delByCustomer;
        if (!delProfile && sub.metadata?.user_id) {
          const { data: delByUserId } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', sub.metadata.user_id)
            .single();
          delProfile = delByUserId;
        }

        if (delProfile) {
          await supabase
            .from('profiles')
            .update({ plan: 'free', stripe_subscription_id: null, updated_at: new Date().toISOString() })
            .eq('id', delProfile.id);

          // Enviar email de cancelamento
          const customer = await stripeGet(`/customers/${sub.customer}`).catch(() => null);
          if (customer?.email) {
            sendCancellationEmail(customer.email, customer.name).catch(() => {});
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        if (customerId) {
          const customer = await stripeGet(`/customers/${customerId}`).catch(() => null);
          if (customer?.email) {
            sendPaymentFailedEmail(customer.email, customer.name).catch(() => {});
          }
        }
        break;
      }
    }

    return Response.json({ received: true });
  } catch (err) {
    console.error('[WEBHOOK] Error:', err.message);
    return Response.json({ error: 'Erro interno' }, { status: 500 });
  }
}
