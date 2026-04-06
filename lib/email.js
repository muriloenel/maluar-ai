const RESEND_API_KEY = (process.env.RESEND_API_KEY || '').trim();
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Maluar AI <noreply@maluarai.com.br>';

export async function sendWelcomeEmail(email, name) {
  if (!RESEND_API_KEY || !email) return;
  const safeName = (name || 'Nail Designer').slice(0, 50);

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: email,
        subject: `Bem-vinda à Maluar AI, ${safeName}! 💅`,
        html: `
          <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #16152B;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="font-size: 24px; margin: 0; color: #16152B;">Maluar AI</h1>
              <p style="color: #64627A; font-size: 13px; margin: 4px 0 0;">NAIL DESIGN AI</p>
            </div>
            <h2 style="font-size: 20px; margin-bottom: 8px;">Oi, ${safeName}! 💅</h2>
            <p style="line-height: 1.6; color: #333;">
              Que bom ter você aqui! A Maluar AI foi criada pra te ajudar a crescer como nail designer — 
              tanto na técnica quanto no negócio.
            </p>
            <p style="line-height: 1.6; color: #333;">
              <strong>O que você pode fazer:</strong>
            </p>
            <ul style="line-height: 1.8; color: #333; padding-left: 20px;">
              <li>Tirar dúvidas de técnica e produtos</li>
              <li>Mandar fotos de unhas pra análise</li>
              <li>Montar planos de captação de clientes</li>
              <li>Calcular preços corretamente</li>
              <li>Gerar posts pro Instagram</li>
            </ul>
            <div style="text-align: center; margin: 28px 0;">
              <a href="https://maluarai.com.br" style="background: linear-gradient(135deg, #7F77DD, #D4537E); color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
                Acessar Maluar AI
              </a>
            </div>
            <p style="line-height: 1.6; color: #64627A; font-size: 13px;">
              Me pergunta qualquer coisa — técnicas, produtos, preços ou manda foto pra eu analisar. 
              Bora crescer juntas! 🚀
            </p>
            <hr style="border: none; border-top: 1px solid #E2E0EE; margin: 24px 0;" />
            <p style="color: #9896AB; font-size: 11px; text-align: center;">
              Maluar AI — Sua mentora de Nail Design
            </p>
          </div>
        `,
      }),
    });
  } catch {}
}

export async function sendUpgradeEmail(email, name, plan) {
  if (!RESEND_API_KEY || !email) return;
  const safeName = (name || 'Nail Designer').slice(0, 50);
  const planLabel = plan === 'premium' ? 'Premium ✨' : 'Pro 💅';

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: email,
        subject: `Plano ${planLabel} ativado! Parabéns, ${safeName}!`,
        html: `
          <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #16152B;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="font-size: 24px; margin: 0; color: #16152B;">Maluar AI</h1>
              <p style="color: #64627A; font-size: 13px; margin: 4px 0 0;">NAIL DESIGN AI</p>
            </div>
            <h2 style="font-size: 20px; margin-bottom: 8px;">Parabéns, ${safeName}! 🎉</h2>
            <p style="line-height: 1.6; color: #333;">
              Seu plano <strong>${planLabel}</strong> está ativo! Agora você tem acesso a tudo que precisa pra 
              levar seu negócio pro próximo nível.
            </p>
            <p style="line-height: 1.6; color: #333;">
              <strong>Seus novos recursos:</strong>
            </p>
            <ul style="line-height: 1.8; color: #333; padding-left: 20px;">
              ${plan === 'premium' ? `
                <li>Mensagens ilimitadas</li>
                <li>Análise de fotos avançada</li>
                <li>Gerador de posts ilimitado</li>
                <li>Planos de ação personalizados</li>
                <li>Meu Negócio completo</li>
                <li>Suporte VIP</li>
              ` : `
                <li>150 mensagens por dia</li>
                <li>Análise de fotos avançada</li>
                <li>Gerador de posts</li>
                <li>Planos de ação personalizados</li>
                <li>Suporte prioritário</li>
              `}
            </ul>
            <div style="text-align: center; margin: 28px 0;">
              <a href="https://maluarai.com.br" style="background: linear-gradient(135deg, #7F77DD, #D4537E); color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
                Acessar Maluar AI
              </a>
            </div>
            <hr style="border: none; border-top: 1px solid #E2E0EE; margin: 24px 0;" />
            <p style="color: #9896AB; font-size: 11px; text-align: center;">
              Maluar AI — Sua mentora de Nail Design
            </p>
          </div>
        `,
      }),
    });
  } catch {}
}

