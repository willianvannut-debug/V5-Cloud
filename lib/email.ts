// ============================================
// V5 CLOUD — SERVICO CENTRAL DE E-MAILS
// 35 Templates Completos
// Fase 1: Essenciais (5) | Fase 2: Seguranca (5)
// Fase 3: Financeiro (9) | Fase 4: Conta/Empresa (4)
// Fase 5: Suporte (4) | Fase 6: Sistema (3)
// Fase 7: Legal/LGPD (3) | Fase 8: Relatorios (2)
// ============================================
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const CONFIG = {
  remetentePadrao: 'V5 Cloud <noreply@v5fibra.com.br>',
  remetenteFinanceiro: 'V5 Cloud Financeiro <financeiro@v5fibra.com.br>',
  remetenteSuporte: 'V5 Cloud Suporte <suporte@v5fibra.com.br>',
  urlBase: process.env.NEXT_PUBLIC_APP_URL || 'https://app.v5fibra.com.br',
  nomeApp: 'V5 Cloud',
};

interface EnvioEmailParams {
  para: string;
  assunto: string;
  html: string;
  de?: string;
  responderPara?: string;
}

export async function enviarEmail({ para, assunto, html, de, responderPara }: EnvioEmailParams) {
  try {
    const resultado = await resend.emails.send({
      from: de || CONFIG.remetentePadrao,
      to: para,
      subject: assunto,
      html: html,
      reply_to: responderPara,
    });

    console.log(`Email enviado para ${para}: ${assunto}`);
    return { sucesso: true, id: resultado.data?.id };
  } catch (erro) {
    console.error(`Falha ao enviar email para ${para}:`, erro);
    return { sucesso: false, erro: String(erro) };
  }
}

// =============================================
// FASE 1 — ESSENCIAIS
// =============================================

// 1. CONFIRMACAO DE CADASTRO (OTP 6 digitos)
export async function enviarCodigoVerificacao(para: string, nome: string, codigo: string) {
  const digitos = codigo.split('');

  const html = gerarTemplateBase({
    iconeEmoji: '&#128272;',
    titulo: 'Confirme seu e-mail',
    subtitulo: 'Um passo para ativar sua conta',
    conteudo: `
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 8px;">
        Ol&aacute; <strong style="color:#fff;">${nome}</strong>,
      </p>
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 28px;">
        Use o c&oacute;digo abaixo para verificar seu e-mail e ativar sua conta na V5 Cloud.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;">
        <tr>
          <td align="center">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                ${digitos.map(d => `
                  <td style="padding:0 4px;">
                    <div style="width:48px;height:56px;background:linear-gradient(135deg,#064e3b,#065f46);border:2px solid #10b981;border-radius:12px;text-align:center;line-height:56px;font-family:'Courier New',monospace;font-size:28px;font-weight:900;color:#34d399;">
                      ${d}
                    </div>
                  </td>
                `).join('')}
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <div style="background:#1a1a2e;border-left:3px solid #10b981;border-radius:0 8px 8px 0;padding:14px 18px;margin:0 0 20px;">
        <p style="color:#a1a1aa;font-size:13px;line-height:1.5;margin:0;">
          &#9200; Este c&oacute;digo expira em <strong style="color:#34d399;">15 minutos</strong>
        </p>
      </div>

      <p style="color:#71717a;font-size:12px;line-height:1.5;margin:0;">
        Se voc&ecirc; n&atilde;o solicitou este c&oacute;digo, ignore este e-mail com seguran&ccedil;a.
      </p>
    `,
  });

  return enviarEmail({
    para,
    assunto: `${codigo} — Código de Verificação V5 Cloud`,
    html,
  });
}

// 2. BOAS-VINDAS
export async function enviarBoasVindas(para: string, nome: string, plano: string) {
  const html = gerarTemplateBase({
    iconeEmoji: '&#128640;',
    titulo: `Bem-vindo, ${nome}!`,
    subtitulo: 'Sua conta est&aacute; pronta para usar',
    conteudo: `
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 24px;">
        Sua conta foi criada com sucesso e seu plano <strong style="color:#34d399;">${plano.toUpperCase()}</strong> j&aacute; est&aacute; ativo. Voc&ecirc; tem acesso completo ao painel de gest&atilde;o.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;">
        ${[
          { icone: '&#128202;', titulo: 'Leads & OS', desc: 'Gerencie leads e ordens de servi&ccedil;o' },
          { icone: '&#128101;', titulo: 'Equipe', desc: 'Cadastre t&eacute;cnicos e atendentes' },
          { icone: '&#128200;', titulo: 'M&eacute;tricas', desc: 'Acompanhe relat&oacute;rios em tempo real' },
          { icone: '&#9881;&#65039;', titulo: 'Configura&ccedil;&otilde;es', desc: 'Personalize sua opera&ccedil;&atilde;o' },
        ].map(item => `
          <tr>
            <td style="padding:6px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1a1a2e;border-radius:10px;border:1px solid #262640;">
                <tr>
                  <td width="50" style="padding:14px;text-align:center;font-size:20px;">${item.icone}</td>
                  <td style="padding:14px 14px 14px 0;">
                    <p style="margin:0 0 2px;color:#fff;font-size:13px;font-weight:700;">${item.titulo}</p>
                    <p style="margin:0;color:#a1a1aa;font-size:12px;">${item.desc}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        `).join('')}
      </table>

      ${gerarBotao('Acessar Meu Painel', `${CONFIG.urlBase}/login`)}

      <p style="color:#71717a;font-size:12px;line-height:1.5;margin:20px 0 0;text-align:center;">
        Precisa de ajuda? Responda este e-mail ou acesse nosso suporte.
      </p>
    `,
  });

  return enviarEmail({
    para,
    assunto: `Bem-vindo à V5 Cloud, ${nome}! Sua conta está pronta.`,
    html,
    responderPara: 'suporte@v5fibra.com.br',
  });
}

// 3. RECUPERACAO DE SENHA
export async function enviarRecuperacaoSenha(para: string, nome: string, token: string) {
  const linkReset = `${CONFIG.urlBase}/redefinir-senha?token=${token}`;

  const html = gerarTemplateBase({
    iconeEmoji: '&#128274;',
    titulo: 'Redefinir sua senha',
    subtitulo: 'Solicita&ccedil;&atilde;o de redefini&ccedil;&atilde;o de senha',
    conteudo: `
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 8px;">
        Ol&aacute; <strong style="color:#fff;">${nome}</strong>,
      </p>
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 28px;">
        Recebemos uma solicita&ccedil;&atilde;o para redefinir a senha da sua conta. Clique no bot&atilde;o abaixo para criar uma nova senha:
      </p>

      ${gerarBotao('Redefinir Minha Senha', linkReset)}

      <div style="background:#1a1a2e;border-left:3px solid #10b981;border-radius:0 8px 8px 0;padding:14px 18px;margin:24px 0 20px;">
        <p style="color:#a1a1aa;font-size:13px;line-height:1.5;margin:0;">
          &#9200; Este link expira em <strong style="color:#34d399;">30 minutos</strong>
        </p>
      </div>

      <p style="color:#71717a;font-size:13px;line-height:1.6;margin:0 0 20px;">
        Se voc&ecirc; n&atilde;o solicitou a redefini&ccedil;&atilde;o, ignore este e-mail. Sua senha permanecer&aacute; inalterada.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#111;border:1px solid #262626;border-radius:10px;">
        <tr>
          <td style="padding:14px 18px;">
            <p style="color:#71717a;font-size:11px;line-height:1.6;margin:0;">
              &#128279; Se o bot&atilde;o n&atilde;o funcionar, copie e cole este link:<br/>
              <a href="${linkReset}" style="color:#34d399;word-break:break-all;font-size:11px;text-decoration:none;">${linkReset}</a>
            </p>
          </td>
        </tr>
      </table>
    `,
  });

  return enviarEmail({
    para,
    assunto: 'Redefinição de Senha — V5 Cloud',
    html,
  });
}

// 4. SENHA ALTERADA
export async function enviarAvisoSenhaAlterada(para: string, nome: string) {
  const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  const html = gerarTemplateBase({
    iconeEmoji: '&#128170;',
    titulo: 'Senha alterada com sucesso',
    subtitulo: 'Notifica&ccedil;&atilde;o de seguran&ccedil;a da sua conta',
    conteudo: `
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 8px;">
        Ol&aacute; <strong style="color:#fff;">${nome}</strong>,
      </p>
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 28px;">
        Confirmamos que a senha da sua conta foi alterada com sucesso. Veja os detalhes:
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1a1a2e;border-radius:12px;border:1px solid #262640;margin:0 0 24px;">
        <tr>
          <td style="padding:18px 20px;border-bottom:1px solid #262640;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Data/Hora</td>
                <td align="right" style="color:#e4e4e7;font-size:13px;font-family:'Courier New',monospace;">${agora}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Conta</td>
                <td align="right" style="color:#e4e4e7;font-size:13px;font-family:'Courier New',monospace;">${para}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#2d1215;border-radius:12px;border:1px solid #5c1d24;">
        <tr>
          <td style="padding:18px 20px;">
            <p style="color:#fca5a5;font-size:13px;font-weight:700;line-height:1.5;margin:0 0 6px;">
              &#9888;&#65039; N&atilde;o foi voc&ecirc;?
            </p>
            <p style="color:#e8a1a1;font-size:13px;line-height:1.6;margin:0;">
              Se voc&ecirc; n&atilde;o fez esta altera&ccedil;&atilde;o, sua conta pode estar comprometida.
              Entre em contato: <a href="mailto:suporte@v5fibra.com.br" style="color:#fca5a5;text-decoration:underline;font-weight:600;">suporte@v5fibra.com.br</a>
            </p>
          </td>
        </tr>
      </table>
    `,
  });

  return enviarEmail({
    para,
    assunto: 'Sua senha foi alterada — V5 Cloud',
    html,
  });
}

