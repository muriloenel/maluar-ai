export const metadata = {
  title: 'Termos de Uso — Maluar AI',
};

export default function TermosPage() {
  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <a href="/" className="text-accent hover:underline text-sm">&larr; Voltar</a>
        <h1 className="text-3xl font-bold text-text mt-6 mb-8">Termos de Uso</h1>
        <div className="prose prose-sm text-text-muted space-y-4 [&_h2]:text-text [&_h2]:font-semibold [&_h2]:text-lg [&_h2]:mt-6">
          <p><strong>Última atualização:</strong> Abril de 2026</p>

          <h2>1. Aceitação dos Termos</h2>
          <p>Ao acessar e utilizar a plataforma Maluar AI, você concorda com estes Termos de Uso. Se não concordar, não utilize o serviço.</p>

          <h2>2. Descrição do Serviço</h2>
          <p>Maluar AI é uma plataforma de inteligência artificial especializada em Nail Design, oferecendo assistência técnica, dicas de negócio, criação de conteúdo e ferramentas de precificação para profissionais da área.</p>

          <h2>3. Cadastro e Conta</h2>
          <p>Para usar o serviço completo, é necessário criar uma conta com email válido. Você é responsável por manter a segurança de suas credenciais. Não compartilhe sua senha com terceiros.</p>

          <h2>4. Planos e Pagamentos</h2>
          <p>O serviço oferece planos gratuito e pagos. Os planos pagos são cobrados via assinatura mensal processada pela Stripe. Cancelamentos podem ser feitos a qualquer momento e terão efeito ao final do ciclo de faturamento vigente.</p>

          <h2>5. Uso Aceitável</h2>
          <p>Você concorda em não:</p>
          <ul>
            <li>Usar o serviço para fins ilegais ou não autorizados</li>
            <li>Tentar burlar limites de uso ou sistemas de segurança</li>
            <li>Compartilhar conteúdo ofensivo, discriminatório ou ilegal</li>
            <li>Revender ou redistribuir o acesso ao serviço</li>
            <li>Usar automatizações ou bots para acessar o serviço</li>
          </ul>

          <h2>6. Propriedade Intelectual</h2>
          <p>O conteúdo gerado pela IA para você pode ser usado livremente em seu negócio. A plataforma, marca e tecnologia são propriedade de Maluar AI.</p>

          <h2>7. Limitação de Responsabilidade</h2>
          <p>As respostas da IA são sugestões e não substituem consultoria profissional. Não nos responsabilizamos por decisões tomadas com base nas respostas fornecidas. Para questões de saúde, procure um dermatologista.</p>

          <h2>8. Modificações</h2>
          <p>Podemos atualizar estes termos periodicamente. Mudanças significativas serão comunicadas por email ou notificação no app.</p>

          <h2>9. Contato</h2>
          <p>Para dúvidas sobre estes termos: <strong>contato@maluar.ai</strong></p>
        </div>
      </div>
    </div>
  );
}
