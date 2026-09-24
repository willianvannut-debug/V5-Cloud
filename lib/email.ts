import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function enviarEmailBoasVindas(emailDestino: string, nomeCliente: string) {
  try {
    const data = await resend.emails.send({
      from: 'V5 Cloud <onboarding@resend.dev>', // Pode alterar para o seu domínio verificado futuramente
      to: [emailDestino],
      subject: 'Bem-vindo à V5 Cloud! 🚀',
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; padding: 20px; max-width: 600px; margin: auto; background-color: #f9f9f9; border-radius: 8px;">
          <h2 style="color: #0070f3;">Olá, ${nomeCliente}!</h2>
          <p>É um enorme prazer ter você a bordo da <strong>V5 Cloud</strong>.</p>
          <p>A sua conta foi configurada com sucesso e já está pronta para gerir a sua operação de internet e telecomunicações com total autonomia e controlo.</p>
          
          <div style="margin: 30px 0; text-align: center;">
            <a href="https://v5-cloud.vercel.app/login" style="background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Acessar o Sistema</a>
          </div>

          <p>Se precisar de ajuda ou tiver alguma dúvida, a nossa equipa está sempre à disposição.</p>
          <p style="margin-top: 30px;">Atenciosamente,<br><strong>Equipe V5 Cloud</strong></p>
        </div>
      `,
    });

    console.log('E-mail de boas-vindas enviado com sucesso:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao enviar e-mail de boas-vindas:', error);
    return { success: false, error };
  }
}