// 5. ASSINATURA ATIVADA
export async function enviarAssinaturaAtivada(
  para: string,
  nome: string,
  plano: string,
  valor: string,
  proximaCobranca: string
) {
  const html = gerarTemplateBase({
    iconeEmoji: '&#9989;',
    titulo: 'Assinatura Ativada',
    subtitulo: `Plano ${plano.toUpperCase()} confirmado`,
    conteudo: `
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 8px;">
        Ol&aacute; <strong style="color:#fff;">${nome}</strong>,
      </p>
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 28px;">
        Seu pagamento foi confirmado e sua assinatura est&aacute; ativa. Obrigado por escolher a V5 Cloud!
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,#0a2818,#1a1a2e);border-radius:12px;border:1px solid #10b98130;margin:0 0 8px;">
        <tr>
          <td style="padding:24px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="33%" align="center" style="padding:8px 4px;">
                  <p style="margin:0 0 6px;color:#34d399;font-size:20px;font-weight:900;">${plano.toUpperCase()}</p>
                  <p style="margin:0;color:#71717a;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;">Plano</p>
                </td>
                <td width="1" style="background:#262640;">&nbsp;</td>
                <td width="33%" align="center" style="padding:8px 4px;">
                  <p style="margin:0 0 6px;color:#fff;font-size:20px;font-weight:900;">R$${valor}</p>
                  <p style="margin:0;color:#71717a;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;">Mensal</p>
                </td>
                <td width="1" style="background:#262640;">&nbsp;</td>
                <td width="33%" align="center" style="padding:8px 4px;">
                  <span style="display:inline-block;background:#10b98125;color:#34d399;font-size:12px;font-weight:800;padding:4px 14px;border-radius:20px;border:1px solid #10b98140;">ATIVO</span>
                  <p style="margin:6px 0 0;color:#71717a;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;">Status</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1a1a2e;border-radius:12px;border:1px solid #262640;margin:0 0 28px;">
        <tr>
          <td style="padding:18px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="color:#71717a;font-size:12px;">Pr&oacute;xima cobran&ccedil;a</td>
                <td align="right" style="color:#e4e4e7;font-size:13px;font-family:'Courier New',monospace;">${proximaCobranca}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      ${gerarBotao('Acessar Meu Painel', `${CONFIG.urlBase}/login`)}

      <p style="color:#71717a;font-size:12px;line-height:1.5;margin:20px 0 0;text-align:center;">
        D&uacute;vidas sobre cobran&ccedil;a? <a href="mailto:financeiro@v5fibra.com.br" style="color:#34d399;text-decoration:none;font-weight:600;">financeiro@v5fibra.com.br</a>
      </p>
    `,
  });

  return enviarEmail({
    para,
    assunto: `Assinatura V5 Cloud Ativada — Plano ${plano.toUpperCase()}`,
    html,
    de: CONFIG.remetenteFinanceiro,
  });
}

// =============================================
// FASE 2 — SEGURANCA
// =============================================

// 6. ALERTA DE LOGIN EM NOVO DISPOSITIVO
export async function enviarAlertaNovoDispositivo(
  para: string,
  nome: string,
  dispositivo: string,
  localizacao: string,
  ip: string
) {
  const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  const html = gerarTemplateBase({
    iconeEmoji: '&#128187;',
    titulo: 'Novo login detectado',
    subtitulo: 'Detectamos um acesso em um novo dispositivo',
    conteudo: `
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 8px;">
        Ol&aacute; <strong style="color:#fff;">${nome}</strong>,
      </p>
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 28px;">
        Detectamos um login na sua conta a partir de um dispositivo que n&atilde;o reconhecemos. Se foi voc&ecirc;, pode ignorar este e-mail.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1a1a2e;border-radius:12px;border:1px solid #262640;margin:0 0 24px;">
        <tr>
          <td style="padding:18px 20px;border-bottom:1px solid #262640;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Dispositivo</td>
                <td align="right" style="color:#e4e4e7;font-size:13px;">${dispositivo}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 20px;border-bottom:1px solid #262640;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Localiza&ccedil;&atilde;o</td>
                <td align="right" style="color:#e4e4e7;font-size:13px;">${localizacao}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 20px;border-bottom:1px solid #262640;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">IP</td>
                <td align="right" style="color:#e4e4e7;font-size:13px;font-family:'Courier New',monospace;">${ip}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Data/Hora</td>
                <td align="right" style="color:#e4e4e7;font-size:13px;font-family:'Courier New',monospace;">${agora}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#2d1215;border-radius:12px;border:1px solid #5c1d24;">
        <tr>
          <td style="padding:18px 20px;">
            <p style="color:#fca5a5;font-size:13px;font-weight:700;line-height:1.5;margin:0 0 6px;">
              &#9888;&#65039; N&atilde;o reconhece este acesso?
            </p>
            <p style="color:#e8a1a1;font-size:13px;line-height:1.6;margin:0;">
              Recomendamos trocar sua senha imediatamente e entrar em contato:
              <a href="mailto:suporte@v5fibra.com.br" style="color:#fca5a5;text-decoration:underline;font-weight:600;">suporte@v5fibra.com.br</a>
            </p>
          </td>
        </tr>
      </table>
    `,
  });

  return enviarEmail({
    para,
    assunto: 'Novo login detectado na sua conta — V5 Cloud',
    html,
  });
}

// 7. CODIGO 2FA
export async function enviarCodigo2FA(para: string, nome: string, codigo: string) {
  const digitos = codigo.split('');

  const html = gerarTemplateBase({
    iconeEmoji: '&#128737;',
    titulo: 'C&oacute;digo de Verifica&ccedil;&atilde;o 2FA',
    subtitulo: 'Autentica&ccedil;&atilde;o em duas etapas',
    conteudo: `
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 8px;">
        Ol&aacute; <strong style="color:#fff;">${nome}</strong>,
      </p>
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 28px;">
        Use o c&oacute;digo abaixo para completar o login na sua conta V5 Cloud:
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;">
        <tr>
          <td align="center">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                ${digitos.map(d => `
                  <td style="padding:0 4px;">
                    <div style="width:48px;height:56px;background:linear-gradient(135deg,#064e3b,#065f46);border:2px solid #10b981;border-radius:12px;text-align:center;line-height:56px;font-family:'Courier New',monospace;font-size:28px;font-weight:900;color:#34d399;">
                      ${d}
                    </div>
                  </td>
                `).join('')}
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <div style="background:#1a1a2e;border-left:3px solid #10b981;border-radius:0 8px 8px 0;padding:14px 18px;margin:0 0 20px;">
        <p style="color:#a1a1aa;font-size:13px;line-height:1.5;margin:0;">
          &#9200; Este c&oacute;digo expira em <strong style="color:#34d399;">5 minutos</strong>
        </p>
      </div>

      <p style="color:#71717a;font-size:12px;line-height:1.5;margin:0;">
        Se voc&ecirc; n&atilde;o tentou fazer login, altere sua senha imediatamente.
      </p>
    `,
  });

  return enviarEmail({
    para,
    assunto: `${codigo} — Código 2FA V5 Cloud`,
    html,
  });
}

// 8. CONTA DESATIVADA
export async function enviarContaDesativada(para: string, nome: string, motivo: string) {
  const html = gerarTemplateBase({
    iconeEmoji: '&#128683;',
    titulo: 'Conta desativada',
    subtitulo: 'Sua conta foi temporariamente desativada',
    conteudo: `
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 8px;">
        Ol&aacute; <strong style="color:#fff;">${nome}</strong>,
      </p>
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 28px;">
        Informamos que sua conta na V5 Cloud foi temporariamente desativada.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1a1a2e;border-radius:12px;border:1px solid #262640;margin:0 0 24px;">
        <tr>
          <td style="padding:18px 20px;border-bottom:1px solid #262640;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Status</td>
                <td align="right">
                  <span style="display:inline-block;background:#ef444425;color:#f87171;font-size:11px;font-weight:800;padding:4px 14px;border-radius:20px;border:1px solid #ef444440;">DESATIVADA</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Motivo</td>
                <td align="right" style="color:#e4e4e7;font-size:13px;">${motivo}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <p style="color:#c4c4cc;font-size:14px;line-height:1.7;margin:0 0 20px;">
        Se voc&ecirc; acredita que isso foi um engano, entre em contato com o administrador da sua empresa ou com nosso suporte.
      </p>

      <p style="color:#71717a;font-size:12px;line-height:1.5;margin:0;text-align:center;">
        Suporte: <a href="mailto:suporte@v5fibra.com.br" style="color:#34d399;text-decoration:none;font-weight:600;">suporte@v5fibra.com.br</a>
      </p>
    `,
  });

  return enviarEmail({
    para,
    assunto: 'Sua conta foi desativada — V5 Cloud',
    html,
  });
}

// 9. CONTA REATIVADA
export async function enviarContaReativada(para: string, nome: string) {
  const html = gerarTemplateBase({
    iconeEmoji: '&#127881;',
    titulo: 'Conta reativada!',
    subtitulo: 'Sua conta est&aacute; ativa novamente',
    conteudo: `
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 8px;">
        Ol&aacute; <strong style="color:#fff;">${nome}</strong>,
      </p>
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 28px;">
        Sua conta na V5 Cloud foi reativada com sucesso. Voc&ecirc; j&aacute; pode acessar o painel normalmente.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1a1a2e;border-radius:12px;border:1px solid #262640;margin:0 0 28px;">
        <tr>
          <td style="padding:18px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Status</td>
                <td align="right">
                  <span style="display:inline-block;background:#10b98125;color:#34d399;font-size:11px;font-weight:800;padding:4px 14px;border-radius:20px;border:1px solid #10b98140;">ATIVA</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      ${gerarBotao('Acessar Meu Painel', `${CONFIG.urlBase}/login`)}

      <p style="color:#71717a;font-size:12px;line-height:1.5;margin:20px 0 0;text-align:center;">
        Bem-vindo de volta!
      </p>
    `,
  });

  return enviarEmail({
    para,
    assunto: 'Sua conta foi reativada — V5 Cloud',
    html,
  });
}

// =============================================
// FASE 3 — FINANCEIRO
// =============================================

