// Script para popular perfil de demonstração V5 Cloud
// Roda com: node popular-demo.js

const BASE_URL = "https://v5-cloud.vercel.app";
const EMAIL = "planobase@gmail.com";
const SENHA = "Iaypfabk1!12";

let sessionCookie = "";

async function req(method, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Cookie: sessionCookie,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  try { return { status: res.status, data: JSON.parse(text), headers: res.headers }; }
  catch { return { status: res.status, data: text, headers: res.headers }; }
}

async function login() {
  console.log("🔐 Fazendo login...");
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, senha: SENHA }),
  });
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) {
    sessionCookie = setCookie.split(";")[0];
    console.log("✅ Login OK");
  } else {
    const data = await res.json();
    console.error("❌ Erro no login:", data);
    process.exit(1);
  }
}

// ============================================================
// DADOS FICTÍCIOS
// ============================================================

const clientes = [
  { nome: "João Silva", email: "joao.silva@email.com", telefone: "11987654321", endereco: "Rua das Flores, 123", plano: "Fibra 200MB", status: "ativo" },
  { nome: "Maria Santos", email: "maria.santos@email.com", telefone: "11976543210", endereco: "Av. Paulista, 456", plano: "Fibra 500MB", status: "ativo" },
  { nome: "Carlos Oliveira", email: "carlos.oliveira@email.com", telefone: "11965432109", endereco: "Rua do Comercio, 789", plano: "Fibra 100MB", status: "ativo" },
  { nome: "Ana Ferreira", email: "ana.ferreira@email.com", telefone: "11954321098", endereco: "Rua das Acácias, 321", plano: "Fibra 1GB", status: "ativo" },
  { nome: "Pedro Costa", email: "pedro.costa@email.com", telefone: "11943210987", endereco: "Av. Brasil, 654", plano: "Fibra 200MB", status: "bloqueado" },
  { nome: "Lucia Almeida", email: "lucia.almeida@email.com", telefone: "11932109876", endereco: "Rua das Palmeiras, 987", plano: "Fibra 500MB", status: "ativo" },
  { nome: "Roberto Lima", email: "roberto.lima@email.com", telefone: "11921098765", endereco: "Rua São Paulo, 147", plano: "Fibra 100MB", status: "ativo" },
  { nome: "Fernanda Souza", email: "fernanda.souza@email.com", telefone: "11910987654", endereco: "Av. das Nações, 258", plano: "Fibra 200MB", status: "ativo" },
  { nome: "Marcos Pereira", email: "marcos.pereira@email.com", telefone: "11999887766", endereco: "Rua Boa Vista, 369", plano: "Fibra 1GB", status: "ativo" },
  { nome: "Juliana Ramos", email: "juliana.ramos@email.com", telefone: "11988776655", endereco: "Rua da Paz, 741", plano: "Fibra 500MB", status: "bloqueado" },
  { nome: "Thiago Barbosa", email: "thiago.barbosa@email.com", telefone: "11977665544", endereco: "Av. Central, 852", plano: "Fibra 200MB", status: "ativo" },
  { nome: "Camila Rodrigues", email: "camila.rodrigues@email.com", telefone: "11966554433", endereco: "Rua Nova, 963", plano: "Fibra 100MB", status: "ativo" },
  { nome: "Diego Martins", email: "diego.martins@email.com", telefone: "11955443322", endereco: "Rua do Sol, 159", plano: "Fibra 500MB", status: "ativo" },
  { nome: "Patricia Gomes", email: "patricia.gomes@email.com", telefone: "11944332211", endereco: "Av. das Flores, 357", plano: "Fibra 1GB", status: "ativo" },
  { nome: "Leonardo Carvalho", email: "leonardo.carvalho@email.com", telefone: "11933221100", endereco: "Rua Horizonte, 753", plano: "Fibra 200MB", status: "cancelado" },
];

