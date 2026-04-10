export const metadata = {
  title: 'Política de Privacidade — Maluar AI',
};

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <a href="/" className="text-accent hover:underline text-sm">&larr; Voltar</a>
        <h1 className="text-3xl font-bold text-text mt-6 mb-8">Política de Privacidade</h1>
        <div className="prose prose-sm text-text-muted space-y-4 [&_h2]:text-text [&_h2]:font-semibold [&_h2]:text-lg [&_h2]:mt-6">
          <p><strong>Última atualização:</strong> Abril de 2026</p>
          <p>Esta política está em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018).</p>

          <h2>1. Dados que Coletamos</h2>
          <ul>
            <li><strong>Dados de cadastro:</strong> nome, email</li>
            <li><strong>Dados de uso:</strong> conversas com a IA, posts criados, favoritos salvos</li>
            <li><strong>Dados de pagamento:</strong> processados diretamente pela Stripe (não armazenamos dados de cartão)</li>
            <li><strong>Dados técnicos:</strong> IP (para rate limiting), tipo de dispositivo</li>
          </ul>

          <h2>2. Como Usamos seus Dados</h2>
          <ul>
            <li>Fornecer e melhorar o serviço de IA</li>
            <li>Gerenciar sua conta e assinatura</li>
            <li>Enviar comunicações sobre o serviço</li>
            <li>Garantir segurança e prevenir abusos</li>
          </ul>

          <h2>3. Compartilhamento de Dados</h2>
          <p>Seus dados NÃO são vendidos a terceiros. Compartilhamos apenas com:</p>
          <ul>
            <li><strong>Anthropic (Claude):</strong> suas mensagens são enviadas à API para gerar respostas (não são armazenadas pela Anthropic após processamento)</li>
            <li><strong>Supabase:</strong> infraestrutura de banco de dados e autenticação</li>
            <li><strong>Stripe:</strong> processamento de pagamentos</li>
            <li><strong>Vercel:</strong> hospedagem da aplicação</li>
          </ul>

          <h2>4. Seus Direitos (LGPD)</h2>
          <p>Você tem direito a:</p>
          <ul>
            <li><strong>Acesso:</strong> exportar todos os seus dados a qualquer momento</li>
            <li><strong>Correção:</strong> atualizar seus dados pessoais</li>
            <li><strong>Exclusão:</strong> deletar sua conta e todos os dados permanentemente</li>
            <li><strong>Portabilidade:</strong> receber seus dados em formato JSON</li>
          </ul>
          <p>Para exercer esses direitos, acesse <strong>Configurações &gt; Minha Conta</strong> no aplicativo ou entre em contato conosco.</p>

          <h2>5. Armazenamento e Segurança</h2>
          <ul>
            <li>Dados armazenados em servidores seguros (Supabase — AWS)</li>
            <li>Comunicação criptografada via HTTPS/TLS</li>
            <li>Row Level Security (RLS) — cada usuário acessa apenas seus próprios dados</li>
            <li>Tokens de autenticação com expiração automática</li>
          </ul>

          <h2>6. Retenção de Dados</h2>
          <p>Seus dados são mantidos enquanto sua conta estiver ativa. Após exclusão da conta, todos os dados são removidos permanentemente em até 30 dias.</p>

          <h2>7. Cookies</h2>
          <p>Utilizamos apenas cookies essenciais para autenticação (token de sessão). Não usamos cookies de rastreamento ou publicidade.</p>

          <h2>8. Alterações</h2>
          <p>Atualizações nesta política serão comunicadas por email. O uso continuado após alterações implica aceitação.</p>

          <h2>9. Encarregado de Proteção de Dados (DPO)</h2>
          <p>
            Nos termos do Art. 41 da LGPD, o encarregado pela proteção de dados pessoais é:<br />
            <strong>Karina Oliveira</strong><br />
            Email: <strong>privacidade@maluar.ai</strong>
          </p>
          <p>Para exercer seus direitos de titular ou esclarecer dúvidas sobre o tratamento de seus dados, entre em contato pelo email acima.</p>
        </div>
      </div>
    </div>
  );
}