// 10. FATURA GERADA / BOLETO DISPONIVEL
export async function enviarFaturaGerada(
  para: string,
  nome: string,
  valor: string,
  vencimento: string,
  linkBoleto: string
) {
  const html = gerarTemplateBase({
    iconeEmoji: '&#128196;',
    titulo: 'Nova fatura dispon&iacute;vel',
    subtitulo: 'Sua fatura mensal foi gerada',
    conteudo: `
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 8px;">
        Ol&aacute; <strong style="color:#fff;">${nome}</strong>,
      </p>
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 28px;">
        Sua fatura mensal da V5 Cloud j&aacute; est&aacute; dispon&iacute;vel. Veja os detalhes:
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,#0a2818,#1a1a2e);border-radius:12px;border:1px solid #10b98130;margin:0 0 28px;">
        <tr>
          <td style="padding:24px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="50%" align="center" style="padding:8px 4px;">
                  <p style="margin:0 0 6px;color:#fff;font-size:24px;font-weight:900;">R$${valor}</p>
                  <p style="margin:0;color:#71717a;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;">Valor</p>
                </td>
                <td width="1" style="background:#262640;">&nbsp;</td>
                <td width="50%" align="center" style="padding:8px 4px;">
                  <p style="margin:0 0 6px;color:#fbbf24;font-size:18px;font-weight:900;">${vencimento}</p>
                  <p style="margin:0;color:#71717a;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;">Vencimento</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      ${gerarBotao('Ver Fatura / Boleto', linkBoleto)}

      <p style="color:#71717a;font-size:12px;line-height:1.5;margin:20px 0 0;text-align:center;">
        D&uacute;vidas? <a href="mailto:financeiro@v5fibra.com.br" style="color:#34d399;text-decoration:none;font-weight:600;">financeiro@v5fibra.com.br</a>
      </p>
    `,
  });

  return enviarEmail({
    para,
    assunto: `Fatura V5 Cloud — R$${valor} — Vencimento ${vencimento}`,
    html,
    de: CONFIG.remetenteFinanceiro,
  });
}

// 11. PAGAMENTO CONFIRMADO
export async function enviarPagamentoConfirmado(
  para: string,
  nome: string,
  valor: string,
  referencia: string
) {
  const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  const html = gerarTemplateBase({
    iconeEmoji: '&#9989;',
    titulo: 'Pagamento confirmado!',
    subtitulo: 'Recebemos seu pagamento com sucesso',
    conteudo: `
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 8px;">
        Ol&aacute; <strong style="color:#fff;">${nome}</strong>,
      </p>
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 28px;">
        Seu pagamento foi processado e confirmado. Aqui est&aacute; o comprovante:
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1a1a2e;border-radius:12px;border:1px solid #262640;margin:0 0 28px;">
        <tr>
          <td style="padding:18px 20px;border-bottom:1px solid #262640;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Valor pago</td>
                <td align="right" style="color:#34d399;font-size:16px;font-weight:900;">R$${valor}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 20px;border-bottom:1px solid #262640;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Refer&ecirc;ncia</td>
                <td align="right" style="color:#e4e4e7;font-size:13px;font-family:'Courier New',monospace;">${referencia}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 20px;border-bottom:1px solid #262640;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Data</td>
                <td align="right" style="color:#e4e4e7;font-size:13px;font-family:'Courier New',monospace;">${agora}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Status</td>
                <td align="right">
                  <span style="display:inline-block;background:#10b98125;color:#34d399;font-size:11px;font-weight:800;padding:4px 14px;border-radius:20px;border:1px solid #10b98140;">PAGO</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <p style="color:#71717a;font-size:12px;line-height:1.5;margin:0;text-align:center;">
        Obrigado por manter sua assinatura em dia!
      </p>
    `,
  });

  return enviarEmail({
    para,
    assunto: `Pagamento confirmado — R$${valor} — V5 Cloud`,
    html,
    de: CONFIG.remetenteFinanceiro,
  });
}

// 12. FALHA NO PAGAMENTO
export async function enviarFalhaPagamento(
  para: string,
  nome: string,
  valor: string,
  motivo: string
) {
  const html = gerarTemplateBase({
    iconeEmoji: '&#9888;&#65039;',
    titulo: 'Falha no pagamento',
    subtitulo: 'N&atilde;o conseguimos processar seu pagamento',
    conteudo: `
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 8px;">
        Ol&aacute; <strong style="color:#fff;">${nome}</strong>,
      </p>
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 28px;">
        N&atilde;o foi poss&iacute;vel processar seu pagamento. Atualize seus dados para evitar a suspens&atilde;o do servi&ccedil;o.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#2d1215;border-radius:12px;border:1px solid #5c1d24;margin:0 0 24px;">
        <tr>
          <td style="padding:24px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="50%" align="center" style="padding:8px 4px;">
                  <p style="margin:0 0 6px;color:#f87171;font-size:20px;font-weight:900;">R$${valor}</p>
                  <p style="margin:0;color:#a1707a;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;">Valor</p>
                </td>
                <td width="1" style="background:#5c1d24;">&nbsp;</td>
                <td width="50%" align="center" style="padding:8px 4px;">
                  <span style="display:inline-block;background:#ef444425;color:#f87171;font-size:11px;font-weight:800;padding:4px 14px;border-radius:20px;border:1px solid #ef444440;">RECUSADO</span>
                  <p style="margin:6px 0 0;color:#a1707a;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;">Status</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1a1a2e;border-radius:12px;border:1px solid #262640;margin:0 0 28px;">
        <tr>
          <td style="padding:18px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Motivo</td>
                <td align="right" style="color:#fca5a5;font-size:13px;">${motivo}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      ${gerarBotao('Atualizar Pagamento', `${CONFIG.urlBase}/dashboard/assinatura`)}

      <p style="color:#71717a;font-size:12px;line-height:1.5;margin:20px 0 0;text-align:center;">
        D&uacute;vidas? <a href="mailto:financeiro@v5fibra.com.br" style="color:#34d399;text-decoration:none;font-weight:600;">financeiro@v5fibra.com.br</a>
      </p>
    `,
  });

  return enviarEmail({
    para,
    assunto: 'Falha no pagamento — Ação necessária — V5 Cloud',
    html,
    de: CONFIG.remetenteFinanceiro,
  });
}

// 13. ASSINATURA CANCELADA
export async function enviarAssinaturaCancelada(
  para: string,
  nome: string,
  plano: string,
  dataFim: string
) {
  const html = gerarTemplateBase({
    iconeEmoji: '&#128532;',
    titulo: 'Assinatura cancelada',
    subtitulo: 'Sentiremos sua falta',
    conteudo: `
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 8px;">
        Ol&aacute; <strong style="color:#fff;">${nome}</strong>,
      </p>
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 28px;">
        Confirmamos o cancelamento da sua assinatura na V5 Cloud. Voc&ecirc; ainda ter&aacute; acesso at&eacute; o final do per&iacute;odo pago.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1a1a2e;border-radius:12px;border:1px solid #262640;margin:0 0 24px;">
        <tr>
          <td style="padding:18px 20px;border-bottom:1px solid #262640;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Plano</td>
                <td align="right" style="color:#e4e4e7;font-size:13px;font-weight:700;">${plano.toUpperCase()}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 20px;border-bottom:1px solid #262640;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Acesso at&eacute;</td>
                <td align="right" style="color:#fbbf24;font-size:13px;font-weight:700;font-family:'Courier New',monospace;">${dataFim}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Status</td>
                <td align="right">
                  <span style="display:inline-block;background:#ef444425;color:#f87171;font-size:11px;font-weight:800;padding:4px 14px;border-radius:20px;border:1px solid #ef444440;">CANCELADA</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <p style="color:#c4c4cc;font-size:14px;line-height:1.7;margin:0 0 24px;">
        Mudou de ideia? Voc&ecirc; pode reativar sua assinatura a qualquer momento antes de <strong style="color:#fbbf24;">${dataFim}</strong>.
      </p>

      ${gerarBotao('Reativar Assinatura', `${CONFIG.urlBase}/dashboard/assinatura`)}
    `,
  });

  return enviarEmail({
    para,
    assunto: `Assinatura cancelada — Plano ${plano.toUpperCase()} — V5 Cloud`,
    html,
    de: CONFIG.remetenteFinanceiro,
  });
}

// 14. ASSINATURA EXPIRADA
export async function enviarAssinaturaExpirada(para: string, nome: string, plano: string) {
  const html = gerarTemplateBase({
    iconeEmoji: '&#9203;',
    titulo: 'Assinatura expirada',
    subtitulo: 'Seu acesso foi encerrado',
    conteudo: `
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 8px;">
        Ol&aacute; <strong style="color:#fff;">${nome}</strong>,
      </p>
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 28px;">
        Sua assinatura do plano <strong style="color:#f87171;">${plano.toUpperCase()}</strong> expirou e o acesso ao painel foi suspenso. Seus dados est&atilde;o seguros e ser&atilde;o mantidos por 90 dias.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,#1a1215,#1a1a2e);border-radius:12px;border:1px solid #5c1d2440;margin:0 0 28px;">
        <tr>
          <td style="padding:24px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="33%" align="center" style="padding:8px 4px;">
                  <p style="margin:0 0 6px;color:#f87171;font-size:18px;font-weight:900;">${plano.toUpperCase()}</p>
                  <p style="margin:0;color:#71717a;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;">Plano</p>
                </td>
                <td width="1" style="background:#262640;">&nbsp;</td>
                <td width="33%" align="center" style="padding:8px 4px;">
                  <span style="display:inline-block;background:#ef444425;color:#f87171;font-size:11px;font-weight:800;padding:4px 14px;border-radius:20px;border:1px solid #ef444440;">EXPIRADA</span>
                  <p style="margin:6px 0 0;color:#71717a;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;">Status</p>
                </td>
                <td width="1" style="background:#262640;">&nbsp;</td>
                <td width="33%" align="center" style="padding:8px 4px;">
                  <p style="margin:0 0 6px;color:#fbbf24;font-size:18px;font-weight:900;">90 dias</p>
                  <p style="margin:0;color:#71717a;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;">Dados retidos</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <p style="color:#c4c4cc;font-size:14px;line-height:1.7;margin:0 0 24px;">
        Renove agora para recuperar o acesso completo sem perder nenhum dado.
      </p>

      ${gerarBotao('Renovar Assinatura', `${CONFIG.urlBase}/dashboard/assinatura`)}

      <p style="color:#71717a;font-size:12px;line-height:1.5;margin:20px 0 0;text-align:center;">
        D&uacute;vidas? <a href="mailto:financeiro@v5fibra.com.br" style="color:#34d399;text-decoration:none;font-weight:600;">financeiro@v5fibra.com.br</a>
      </p>
    `,
  });

  return enviarEmail({
    para,
    assunto: 'Sua assinatura expirou — V5 Cloud',
    html,
    de: CONFIG.remetenteFinanceiro,
  });
}

// =============================================
// FASE 4 — RELATORIOS
// =============================================

