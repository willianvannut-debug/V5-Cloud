-- ============================================================
-- V5 Cloud — DESFAZER o fechamento (volta ao estado anterior)
-- Use só se algo quebrar depois de rodar FECHAR-banco.sql.
-- Recria exatamente as regras que existiam antes.
-- ============================================================

create policy "permitir_leitura_anon" on public.clientes
  for select to anon using (true);

create policy "Permitir tudo conexoes_pppoe" on public.conexoes_pppoe
  for all using (true) with check (true);

create policy "Permitir tudo contratos" on public.contratos
  for all using (true) with check (true);
create policy "contratos_all" on public.contratos
  for all using (true) with check (true);

create policy "avaliacoes_all" on public.avaliacoes
  for all using (true) with check (true);

create policy "Leitura empresas app" on public.empresas
  for select using (true);
create policy "Permitir leitura publica de empresas" on public.empresas
  for select to authenticated, anon using (true);

create policy "Permitir leitura ordens_servico" on public.ordens_servico
  for select using (true);

create policy "planos_all" on public.planos
  for all using (true) with check (true);
