// ============================================
// API: TESTAR TODOS OS EMAILS DE UMA VEZ
// POST /api/email/testar-todos
// REMOVA ESTE ARQUIVO ANTES DO DEPLOY!
// ============================================
import { NextRequest, NextResponse } from 'next/server';
import {
  enviarCodigoVerificacao,
  enviarBoasVindas,
  enviarRecuperacaoSenha,
  enviarAvisoSenhaAlterada,
  enviarAssinaturaAtivada,
  enviarAlertaNovoDispositivo,
  enviarCodigo2FA,
  enviarContaDesativada,
  enviarContaReativada,
  enviarFaturaGerada,
  enviarPagamentoConfirmado,
  enviarFalhaPagamento,
  enviarAssinaturaCancelada,
  enviarAssinaturaExpirada,
  enviarRelatorioSemanal,
  enviarResumoMensal,
  enviarEmailAlterado,
  enviarPagamentoPendente,
  enviarPagamentoVencendo,
  enviarCartaoVencendo,
  enviarTentativaCobranca,
  enviarUsuarioAlterado,
  enviarAlteracaoDadosEmpresa,
  enviarExportacaoConcluida,
  enviarSolicitacaoExclusao,
  enviarTicketRecebido,
  enviarTicketAtualizado,
  enviarTicketResolvido,
  enviarTicketReaberto,
  enviarManutencaoProgramada,
  enviarInstabilidade,
  enviarServicoNormalizado,
  enviarAlteracaoTermos,
  enviarAlteracaoPrivacidade,
  enviarSolicitacaoLGPD,
} from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { mensagem: 'Envie {"email": "seu@email.com"} no body.' },
        { status: 400 }
      );
    }

    console.log(`\nINICIANDO TESTE DE TODOS OS 35 EMAILS PARA: ${email}\n`);

    const resultados = [];
    const total = 35;

    // =========================================
    // FASE 1 — ESSENCIAIS (5)
    // =========================================

    console.log(`1/${total} — Codigo de Verificacao...`);
    const r1 = await enviarCodigoVerificacao(email, 'Usuario Teste', '483291');
    resultados.push({ template: '1. Codigo de Verificacao (OTP)', ...r1 });

    console.log(`2/${total} — Boas-vindas...`);
    const r2 = await enviarBoasVindas(email, 'Usuario Teste', 'Profissional');
    resultados.push({ template: '2. Boas-vindas', ...r2 });

    console.log(`3/${total} — Recuperacao de Senha...`);
    const r3 = await enviarRecuperacaoSenha(email, 'Usuario Teste', 'token-teste-abc123');
    resultados.push({ template: '3. Recuperacao de Senha', ...r3 });

    console.log(`4/${total} — Senha Alterada...`);
    const r4 = await enviarAvisoSenhaAlterada(email, 'Usuario Teste');
    resultados.push({ template: '4. Senha Alterada', ...r4 });

    console.log(`5/${total} — Assinatura Ativada...`);
    const r5 = await enviarAssinaturaAtivada(email, 'Usuario Teste', 'Profissional', '197,00', '10/11/2026');
    resultados.push({ template: '5. Assinatura Ativada', ...r5 });

    // =========================================
    // FASE 2 — SEGURANCA (4)
    // =========================================

    console.log(`6/${total} — Alerta Novo Dispositivo...`);
    const r6 = await enviarAlertaNovoDispositivo(email, 'Usuario Teste', 'Chrome no Windows 11', 'Sao Paulo, SP', '189.45.123.78');
    resultados.push({ template: '6. Alerta Novo Dispositivo', ...r6 });

    console.log(`7/${total} — Codigo 2FA...`);
    const r7 = await enviarCodigo2FA(email, 'Usuario Teste', '847293');
    resultados.push({ template: '7. Codigo 2FA', ...r7 });

    console.log(`8/${total} — Conta Desativada...`);
    const r8 = await enviarContaDesativada(email, 'Usuario Teste', 'Solicitacao do administrador');
    resultados.push({ template: '8. Conta Desativada', ...r8 });

    console.log(`9/${total} — Conta Reativada...`);
    const r9 = await enviarContaReativada(email, 'Usuario Teste');
    resultados.push({ template: '9. Conta Reativada', ...r9 });

    // =========================================
    // FASE 3 — FINANCEIRO (9)
    // =========================================

    console.log(`10/${total} — Fatura Gerada...`);
    const r10 = await enviarFaturaGerada(email, 'Usuario Teste', '197,00', '15/11/2026', 'https://exemplo.com/boleto');
    resultados.push({ template: '10. Fatura Gerada', ...r10 });

    console.log(`11/${total} — Pagamento Confirmado...`);
    const r11 = await enviarPagamentoConfirmado(email, 'Usuario Teste', '197,00', 'PAG-2026-001234');
    resultados.push({ template: '11. Pagamento Confirmado', ...r11 });

    console.log(`12/${total} — Falha no Pagamento...`);
    const r12 = await enviarFalhaPagamento(email, 'Usuario Teste', '197,00', 'Cartao recusado pela operadora');
    resultados.push({ template: '12. Falha no Pagamento', ...r12 });

    console.log(`13/${total} — Assinatura Cancelada...`);
    const r13 = await enviarAssinaturaCancelada(email, 'Usuario Teste', 'Profissional', '10/12/2026');
    resultados.push({ template: '13. Assinatura Cancelada', ...r13 });

    console.log(`14/${total} — Assinatura Expirada...`);
    const r14 = await enviarAssinaturaExpirada(email, 'Usuario Teste', 'Profissional');
    resultados.push({ template: '14. Assinatura Expirada', ...r14 });

    console.log(`15/${total} — Pagamento Pendente...`);
    const r15 = await enviarPagamentoPendente(email, 'Usuario Teste', '197,00', '20/11/2026');
    resultados.push({ template: '15. Pagamento Pendente', ...r15 });

    console.log(`16/${total} — Pagamento Vencendo...`);
    const r16 = await enviarPagamentoVencendo(email, 'Usuario Teste', '197,00', '18/11/2026', 3);
    resultados.push({ template: '16. Pagamento Vencendo (3 dias)', ...r16 });

    console.log(`17/${total} — Cartao Vencendo...`);
    const r17 = await enviarCartaoVencendo(email, 'Usuario Teste', '4532', '12/2026');
    resultados.push({ template: '17. Cartao Vencendo', ...r17 });

    console.log(`18/${total} — Tentativa de Cobranca...`);
    const r18 = await enviarTentativaCobranca(email, 'Usuario Teste', '197,00', 2, '15/11/2026');
    resultados.push({ template: '18. Tentativa de Cobranca (2a tentativa)', ...r18 });

    // =========================================
    // FASE 4 — CONTA / EMPRESA (4)
    // =========================================

    console.log(`19/${total} — Email Alterado...`);
    const r19 = await enviarEmailAlterado(email, 'Usuario Teste', 'antigo@email.com', 'novo@email.com');
    resultados.push({ template: '19. Email Alterado', ...r19 });

    console.log(`20/${total} — Usuario Alterado...`);
    const r20 = await enviarUsuarioAlterado(email, 'Usuario Teste', 'Carlos Silva', 'adicionado', 'Tecnico');
    resultados.push({ template: '20. Usuario Adicionado', ...r20 });

    console.log(`21/${total} — Alteracao Dados Empresa...`);
    const r21 = await enviarAlteracaoDadosEmpresa(email, 'Usuario Teste', ['Razao Social', 'CNPJ', 'Endereco']);
    resultados.push({ template: '21. Alteracao Dados Empresa', ...r21 });

    console.log(`22/${total} — Solicitacao de Exclusao...`);
    const r22 = await enviarSolicitacaoExclusao(email, 'Usuario Teste', '30 dias', `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.v5fibra.com.br'}/cancelar-exclusao`);
    resultados.push({ template: '22. Solicitacao de Exclusao', ...r22 });

    // =========================================
    // FASE 5 — SUPORTE (4)
    // =========================================

    console.log(`23/${total} — Ticket Recebido...`);
    const r23 = await enviarTicketRecebido(email, 'Usuario Teste', 'TK-2026-00456', 'Internet lenta no periodo noturno');
    resultados.push({ template: '23. Ticket Recebido', ...r23 });

    console.log(`24/${total} — Ticket Atualizado...`);
    const r24 = await enviarTicketAtualizado(email, 'Usuario Teste', 'TK-2026-00456', 'Em Andamento', 'Estamos analisando o trafego da sua regiao e identificamos um ponto de congestionamento.');
    resultados.push({ template: '24. Ticket Atualizado', ...r24 });

    console.log(`25/${total} — Ticket Resolvido...`);
    const r25 = await enviarTicketResolvido(email, 'Usuario Teste', 'TK-2026-00456', 'Internet lenta no periodo noturno');
    resultados.push({ template: '25. Ticket Resolvido', ...r25 });

    console.log(`26/${total} — Ticket Reaberto...`);
    const r26 = await enviarTicketReaberto(email, 'Usuario Teste', 'TK-2026-00456', 'Internet lenta no periodo noturno');
    resultados.push({ template: '26. Ticket Reaberto', ...r26 });

    // =========================================
    // FASE 6 — SISTEMA (3)
    // =========================================

    console.log(`27/${total} — Manutencao Programada...`);
    const r27 = await enviarManutencaoProgramada(email, 'Usuario Teste', '15/11/2026 as 02:00', '15/11/2026 as 06:00', ['Painel do Cliente', 'API de Integracao', 'Portal de Pagamentos']);
    resultados.push({ template: '27. Manutencao Programada', ...r27 });

    console.log(`28/${total} — Instabilidade Detectada...`);
    const r28 = await enviarInstabilidade(email, 'Usuario Teste', 'Servidor de Autenticacao', 'Identificamos lentidao no login. Nossa equipe ja esta atuando para resolver o mais rapido possivel.');
    resultados.push({ template: '28. Instabilidade Detectada', ...r28 });

    console.log(`29/${total} — Servico Normalizado...`);
    const r29 = await enviarServicoNormalizado(email, 'Usuario Teste', 'Servidor de Autenticacao', '2 horas e 15 minutos');
    resultados.push({ template: '29. Servico Normalizado', ...r29 });

    // =========================================
    // FASE 7 — LEGAL / LGPD (3)
    // =========================================

    console.log(`30/${total} — Alteracao nos Termos...`);
    const r30 = await enviarAlteracaoTermos(email, 'Usuario Teste', '15/12/2026', `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.v5fibra.com.br'}/termos`);
    resultados.push({ template: '30. Alteracao nos Termos', ...r30 });

    console.log(`31/${total} — Alteracao na Politica de Privacidade...`);
    const r31 = await enviarAlteracaoPrivacidade(email, 'Usuario Teste', '15/12/2026', `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.v5fibra.com.br'}/privacidade`);
    resultados.push({ template: '31. Alteracao na Politica de Privacidade', ...r31 });

    console.log(`32/${total} — Solicitacao LGPD...`);
    const r32 = await enviarSolicitacaoLGPD(email, 'Usuario Teste', 'Acesso aos dados pessoais', 'LGPD-2026-007891', '15 dias uteis');
    resultados.push({ template: '32. Solicitacao LGPD', ...r32 });

    // =========================================
    // FASE 8 — RELATORIOS (2)
    // =========================================

    console.log(`33/${total} — Exportacao Concluida...`);
    const r33 = await enviarExportacaoConcluida(email, 'Usuario Teste', 'Relatorio de Clientes Ativos', `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.v5fibra.com.br'}/downloads/relatorio-clientes.xlsx`);
    resultados.push({ template: '33. Exportacao Concluida', ...r33 });

    console.log(`34/${total} — Relatorio Semanal...`);
    const r34 = await enviarRelatorioSemanal(email, 'Usuario Teste', '07/10 a 13/10/2026', {
      leadsNovos: 342,
      osAbertas: 89,
      osConcluidas: 76,
      taxaConversao: '22.8%',
    });
    resultados.push({ template: '34. Relatorio Semanal', ...r34 });

    console.log(`35/${total} — Resumo Mensal...`);
    const r35 = await enviarResumoMensal(email, 'Usuario Teste', 'Outubro 2026', {
      totalLeads: 1420,
      totalOS: 380,
      osConcluidas: 341,
      ticketMedio: '89,50',
      receitaTotal: '34.010,00',
      melhorTecnico: 'Carlos Silva',
    });
    resultados.push({ template: '35. Resumo Mensal', ...r35 });

    // =========================================
    // RESUMO FINAL
    // =========================================
    const sucessos = resultados.filter(r => r.sucesso).length;
    const falhas = resultados.filter(r => !r.sucesso).length;

    console.log(`\nTESTE CONCLUIDO: ${sucessos}/${total} enviados | ${falhas} falhas\n`);

    return NextResponse.json({
      resumo: `${sucessos}/${total} emails enviados com sucesso`,
      resultados,
    });

  } catch (erro) {
    console.error('Erro no teste:', erro);
    return NextResponse.json(
      { mensagem: 'Erro ao executar teste.', erro: String(erro) },
      { status: 500 }
    );
  }
}