// 15. RELATORIO SEMANAL
export async function enviarRelatorioSemanal(
  para: string,
  nome: string,
  periodo: string,
  dados: {
    leadsNovos: number;
    osAbertas: number;
    osConcluidas: number;
    taxaConversao: string;
  }
) {
  const html = gerarTemplateBase({
    iconeEmoji: '&#128202;',
    titulo: 'Relat&oacute;rio Semanal',
    subtitulo: periodo,
    conteudo: `
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 8px;">
        Ol&aacute; <strong style="color:#fff;">${nome}</strong>,
      </p>
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 28px;">
        Aqui est&aacute; o resumo da sua opera&ccedil;&atilde;o nesta semana:
      </p>

      <!-- STATS EM GRID 2x2 -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;">
        <tr>
          <td width="50%" style="padding:4px 4px 4px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1a1a2e;border-radius:12px;border:1px solid #262640;">
              <tr>
                <td align="center" style="padding:20px 12px;">
                  <p style="margin:0 0 6px;color:#34d399;font-size:28px;font-weight:900;">${dados.leadsNovos}</p>
                  <p style="margin:0;color:#71717a;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;">Leads Novos</p>
                </td>
              </tr>
            </table>
          </td>
          <td width="50%" style="padding:4px 0 4px 4px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1a1a2e;border-radius:12px;border:1px solid #262640;">
              <tr>
                <td align="center" style="padding:20px 12px;">
                  <p style="margin:0 0 6px;color:#fbbf24;font-size:28px;font-weight:900;">${dados.osAbertas}</p>
                  <p style="margin:0;color:#71717a;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;">OS Abertas</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td width="50%" style="padding:4px 4px 4px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1a1a2e;border-radius:12px;border:1px solid #262640;">
              <tr>
                <td align="center" style="padding:20px 12px;">
                  <p style="margin:0 0 6px;color:#10b981;font-size:28px;font-weight:900;">${dados.osConcluidas}</p>
                  <p style="margin:0;color:#71717a;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;">OS Conclu&iacute;das</p>
                </td>
              </tr>
            </table>
          </td>
          <td width="50%" style="padding:4px 0 4px 4px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1a1a2e;border-radius:12px;border:1px solid #262640;">
              <tr>
                <td align="center" style="padding:20px 12px;">
                  <p style="margin:0 0 6px;color:#8b5cf6;font-size:28px;font-weight:900;">${dados.taxaConversao}</p>
                  <p style="margin:0;color:#71717a;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;">Convers&atilde;o</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      ${gerarBotao('Ver Relatório Completo', `${CONFIG.urlBase}/dashboard`)}

      <p style="color:#71717a;font-size:12px;line-height:1.5;margin:20px 0 0;text-align:center;">
        Este relat&oacute;rio &eacute; gerado automaticamente toda segunda-feira.
      </p>
    `,
  });

  return enviarEmail({
    para,
    assunto: `Relatório Semanal — ${periodo} — V5 Cloud`,
    html,
  });
}

// 16. RESUMO MENSAL
export async function enviarResumoMensal(
  para: string,
  nome: string,
  mes: string,
  dados: {
    totalLeads: number;
    totalOS: number;
    osConcluidas: number;
    ticketMedio: string;
    receitaTotal: string;
    melhorTecnico: string;
  }
) {
  const taxaConclusao = dados.totalOS > 0
    ? ((dados.osConcluidas / dados.totalOS) * 100).toFixed(1) + '%'
    : '0%';

  const html = gerarTemplateBase({
    iconeEmoji: '&#128200;',
    titulo: `Resumo de ${mes}`,
    subtitulo: 'Vis&atilde;o geral da sua opera&ccedil;&atilde;o',
    conteudo: `
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 8px;">
        Ol&aacute; <strong style="color:#fff;">${nome}</strong>,
      </p>
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 28px;">
        Aqui est&aacute; o resumo completo do m&ecirc;s de <strong style="color:#fff;">${mes}</strong>:
      </p>

      <!-- DESTAQUE PRINCIPAL -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,#0a2818,#1a1a2e);border-radius:12px;border:1px solid #10b98130;margin:0 0 8px;">
        <tr>
          <td style="padding:24px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="33%" align="center" style="padding:8px 4px;">
                  <p style="margin:0 0 6px;color:#34d399;font-size:26px;font-weight:900;">${dados.totalLeads}</p>
                  <p style="margin:0;color:#71717a;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;">Leads</p>
                </td>
                <td width="1" style="background:#262640;">&nbsp;</td>
                <td width="33%" align="center" style="padding:8px 4px;">
                  <p style="margin:0 0 6px;color:#fff;font-size:26px;font-weight:900;">${dados.totalOS}</p>
                  <p style="margin:0;color:#71717a;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;">Ordens</p>
                </td>
                <td width="1" style="background:#262640;">&nbsp;</td>
                <td width="33%" align="center" style="padding:8px 4px;">
                  <p style="margin:0 0 6px;color:#10b981;font-size:26px;font-weight:900;">${taxaConclusao}</p>
                  <p style="margin:0;color:#71717a;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;">Conclus&atilde;o</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- DETALHES -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1a1a2e;border-radius:12px;border:1px solid #262640;margin:0 0 28px;">
        <tr>
          <td style="padding:18px 20px;border-bottom:1px solid #262640;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Receita total</td>
                <td align="right" style="color:#34d399;font-size:16px;font-weight:900;">R$${dados.receitaTotal}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 20px;border-bottom:1px solid #262640;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Ticket m&eacute;dio</td>
                <td align="right" style="color:#e4e4e7;font-size:14px;font-weight:700;">R$${dados.ticketMedio}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Melhor t&eacute;cnico</td>
                <td align="right" style="color:#fbbf24;font-size:14px;font-weight:700;">&#127942; ${dados.melhorTecnico}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      ${gerarBotao('Ver Dashboard Completo', `${CONFIG.urlBase}/dashboard`)}

      <p style="color:#71717a;font-size:12px;line-height:1.5;margin:20px 0 0;text-align:center;">
        Este resumo &eacute; gerado automaticamente no 1&ordm; dia de cada m&ecirc;s.
      </p>
    `,
  });

  return enviarEmail({
    para,
    assunto: `Resumo Mensal — ${mes} — V5 Cloud`,
    html,
  });
}

// =============================================
// FASE 5 — CONTAS E SEGURANCA (EXTRAS)
// =============================================

// 17. E-MAIL ALTERADO
export async function enviarEmailAlterado(
  para: string,
  nome: string,
  emailAntigo: string,
  emailNovo: string
) {
  const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  const html = gerarTemplateBase({
    iconeEmoji: '&#9993;',
    titulo: 'E-mail alterado',
    subtitulo: 'O endere&ccedil;o de e-mail da sua conta foi atualizado',
    conteudo: `
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 8px;">
        Ol&aacute; <strong style="color:#fff;">${nome}</strong>,
      </p>
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 28px;">
        O endere&ccedil;o de e-mail associado &agrave; sua conta V5 Cloud foi alterado.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1a1a2e;border-radius:12px;border:1px solid #262640;margin:0 0 24px;">
        <tr>
          <td style="padding:18px 20px;border-bottom:1px solid #262640;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">E-mail anterior</td>
                <td align="right" style="color:#f87171;font-size:13px;font-family:'Courier New',monospace;text-decoration:line-through;">${emailAntigo}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 20px;border-bottom:1px solid #262640;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Novo e-mail</td>
                <td align="right" style="color:#34d399;font-size:13px;font-family:'Courier New',monospace;">${emailNovo}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Data/Hora</td>
                <td align="right" style="color:#e4e4e7;font-size:13px;font-family:'Courier New',monospace;">${agora}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#2d1215;border-radius:12px;border:1px solid #5c1d24;">
        <tr>
          <td style="padding:18px 20px;">
            <p style="color:#fca5a5;font-size:13px;font-weight:700;line-height:1.5;margin:0 0 6px;">
              &#9888;&#65039; N&atilde;o foi voc&ecirc;?
            </p>
            <p style="color:#e8a1a1;font-size:13px;line-height:1.6;margin:0;">
              Entre em contato imediatamente:
              <a href="mailto:suporte@v5fibra.com.br" style="color:#fca5a5;text-decoration:underline;font-weight:600;">suporte@v5fibra.com.br</a>
            </p>
          </td>
        </tr>
      </table>
    `,
  });

  return enviarEmail({
    para: emailAntigo,
    assunto: 'O e-mail da sua conta foi alterado — V5 Cloud',
    html,
  });
}

// =============================================
// FASE 6 — FINANCEIRO (EXTRAS)
// =============================================

// 18. PAGAMENTO PENDENTE
export async function enviarPagamentoPendente(
  para: string,
  nome: string,
  valor: string,
  vencimento: string
) {
  const html = gerarTemplateBase({
    iconeEmoji: '&#9203;',
    titulo: 'Pagamento pendente',
    subtitulo: 'Seu pagamento ainda n&atilde;o foi confirmado',
    conteudo: `
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 8px;">
        Ol&aacute; <strong style="color:#fff;">${nome}</strong>,
      </p>
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 28px;">
        Seu pagamento no valor de <strong style="color:#fbbf24;">R$${valor}</strong> ainda n&atilde;o foi identificado. Regularize para evitar a suspens&atilde;o do servi&ccedil;o.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,#1a1810,#1a1a2e);border-radius:12px;border:1px solid #fbbf2430;margin:0 0 28px;">
        <tr>
          <td style="padding:24px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="50%" align="center" style="padding:8px 4px;">
                  <p style="margin:0 0 6px;color:#fbbf24;font-size:22px;font-weight:900;">R$${valor}</p>
                  <p style="margin:0;color:#71717a;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;">Valor</p>
                </td>
                <td width="1" style="background:#262640;">&nbsp;</td>
                <td width="50%" align="center" style="padding:8px 4px;">
                  <span style="display:inline-block;background:#fbbf2425;color:#fbbf24;font-size:11px;font-weight:800;padding:4px 14px;border-radius:20px;border:1px solid #fbbf2440;">PENDENTE</span>
                  <p style="margin:6px 0 0;color:#71717a;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;">Status</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <div style="background:#1a1a2e;border-left:3px solid #fbbf24;border-radius:0 8px 8px 0;padding:14px 18px;margin:0 0 24px;">
        <p style="color:#a1a1aa;font-size:13px;line-height:1.5;margin:0;">
          &#128197; Vencimento: <strong style="color:#fbbf24;">${vencimento}</strong>
        </p>
      </div>

      ${gerarBotao('Realizar Pagamento', `${CONFIG.urlBase}/dashboard/assinatura`)}

      <p style="color:#71717a;font-size:12px;line-height:1.5;margin:20px 0 0;text-align:center;">
        J&aacute; pagou? O processamento pode levar at&eacute; 48h. D&uacute;vidas: <a href="mailto:financeiro@v5fibra.com.br" style="color:#34d399;text-decoration:none;font-weight:600;">financeiro@v5fibra.com.br</a>
      </p>
    `,
  });

  return enviarEmail({
    para,
    assunto: `Pagamento pendente — R$${valor} — V5 Cloud`,
    html,
    de: CONFIG.remetenteFinanceiro,
  });
}