export async function sendCancellationEmail(email, name) {
  if (!RESEND_API_KEY || !email) return;
  const safeName = (name || 'Nail Designer').slice(0, 50);
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM_EMAIL, to: email,
        subject: `${safeName}, sentimos sua falta`,
        html: `<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#16152B;">
          <div style="text-align:center;margin-bottom:24px;"><h1 style="font-size:24px;margin:0;">Maluar AI</h1><p style="color:#64627A;font-size:13px;margin:4px 0 0;">NAIL DESIGN AI</p></div>
          <h2 style="font-size:20px;margin-bottom:8px;">Oi ${safeName}</h2>
          <p style="line-height:1.6;color:#333;">Vimos que voce cancelou sua assinatura. Que pena!</p>
          <p style="line-height:1.6;color:#333;">Seu acesso ao plano gratuito continua ativo com 15 mensagens por dia. Se mudar de ideia, pode voltar a qualquer momento.</p>
          <p style="line-height:1.6;color:#333;"><strong>Se teve algum problema ou sugestao, responda esse email.</strong> Sua opiniao e super importante pra gente melhorar!</p>
          <div style="text-align:center;margin:28px 0;"><a href="https://maluarai.com.br" style="background:linear-gradient(135deg,#7F77DD,#D4537E);color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">Voltar para o Maluar AI</a></div>
          <hr style="border:none;border-top:1px solid #E2E0EE;margin:24px 0;"/>
          <p style="color:#9896AB;font-size:11px;text-align:center;">Maluar AI - Sua mentora de Nail Design</p></div>`,
      }),
    });
  } catch {}
}

export async function sendPaymentFailedEmail(email, name) {
  if (!RESEND_API_KEY || !email) return;
  const safeName = (name || 'Nail Designer').slice(0, 50);
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM_EMAIL, to: email,
        subject: 'Problema no pagamento da sua assinatura - Maluar AI',
        html: `<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#16152B;">
          <div style="text-align:center;margin-bottom:24px;"><h1 style="font-size:24px;margin:0;">Maluar AI</h1><p style="color:#64627A;font-size:13px;margin:4px 0 0;">NAIL DESIGN AI</p></div>
          <h2 style="font-size:20px;margin-bottom:8px;">Oi ${safeName}</h2>
          <p style="line-height:1.6;color:#333;">Nao conseguimos processar o pagamento da sua assinatura. Isso pode acontecer por limite do cartao, cartao vencido ou dados desatualizados.</p>
          <p style="line-height:1.6;color:#333;"><strong>Para nao perder seu acesso</strong>, atualize seus dados de pagamento:</p>
          <div style="text-align:center;margin:28px 0;"><a href="https://maluarai.com.br" style="background:linear-gradient(135deg,#7F77DD,#D4537E);color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">Atualizar Pagamento</a></div>
          <p style="line-height:1.6;color:#64627A;font-size:13px;">Se o pagamento nao for atualizado, seu plano sera rebaixado para o gratuito automaticamente.</p>
          <hr style="border:none;border-top:1px solid #E2E0EE;margin:24px 0;"/>
          <p style="color:#9896AB;font-size:11px;text-align:center;">Maluar AI - Sua mentora de Nail Design</p></div>`,
      }),
    });
  } catch {}
}
