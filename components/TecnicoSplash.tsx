// ============================================
// V5 Cloud Técnico - Splash Screen Animada
// Inspirada no estilo DailyFlutterUI
// Fundo branco, logo montagem, texto gradiente
// ============================================

"use client"
import React, { useEffect, useState, useRef } from 'react';

interface TecnicoSplashProps {
  onFinish: () => void;
}

export default function TecnicoSplash({ onFinish }: TecnicoSplashProps) {
  const [phase, setPhase] = useState(0);
  // 0 = início (tudo invisível)
  // 1 = logo aparece (glow + scale)
  // 2 = logo completa + shimmer
  // 3 = texto "V5 Técnico" aparece
  // 4 = subtítulo "Conectando O Futuro" aparece
  // 5 = tudo some (fade out)
  // 6 = done

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    timers.push(setTimeout(() => setPhase(1), 100));    // logo começa
    timers.push(setTimeout(() => setPhase(2), 1000));   // logo completa + shimmer
    timers.push(setTimeout(() => setPhase(3), 1800));   // texto aparece
    timers.push(setTimeout(() => setPhase(4), 2600));   // subtítulo aparece
    timers.push(setTimeout(() => setPhase(5), 4200));   // fade out
    timers.push(setTimeout(() => { setPhase(6); onFinish(); }, 4800)); // done
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: '#ffffff',
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      opacity: phase >= 5 ? 0 : 1,
      transition: 'opacity 0.6s ease-out',
      overflow: 'hidden',
    }}>

      {/* Partículas decorativas / pontos de circuito */}
      <div style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        opacity: phase >= 1 && phase < 5 ? 0.15 : 0,
        transition: 'opacity 1s ease',
      }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: '2px',
            height: '2px',
            backgroundColor: '#10b981',
            borderRadius: '50%',
            top: `${20 + (i * 12)}%`,
            left: `${10 + (i * 15)}%`,
            boxShadow: '0 0 10px 3px rgba(16,185,129,0.4)',
            animation: `float${i % 3} ${3 + i * 0.5}s ease-in-out infinite`,
          }} />
        ))}
      </div>

      {/* Linhas de circuito animadas */}
      <svg style={{
        position: 'absolute',
        width: '300px',
        height: '300px',
        opacity: phase >= 1 && phase < 5 ? 0.08 : 0,
        transition: 'opacity 0.8s ease',
      }}>
        <circle cx="150" cy="150" r="120" fill="none" stroke="#10b981" strokeWidth="0.5"
          strokeDasharray="755"
          strokeDashoffset={phase >= 1 ? '0' : '755'}
          style={{ transition: 'stroke-dashoffset 2s ease-out' }}
        />
        <circle cx="150" cy="150" r="90" fill="none" stroke="#10b981" strokeWidth="0.3"
          strokeDasharray="565"
          strokeDashoffset={phase >= 1 ? '0' : '565'}
          style={{ transition: 'stroke-dashoffset 2.5s ease-out' }}
        />
      </svg>

      {/* Logo container com glow */}
      <div style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: phase >= 1 ? 1 : 0,
        transform: phase >= 1 ? 'scale(1)' : 'scale(0.3)',
        transition: 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        marginBottom: '24px',
      }}>
        {/* Glow atrás da logo */}
        <div style={{
          position: 'absolute',
          width: '180px',
          height: '180px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)',
          opacity: phase >= 2 ? 1 : 0,
          transform: phase >= 2 ? 'scale(1.2)' : 'scale(0.8)',
          transition: 'all 1s ease-out',
        }} />

        {/* Logo */}
        <img
          src="/v5-logo-transparent.png"
          alt="V5 Cloud"
          style={{
            width: '140px',
            height: '140px',
            objectFit: 'contain',
            filter: phase >= 2 ? 'drop-shadow(0 0 20px rgba(16,185,129,0.3))' : 'none',
            transition: 'filter 0.8s ease',
          }}
        />

        {/* Shimmer overlay na logo */}
        <div style={{
          position: 'absolute',
          top: 0, left: '-100%',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.15), transparent)',
          animation: phase >= 2 ? 'shimmer 1.5s ease-in-out' : 'none',
        }} />
      </div>

      {/* Texto "V5 Técnico" com gradiente */}
      <div style={{
        opacity: phase >= 3 ? 1 : 0,
        transform: phase >= 3 ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        marginBottom: '12px',
      }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: 900,
          letterSpacing: '2px',
          textTransform: 'uppercase',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          margin: 0,
          textAlign: 'center',
        }}>
          V5 Técnico
        </h1>
      </div>

      {/* Subtítulo "Conectando O Futuro" */}
      <div style={{
        opacity: phase >= 4 ? 1 : 0,
        transform: phase >= 4 ? 'translateY(0)' : 'translateY(15px)',
        transition: 'opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.1s, transform 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.1s',
      }}>
        <p style={{
          fontSize: '14px',
          fontWeight: 400,
          color: '#71717a',
          letterSpacing: '4px',
          textTransform: 'uppercase',
          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
          margin: 0,
          textAlign: 'center',
        }}>
          Conectando O Futuro
        </p>
      </div>

      {/* Barra de loading sutil */}
      <div style={{
        position: 'absolute',
        bottom: '80px',
        width: '120px',
        height: '2px',
        backgroundColor: '#e4e4e7',
        borderRadius: '1px',
        overflow: 'hidden',
        opacity: phase >= 3 && phase < 5 ? 1 : 0,
        transition: 'opacity 0.4s ease',
      }}>
        <div style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(90deg, #10b981, #059669)',
          borderRadius: '1px',
          animation: phase >= 3 ? 'loading 2s ease-in-out' : 'none',
          transformOrigin: 'left',
        }} />
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes shimmer {
          0% { left: -100%; }
          100% { left: 200%; }
        }
        @keyframes loading {
          0% { transform: scaleX(0); }
          100% { transform: scaleX(1); }
        }
        @keyframes float0 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        @keyframes float1 {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          50% { transform: translateY(-10px) translateX(5px); }
        }
        @keyframes float2 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
      `}</style>
    </div>
  );
}