// 19. PAGAMENTO VENCENDO (LEMBRETE)
export async function enviarPagamentoVencendo(
  para: string,
  nome: string,
  valor: string,
  vencimento: string,
  diasRestantes: number
) {
  const html = gerarTemplateBase({
    iconeEmoji: '&#128276;',
    titulo: 'Lembrete de pagamento',
    subtitulo: `Sua fatura vence em ${diasRestantes} dia${diasRestantes > 1 ? 's' : ''}`,
    conteudo: `
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 8px;">
        Ol&aacute; <strong style="color:#fff;">${nome}</strong>,
      </p>
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 28px;">
        Este &eacute; um lembrete de que sua fatura da V5 Cloud vence em breve. Evite a interrup&ccedil;&atilde;o do servi&ccedil;o.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1a1a2e;border-radius:12px;border:1px solid #262640;margin:0 0 24px;">
        <tr>
          <td style="padding:18px 20px;border-bottom:1px solid #262640;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Valor</td>
                <td align="right" style="color:#fff;font-size:16px;font-weight:900;">R$${valor}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 20px;border-bottom:1px solid #262640;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Vencimento</td>
                <td align="right" style="color:#fbbf24;font-size:14px;font-weight:700;font-family:'Courier New',monospace;">${vencimento}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Dias restantes</td>
                <td align="right" style="color:#fbbf24;font-size:20px;font-weight:900;">${diasRestantes}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      ${gerarBotao('Pagar Agora', `${CONFIG.urlBase}/dashboard/assinatura`)}

      <p style="color:#71717a;font-size:12px;line-height:1.5;margin:20px 0 0;text-align:center;">
        D&uacute;vidas? <a href="mailto:financeiro@v5fibra.com.br" style="color:#34d399;text-decoration:none;font-weight:600;">financeiro@v5fibra.com.br</a>
      </p>
    `,
  });

  return enviarEmail({
    para,
    assunto: `Lembrete: fatura vence em ${diasRestantes} dia${diasRestantes > 1 ? 's' : ''} — V5 Cloud`,
    html,
    de: CONFIG.remetenteFinanceiro,
  });
}

// 20. CARTAO PROXIMO DO VENCIMENTO
export async function enviarCartaoVencendo(
  para: string,
  nome: string,
  ultimosDigitos: string,
  mesExpiracao: string
) {
  const html = gerarTemplateBase({
    iconeEmoji: '&#128179;',
    titulo: 'Cart&atilde;o expirando',
    subtitulo: 'Atualize seu m&eacute;todo de pagamento',
    conteudo: `
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 8px;">
        Ol&aacute; <strong style="color:#fff;">${nome}</strong>,
      </p>
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 28px;">
        O cart&atilde;o de cr&eacute;dito associado &agrave; sua assinatura est&aacute; pr&oacute;ximo do vencimento. Atualize para evitar interrup&ccedil;&atilde;o.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,#1a1810,#1a1a2e);border-radius:12px;border:1px solid #fbbf2430;margin:0 0 28px;">
        <tr>
          <td style="padding:24px;text-align:center;">
            <p style="margin:0 0 4px;color:#71717a;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;">Cart&atilde;o terminado em</p>
            <p style="margin:0 0 12px;color:#fff;font-size:28px;font-weight:900;font-family:'Courier New',monospace;">**** ${ultimosDigitos}</p>
            <span style="display:inline-block;background:#fbbf2425;color:#fbbf24;font-size:12px;font-weight:800;padding:4px 14px;border-radius:20px;border:1px solid #fbbf2440;">Expira em ${mesExpiracao}</span>
          </td>
        </tr>
      </table>

      ${gerarBotao('Atualizar Cartão', `${CONFIG.urlBase}/dashboard/assinatura`)}

      <p style="color:#71717a;font-size:12px;line-height:1.5;margin:20px 0 0;text-align:center;">
        D&uacute;vidas? <a href="mailto:financeiro@v5fibra.com.br" style="color:#34d399;text-decoration:none;font-weight:600;">financeiro@v5fibra.com.br</a>
      </p>
    `,
  });

  return enviarEmail({
    para,
    assunto: 'Seu cartão está expirando — Atualize agora — V5 Cloud',
    html,
    de: CONFIG.remetenteFinanceiro,
  });
}

// 21. TENTATIVA DE COBRANCA NOVAMENTE
export async function enviarTentativaCobranca(
  para: string,
  nome: string,
  valor: string,
  tentativa: number,
  proximaTentativa: string
) {
  const html = gerarTemplateBase({
    iconeEmoji: '&#128260;',
    titulo: 'Tentativa de cobran&ccedil;a',
    subtitulo: `${tentativa}&ordf; tentativa de cobran&ccedil;a autom&aacute;tica`,
    conteudo: `
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 8px;">
        Ol&aacute; <strong style="color:#fff;">${nome}</strong>,
      </p>
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 28px;">
        Tentamos cobrar sua assinatura, mas o pagamento foi recusado novamente. Atualize seus dados para manter o servi&ccedil;o ativo.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#2d1215;border-radius:12px;border:1px solid #5c1d24;margin:0 0 24px;">
        <tr>
          <td style="padding:24px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="33%" align="center" style="padding:8px 4px;">
                  <p style="margin:0 0 6px;color:#f87171;font-size:20px;font-weight:900;">R$${valor}</p>
                  <p style="margin:0;color:#a1707a;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;">Valor</p>
                </td>
                <td width="1" style="background:#5c1d24;">&nbsp;</td>
                <td width="33%" align="center" style="padding:8px 4px;">
                  <p style="margin:0 0 6px;color:#fbbf24;font-size:20px;font-weight:900;">${tentativa}&ordf;</p>
                  <p style="margin:0;color:#a1707a;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;">Tentativa</p>
                </td>
                <td width="1" style="background:#5c1d24;">&nbsp;</td>
                <td width="33%" align="center" style="padding:8px 4px;">
                  <span style="display:inline-block;background:#ef444425;color:#f87171;font-size:11px;font-weight:800;padding:4px 14px;border-radius:20px;border:1px solid #ef444440;">FALHOU</span>
                  <p style="margin:6px 0 0;color:#a1707a;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;">Status</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <div style="background:#1a1a2e;border-left:3px solid #fbbf24;border-radius:0 8px 8px 0;padding:14px 18px;margin:0 0 24px;">
        <p style="color:#a1a1aa;font-size:13px;line-height:1.5;margin:0;">
          &#128197; Pr&oacute;xima tentativa autom&aacute;tica: <strong style="color:#fbbf24;">${proximaTentativa}</strong>
        </p>
      </div>

      ${gerarBotao('Atualizar Pagamento', `${CONFIG.urlBase}/dashboard/assinatura`)}

      <p style="color:#71717a;font-size:12px;line-height:1.5;margin:20px 0 0;text-align:center;">
        D&uacute;vidas? <a href="mailto:financeiro@v5fibra.com.br" style="color:#34d399;text-decoration:none;font-weight:600;">financeiro@v5fibra.com.br</a>
      </p>
    `,
  });

  return enviarEmail({
    para,
    assunto: `${tentativa}ª tentativa de cobrança falhou — V5 Cloud`,
    html,
    de: CONFIG.remetenteFinanceiro,
  });
}

// =============================================
// FASE 7 — CONTA / EMPRESA
// =============================================

// 22. USUARIO ADICIONADO/REMOVIDO
export async function enviarUsuarioAlterado(
  para: string,
  nomeDono: string,
  nomeUsuario: string,
  acao: 'adicionado' | 'removido',
  cargo: string
) {
  const isAdicionado = acao === 'adicionado';
  const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  const html = gerarTemplateBase({
    iconeEmoji: isAdicionado ? '&#128101;' : '&#128100;',
    titulo: `Usu&aacute;rio ${acao}`,
    subtitulo: `Um membro da equipe foi ${acao}`,
    conteudo: `
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 8px;">
        Ol&aacute; <strong style="color:#fff;">${nomeDono}</strong>,
      </p>
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 28px;">
        ${isAdicionado
          ? `O usu&aacute;rio <strong style="color:#34d399;">${nomeUsuario}</strong> foi adicionado &agrave; sua empresa.`
          : `O usu&aacute;rio <strong style="color:#f87171;">${nomeUsuario}</strong> foi removido da sua empresa.`
        }
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1a1a2e;border-radius:12px;border:1px solid #262640;margin:0 0 24px;">
        <tr>
          <td style="padding:18px 20px;border-bottom:1px solid #262640;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Usu&aacute;rio</td>
                <td align="right" style="color:#e4e4e7;font-size:13px;font-weight:700;">${nomeUsuario}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 20px;border-bottom:1px solid #262640;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Cargo</td>
                <td align="right" style="color:#e4e4e7;font-size:13px;">${cargo}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 20px;border-bottom:1px solid #262640;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">A&ccedil;&atilde;o</td>
                <td align="right">
                  <span style="display:inline-block;background:${isAdicionado ? '#10b98125' : '#ef444425'};color:${isAdicionado ? '#34d399' : '#f87171'};font-size:11px;font-weight:800;padding:4px 14px;border-radius:20px;border:1px solid ${isAdicionado ? '#10b98140' : '#ef444440'};">${acao.toUpperCase()}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Data/Hora</td>
                <td align="right" style="color:#e4e4e7;font-size:13px;font-family:'Courier New',monospace;">${agora}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      ${gerarBotao('Gerenciar Equipe', `${CONFIG.urlBase}/dashboard/equipe`)}
    `,
  });

  return enviarEmail({
    para,
    assunto: `Usuário ${acao}: ${nomeUsuario} — V5 Cloud`,
    html,
  });
}

