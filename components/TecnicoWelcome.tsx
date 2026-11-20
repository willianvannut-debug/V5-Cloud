"use client"
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface TecnicoWelcomeProps {
  operador: any;
  onStart: () => void;
}

export default function TecnicoWelcome({ operador, onStart }: TecnicoWelcomeProps) {
  const [stats, setStats] = useState({ instalacoes: 0, reparos: 0, pendentes: 0, concluidas: 0 });
  const [loading, setLoading] = useState(true);
  const [fadeIn, setFadeIn] = useState(false);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setFadeIn(true));
    setTimeout(() => setShowButton(true), 800);
    carregarStats();
  }, []);

  const carregarStats = async () => {
    try {
      const hoje = new Date();
      const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).toISOString();
      const fimHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59).toISOString();

      // Buscar ordens do técnico para hoje
      const { data: ordens } = await supabase
        .from('ordens_servico')
        .select('id, tipo, status, status_instalacao, created_at')
        .eq('tecnico_id', operador?.id)
        .gte('created_at', inicioHoje)
        .lte('created_at', fimHoje);

      if (ordens) {
        const instalacoes = ordens.filter((o: any) => 
          o.tipo?.toLowerCase().includes('instal') || o.status_instalacao
        ).length;
        const reparos = ordens.filter((o: any) => 
          o.tipo?.toLowerCase().includes('reparo') || o.tipo?.toLowerCase().includes('manut')
        ).length;
        const concluidas = ordens.filter((o: any) => 
          o.status_instalacao === 'CONCLUIDA' || o.status?.toLowerCase() === 'concluido'
        ).length;
        const pendentes = ordens.length - concluidas;

        setStats({ instalacoes, reparos, pendentes, concluidas });
      }
    } catch (e) {
      console.log('Erro ao carregar stats:', e);
    } finally {
      setLoading(false);
    }
  };

  const primeiroNome = operador?.nome?.split(' ')[0] || 'Técnico';

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0,
      width: '100vw', height: '100vh',
      backgroundColor: '#f9fafb',
      zIndex: 99998,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px',
      opacity: fadeIn ? 1 : 0,
      transition: 'opacity 0.6s ease-out',
    }}>
      {/* Saudação */}
      <div style={{
        textAlign: 'center',
        marginBottom: '40px',
      }}>
        <p style={{
          fontSize: '14px',
          color: '#6b7280',
          margin: '0 0 8px 0',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          letterSpacing: '2px',
          textTransform: 'uppercase',
        }}>
          Bem-vindo de volta
        </p>
        <h1 style={{
          fontSize: '32px',
          fontWeight: 800,
          color: '#18181b',
          margin: 0,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}>
          {primeiroNome} 👋
        </h1>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        width: '100%',
        maxWidth: '360px',
        marginBottom: '48px',
      }}>
        <StatCard label="Instalações" value={stats.instalacoes} color="#10b981" icon="📡" />
        <StatCard label="Reparos" value={stats.reparos} color="#3b82f6" icon="🔧" />
        <StatCard label="Pendentes" value={stats.pendentes} color="#f59e0b" icon="⏳" />
        <StatCard label="Concluídas" value={stats.concluidas} color="#10b981" icon="✅" />
      </div>

      {/* Botão */}
      <div style={{
        opacity: showButton ? 1 : 0,
        transform: showButton ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.5s ease-out, transform 0.5s ease-out',
      }}>
        <button
          onClick={onStart}
          style={{
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: '#fff',
            border: 'none',
            borderRadius: '16px',
            padding: '18px 48px',
            fontSize: '18px',
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            letterSpacing: '1px',
            boxShadow: '0 4px 24px rgba(16, 185, 129, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          🚀 Hora de trabalhar
        </button>
      </div>

      {/* Hora atual */}
      <p style={{
        marginTop: '32px',
        fontSize: '13px',
        color: '#9ca3af',
        fontFamily: 'monospace',
      }}>
        {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        {' · '}
        {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
      </p>
    </div>
  );
}

function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  return (
    <div style={{
      backgroundColor: '#ffffff',
      borderRadius: '16px',
      padding: '20px 16px',
      textAlign: 'center',
      border: '1px solid #e5e7eb',
    }}>
      <div style={{ fontSize: '24px', marginBottom: '8px' }}>{icon}</div>
      <div style={{
        fontSize: '28px',
        fontWeight: 800,
        color: color,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}>
        {value}
      </div>
      <div style={{
        fontSize: '12px',
        color: '#6b7280',
        marginTop: '4px',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}>
        {label}
      </div>
    </div>
  );
}
