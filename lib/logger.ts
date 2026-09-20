// lib/logger.ts
// Sistema centralizado de logs - integra com Supabase

export type LogLevel = 'INFO' | 'ERROR' | 'WARNING' | 'DEBUG' | 'SUCCESS';
export type LogEntidade = 'leads' | 'autenticacao' | 'operador' | 'empresa' | 'sistema' | 'webhooks' | 'checkout';

export interface LogData {
  nivel: LogLevel;
  acao: string;
  entidade: LogEntidade;
  mensagem: string;
  operadorEmail?: string;
  operadorId?: string;
  empresaId?: string;
  entidadeId?: string;
  ip?: string;
  detalhes?: Record<string, any>;
  timestamp?: string;
  userAgent?: string;
}

class Logger {
  private logs: LogData[] = [];
  private MAX_LOGS_OFFLINE = 100;

  async log(dados: Omit<LogData, 'timestamp'>) {
    const logCompleto: LogData = {
      ...dados,
      timestamp: new Date().toISOString(),
    };

    this.logs.push(logCompleto);
    await this.enviarParaServidor(logCompleto);

    if (this.logs.length >= this.MAX_LOGS_OFFLINE) {
      await this.enviarFilaCompleta();
    }
  }

  async sucesso(acao: string, entidade: LogEntidade, mensagem: string, detalhes?: Record<string, any>) {
    await this.log({
      nivel: 'SUCCESS', acao, entidade, mensagem,
      empresaId: detalhes?.empresaId,
      operadorId: detalhes?.operadorId,
      operadorEmail: detalhes?.operadorEmail,
      entidadeId: detalhes?.entidadeId,
      ip: detalhes?.ip,
      detalhes,
    });
  }

  async erro(acao: string, entidade: LogEntidade, mensagem: string, erro?: any, detalhes?: Record<string, any>) {
    const mensagemErro = erro?.message || String(erro) || 'Erro desconhecido';
    await this.log({
      nivel: 'ERROR', acao, entidade, mensagem,
      empresaId: detalhes?.empresaId,
      operadorId: detalhes?.operadorId,
      operadorEmail: detalhes?.operadorEmail,
      entidadeId: detalhes?.entidadeId,
      ip: detalhes?.ip,
      detalhes: { ...detalhes, erroOriginal: mensagemErro, stack: erro?.stack },
    });
  }

  async aviso(acao: string, entidade: LogEntidade, mensagem: string, detalhes?: Record<string, any>) {
    await this.log({
      nivel: 'WARNING', acao, entidade, mensagem,
      empresaId: detalhes?.empresaId,
      operadorId: detalhes?.operadorId,
      operadorEmail: detalhes?.operadorEmail,
      entidadeId: detalhes?.entidadeId,
      ip: detalhes?.ip,
      detalhes,
    });
  }

  async info(acao: string, entidade: LogEntidade, mensagem: string, detalhes?: Record<string, any>) {
    await this.log({
      nivel: 'INFO', acao, entidade, mensagem,
      empresaId: detalhes?.empresaId,
      operadorId: detalhes?.operadorId,
      operadorEmail: detalhes?.operadorEmail,
      entidadeId: detalhes?.entidadeId,
      ip: detalhes?.ip,
      detalhes,
    });
  }

  async debug(acao: string, entidade: LogEntidade, mensagem: string, detalhes?: Record<string, any>) {
    if (process.env.NODE_ENV !== 'development') return;
    await this.log({
      nivel: 'DEBUG', acao, entidade, mensagem,
      empresaId: detalhes?.empresaId,
      operadorId: detalhes?.operadorId,
      operadorEmail: detalhes?.operadorEmail,
      entidadeId: detalhes?.entidadeId,
      ip: detalhes?.ip,
      detalhes,
    });
  }

  async cto(acao: string, mensagem: string, operadorEmail?: string, entidadeId?: string, detalhes?: Record<string, any>) {
    await this.log({
      nivel: 'SUCCESS',
      acao,
      entidade: 'sistema', 
      mensagem,
      operadorEmail,
      entidadeId,
      empresaId: detalhes?.empresaId,     // ✅ Puxa a empresa para a raiz
      operadorId: detalhes?.operadorId,   // ✅ Puxa o operador para a raiz
      ip: detalhes?.ip,                   // ✅ Puxa o IP para a raiz
      detalhes,
    });
  }

  private async enviarParaServidor(logData: LogData) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const res = await fetch(`${baseUrl}/api/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logData),
      });

      if (!res.ok) {
        console.warn('Falha ao enviar log para servidor:', res.status);
      } else {
        this.logs = this.logs.filter(l => l.timestamp !== logData.timestamp);
      }
    } catch (erro) {
      console.warn('Erro ao conectar ao servidor de logs:', erro);
    }
  }

  private async enviarFilaCompleta() {
    if (this.logs.length === 0) return;
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const res = await fetch(`${baseUrl}/api/logs/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs: this.logs }),
      });
      if (res.ok) this.logs = []; 
    } catch (erro) {
      console.warn('Erro ao enviar fila de logs:', erro);
    }
  }

  async flush() {
    await this.enviarFilaCompleta();
  }
}

export const logger = new Logger();
export default logger;