// 23. ALTERACAO DE DADOS DA EMPRESA
export async function enviarAlteracaoDadosEmpresa(
  para: string,
  nome: string,
  camposAlterados: string[]
) {
  const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  const html = gerarTemplateBase({
    iconeEmoji: '&#127970;',
    titulo: 'Dados da empresa alterados',
    subtitulo: 'Altera&ccedil;&otilde;es no cadastro da empresa',
    conteudo: `
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 8px;">
        Ol&aacute; <strong style="color:#fff;">${nome}</strong>,
      </p>
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 28px;">
        Os seguintes dados cadastrais da sua empresa foram alterados:
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1a1a2e;border-radius:12px;border:1px solid #262640;margin:0 0 24px;">
        ${camposAlterados.map((campo, i) => `
          <tr>
            <td style="padding:14px 20px;${i < camposAlterados.length - 1 ? 'border-bottom:1px solid #262640;' : ''}">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="color:#fbbf24;font-size:13px;">&#9998; ${campo}</td>
                </tr>
              </table>
            </td>
          </tr>
        `).join('')}
      </table>

      <div style="background:#1a1a2e;border-left:3px solid #10b981;border-radius:0 8px 8px 0;padding:14px 18px;margin:0 0 24px;">
        <p style="color:#a1a1aa;font-size:13px;line-height:1.5;margin:0;">
          &#128197; Alterado em: <strong style="color:#34d399;">${agora}</strong>
        </p>
      </div>

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#2d1215;border-radius:12px;border:1px solid #5c1d24;">
        <tr>
          <td style="padding:18px 20px;">
            <p style="color:#fca5a5;font-size:13px;font-weight:700;line-height:1.5;margin:0 0 6px;">
              &#9888;&#65039; N&atilde;o reconhece estas altera&ccedil;&otilde;es?
            </p>
            <p style="color:#e8a1a1;font-size:13px;line-height:1.6;margin:0;">
              Entre em contato: <a href="mailto:suporte@v5fibra.com.br" style="color:#fca5a5;text-decoration:underline;font-weight:600;">suporte@v5fibra.com.br</a>
            </p>
          </td>
        </tr>
      </table>
    `,
  });

  return enviarEmail({
    para,
    assunto: 'Dados da empresa alterados — V5 Cloud',
    html,
  });
}

// 24. EXPORTACAO DE DADOS CONCLUIDA
export async function enviarExportacaoConcluida(
  para: string,
  nome: string,
  tipoRelatorio: string,
  linkDownload: string
) {
  const html = gerarTemplateBase({
    iconeEmoji: '&#128229;',
    titulo: 'Exporta&ccedil;&atilde;o conclu&iacute;da',
    subtitulo: 'Seus dados est&atilde;o prontos para download',
    conteudo: `
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 8px;">
        Ol&aacute; <strong style="color:#fff;">${nome}</strong>,
      </p>
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 28px;">
        A exporta&ccedil;&atilde;o de <strong style="color:#34d399;">${tipoRelatorio}</strong> foi conclu&iacute;da e est&aacute; dispon&iacute;vel para download.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1a1a2e;border-radius:12px;border:1px solid #262640;margin:0 0 24px;">
        <tr>
          <td style="padding:18px 20px;border-bottom:1px solid #262640;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Tipo</td>
                <td align="right" style="color:#e4e4e7;font-size:13px;font-weight:700;">${tipoRelatorio}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Status</td>
                <td align="right">
                  <span style="display:inline-block;background:#10b98125;color:#34d399;font-size:11px;font-weight:800;padding:4px 14px;border-radius:20px;border:1px solid #10b98140;">PRONTO</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      ${gerarBotao('Baixar Arquivo', linkDownload)}

      <div style="background:#1a1a2e;border-left:3px solid #fbbf24;border-radius:0 8px 8px 0;padding:14px 18px;margin:24px 0 0;">
        <p style="color:#a1a1aa;font-size:13px;line-height:1.5;margin:0;">
          &#9200; O link expira em <strong style="color:#fbbf24;">7 dias</strong>
        </p>
      </div>
    `,
  });

  return enviarEmail({
    para,
    assunto: `Exportação concluída — ${tipoRelatorio} — V5 Cloud`,
    html,
  });
}

// 25. SOLICITACAO DE EXCLUSAO DE CONTA
export async function enviarSolicitacaoExclusao(
  para: string,
  nome: string,
  prazoExclusao: string,
  linkCancelar: string
) {
  const html = gerarTemplateBase({
    iconeEmoji: '&#128465;',
    titulo: 'Solicita&ccedil;&atilde;o de exclus&atilde;o',
    subtitulo: 'Recebemos sua solicita&ccedil;&atilde;o de exclus&atilde;o de conta',
    conteudo: `
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 8px;">
        Ol&aacute; <strong style="color:#fff;">${nome}</strong>,
      </p>
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 28px;">
        Recebemos sua solicita&ccedil;&atilde;o de exclus&atilde;o de conta. Todos os seus dados ser&atilde;o permanentemente apagados ap&oacute;s o prazo abaixo.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#2d1215;border-radius:12px;border:1px solid #5c1d24;margin:0 0 24px;">
        <tr>
          <td style="padding:24px;text-align:center;">
            <p style="margin:0 0 4px;color:#a1707a;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;">Exclus&atilde;o permanente em</p>
            <p style="margin:0 0 12px;color:#f87171;font-size:28px;font-weight:900;">${prazoExclusao}</p>
            <span style="display:inline-block;background:#ef444425;color:#f87171;font-size:12px;font-weight:800;padding:4px 14px;border-radius:20px;border:1px solid #ef444440;">IRREVERS&Iacute;VEL</span>
          </td>
        </tr>
      </table>

      <p style="color:#c4c4cc;font-size:14px;line-height:1.7;margin:0 0 24px;text-align:center;">
        Mudou de ideia? Voc&ecirc; pode cancelar antes do prazo.
      </p>

      ${gerarBotao('Cancelar Exclusão', linkCancelar)}

      <p style="color:#71717a;font-size:12px;line-height:1.5;margin:20px 0 0;text-align:center;">
        D&uacute;vidas? <a href="mailto:suporte@v5fibra.com.br" style="color:#34d399;text-decoration:none;font-weight:600;">suporte@v5fibra.com.br</a>
      </p>
    `,
  });

  return enviarEmail({
    para,
    assunto: 'Solicitação de exclusão de conta — V5 Cloud',
    html,
  });
}

// =============================================
// FASE 8 — SUPORTE / TICKETS
// =============================================

// 26. TICKET RECEBIDO
export async function enviarTicketRecebido(
  para: string,
  nome: string,
  ticketId: string,
  assuntoTicket: string
) {
  const html = gerarTemplateBase({
    iconeEmoji: '&#127915;',
    titulo: 'Ticket recebido',
    subtitulo: `Solicita&ccedil;&atilde;o #${ticketId}`,
    conteudo: `
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 8px;">
        Ol&aacute; <strong style="color:#fff;">${nome}</strong>,
      </p>
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 28px;">
        Recebemos sua solicita&ccedil;&atilde;o e nossa equipe j&aacute; est&aacute; trabalhando nela.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1a1a2e;border-radius:12px;border:1px solid #262640;margin:0 0 24px;">
        <tr>
          <td style="padding:18px 20px;border-bottom:1px solid #262640;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Ticket</td>
                <td align="right" style="color:#34d399;font-size:14px;font-weight:900;font-family:'Courier New',monospace;">#${ticketId}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 20px;border-bottom:1px solid #262640;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Assunto</td>
                <td align="right" style="color:#e4e4e7;font-size:13px;">${assuntoTicket}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Status</td>
                <td align="right">
                  <span style="display:inline-block;background:#3b82f625;color:#60a5fa;font-size:11px;font-weight:800;padding:4px 14px;border-radius:20px;border:1px solid #3b82f640;">ABERTO</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <p style="color:#c4c4cc;font-size:14px;line-height:1.7;margin:0 0 20px;">
        Voc&ecirc; receber&aacute; atualiza&ccedil;&otilde;es por e-mail conforme o chamado for atendido.
      </p>

      <p style="color:#71717a;font-size:12px;line-height:1.5;margin:0;text-align:center;">
        Suporte: <a href="mailto:suporte@v5fibra.com.br" style="color:#34d399;text-decoration:none;font-weight:600;">suporte@v5fibra.com.br</a>
      </p>
    `,
  });

  return enviarEmail({
    para,
    assunto: `Ticket #${ticketId} recebido — ${assuntoTicket} — V5 Cloud`,
    html,
    de: CONFIG.remetenteSuporte,
  });
}

// 27. TICKET ATUALIZADO
export async function enviarTicketAtualizado(
  para: string,
  nome: string,
  ticketId: string,
  novoStatus: string,
  mensagem: string
) {
  const html = gerarTemplateBase({
    iconeEmoji: '&#128172;',
    titulo: 'Ticket atualizado',
    subtitulo: `Atualiza&ccedil;&atilde;o no ticket #${ticketId}`,
    conteudo: `
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 8px;">
        Ol&aacute; <strong style="color:#fff;">${nome}</strong>,
      </p>
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 28px;">
        Houve uma atualiza&ccedil;&atilde;o no seu chamado de suporte.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1a1a2e;border-radius:12px;border:1px solid #262640;margin:0 0 24px;">
        <tr>
          <td style="padding:18px 20px;border-bottom:1px solid #262640;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Ticket</td>
                <td align="right" style="color:#34d399;font-size:14px;font-weight:900;font-family:'Courier New',monospace;">#${ticketId}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Status</td>
                <td align="right">
                  <span style="display:inline-block;background:#fbbf2425;color:#fbbf24;font-size:11px;font-weight:800;padding:4px 14px;border-radius:20px;border:1px solid #fbbf2440;">${novoStatus.toUpperCase()}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <div style="background:#1a1a2e;border-left:3px solid #10b981;border-radius:0 8px 8px 0;padding:18px;margin:0 0 24px;">
        <p style="color:#71717a;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Resposta do suporte:</p>
        <p style="color:#e4e4e7;font-size:14px;line-height:1.7;margin:0;">${mensagem}</p>
      </div>

      <p style="color:#71717a;font-size:12px;line-height:1.5;margin:0;text-align:center;">
        Responda este e-mail para continuar a conversa.
      </p>
    `,
  });

  return enviarEmail({
    para,
    assunto: `Ticket #${ticketId} atualizado — V5 Cloud`,
    html,
    de: CONFIG.remetenteSuporte,
    responderPara: 'suporte@v5fibra.com.br',
  });
}

