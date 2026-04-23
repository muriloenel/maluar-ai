const RESEND_API_KEY = (process.env.RESEND_API_KEY || '').trim();
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Maluar AI <noreply@maluarai.com.br>';

// Sanitiza nome para uso seguro em HTML de email (previne XSS)
function sanitizeNameForHtml(name) {
  return (name || 'Nail Designer').replace(/[<>"'&]/g, '').slice(0, 50) || 'Nail Designer';
}

export async function sendWelcomeEmail(email, name) {
  if (!RESEND_API_KEY || !email) return;
  const safeName = sanitizeNameForHtml(name);

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
  const safeName = sanitizeNameForHtml(name);
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
  const safeName = sanitizeNameForHtml(name);
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
  const safeName = sanitizeNameForHtml(name);
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

// ===== Emails de Pix =====

export async function sendPixExpiringEmail(adminEmail, userName, userEmail, plan, expiresAt) {
  if (!RESEND_API_KEY || !adminEmail) return;
  const safeName = sanitizeNameForHtml(userName);
  const planLabel = plan === 'premium' ? 'Premium' : 'Pro';
  const expiresFormatted = new Date(expiresAt).toLocaleDateString('pt-BR');
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM_EMAIL, to: adminEmail,
        subject: `⚠️ Pix vencendo em breve — ${safeName} (${planLabel})`,
        html: `<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#16152B;">
          <div style="text-align:center;margin-bottom:24px;"><h1 style="font-size:24px;margin:0;">Maluar AI</h1><p style="color:#64627A;font-size:13px;margin:4px 0 0;">CONTROLE ADMIN</p></div>
          <h2 style="font-size:20px;margin-bottom:8px;">⚠️ Pagamento Pix vencendo</h2>
          <div style="background:#FEF3C7;border:1px solid #F59E0B;border-radius:8px;padding:16px;margin:16px 0;">
            <p style="margin:0;font-size:14px;"><strong>${safeName}</strong></p>
            <p style="margin:4px 0 0;font-size:13px;color:#92400E;">Email: ${userEmail || 'N/A'}</p>
            <p style="margin:4px 0 0;font-size:13px;color:#92400E;">Plano: ${planLabel}</p>
            <p style="margin:4px 0 0;font-size:13px;color:#92400E;">Vence em: <strong>${expiresFormatted}</strong></p>
          </div>
          <p style="line-height:1.6;color:#333;">Entre em contato com a cliente para renovar o pagamento Pix.</p>
          <div style="text-align:center;margin:28px 0;"><a href="https://maluarai.com.br/admin" style="background:linear-gradient(135deg,#7F77DD,#D4537E);color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">Abrir Painel Admin</a></div>
          <hr style="border:none;border-top:1px solid #E2E0EE;margin:24px 0;"/>
          <p style="color:#9896AB;font-size:11px;text-align:center;">Maluar AI - Painel Admin</p></div>`,
      }),
    });
  } catch {}
}

export async function sendPixExpiredEmail(userEmail, userName) {
  if (!RESEND_API_KEY || !userEmail) return;
  const safeName = sanitizeNameForHtml(userName);
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM_EMAIL, to: userEmail,
        subject: `${safeName}, seu plano expirou — Maluar AI`,
        html: `<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#16152B;">
          <div style="text-align:center;margin-bottom:24px;"><h1 style="font-size:24px;margin:0;">Maluar AI</h1><p style="color:#64627A;font-size:13px;margin:4px 0 0;">NAIL DESIGN AI</p></div>
          <h2 style="font-size:20px;margin-bottom:8px;">Oi ${safeName}</h2>
          <p style="line-height:1.6;color:#333;">Seu pagamento via Pix venceu e seu plano voltou para o <strong>gratuito</strong>.</p>
          <p style="line-height:1.6;color:#333;">Para continuar com acesso completo, entre em contato para renovar seu pagamento via Pix.</p>
          <p style="line-height:1.6;color:#333;">Enquanto isso, voce ainda pode usar o plano gratuito com 15 mensagens por dia.</p>
          <div style="text-align:center;margin:28px 0;"><a href="https://maluarai.com.br" style="background:linear-gradient(135deg,#7F77DD,#D4537E);color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">Acessar Maluar AI</a></div>
          <hr style="border:none;border-top:1px solid #E2E0EE;margin:24px 0;"/>
          <p style="color:#9896AB;font-size:11px;text-align:center;">Maluar AI - Sua mentora de Nail Design</p></div>`,
      }),
    });
  } catch {}
}

export async function sendPixExpiringAdminSummary(adminEmail, expiringList) {
  if (!RESEND_API_KEY || !adminEmail || !expiringList?.length) return;
  const rows = expiringList.map(u => `<tr>
    <td style="padding:8px 12px;border-bottom:1px solid #E2E0EE;font-size:13px;">${sanitizeNameForHtml(u.name)}</td>
    <td style="padding:8px 12px;border-bottom:1px solid #E2E0EE;font-size:13px;">${u.plan === 'premium' ? 'Premium' : 'Pro'}</td>
    <td style="padding:8px 12px;border-bottom:1px solid #E2E0EE;font-size:13px;">${new Date(u.expires_at).toLocaleDateString('pt-BR')}</td>
    <td style="padding:8px 12px;border-bottom:1px solid #E2E0EE;font-size:13px;">${u.email || 'N/A'}</td>
  </tr>`).join('');
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM_EMAIL, to: adminEmail,
        subject: `⚠️ ${expiringList.length} pagamento(s) Pix vencendo em breve — Maluar AI`,
        html: `<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:640px;margin:0 auto;padding:32px 24px;color:#16152B;">
          <div style="text-align:center;margin-bottom:24px;"><h1 style="font-size:24px;margin:0;">Maluar AI</h1><p style="color:#64627A;font-size:13px;margin:4px 0 0;">CONTROLE ADMIN</p></div>
          <h2 style="font-size:20px;margin-bottom:16px;">⚠️ ${expiringList.length} Pix vencendo nos proximos 5 dias</h2>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <thead><tr style="background:#F3F4F6;">
              <th style="padding:8px 12px;text-align:left;font-size:12px;text-transform:uppercase;color:#6B7280;">Nome</th>
              <th style="padding:8px 12px;text-align:left;font-size:12px;text-transform:uppercase;color:#6B7280;">Plano</th>
              <th style="padding:8px 12px;text-align:left;font-size:12px;text-transform:uppercase;color:#6B7280;">Vence</th>
              <th style="padding:8px 12px;text-align:left;font-size:12px;text-transform:uppercase;color:#6B7280;">Email</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <div style="text-align:center;margin:28px 0;"><a href="https://maluarai.com.br/admin" style="background:linear-gradient(135deg,#7F77DD,#D4537E);color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">Abrir Painel Admin</a></div>
          <hr style="border:none;border-top:1px solid #E2E0EE;margin:24px 0;"/>
          <p style="color:#9896AB;font-size:11px;text-align:center;">Maluar AI - Painel Admin</p></div>`,
      }),
    });
  } catch {}
}
