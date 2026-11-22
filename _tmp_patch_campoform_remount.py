import os

BASE = os.path.join(os.environ['HOME'], 'mnt', 'v5-saas')
path = os.path.join(BASE, 'app', 'dashboard', 'clientes', '[id]', 'components', 'TabConexao.tsx')

with open(path, 'r', encoding='utf-8') as f:
    t = f.read()

# ======================================================================
# CAUSA RAIZ do bug "digita uma letra e perde o foco, tem que clicar de
# novo para cada letra": o componente <CampoForm> era declarado DENTRO do
# corpo de TabConexao (uma function expression recriada a cada render).
# TabConexao re-renderiza a cada tecla digitada (setFormConexao), e o React
# compara <CampoForm .../> pelo *tipo* do componente, nao pelo nome -- como
# a cada render existe uma funcao CampoForm nova (identidade diferente da
# anterior), o React acha que e um componente diferente, desmonta o <input>
# antigo (perdendo o foco/cursor) e monta um novo no lugar. Resultado: toda
# tecla fecha o foco, e por isso o usuario precisa clicar de novo antes de
# cada caractere. A correcao e mover CampoForm para fora de TabConexao,
# como um componente top-level com identidade estavel entre renders, e
# receber formConexao/onChange/etc como props em vez de via closure.
# ======================================================================

marker_antes_export = "export default function TabConexao({ cliente, editando, formEdit, setFormEdit }: TabConexaoProps) {"
assert t.count(marker_antes_export) == 1, "declaracao de TabConexao nao encontrada"

campo_form_component = '''// ==========================
// CAMPO DE FORMULARIO (componente top-level - identidade estavel entre
// renders, para o <input> nao perder o foco a cada tecla digitada)
// ==========================
function CampoForm({ label, campo, placeholder, copiavel, valor, estaEditando, valorForm, onMudar, onCopiar }: {
  label: string;
  campo: string;
  placeholder?: string;
  copiavel?: boolean;
  valor?: string;
  estaEditando: boolean;
  valorForm?: string;
  onMudar: (campo: string, valor: string) => void;
  onCopiar: (valor: string, label: string) => void;
}) {
  const valorExibir = valor ?? '';

  if (estaEditando) {
    return (
      <div>
        <label className={estiloRotulo}>{label}</label>
        <input
          type="text"
          placeholder={placeholder || label}
          value={valorForm || ''}
          onChange={(e) => onMudar(campo, e.target.value)}
          className={estiloInput}
        />
      </div>
    );
  }

  return (
    <div>
      <label className={estiloRotulo}>{label}</label>
      <div className="flex items-center gap-2">
        <p className={estiloValor}>{valorExibir || <span className="text-zinc-600">-</span>}</p>
        {copiavel && valorExibir && (
          <button onClick={() => onCopiar(valorExibir, label)} className="text-zinc-600 hover:text-emerald-400 transition-all cursor-pointer">
            <Copy className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

''' + marker_antes_export

t = t.replace(marker_antes_export, campo_form_component)

# ----------------------------------------------------------------------
# Remove a antiga definicao de CampoForm de dentro de TabConexao e deixa
# so o handler estavel (aoMudarCampo), que as chamadas abaixo vao usar.
# ----------------------------------------------------------------------
old_def = """  // ==========================
  // CAMPO DE FORMULARIO
  // ==========================
  const CampoForm = ({ label, campo, placeholder, copiavel, valor }: {
    label: string; campo: string; placeholder?: string; copiavel?: boolean; valor?: string;
  }) => {
    const estaEditando = editandoConexao || adicionando;
    const valorExibir = valor ?? '';

    if (estaEditando) {
      return (
        <div>
          <label className={estiloRotulo}>{label}</label>
          <input
            type="text"
            placeholder={placeholder || label}
            value={(formConexao as any)[campo] || ''}
            onChange={(e) => {
              let v = e.target.value;
              if (campo === 'mac_address') v = mascaraMAC(v);
              setFormConexao(prev => ({ ...prev, [campo]: v }));
            }}
            className={estiloInput}
          />
        </div>
      );
    }

    return (
      <div>
        <label className={estiloRotulo}>{label}</label>
        <div className="flex items-center gap-2">
          <p className={estiloValor}>{valorExibir || <span className="text-zinc-600">-</span>}</p>
          {copiavel && valorExibir && (
            <button onClick={() => copiar(valorExibir, label)} className="text-zinc-600 hover:text-emerald-400 transition-all cursor-pointer">
              <Copy className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    );
  };"""