// 28. TICKET RESOLVIDO
export async function enviarTicketResolvido(
  para: string,
  nome: string,
  ticketId: string,
  assuntoTicket: string
) {
  const html = gerarTemplateBase({
    iconeEmoji: '&#9989;',
    titulo: 'Ticket resolvido',
    subtitulo: `Chamado #${ticketId} encerrado`,
    conteudo: `
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 8px;">
        Ol&aacute; <strong style="color:#fff;">${nome}</strong>,
      </p>
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 28px;">
        Seu chamado de suporte foi resolvido e encerrado.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1a1a2e;border-radius:12px;border:1px solid #262640;margin:0 0 24px;">
        <tr>
          <td style="padding:18px 20px;border-bottom:1px solid #262640;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Ticket</td>
                <td align="right" style="color:#34d399;font-size:14px;font-weight:900;font-family:'Courier New',monospace;">#${ticketId}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 20px;border-bottom:1px solid #262640;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Assunto</td>
                <td align="right" style="color:#e4e4e7;font-size:13px;">${assuntoTicket}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Status</td>
                <td align="right">
                  <span style="display:inline-block;background:#10b98125;color:#34d399;font-size:11px;font-weight:800;padding:4px 14px;border-radius:20px;border:1px solid #10b98140;">RESOLVIDO</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <p style="color:#c4c4cc;font-size:14px;line-height:1.7;margin:0 0 20px;">
        Caso o problema persista, voc&ecirc; pode reabrir o chamado respondendo este e-mail.
      </p>

      <p style="color:#71717a;font-size:12px;line-height:1.5;margin:0;text-align:center;">
        Obrigado por utilizar o suporte V5 Cloud!
      </p>
    `,
  });

  return enviarEmail({
    para,
    assunto: `Ticket #${ticketId} resolvido — V5 Cloud`,
    html,
    de: CONFIG.remetenteSuporte,
    responderPara: 'suporte@v5fibra.com.br',
  });
}

// 29. TICKET REABERTO
export async function enviarTicketReaberto(
  para: string,
  nome: string,
  ticketId: string,
  assuntoTicket: string
) {
  const html = gerarTemplateBase({
    iconeEmoji: '&#128260;',
    titulo: 'Ticket reaberto',
    subtitulo: `Chamado #${ticketId} foi reaberto`,
    conteudo: `
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 8px;">
        Ol&aacute; <strong style="color:#fff;">${nome}</strong>,
      </p>
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 28px;">
        Seu chamado de suporte foi reaberto e nossa equipe ir&aacute; analis&aacute;-lo novamente.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1a1a2e;border-radius:12px;border:1px solid #262640;margin:0 0 24px;">
        <tr>
          <td style="padding:18px 20px;border-bottom:1px solid #262640;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Ticket</td>
                <td align="right" style="color:#34d399;font-size:14px;font-weight:900;font-family:'Courier New',monospace;">#${ticketId}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 20px;border-bottom:1px solid #262640;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Assunto</td>
                <td align="right" style="color:#e4e4e7;font-size:13px;">${assuntoTicket}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Status</td>
                <td align="right">
                  <span style="display:inline-block;background:#fbbf2425;color:#fbbf24;font-size:11px;font-weight:800;padding:4px 14px;border-radius:20px;border:1px solid #fbbf2440;">REABERTO</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <p style="color:#c4c4cc;font-size:14px;line-height:1.7;margin:0 0 20px;">
        Voc&ecirc; ser&aacute; notificado assim que houver novas atualiza&ccedil;&otilde;es.
      </p>

      <p style="color:#71717a;font-size:12px;line-height:1.5;margin:0;text-align:center;">
        Suporte: <a href="mailto:suporte@v5fibra.com.br" style="color:#34d399;text-decoration:none;font-weight:600;">suporte@v5fibra.com.br</a>
      </p>
    `,
  });

  return enviarEmail({
    para,
    assunto: `Ticket #${ticketId} reaberto — V5 Cloud`,
    html,
    de: CONFIG.remetenteSuporte,
  });
}

// =============================================
// FASE 9 — SISTEMA
// =============================================

// 30. MANUTENCAO PROGRAMADA
export async function enviarManutencaoProgramada(
  para: string,
  nome: string,
  dataInicio: string,
  dataFim: string,
  servicosAfetados: string[]
) {
  const html = gerarTemplateBase({
    iconeEmoji: '&#128736;',
    titulo: 'Manuten&ccedil;&atilde;o programada',
    subtitulo: 'Aviso antecipado de manuten&ccedil;&atilde;o',
    conteudo: `
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 8px;">
        Ol&aacute; <strong style="color:#fff;">${nome}</strong>,
      </p>
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 28px;">
        Realizaremos uma manuten&ccedil;&atilde;o programada que pode afetar o funcionamento de alguns servi&ccedil;os.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,#1a1810,#1a1a2e);border-radius:12px;border:1px solid #fbbf2430;margin:0 0 24px;">
        <tr>
          <td style="padding:24px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="50%" align="center" style="padding:8px 4px;">
                  <p style="margin:0 0 4px;color:#71717a;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;">In&iacute;cio</p>
                  <p style="margin:0;color:#fbbf24;font-size:16px;font-weight:900;font-family:'Courier New',monospace;">${dataInicio}</p>
                </td>
                <td width="1" style="background:#262640;">&nbsp;</td>
                <td width="50%" align="center" style="padding:8px 4px;">
                  <p style="margin:0 0 4px;color:#71717a;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;">Previs&atilde;o de t&eacute;rmino</p>
                  <p style="margin:0;color:#34d399;font-size:16px;font-weight:900;font-family:'Courier New',monospace;">${dataFim}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1a1a2e;border-radius:12px;border:1px solid #262640;margin:0 0 24px;">
        <tr>
          <td style="padding:14px 20px;border-bottom:1px solid #262640;">
            <p style="color:#71717a;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;margin:0;">Servi&ccedil;os afetados</p>
          </td>
        </tr>
        ${servicosAfetados.map(s => `
          <tr>
            <td style="padding:10px 20px;border-bottom:1px solid #262640;">
              <p style="color:#fbbf24;font-size:13px;margin:0;">&#9888;&#65039; ${s}</p>
            </td>
          </tr>
        `).join('')}
      </table>

      <p style="color:#c4c4cc;font-size:14px;line-height:1.7;margin:0 0 20px;">
        Pedimos desculpas pelo inconveniente. Enviaremos um aviso quando tudo estiver normalizado.
      </p>

      <p style="color:#71717a;font-size:12px;line-height:1.5;margin:0;text-align:center;">
        Acompanhe: <a href="mailto:suporte@v5fibra.com.br" style="color:#34d399;text-decoration:none;font-weight:600;">suporte@v5fibra.com.br</a>
      </p>
    `,
  });

  return enviarEmail({
    para,
    assunto: 'Manutenção programada — V5 Cloud',
    html,
    de: CONFIG.remetenteSuporte,
  });
}

// 31. INSTABILIDADE / INTERRUPCAO
export async function enviarInstabilidade(
  para: string,
  nome: string,
  servicoAfetado: string,
  descricao: string
) {
  const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  const html = gerarTemplateBase({
    iconeEmoji: '&#9888;&#65039;',
    titulo: 'Instabilidade detectada',
    subtitulo: 'Estamos cientes e trabalhando na solu&ccedil;&atilde;o',
    conteudo: `
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 8px;">
        Ol&aacute; <strong style="color:#fff;">${nome}</strong>,
      </p>
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 28px;">
        Identificamos uma instabilidade em nossos servi&ccedil;os. Nossa equipe j&aacute; est&aacute; atuando na corre&ccedil;&atilde;o.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#2d1215;border-radius:12px;border:1px solid #5c1d24;margin:0 0 24px;">
        <tr>
          <td style="padding:18px 20px;border-bottom:1px solid #5c1d24;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="color:#a1707a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Servi&ccedil;o afetado</td>
                <td align="right" style="color:#f87171;font-size:13px;font-weight:700;">${servicoAfetado}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 20px;border-bottom:1px solid #5c1d24;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="color:#a1707a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Detectado em</td>
                <td align="right" style="color:#e4e4e7;font-size:13px;font-family:'Courier New',monospace;">${agora}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="color:#a1707a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Status</td>
                <td align="right">
                  <span style="display:inline-block;background:#ef444425;color:#f87171;font-size:11px;font-weight:800;padding:4px 14px;border-radius:20px;border:1px solid #ef444440;">INVESTIGANDO</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <div style="background:#1a1a2e;border-left:3px solid #fbbf24;border-radius:0 8px 8px 0;padding:18px;margin:0 0 24px;">
        <p style="color:#71717a;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Descri&ccedil;&atilde;o</p>
        <p style="color:#e4e4e7;font-size:14px;line-height:1.7;margin:0;">${descricao}</p>
      </div>

      <p style="color:#c4c4cc;font-size:14px;line-height:1.7;margin:0 0 20px;">
        Enviaremos um novo aviso quando o servi&ccedil;o estiver normalizado.
      </p>

      <p style="color:#71717a;font-size:12px;line-height:1.5;margin:0;text-align:center;">
        Suporte: <a href="mailto:suporte@v5fibra.com.br" style="color:#34d399;text-decoration:none;font-weight:600;">suporte@v5fibra.com.br</a>
      </p>
    `,
  });

  return enviarEmail({
    para,
    assunto: `⚠️ Instabilidade detectada — ${servicoAfetado} — V5 Cloud`,
    html,
    de: CONFIG.remetenteSuporte,
  });
}

// 32. SERVICO NORMALIZADO
export async function enviarServicoNormalizado(
  para: string,
  nome: string,
  servicoAfetado: string,
  duracaoIncidente: string
) {
  const html = gerarTemplateBase({
    iconeEmoji: '&#9989;',
    titulo: 'Servi&ccedil;o normalizado',
    subtitulo: 'Tudo funcionando normalmente',
    conteudo: `
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 8px;">
        Ol&aacute; <strong style="color:#fff;">${nome}</strong>,
      </p>
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 28px;">
        O servi&ccedil;o que apresentava instabilidade foi normalizado e est&aacute; operando corretamente.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,#0a2818,#1a1a2e);border-radius:12px;border:1px solid #10b98130;margin:0 0 24px;">
        <tr>
          <td style="padding:24px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="33%" align="center" style="padding:8px 4px;">
                  <p style="margin:0 0 6px;color:#fff;font-size:14px;font-weight:700;">${servicoAfetado}</p>
                  <p style="margin:0;color:#71717a;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;">Servi&ccedil;o</p>
                </td>
                <td width="1" style="background:#262640;">&nbsp;</td>
                <td width="33%" align="center" style="padding:8px 4px;">
                  <span style="display:inline-block;background:#10b98125;color:#34d399;font-size:11px;font-weight:800;padding:4px 14px;border-radius:20px;border:1px solid #10b98140;">ONLINE</span>
                  <p style="margin:6px 0 0;color:#71717a;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;">Status</p>
                </td>
                <td width="1" style="background:#262640;">&nbsp;</td>
                <td width="33%" align="center" style="padding:8px 4px;">
                  <p style="margin:0 0 6px;color:#fbbf24;font-size:14px;font-weight:700;">${duracaoIncidente}</p>
                  <p style="margin:0;color:#71717a;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;">Dura&ccedil;&atilde;o</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <p style="color:#c4c4cc;font-size:14px;line-height:1.7;margin:0 0 20px;">
        Pedimos desculpas pelo transtorno causado. Seguimos trabalhando para garantir a melhor experi&ecirc;ncia poss&iacute;vel.
      </p>

      ${gerarBotao('Acessar Painel', `${CONFIG.urlBase}/login`)}
    `,
  });

  return enviarEmail({
    para,
    assunto: `✅ Serviço normalizado — ${servicoAfetado} — V5 Cloud`,
    html,
    de: CONFIG.remetenteSuporte,
  });
}

