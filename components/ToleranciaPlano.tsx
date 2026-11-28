'use client';

// components/ToleranciaPlano.tsx
// Banner regressivo + popup bloqueante para tolerância de limite de plano.
// Renderize este componente no layout principal do dashboard.

import { useEffect, useState } from 'react';
import { AlertTriangle, X, Zap, Clock } from 'lucide-react';

interface ToleranciaInfo {
  ativa: boolean;
  expirada: boolean;
  diasRestantes: number;
  expiraEm: string;
}

interface Props {
  tolerancia: ToleranciaInfo | null;
  plano: string;
}

export function ToleranciaPlano({ tolerancia, plano }: Props) {
  const [bannerFechado, setBannerFechado] = useState(false);

  // Reseta o banner fechado se a tolerância mudar
  useEffect(() => {
    setBannerFechado(false);
  }, [tolerancia?.expiraEm]);

  if (!tolerancia) return null;

  // --- POPUP BLOQUEANTE (tolerância expirada) ---
  if (tolerancia.expirada) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full mx-4 p-8 flex flex-col items-center text-center gap-6">
          {/* Ícone */}
          <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-red-500" />
          </div>

          {/* Título */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Limite de assinantes atingido
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
              O período de tolerância de <strong>15 dias</strong> encerrou.
              Para continuar usando o sistema, faça o upgrade do seu plano.
            </p>
          </div>

          {/* Plano atual */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-6 py-3 text-sm text-gray-600 dark:text-gray-300">
            Plano atual: <span className="font-semibold capitalize">{plano}</span>
          </div>

          {/* Botão upgrade */}
          <a
            href="/dashboard/assinatura"
            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-base shadow-lg shadow-blue-500/30"
          >
            <Zap className="w-5 h-5" />
            Fazer upgrade agora
          </a>

          <p className="text-xs text-gray-400 dark:text-gray-500">
            Após o upgrade, o sistema será liberado imediatamente.
          </p>
        </div>
      </div>
    );
  }

  // --- BANNER REGRESSIVO (dentro da tolerância) ---
  if (!tolerancia.ativa || bannerFechado) return null;

  const urgente = tolerancia.diasRestantes <= 3;
  const quaseAcabando = tolerancia.diasRestantes <= 7;

  return (
    <div
      className={`w-full px-4 py-3 flex items-center justify-between gap-3 text-sm font-medium transition-colors ${
        urgente
          ? 'bg-red-500 text-white'
          : quaseAcabando
          ? 'bg-orange-500 text-white'
          : 'bg-amber-400 text-amber-900'
      }`}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Clock className="w-4 h-4 shrink-0" />
        <span className="truncate">
          {urgente ? '⚠️ ' : ''}
          Você ultrapassou o limite do seu plano <strong>{plano}</strong>.{' '}
          Faça upgrade em{' '}
          <strong>
            {tolerancia.diasRestantes === 0
              ? 'menos de 1 dia'
              : `${tolerancia.diasRestantes} ${tolerancia.diasRestantes === 1 ? 'dia' : 'dias'}`}
          </strong>{' '}
          para evitar o bloqueio.
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <a
          href="/dashboard/assinatura"
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            urgente || quaseAcabando
              ? 'bg-white text-gray-900 hover:bg-gray-100'
              : 'bg-amber-900 text-white hover:bg-amber-800'
          }`}
        >
          Fazer upgrade
        </a>
        <button
          onClick={() => setBannerFechado(true)}
          className="opacity-70 hover:opacity-100 transition-opacity"
          aria-label="Fechar aviso"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
