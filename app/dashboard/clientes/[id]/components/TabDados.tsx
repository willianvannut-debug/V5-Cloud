// ================================================================================
// TAB DADOS - Dados pessoais, contato, endereco, observacoes
// ================================================================================

"use client"
import React from 'react';
import {
  User,
  Building2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import {
  estiloInput,
  estiloRotulo,
  estiloSelect,
  estiloValor,
  mascaraCPF,
  mascaraCNPJ,
  mascaraTelefone,
  mascaraCEP,
} from '../shared';

// ==========================
// Funcao de mascara global
// ==========================
function aplicarMascara(campo: string, valor: string): string {
  if (campo === 'cpf' || campo === 'responsavel_cpf') return mascaraCPF(valor);
  if (campo === 'cnpj') return mascaraCNPJ(valor);
  if (campo === 'telefone' || campo === 'telefone2' || campo === 'whatsapp') return mascaraTelefone(valor);
  if (campo === 'cep') return mascaraCEP(valor);
  return valor;
}

// ==========================
// COMPONENTES EXTRAIDOS (fora do TabDados para nao perder foco!)
// ==========================
function CampoTexto({
  label,
  campo,
  placeholder,
  colSpan,
  editando,
  formEdit,
  cliente,
  onCampoChange,
  readOnly,
}: {
  label: string;
  campo: string;
  placeholder?: string;
  colSpan?: number;
  editando: boolean;
  formEdit: any;
  cliente: any;
  onCampoChange: (campo: string, valor: string) => void;
  readOnly?: boolean;
}) {
  return (
    <div className={colSpan === 2 ? 'md:col-span-2' : ''}>
      <label className={estiloRotulo}>
        {label}
        {readOnly && editando && <span className="ml-1 text-zinc-600 text-[10px] normal-case tracking-normal">(somente leitura)</span>}
      </label>
      {editando && !readOnly ? (
        <input
          type="text"
          placeholder={placeholder || label}
          value={formEdit[campo] || ''}
          onChange={(e) => onCampoChange(campo, e.target.value)}
          className={estiloInput}
        />
      ) : (
        <p className={estiloValor}>{cliente[campo] || <span className="text-zinc-600">-</span>}</p>
      )}
    </div>
  );
}

function CampoSelect({
  label,
  campo,
  opcoes,
  editando,
  formEdit,
  cliente,
  onCampoChange,
}: {
  label: string;
  campo: string;
  opcoes: { value: string; label: string }[];
  editando: boolean;
  formEdit: any;
  cliente: any;
  onCampoChange: (campo: string, valor: string) => void;
}) {
  return (
    <div>
      <label className={estiloRotulo}>{label}</label>
      {editando ? (
        <select value={formEdit[campo] || ''} onChange={(e) => onCampoChange(campo, e.target.value)} className={estiloSelect}>
          {opcoes.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <p className={estiloValor}>{opcoes.find(o => o.value === cliente[campo])?.label || cliente[campo] || <span className="text-zinc-600">-</span>}</p>
      )}
    </div>
  );
}

// ==========================
// COMPONENTE PRINCIPAL
// ==========================
interface TabDadosProps {
  cliente: any;
  editando: boolean;
  formEdit: any;
  setFormEdit: (fn: (prev: any) => any) => void;
  erroSalvar: string;
  sucessoSalvar: string;
}

export default function TabDados({ cliente, editando, formEdit, setFormEdit, erroSalvar, sucessoSalvar }: TabDadosProps) {

  const atualizarCampoEdit = (campo: string, valor: string) => {
    const v = aplicarMascara(campo, valor);
    setFormEdit((prev: any) => ({ ...prev, [campo]: v }));
  };

  // Props comuns para todos os campos
  const campoProps = { editando, formEdit, cliente, onCampoChange: atualizarCampoEdit };

  return (
    <div className="space-y-6">
      {/* Mensagens */}
      {erroSalvar && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-xs text-red-400 font-mono flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {erroSalvar}
        </div>
      )}
      {sucessoSalvar && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-xs text-emerald-400 font-mono flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" /> {sucessoSalvar}
        </div>
      )}

      {/* Tipo pessoa */}
      {editando && (
        <div>
          <label className={estiloRotulo}>Tipo de Pessoa</label>
          <div className="flex gap-3">
            {['PF', 'PJ'].map(tipo => (
              <button key={tipo} type="button" onClick={() => atualizarCampoEdit('tipo_pessoa', tipo)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-mono font-bold uppercase transition-all cursor-pointer ${
                  formEdit.tipo_pessoa === tipo ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-zinc-900/40 border-zinc-800 text-zinc-500 hover:text-white'
                }`}>
                {tipo === 'PF' ? <User className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                {tipo === 'PF' ? 'Pessoa Fisica' : 'Pessoa Juridica'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Dados pessoais / empresa */}
      <div>
        <p className="text-xs font-mono uppercase text-emerald-500 tracking-widest border-b border-zinc-900 pb-2 mb-4">
          {(editando ? formEdit.tipo_pessoa : cliente.tipo_pessoa) === 'PJ' ? 'Dados da Empresa' : 'Dados Pessoais'}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(editando ? formEdit.tipo_pessoa : cliente.tipo_pessoa) === 'PF' ? (
            <>
              <CampoTexto label="Nome Completo" campo="nome" colSpan={2} {...campoProps} />
              <CampoTexto label="CPF" campo="cpf" placeholder="000.000.000-00" {...campoProps} />
              <CampoTexto label="RG" campo="rg" {...campoProps} />
              <div>
                <label className={estiloRotulo}>Data de Nascimento</label>
                {editando ? (
                  <input type="date" value={formEdit.data_nascimento || ''} onChange={(e) => atualizarCampoEdit('data_nascimento', e.target.value)} className={estiloInput} />
                ) : (
                  <p className={estiloValor}>{cliente.data_nascimento ? new Date(cliente.data_nascimento).toLocaleDateString('pt-BR') : <span className="text-zinc-600">-</span>}</p>
                )}
              </div>
              <CampoSelect label="Sexo" campo="sexo" opcoes={[{ value: '', label: 'Selecione' }, { value: 'M', label: 'Masculino' }, { value: 'F', label: 'Feminino' }, { value: 'O', label: 'Outro' }]} {...campoProps} />
            </>
          ) : (
            <>
              <CampoTexto label="Razao Social" campo="razao_social" colSpan={2} {...campoProps} />
              <CampoTexto label="Nome Fantasia" campo="nome_fantasia" {...campoProps} />
              <CampoTexto label="CNPJ" campo="cnpj" placeholder="00.000.000/0000-00" {...campoProps} />
              <CampoTexto label="Inscricao Estadual" campo="inscricao_estadual" {...campoProps} />
              <CampoTexto label="Inscricao Municipal" campo="inscricao_municipal" {...campoProps} />
              <CampoTexto label="Nome Contato" campo="nome" colSpan={2} {...campoProps} />
              <CampoTexto label="Responsavel Legal" campo="responsavel_nome" {...campoProps} />
              <CampoTexto label="CPF Responsavel" campo="responsavel_cpf" {...campoProps} />
            </>
          )}
        </div>
      </div>

      {/* Contato */}
      <div>
        <p className="text-xs font-mono uppercase text-emerald-500 tracking-widest border-b border-zinc-900 pb-2 mb-4">Contato</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CampoTexto label="Telefone" campo="telefone" placeholder="(00) 00000-0000" {...campoProps} />
          <CampoTexto label="WhatsApp" campo="whatsapp" placeholder="(00) 00000-0000" {...campoProps} />
          <CampoTexto label="Telefone 2" campo="telefone2" placeholder="(00) 00000-0000" {...campoProps} />
          <CampoTexto label="E-mail" campo="email" placeholder="email@exemplo.com" {...campoProps} />
        </div>
      </div>

      {/* Endereco */}
      <div>
        <p className="text-xs font-mono uppercase text-emerald-500 tracking-widest border-b border-zinc-900 pb-2 mb-4">Endereco de Instalacao</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CampoTexto label="CEP" campo="cep" placeholder="00000-000" {...campoProps} />
          <CampoTexto label="Logradouro" campo="logradouro" colSpan={2} {...campoProps} />
          <CampoTexto label="Numero" campo="numero" {...campoProps} />
          <CampoTexto label="Complemento" campo="complemento" {...campoProps} />
          <CampoTexto label="Bairro" campo="bairro" {...campoProps} />
          <CampoTexto label="Cidade" campo="cidade" {...campoProps} />
          {editando ? (
            <div>
              <label className={estiloRotulo}>UF</label>
              <select value={formEdit.uf || ''} onChange={(e) => atualizarCampoEdit('uf', e.target.value)} className={estiloSelect}>
                <option value="">UF</option>
                {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className={estiloRotulo}>UF</label>
              <p className={estiloValor}>{cliente.uf || <span className="text-zinc-600">-</span>}</p>
            </div>
          )}
          <CampoTexto label="Referencia" campo="referencia" {...campoProps} />
        </div>
      </div>

      {/* Observacoes */}
      <div>
        <p className="text-xs font-mono uppercase text-emerald-500 tracking-widest border-b border-zinc-900 pb-2 mb-4">Observacoes</p>
        {editando ? (
          <textarea value={formEdit.observacoes || ''} onChange={(e) => atualizarCampoEdit('observacoes', e.target.value)} rows={3} placeholder="Observacoes sobre o cliente..." className={`${estiloInput} resize-none`} />
        ) : (
          <p className="text-xs text-zinc-400 font-mono bg-zinc-900/40 rounded-xl p-3 border border-zinc-900">
            {cliente.observacoes || <span className="text-zinc-600">Nenhuma observacao</span>}
          </p>
        )}
      </div>
    </div>
  );
}