// =============================================
// FASE 10 — LEGAL / LGPD
// =============================================

// 33. ALTERACAO DOS TERMOS DE USO
export async function enviarAlteracaoTermos(
  para: string,
  nome: string,
  dataVigor: string,
  linkTermos: string
) {
  const html = gerarTemplateBase({
    iconeEmoji: '&#128220;',
    titulo: 'Termos de Uso atualizados',
    subtitulo: 'Altera&ccedil;&atilde;o nos nossos Termos de Uso',
    conteudo: `
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 8px;">
        Ol&aacute; <strong style="color:#fff;">${nome}</strong>,
      </p>
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 28px;">
        Atualizamos nossos Termos de Uso para refletir melhorias no nosso servi&ccedil;o. As altera&ccedil;&otilde;es entram em vigor na data indicada abaixo.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1a1a2e;border-radius:12px;border:1px solid #262640;margin:0 0 28px;">
        <tr>
          <td style="padding:18px 20px;border-bottom:1px solid #262640;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Documento</td>
                <td align="right" style="color:#e4e4e7;font-size:13px;font-weight:700;">Termos de Uso</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Vigente a partir de</td>
                <td align="right" style="color:#34d399;font-size:14px;font-weight:700;font-family:'Courier New',monospace;">${dataVigor}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      ${gerarBotao('Ler Termos de Uso', linkTermos)}

      <p style="color:#71717a;font-size:12px;line-height:1.6;margin:20px 0 0;text-align:center;">
        O uso continuado da plataforma ap&oacute;s a data de vig&ecirc;ncia constitui aceita&ccedil;&atilde;o dos novos termos. D&uacute;vidas: <a href="mailto:suporte@v5fibra.com.br" style="color:#34d399;text-decoration:none;font-weight:600;">suporte@v5fibra.com.br</a>
      </p>
    `,
  });

  return enviarEmail({
    para,
    assunto: 'Atualização nos Termos de Uso — V5 Cloud',
    html,
  });
}

// 34. ALTERACAO DA POLITICA DE PRIVACIDADE
export async function enviarAlteracaoPrivacidade(
  para: string,
  nome: string,
  dataVigor: string,
  linkPolitica: string
) {
  const html = gerarTemplateBase({
    iconeEmoji: '&#128737;',
    titulo: 'Pol&iacute;tica de Privacidade atualizada',
    subtitulo: 'Altera&ccedil;&atilde;o na nossa Pol&iacute;tica de Privacidade',
    conteudo: `
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 8px;">
        Ol&aacute; <strong style="color:#fff;">${nome}</strong>,
      </p>
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 28px;">
        Atualizamos nossa Pol&iacute;tica de Privacidade para garantir mais transpar&ecirc;ncia sobre como tratamos seus dados, em conformidade com a LGPD.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1a1a2e;border-radius:12px;border:1px solid #262640;margin:0 0 28px;">
        <tr>
          <td style="padding:18px 20px;border-bottom:1px solid #262640;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Documento</td>
                <td align="right" style="color:#e4e4e7;font-size:13px;font-weight:700;">Pol&iacute;tica de Privacidade</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Vigente a partir de</td>
                <td align="right" style="color:#34d399;font-size:14px;font-weight:700;font-family:'Courier New',monospace;">${dataVigor}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      ${gerarBotao('Ler Política de Privacidade', linkPolitica)}

      <p style="color:#71717a;font-size:12px;line-height:1.6;margin:20px 0 0;text-align:center;">
        D&uacute;vidas sobre seus dados? <a href="mailto:suporte@v5fibra.com.br" style="color:#34d399;text-decoration:none;font-weight:600;">suporte@v5fibra.com.br</a>
      </p>
    `,
  });

  return enviarEmail({
    para,
    assunto: 'Atualização na Política de Privacidade — V5 Cloud',
    html,
  });
}

// 35. SOLICITACAO DE DADOS / LGPD
export async function enviarSolicitacaoLGPD(
  para: string,
  nome: string,
  tipoSolicitacao: string,
  protocolo: string,
  prazoResposta: string
) {
  const html = gerarTemplateBase({
    iconeEmoji: '&#128220;',
    titulo: 'Solicita&ccedil;&atilde;o LGPD recebida',
    subtitulo: 'Confirmamos sua solicita&ccedil;&atilde;o de dados pessoais',
    conteudo: `
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 8px;">
        Ol&aacute; <strong style="color:#fff;">${nome}</strong>,
      </p>
      <p style="color:#c4c4cc;font-size:15px;line-height:1.7;margin:0 0 28px;">
        Recebemos sua solicita&ccedil;&atilde;o referente aos seus dados pessoais, conforme previsto na Lei Geral de Prote&ccedil;&atilde;o de Dados (LGPD).
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1a1a2e;border-radius:12px;border:1px solid #262640;margin:0 0 24px;">
        <tr>
          <td style="padding:18px 20px;border-bottom:1px solid #262640;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Tipo</td>
                <td align="right" style="color:#e4e4e7;font-size:13px;font-weight:700;">${tipoSolicitacao}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 20px;border-bottom:1px solid #262640;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Protocolo</td>
                <td align="right" style="color:#34d399;font-size:14px;font-weight:900;font-family:'Courier New',monospace;">${protocolo}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Prazo de resposta</td>
                <td align="right" style="color:#fbbf24;font-size:14px;font-weight:700;">${prazoResposta}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <p style="color:#c4c4cc;font-size:14px;line-height:1.7;margin:0 0 20px;">
        Entraremos em contato dentro do prazo informado. Guarde o n&uacute;mero do protocolo para acompanhamento.
      </p>

      <p style="color:#71717a;font-size:12px;line-height:1.5;margin:0;text-align:center;">
        DPO / Encarregado de dados: <a href="mailto:suporte@v5fibra.com.br" style="color:#34d399;text-decoration:none;font-weight:600;">suporte@v5fibra.com.br</a>
      </p>
    `,
  });

  return enviarEmail({
    para,
    assunto: `Solicitação LGPD recebida — Protocolo ${protocolo} — V5 Cloud`,
    html,
  });
}

// ============================================
// TEMPLATE BASE v2 (Design moderno)
// ============================================
function gerarTemplateBase({ iconeEmoji, titulo, subtitulo, conteudo }: {
  iconeEmoji: string;
  titulo: string;
  subtitulo: string;
  conteudo: string;
}): string {
  const ano = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${titulo}</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0a0a0a;padding:0;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">

          <!-- BARRA VERDE TOPO -->
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#059669,#10b981,#34d399);font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- HEADER COM GRADIENTE -->
          <tr>
            <td style="background:linear-gradient(180deg,#0c1f17 0%,#0a0a0a 100%);padding:40px 32px 32px;text-align:center;">
              <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 20px;">
                <tr>
                  <td style="background:#111;border:1px solid #1e3b29;border-radius:14px;padding:14px;text-align:center;">
                    <span style="font-size:28px;line-height:1;">${iconeEmoji}</span>
                  </td>
                </tr>
              </table>
              <h1 style="margin:0 0 6px;font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">
                ${titulo}
              </h1>
              <p style="margin:0;color:#71717a;font-size:13px;letter-spacing:0.3px;">
                ${subtitulo}
              </p>
            </td>
          </tr>

          <!-- DIVISOR SUTIL -->
          <tr>
            <td style="padding:0 32px;">
              <div style="height:1px;background:linear-gradient(90deg,transparent,#262626,transparent);"></div>
            </td>
          </tr>

          <!-- CONTEUDO PRINCIPAL -->
          <tr>
            <td style="background:#0a0a0a;padding:32px;">
              ${conteudo}
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding:0 32px;">
              <div style="height:1px;background:linear-gradient(90deg,transparent,#262626,transparent);"></div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 12px;text-align:center;">
              <p style="margin:0 0 4px;font-family:'Courier New',monospace;font-size:11px;font-weight:800;letter-spacing:3px;color:#3f3f46;text-transform:uppercase;">
                V5 Cloud
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 32px 8px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:0 8px;">
                    <a href="https://v5fibra.com.br" style="color:#525252;font-size:11px;text-decoration:none;">Site</a>
                  </td>
                  <td style="color:#333;font-size:11px;">|</td>
                  <td style="padding:0 8px;">
                    <a href="mailto:suporte@v5fibra.com.br" style="color:#525252;font-size:11px;text-decoration:none;">Suporte</a>
                  </td>
                  <td style="color:#333;font-size:11px;">|</td>
                  <td style="padding:0 8px;">
                    <a href="mailto:financeiro@v5fibra.com.br" style="color:#525252;font-size:11px;text-decoration:none;">Financeiro</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 40px;text-align:center;">
              <p style="color:#333;font-size:10px;line-height:1.5;margin:0;">
                &copy; ${ano} V5 Fibra &mdash; v5fibra.com.br<br/>
                Este e-mail foi enviado automaticamente.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}

// ============================================
// BOTAO CTA (Estilo moderno com seta)
// ============================================
function gerarBotao(texto: string, url: string): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center" style="padding:4px 0;">
          <a href="${url}" target="_blank" style="
            display:inline-block;
            background:linear-gradient(135deg,#059669,#10b981);
            color:#000;
            font-size:13px;
            font-weight:700;
            text-decoration:none;
            padding:14px 36px;
            border-radius:10px;
            letter-spacing:0.5px;
          ">${texto} &nbsp;&#8594;</a>
        </td>
      </tr>
    </table>
  `;
}

export { CONFIG };