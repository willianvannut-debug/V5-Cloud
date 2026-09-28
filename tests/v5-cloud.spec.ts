import { test, expect } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

test('Passo 1: Validar Central de Viabilidade e Elementos do Mapa', async ({ page }) => {
  // 1. Vai para a página de login
  await page.goto('http://localhost:3000/login');
  
  // 2. Preenche as credenciais
  await page.fill('input[type="email"]', 'willianvannut@gmail.com');
  await page.fill('input[type="password"]', 'laypfabk1!');

  // 3. Clica no botão e aguarda o carregamento completo da página seguinte com segurança
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }),
    page.click('button:has-text("ACESSAR PAINEL")'),
  ]);

  // 4. Navega diretamente para a página de Viabilidade já autenticado
  await page.goto('http://localhost:3000/dashboard/viabilidade');

  // 5. Verifica se o título principal está visível
  const titulo = page.locator('text=Central de Viabilidade Assistida');
  await expect(titulo).toBeVisible();

  // 6. Valida se o bloco de dados do cliente / localização no mapa está presente
  const secaoMapa = page.locator('text=DADOS DO CLIENTE & LOCALIZAÇÃO NO MAPA');
  await expect(secaoMapa).toBeVisible();

  // 7. Clica no botão "LIMPAR CONSULTA" para testar interatividade
  await page.click('button:has-text("LIMPAR CONSULTA")');

  // 8. Tira uma foto para auditoria visual
  await page.screenshot({ path: 'teste-passo1-viabilidade-sucesso.png', fullPage: true });
});