//context/AuthContext.tsx

"use client"
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface OperadorInfo {
  nome: string;
  email: string;
  role: string;
  empresaId: string;
}

interface EmpresaInfo {
  id: string;
  nomeEmpresa: string;
  codigoConvite: string;
  endereco: string;
  plano: string; 
}

interface AuthContextType {
  autenticado: boolean;
  carregando: boolean;
  operador: OperadorInfo | null;
  empresa: EmpresaInfo | null;
  logout: () => Promise<void>;
  verificarSessao: () => Promise<void>;
  atualizarNomeUsuario: (novoNome: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [autenticado, setAutenticado] = useState<boolean>(false);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [operador, setOperador] = useState<OperadorInfo | null>(null);
  const [empresa, setEmpresa] = useState<EmpresaInfo | null>(null);
  const router = useRouter();

  const verificarSessao = async () => {
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.sucesso) {
          setAutenticado(true);
          setOperador(data.operador);
          setEmpresa(data.empresa);
        } else {
          setAutenticado(false);
          setOperador(null);
          setEmpresa(null);
        }
      } else {
        setAutenticado(false);
        setOperador(null);
        setEmpresa(null);
      }
    } catch (e) {
      setAutenticado(false);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    verificarSessao();
  }, []);

  const atualizarNomeUsuario = (novoNome: string) => {
    if (operador) {
      setOperador({ ...operador, nome: novoNome });
    }
  };

  const logout = async () => {
    try {
      // 1. Pede à API para destruir o cookie HttpOnly seguro no servidor
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {}

    // 2. Apaga qualquer cookie de fallback que o JS tenha acesso
    document.cookie = 'v5_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
    
    // 3. Limpa o cache local de caixas CTO para não vazar dados
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }

    // 4. Limpa os estados do React
    setAutenticado(false);
    setOperador(null);
    setEmpresa(null);
    
    // 🚀 A SOLUÇÃO DEFINITIVA: Força o navegador a recarregar e esquecer o cache do Next.js
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ autenticado, carregando, operador, empresa, logout, verificarSessao, atualizarNomeUsuario }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth precisa ser usado dentro de um AuthProvider');
  return context;
}