const leads = [
  { nome: "Beatriz Nascimento", whatsapp: "11912345678", numero: "Rua das Margaridas, 10",  cep: "72900-000", perfil: "COM COBERTURA", lat: -16.0163, lon: -47.9992, plano_escolhido: "Fibra 200MB" },
  { nome: "Ricardo Mendes",     whatsapp: "11923456789", numero: "Av. Independência, 20",   cep: "72901-000", perfil: "EM CONTATO",    lat: -16.0231, lon: -47.9876, plano_escolhido: "Fibra 500MB" },
  { nome: "Vanessa Castro",     whatsapp: "11934567890", numero: "Rua do Ipê, 30",          cep: "72902-000", perfil: "NOVO",           lat: -16.0089, lon: -48.0101, plano_escolhido: "Fibra 1GB"   },
  { nome: "Gustavo Nunes",      whatsapp: "11945678901", numero: "Rua das Orquídeas, 40",   cep: "72903-000", perfil: "COM COBERTURA", lat: -16.0310, lon: -47.9754, plano_escolhido: "Fibra 100MB" },
  { nome: "Isabela Freitas",    whatsapp: "11956789012", numero: "Av. Liberdade, 50",       cep: "72904-000", perfil: "NOVO",           lat: -16.0055, lon: -48.0215, plano_escolhido: "Fibra 200MB" },
  { nome: "André Cardoso",      whatsapp: "11967890123", numero: "Rua do Pinheiro, 60",     cep: "72905-000", perfil: "NEGOCIANDO",     lat: -16.0412, lon: -47.9633, plano_escolhido: "Fibra 500MB" },
  { nome: "Larissa Monteiro",   whatsapp: "11978901234", numero: "Av. das Américas, 70",    cep: "72906-000", perfil: "COM COBERTURA", lat: -15.9988, lon: -48.0330, plano_escolhido: "Fibra 1GB"   },
  { nome: "Felipe Araújo",      whatsapp: "11989012345", numero: "Rua Esperança, 80",       cep: "72907-000", perfil: "EM CONTATO",    lat: -16.0501, lon: -47.9512, plano_escolhido: "Fibra 200MB" },
  { nome: "Mariana Teixeira",   whatsapp: "11911223344", numero: "Rua dos Girassóis, 90",   cep: "72908-000", perfil: "NOVO",           lat: -16.0620, lon: -47.9401, plano_escolhido: "Fibra 500MB" },
  { nome: "Samuel Vieira",      whatsapp: "11922334455", numero: "Av. do Lago, 100",        cep: "72909-000", perfil: "COM COBERTURA", lat: -15.9870, lon: -48.0445, plano_escolhido: "Fibra 1GB"   },
];

const tecnicos = [
  { nome: "Alex Técnico", email: "alex.tec@suaempresa.com", senha: "Tecnico@123" },
  { nome: "Bruno Instalador", email: "bruno.inst@suaempresa.com", senha: "Tecnico@123" },
  { nome: "Carlos Suporte", email: "carlos.sup@suaempresa.com", senha: "Tecnico@123" },
];

const servidores = [
  { nome: "MikroTik Principal", host: "192.168.1.1", porta: 8728, usuario: "admin", senha: "mikrotik123" },
  { nome: "MikroTik Bairro Norte", host: "192.168.2.1", porta: 8728, usuario: "admin", senha: "mikrotik123" },
  { nome: "MikroTik Bairro Sul", host: "192.168.3.1", porta: 8728, usuario: "admin", senha: "mikrotik123" },
];

// ============================================================
// POPULAR
// ============================================================

async function popularClientes() {
  console.log("\n👥 Criando clientes...");
  for (const c of clientes) {
    const r = await req("POST", "/api/assinantes", c);
    const ok = r.status === 201 || r.status === 200;
    console.log(`  ${ok ? "✅" : "⚠️ "} ${c.nome} — ${r.status}`);
  }
}

async function popularLeads() {
  console.log("\n🎯 Criando leads...");
  for (const l of leads) {
    const r = await req("POST", "/api/leads", l);
    const ok = r.status === 201 || r.status === 200;
    console.log(`  ${ok ? "✅" : "⚠️ "} ${l.nome} — ${r.status}`);
  }
}

async function popularTecnicos() {
  console.log("\n🔧 Criando técnicos...");
  for (const t of tecnicos) {
    const r = await req("POST", "/api/tecnicos", t);
    const ok = r.status === 201 || r.status === 200;
    console.log(`  ${ok ? "✅" : "⚠️ "} ${t.nome} — ${r.status}`);
  }
}

async function popularServidores() {
  console.log("\n🖥️  Criando servidores MikroTik...");
  for (const s of servidores) {
    const r = await req("POST", "/api/servidores", s);
    const ok = r.status === 201 || r.status === 200;
    console.log(`  ${ok ? "✅" : "⚠️ "} ${s.nome} — ${r.status}`);
  }
}

async function main() {
  console.log("🚀 Populando perfil de demonstração V5 Cloud...\n");
  await login();
  await popularClientes();
  await popularLeads();
  await popularTecnicos();
  await popularServidores();
  console.log("\n✅ Concluído! Acesse https://v5-cloud.vercel.app e faça login com:");
  console.log("   Email: planobase@gmail.com");
  console.log("   Senha: Iaypfabk1!12");
}

main().catch(console.error);
