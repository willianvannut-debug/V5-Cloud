//context/SettingsContext.tsx

"use client"
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

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
  nomeUsuario: string;
  cidadeEmpresa: string;
  latEmpresa: number;
  lonEmpresa: number;
  planoAtivo: string; 
  ctos: CtoItem[];
  planos: PlanoItem[];
  funcionarios: FuncionarioItem[];
  salvarConfiguracoes: (
    nome: string, 
    logo: string, 
    tel: string, 
    email: string, 
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
  const { operador, empresa } = useAuth();

  const [nomeProvedor, setNomeProvedor] = useState(empresa?.nomeEmpresa || 'V5 Fibra');
  const [logoUrl, setLogoUrl] = useState('');
  const [telefone, setTelefone] = useState('');
  const [emailEmpresa, setEmailEmpresa] = useState(operador?.email || '');
  const [nomeUsuario, setNomeUsuario] = useState(operador?.nome || 'Usuário');
  
  const [cidadeEmpresa, setCidadeEmpresa] = useState(empresa?.endereco || 'Águas Lindas de Goiás - GO');
  const [latEmpresa, setLatEmpresa] = useState(-15.8193);
  const [lonEmpresa, setLonEmpresa] = useState(-48.1133);
  const [planoAtivo, setPlanoAtivo] = useState('essencial');

  const [ctos, setCtos] = useState<CtoItem[]>([]);
  const [planos, setPlanos] = useState<PlanoItem[]>([]);
  const [funcionarios, setFuncionarios] = useState<FuncionarioItem[]>([]);

  useEffect(() => {
    if (empresa?.nomeEmpresa) setNomeProvedor(empresa.nomeEmpresa);
    if (empresa?.endereco && empresa.endereco !== 'Não informado') setCidadeEmpresa(empresa.endereco);
    if (operador?.nome) setNomeUsuario(operador.nome);
    if (operador?.email) setEmailEmpresa(operador.email);
  }, [empresa, operador]);

  // 🚀 BUSCA INTELIGENTE DO PLANO: Tenta pelo ID, se não achar, busca o último plano atualizado no banco
  const carregarPlanoDoBanco = useCallback(async () => {
    if (!supabase) return;

    const idDaEmpresa = operador?.empresaId || operador?.empresa_id || empresa?.id;
    
    try {
      let data = null;

      if (idDaEmpresa) {
        // Tenta buscar diretamente pela empresa logada
        const resId = await supabase
          .from('empresas')
          .select('plano, nome_empresa, endereco')
          .eq('id', idDaEmpresa)
          .maybeSingle();
        data = resId.data;
      }

      // Se por acaso o ID não veio na sessão, busca a empresa que possui o plano ativo mais recente ou a última alterada
      if (!data) {
        const resUltima = await supabase
          .from('empresas')
          .select('plano, nome_empresa, endereco')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        data = resUltima.data;
      }

      if (data && data.plano) {
        const planoLimpo = String(data.plano).toLowerCase().trim();
        console.log("⚡ [SETTINGS] Plano ativo aplicado na tela:", planoLimpo);
        setPlanoAtivo(planoLimpo);
        if (data.nome_empresa) setNomeProvedor(data.nome_empresa);
        if (data.endereco) setCidadeEmpresa(data.endereco);
      }
    } catch (e) {
      console.error("Erro ao carregar plano do Supabase:", e);
    }
  }, [operador, empresa]);

  const carregarCtosDoBanco = useCallback(async () => {
    const idDaEmpresa = operador?.empresaId || operador?.empresa_id || empresa?.id;

    if (supabase && idDaEmpresa) {
      try {
        const { data, error } = await supabase
          .from('ctos')
          .select('*')
          .eq('provedor_id', idDaEmpresa); 

        if (!error && data) {
          const ctosFormatadas = data.map((cto: any) => ({
            id: cto.id,
            identificacao: cto.identificacao,
            cep: cto.cep || '',
            endereco: cto.endereco,
            raio: cto.raio,
            lat: typeof cto.lat === 'string' ? parseFloat(cto.lat) : cto.lat,
            lon: typeof cto.lon === 'string' ? parseFloat(cto.lon) : cto.lon
          }));
          setCtos(ctosFormatadas);
          return;
        }
      } catch (e) {}
    }

    try {
      const res = await fetch('/api/ctos', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const lista = Array.isArray(data) ? data : (data.ctos || []);
        setCtos(lista);
      }
    } catch (e) {}
  }, [operador, empresa]);

  const carregarFuncionariosDoBanco = useCallback(async () => {
    try {
      const res = await fetch('/api/operators', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.sucesso && data.operadores) {
          const listaFormatada: FuncionarioItem[] = data.operadores.map((op: any) => ({
            id: op.id,
            nome: op.nome,
            cargo: op.role === 'gerente' ? 'Gerente / Dono' : (op.cargo || 'Atendente'),
            email: op.email
          }));
          setFuncionarios(listaFormatada);
        }
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    carregarPlanoDoBanco();
    carregarFuncionariosDoBanco();
    carregarCtosDoBanco();
  }, [carregarPlanoDoBanco, carregarFuncionariosDoBanco, carregarCtosDoBanco]);

  const salvarConfiguracoes = async (
    novoProvedor: string, 
    novaLogo: string, 
    novoTel: string, 
    novoEmail: string, 
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
      await fetch(`/api/settings?t=${Date.now()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        body: JSON.stringify(payload)
      });
    } catch (e) {}
  };

  return (
    <SettingsContext.Provider value={{ 
      nomeProvedor, logoUrl, telefone, emailEmpresa, nomeUsuario, 
      cidadeEmpresa, latEmpresa, lonEmpresa, planoAtivo, ctos, planos, funcionarios, salvarConfiguracoes 
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