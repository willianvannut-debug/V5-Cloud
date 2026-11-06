// ============================================
// V5 Fibra - Contexto de Autenticação
// ============================================

import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '@/lib/supabase';
import { Cliente, Empresa, UserSession } from '@/types';
import { clearCache } from '@/utils/cache';

interface AuthContextData {
  session: UserSession | null;
  isLoading: boolean;
  signIn: (cpf: string, senha: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

const SESSION_KEY = '@v5fibra:session';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredSession();
  }, []);

  async function loadStoredSession() {
    try {
      const stored = await SecureStore.getItemAsync(SESSION_KEY);
      if (stored) {
        const parsed: UserSession = JSON.parse(stored);
        setSession(parsed);
      }
    } catch {
      // Sessão inválida, ignora
    } finally {
      setIsLoading(false);
    }
  }

  async function signIn(cpf: string, senha: string) {
    // CPF é armazenado COM máscara no banco (ex: "701.573.921-63")
    // O campo de login já formata com máscara, então usa direto
    const { data: cliente, error: clienteError } = await supabase
      .from('clientes')
      .select('*')
      .eq('cpf', cpf)
      .single();

    if (clienteError || !cliente) {
      throw new Error('CPF não encontrado');
    }

    // Verifica senha via RPC (bcrypt no backend)
    const { data: authResult, error: authError } = await supabase.rpc(
      'verificar_senha_cliente',
      { p_cpf: cpf, p_senha: senha }
    );

    if (authError || !authResult) {
      throw new Error('Senha incorreta');
    }

    // Monta sessão com empresa hardcoded (MVP)
    const userSession: UserSession = {
      cliente: cliente as Cliente,
      empresa: {
        id: cliente.empresa_id,
        nome: 'Provedor',
        logo_url: null,
        cor_primaria: null,
        cor_secundaria: null,
      },
      token: `session_${Date.now()}`,
    };

    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(userSession));
    setSession(userSession);
  }

  async function signOut() {
    await SecureStore.deleteItemAsync(SESSION_KEY);
    await clearCache();
    setSession(null);
  }

  return (
    <AuthContext.Provider value={{ session, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
}
