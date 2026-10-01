// ================================================================================
// 📋 SETTINGS CONTEXT - V5 CLOUD (COM LEITURA COMPLETA DO SUPABASE VIA API)
// context/SettingsContext.tsx
// ================================================================================

"use client"
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

export interface CtoItem {
  id: string;
  identificacao: string;
  cep: string;
  endereco: string;
  raio: number;
  lat?: number;
  lon?: number;
}

export interface PlanoItem {
  id: string;
  nome: string;
  velocidade: string;
  preco: string;
}

export interface FuncionarioItem {
  id: string;
  nome: string;
  cargo: string;
  email: string;
}

interface SettingsContextType {
  nomeProvedor: string;
  logoUrl: string;
  telefone: string;
  emailEmpresa: string;
  cep: string;
  nomeUsuario: string;
  cidadeEmpresa: string;
  latEmpresa: number;
  lonEmpresa: number;
  planoAtivo: string; 
  ctos: CtoItem[];
  planos: PlanoItem[];
  funcionarios: FuncionarioItem[];
  recarregarDados: () => Promise<void>;
  salvarConfiguracoes: (
    nome: string, 
    logo: string, 
    tel: string, 
    email: string, 
    cep: string,
    usuario: string, 
    cidade: string,
    lat: number,
    lon: number,
    novasCtos: CtoItem[],
    novosPlanos: PlanoItem[],
    novosFuncionarios: FuncionarioItem[],
    novoPlanoAtivo?: string
  ) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { operador } = useAuth();

  const [nomeProvedor, setNomeProvedor] = useState('V5 Fibra');
  const [logoUrl, setLogoUrl] = useState('');
  const [telefone, setTelefone] = useState('');
  const [emailEmpresa, setEmailEmpresa] = useState('');
  const [cep, setCep] = useState('');
  const [nomeUsuario, setNomeUsuario] = useState('');
  const [cidadeEmpresa, setCidadeEmpresa] = useState('Águas Lindas de Goiás - GO');
  const [latEmpresa, setLatEmpresa] = useState(-15.8193);
  const [lonEmpresa, setLonEmpresa] = useState(-48.1133);
  const [planoAtivo, setPlanoAtivo] = useState('essencial');

  const [ctos, setCtos] = useState<CtoItem[]>([]);
  const [planos, setPlanos] = useState<PlanoItem[]>([]);
  const [funcionarios, setFuncionarios] = useState<FuncionarioItem[]>([]);

  // 🚀 Carrega os dados reais direto da API protegida /api/settings (que puxa do Supabase)
  const carregarDadosDoBanco = useCallback(async () => {
    try {
      const res = await fetch(`/api/settings?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data) {
          if (data.nomeProvedor) setNomeProvedor(data.nomeProvedor);
          if (data.logoUrl) setLogoUrl(data.logoUrl);
          if (data.telefone) setTelefone(data.telefone);
          if (data.emailEmpresa) setEmailEmpresa(data.emailEmpresa);
          if (data.cep) setCep(data.cep);
          if (data.cidadeEmpresa) setCidadeEmpresa(data.cidadeEmpresa);
          if (data.latEmpresa !== undefined) setLatEmpresa(Number(data.latEmpresa));
          if (data.lonEmpresa !== undefined) setLonEmpresa(Number(data.lonEmpresa));
          if (data.planoAtivo) setPlanoAtivo(String(data.planoAtivo).toLowerCase().trim());
          if (data.planos && Array.isArray(data.planos)) setPlanos(data.planos);
          if (data.ctos && Array.isArray(data.ctos)) setCtos(data.ctos);
        }
      }
    } catch (e) {
      console.error("Erro ao carregar configurações via API:", e);
    }
  }, []);

  const carregarFuncionariosDoBanco = useCallback(async () => {
    try {
      const res = await fetch('/api/operators', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.sucesso && data.operadores) {
          const listaFormatada: FuncionarioItem[] = data.operadores.map((op: any) => {
            let cargoFinal = op.cargo || op.role || 'Atendente';
            if (op.role === 'gerente' && !op.cargo) cargoFinal = 'Gerente / Dono';
            if (op.nome && op.nome.toLowerCase().includes('tecnico')) cargoFinal = 'Técnico de Campo';

            return {
              id: op.id,
              nome: op.nome,
              cargo: cargoFinal,
              email: op.email
            };
          });
          setFuncionarios(listaFormatada);
        }
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    carregarDadosDoBanco();
    carregarFuncionariosDoBanco();
    if (operador?.nome) setNomeUsuario(operador.nome);
  }, [carregarDadosDoBanco, carregarFuncionariosDoBanco, operador]);

  const salvarConfiguracoes = async (
    novoProvedor: string, 
    novaLogo: string, 
    novoTel: string, 
    novoEmail: string, 
    novoCep: string,
    novoUsuario: string,
    novaCidade: string,
    novaLat: number,
    novaLon: number,
    novasCtos: CtoItem[],
    novosPlanos: PlanoItem[],
    novosFuncionarios: FuncionarioItem[],
    novoPlanoAtivo?: string
  ) => {
    const ctosProcessadas = await Promise.all(
      novasCtos.map(async (cto) => {
        let lat = cto.lat ?? novaLat;
        let lon = cto.lon ?? novaLon;
        let endereco = cto.endereco;

        if (!lat || !lon) {
          lat = novaLat;
          lon = novaLon;
          if (!endereco) endereco = `Endereço ref. ${novaCidade}`;
        }

        return { ...cto, endereco, lat: Number(lat), lon: Number(lon) };
      })
    );

    setNomeProvedor(novoProvedor);
    setLogoUrl(novaLogo);
    setTelefone(novoTel);
    setEmailEmpresa(novoEmail);
    setCep(novoCep);
    setNomeUsuario(novoUsuario);
    setCidadeEmpresa(novaCidade);
    setLatEmpresa(novaLat);
    setLonEmpresa(novaLon);
    setCtos(ctosProcessadas);
    setPlanos(novosPlanos);

    const planoFinal = novoPlanoAtivo || planoAtivo;
    setPlanoAtivo(planoFinal);

    const payload = {
      nomeProvedor: novoProvedor,
      logoUrl: novaLogo,
      telefone: novoTel,
      emailEmpresa: novoEmail,
      cep: novoCep,
      nomeUsuario: novoUsuario,
      cidadeEmpresa: novaCidade,
      latEmpresa: novaLat,
      lonEmpresa: novaLon,
      planoAtivo: planoFinal,
      ctos: ctosProcessadas,
      planos: novosPlanos,
      funcionarios: novosFuncionarios
    };

    try {
      const res = await fetch(`/api/settings?t=${Date.now()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        await carregarDadosDoBanco(); // Atualiza os dados imediatamente após salvar
      }
    } catch (e) {
      console.error("Erro ao salvar configurações:", e);
    }
  };

  return (
    <SettingsContext.Provider value={{ 
      nomeProvedor, logoUrl, telefone, emailEmpresa, cep, nomeUsuario, 
      cidadeEmpresa, latEmpresa, lonEmpresa, planoAtivo, ctos, planos, funcionarios, 
      recarregarDados: carregarDadosDoBanco, salvarConfiguracoes 
    }}>
      <div className="dark bg-zinc-950 text-zinc-50 min-h-screen">
        {children}
      </div>
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings precisa ser usado dentro de um SettingsProvider');
  return context;
}