new_def = """  // ==========================
  // CAMPO DE FORMULARIO: handler estavel usado pelo <CampoForm> (ver
  // definicao top-level acima, fora de TabConexao -- e essa a correcao
  // do bug de perda de foco a cada tecla digitada).
  // ==========================
  const aoMudarCampo = (campo: string, v: string) => {
    if (campo === 'mac_address') v = mascaraMAC(v);
    setFormConexao(prev => ({ ...prev, [campo]: v }));
  };

  const estaEditandoForm = Boolean(editandoConexao || adicionando);"""

assert t.count(old_def) == 1, "definicao antiga de CampoForm nao encontrada"
t = t.replace(old_def, new_def)

# ----------------------------------------------------------------------
# Atualiza todas as chamadas <CampoForm .../> para passar as novas props
# (estaEditando / valorForm / onMudar / onCopiar) explicitamente, em vez
# de depender de closure.
# ----------------------------------------------------------------------
replacements = [
    (
        '<CampoForm label="Login PPPoE" campo="login_pppoe" placeholder="usuario@v5fibra" />',
        '<CampoForm label="Login PPPoE" campo="login_pppoe" placeholder="usuario@v5fibra" estaEditando={estaEditandoForm} valorForm={formConexao.login_pppoe || \'\'} onMudar={aoMudarCampo} onCopiar={copiar} />',
    ),
    (
        '<CampoForm label="Senha PPPoE" campo="senha_pppoe" placeholder="senha" />',
        '<CampoForm label="Senha PPPoE" campo="senha_pppoe" placeholder="senha" estaEditando={estaEditandoForm} valorForm={formConexao.senha_pppoe || \'\'} onMudar={aoMudarCampo} onCopiar={copiar} />',
    ),
    (
        '<CampoForm label="IP Fixo" campo="ip_fixo" placeholder="0.0.0.0" />',
        '<CampoForm label="IP Fixo" campo="ip_fixo" placeholder="0.0.0.0" estaEditando={estaEditandoForm} valorForm={formConexao.ip_fixo || \'\'} onMudar={aoMudarCampo} onCopiar={copiar} />',
    ),
    (
        '<CampoForm label="MAC Address" campo="mac_address" placeholder="AA:BB:CC:DD:EE:FF" />',
        '<CampoForm label="MAC Address" campo="mac_address" placeholder="AA:BB:CC:DD:EE:FF" estaEditando={estaEditandoForm} valorForm={formConexao.mac_address || \'\'} onMudar={aoMudarCampo} onCopiar={copiar} />',
    ),
    (
        '<CampoForm label="Perfil RADIUS" campo="perfil_radius" placeholder="plano_100mb" />',
        '<CampoForm label="Perfil RADIUS" campo="perfil_radius" placeholder="plano_100mb" estaEditando={estaEditandoForm} valorForm={formConexao.perfil_radius || \'\'} onMudar={aoMudarCampo} onCopiar={copiar} />',
    ),
    (
        '<CampoForm label="VLAN" campo="vlan" />',
        '<CampoForm label="VLAN" campo="vlan" estaEditando={estaEditandoForm} valorForm={formConexao.vlan || \'\'} onMudar={aoMudarCampo} onCopiar={copiar} />',
    ),
    (
        '<CampoForm label="Porta OLT" campo="porta_olt" />',
        '<CampoForm label="Porta OLT" campo="porta_olt" estaEditando={estaEditandoForm} valorForm={formConexao.porta_olt || \'\'} onMudar={aoMudarCampo} onCopiar={copiar} />',
    ),
    (
        '<CampoForm label="Serial ONU" campo="onu_serial" />',
        '<CampoForm label="Serial ONU" campo="onu_serial" estaEditando={estaEditandoForm} valorForm={formConexao.onu_serial || \'\'} onMudar={aoMudarCampo} onCopiar={copiar} />',
    ),
    (
        '<CampoForm label="Login PPPoE" campo="login_pppoe" placeholder="usuario@v5fibra" copiavel valor={conexao.login_pppoe || \'\'} />',
        '<CampoForm label="Login PPPoE" campo="login_pppoe" placeholder="usuario@v5fibra" copiavel valor={conexao.login_pppoe || \'\'} estaEditando={estaEditandoForm} valorForm={formConexao.login_pppoe || \'\'} onMudar={aoMudarCampo} onCopiar={copiar} />',
    ),
    (
        '<CampoForm label="IP Fixo" campo="ip_fixo" placeholder="0.0.0.0" copiavel valor={conexao.ip_fixo || \'\'} />',
        '<CampoForm label="IP Fixo" campo="ip_fixo" placeholder="0.0.0.0" copiavel valor={conexao.ip_fixo || \'\'} estaEditando={estaEditandoForm} valorForm={formConexao.ip_fixo || \'\'} onMudar={aoMudarCampo} onCopiar={copiar} />',
    ),
    (
        '<CampoForm label="MAC Address" campo="mac_address" placeholder="AA:BB:CC:DD:EE:FF" copiavel valor={conexao.mac_address || \'\'} />',
        '<CampoForm label="MAC Address" campo="mac_address" placeholder="AA:BB:CC:DD:EE:FF" copiavel valor={conexao.mac_address || \'\'} estaEditando={estaEditandoForm} valorForm={formConexao.mac_address || \'\'} onMudar={aoMudarCampo} onCopiar={copiar} />',
    ),
    (
        '<CampoForm label="Perfil RADIUS" campo="perfil_radius" placeholder="plano_100mb" copiavel valor={conexao.perfil_radius || \'\'} />',
        '<CampoForm label="Perfil RADIUS" campo="perfil_radius" placeholder="plano_100mb" copiavel valor={conexao.perfil_radius || \'\'} estaEditando={estaEditandoForm} valorForm={formConexao.perfil_radius || \'\'} onMudar={aoMudarCampo} onCopiar={copiar} />',
    ),
    (
        '<CampoForm label="VLAN" campo="vlan" copiavel valor={conexao.vlan || \'\'} />',
        '<CampoForm label="VLAN" campo="vlan" copiavel valor={conexao.vlan || \'\'} estaEditando={estaEditandoForm} valorForm={formConexao.vlan || \'\'} onMudar={aoMudarCampo} onCopiar={copiar} />',
    ),
    (
        '<CampoForm label="Porta OLT" campo="porta_olt" copiavel valor={conexao.porta_olt || \'\'} />',
        '<CampoForm label="Porta OLT" campo="porta_olt" copiavel valor={conexao.porta_olt || \'\'} estaEditando={estaEditandoForm} valorForm={formConexao.porta_olt || \'\'} onMudar={aoMudarCampo} onCopiar={copiar} />',
    ),
    (
        '<CampoForm label="Serial ONU" campo="onu_serial" copiavel valor={conexao.onu_serial || \'\'} />',
        '<CampoForm label="Serial ONU" campo="onu_serial" copiavel valor={conexao.onu_serial || \'\'} estaEditando={estaEditandoForm} valorForm={formConexao.onu_serial || \'\'} onMudar={aoMudarCampo} onCopiar={copiar} />',
    ),
]

for old, new in replacements:
    assert t.count(old) == 1, f"chamada nao encontrada (exatamente 1 esperada): {old}"
    t = t.replace(old, new)

with open(path, 'w', encoding='utf-8') as f:
    f.write(t)
print('OK TabConexao.tsx (fix remount CampoForm)')
