-- ============================================================
-- V5 Cloud — FECHAR o banco à chave pública (etapa 4.3)
-- RODAR SOMENTE DEPOIS que o site novo (com todas as telas já
-- passando pelo servidor) estiver publicado na Vercel.
-- Remove as regras que deixavam QUALQUER UM ler/editar pela chave
-- pública. A chave de serviço (usada só no servidor) ignora RLS,
-- então painel, app e páginas públicas continuam funcionando.
-- Para desfazer: rode DESFAZER-banco.sql
-- ============================================================

-- Clientes: ninguém de fora lê mais CPF, senha, senha PPPoE
drop policy if exists "permitir_leitura_anon" on public.clientes;

-- Conexões PPPoE: ninguém de fora lê/edita/apaga
drop policy if exists "Permitir tudo conexoes_pppoe" on public.conexoes_pppoe;

-- Contratos
drop policy if exists "Permitir tudo contratos" on public.contratos;
drop policy if exists "contratos_all" on public.contratos;

-- Avaliações: ninguém de fora edita/apaga notas
drop policy if exists "avaliacoes_all" on public.avaliacoes;

-- Empresas: dados do provedor saem só pelas rotas do servidor
drop policy if exists "Leitura empresas app" on public.empresas;
drop policy if exists "Permitir leitura publica de empresas" on public.empresas;

-- Ordens de serviço
drop policy if exists "Permitir leitura ordens_servico" on public.ordens_servico;

-- Planos
drop policy if exists "planos_all" on public.planos;

-- Observação: ctos, leads e faturas já estavam fechados à chave pública.
-- avaliacoes_tecnico mantém as regras próprias (cliente insere/lê as suas).
