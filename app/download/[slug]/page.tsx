import { createClient } from '@supabase/supabase-js';
import { Metadata } from 'next';
import DownloadClient from './DownloadClient';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data } = await supabase
    .from('empresas')
    .select('nome_empresa')
    .eq('codigo_slug', slug)
    .single();

  return {
    title: data ? `${data.nome_empresa} - Baixar App` : 'Baixar App',
    description: data ? `Baixe o aplicativo do ${data.nome_empresa}` : 'Baixe o aplicativo',
  };
}

export default async function DownloadPage({ params }: Props) {
  const { slug } = await params;
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data: empresa } = await supabase
    .from('empresas')
    .select('nome_empresa, logo_url, cor_primaria, cor_secundaria, telefone_suporte, apk_cliente_url, apk_tecnico_url')
    .eq('codigo_slug', slug)
    .single();

  if (!empresa) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Provedor não encontrado</h1>
          <p className="text-zinc-400">Verifique o link e tente novamente.</p>
        </div>
      </div>
    );
  }

  return <DownloadClient empresa={empresa} />;
}
