// ============================================================
// V5 Fibra - Server Entry Point
// Backend Express para o módulo financeiro
// ============================================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { createFinancialModule } from './src/routes';
import cookieParser from 'cookie-parser';
import { authMiddleware } from './src/middleware/auth';

dotenv.config();

// ============================================================
// Configuração do Banco de Dados
// ============================================================

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

db.on('error', (err) => {
  console.error('[DB] Erro inesperado no pool:', err);
});

// ============================================================
// App Express
// ============================================================

const app = express();
const PORT = parseInt(process.env.PORT || '4000', 10);

// --- Middlewares globais ---
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --- Health check ---
app.get('/api/health', async (_req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(503).json({ status: 'error', message: err.message });
  }
});

// ============================================================
// Módulo Financeiro
// ============================================================

const financial = createFinancialModule({ db });

// Montar rotas
app.use('/api/financial', authMiddleware, financial.router);

// ============================================================
// Error handler global
// ============================================================

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Error]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Erro interno do servidor',
  });
});

// ============================================================
// Iniciar servidor
// ============================================================

async function start() {
  try {
    await db.query('SELECT NOW()');
    console.log('[DB] Conectado ao PostgreSQL');

    app.listen(PORT, () => {
      console.log(`[V5 Fibra] Servidor financeiro rodando na porta ${PORT}`);
      console.log(`[V5 Fibra] Health check: http://localhost:${PORT}/api/health`);
      console.log(`[V5 Fibra] API Bills: http://localhost:${PORT}/api/financial/bills`);
      console.log(`[V5 Fibra] API Cashflow: http://localhost:${PORT}/api/financial/cashflow`);
    });
  } catch (err) {
    console.error('[V5 Fibra] Falha ao iniciar:', err);
    process.exit(1);
  }
}

start();