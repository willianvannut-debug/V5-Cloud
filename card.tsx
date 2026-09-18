<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Planos e Preços - V5 Provedores (Dark Green)</title>
    <!-- Tailwind CSS via CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Lucide Icons via CDN -->
    <script src="https://unpkg.com/lucide@latest"></script>
    
    <!-- Configuração de cores personalizadas do Tailwind para DARK GREEN MODE -->
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        background: '#021708', // Fundo verde bem escuro
                        foreground: '#f8fafc', // Texto claro
                        muted: { DEFAULT: '#1e3b29', foreground: '#94a3b8' }, // Bordas e fundos secundários
                        primary: { DEFAULT: '#f8fafc', foreground: '#021708' }, // Destaque branco
                        card: { DEFAULT: '#021708', foreground: '#f8fafc' }, // Fundo dos cartões
                        border: '#1e3b29', // Cor das bordas
                    }
                }
            }
        }
    </script>
</head>
<body class="min-h-screen bg-background text-foreground font-sans antialiased">

    <main class="w-full py-20 px-4 md:px-8">
        <div class="max-w-7xl mx-auto text-center">
            
            <!-- Cabeçalho -->
            <h2 class="text-4xl font-bold tracking-tight mb-2">Preços Simples e Transparentes</h2>
            <p class="text-muted-foreground mb-8">------------</p>

            <!-- Toggle Mensal/Anual -->
            <div class="flex items-center justify-center gap-3 mb-10">
                <label for="billing-toggle" class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" id="billing-toggle" class="sr-only peer">
                    <!-- Cores do toggle puxando do tema verde -->
                    <div class="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-checked:after:bg-background"></div>
                    <span class="ml-3 text-sm font-medium text-muted-foreground select-none">Pague anualmente e economize 20%</span>
                </label>
            </div>

            <!-- Grid de Cards de Preço -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
                
                <!-- Card 1: Essencial -->
                <div class="relative flex flex-col border border-border rounded-xl bg-card p-6 transition-all hover:shadow-md hover:border-primary/30">
                    <div class="flex flex-col items-center text-center mb-6 pt-2">
                        <i data-lucide="layers" class="w-8 h-8 text-primary mb-4"></i>
                        <h3 class="text-2xl font-semibold leading-none tracking-tight mb-2">Essencial</h3>
                        <p class="text-sm text-muted-foreground min-h-[40px]">Para pequenos provedores dando o primeiro passo digital.</p>
                    </div>
                    <div class="text-center flex-grow flex flex-col">
                        <div class="text-3xl font-bold mb-2 transition-all duration-300 price-display" data-monthly="97" data-yearly="970">R$ 97</div>
                        <p class="text-sm text-muted-foreground mb-4 min-h-[20px] price-period">/ mês</p>
                        <button class="w-full mb-6 inline-flex items-center justify-center rounded-lg text-sm font-medium h-9 px-4 py-2 border border-border bg-transparent hover:bg-muted transition-colors text-foreground">Começar Agora</button>
                        
                        <div class="text-left text-sm mt-auto">
                            <h4 class="font-semibold mb-2">Visão Geral</h4>
                            <p class="text-muted-foreground mb-1">✓ 1 Usuário de vendas</p>
                            <p class="text-muted-foreground mb-1">✓ Até 300 caixas CTO cadastradas</p>
                            <p class="text-muted-foreground mb-1">✓ Até 100 Leads validados por mês</p>
                            <p class="text-muted-foreground mb-3">✓ Até 2 Tecnico em campo</p>
                            
                            <h4 class="font-semibold mb-2">Destaques</h4>
                            <ul class="space-y-2">
                                <li class="flex items-start gap-2 text-muted-foreground"><i data-lucide="check" class="w-4 h-4 text-primary shrink-0 mt-0.5"></i> <span>Widget de Viabilidade no site</span></li>
                                <li class="flex items-start gap-2 text-muted-foreground"><i data-lucide="check" class="w-4 h-4 text-primary shrink-0 mt-0.5"></i> <span>CRM Básico (Kanban de leads)</span></li>
                                <li class="flex items-start gap-2 text-muted-foreground/40 line-through"><i data-lucide="x" class="w-4 h-4 text-muted-foreground shrink-0 mt-0.5"></i> <span>Integrações externas (Webhooks)</span></li>
                                <li class="flex items-start gap-2 text-muted-foreground/40 line-through"><i data-lucide="x" class="w-4 h-4 text-muted-foreground shrink-0 mt-0.5"></i> <span>Suporte prioritário</span></li>
                            </ul>
                        </div>
                    </div>
                </div>

                <!-- Card 2: Pro -->
                <div class="relative flex flex-col border border-border rounded-xl bg-card p-6 transition-all hover:shadow-md hover:border-primary/30">
                    <div class="flex flex-col items-center text-center mb-6 pt-2">
                        <i data-lucide="monitor" class="w-8 h-8 text-primary mb-4"></i>
                        <h3 class="text-2xl font-semibold leading-none tracking-tight mb-2">Pro</h3>
                        <p class="text-sm text-muted-foreground min-h-[40px]">Para provedores em expansão que precisam de velocidade.</p>
                    </div>
                    <div class="text-center flex-grow flex flex-col">
                        <div class="text-3xl font-bold mb-2 transition-all duration-300 price-display" data-monthly="247" data-yearly="2470">R$ 247</div>
                        <p class="text-sm text-muted-foreground mb-4 min-h-[20px] price-period">/ mês</p>
                        <button class="w-full mb-6 inline-flex items-center justify-center rounded-lg text-sm font-medium h-9 px-4 py-2 border border-border bg-transparent hover:bg-muted transition-colors text-foreground">Começar Agora</button>
                        
                        <div class="text-left text-sm mt-auto">
                            <h4 class="font-semibold mb-2">Visão Geral</h4>
                            <p class="text-muted-foreground mb-1">✓ Até 3 Usuários de vendas</p>
                            <p class="text-muted-foreground mb-1">✓ Até 1.500 Caixas CTO cadastradas</p>
                            <p class="text-muted-foreground mb-1">✓ Até 500 leads validados por mês</p>
                            <p class="text-muted-foreground mb-4">✓ Até 10 Tecnico em campo</p>
                            
                            <h4 class="font-semibold mb-2">Destaques</h4>
                            <ul class="space-y-2">
                                <li class="flex items-start gap-2 text-muted-foreground"><i data-lucide="check" class="w-4 h-4 text-primary shrink-0 mt-0.5"></i> <span>Tudo do Essencial</span></li>
                                <li class="flex items-start gap-2 text-muted-foreground"><i data-lucide="check" class="w-4 h-4 text-primary shrink-0 mt-0.5"></i> <span>Relatórios básicos de conversão</span></li>
                                <li class="flex items-start gap-2 text-muted-foreground/40 line-through"><i data-lucide="x" class="w-4 h-4 text-muted-foreground shrink-0 mt-0.5"></i> <span>Setup assistido de automação</span></li>
                            </ul>
                        </div>
                    </div>
                </div>

                <!-- Card 3: Scale (Recomendado) -->
                <div class="relative flex flex-col border border-primary ring-1 ring-primary/30 scale-[1.03] rounded-xl bg-card p-6 transition-all shadow-md z-10">
                    <div class="absolute -top-3 left-0 right-0 mx-auto w-fit bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full font-medium shadow-sm">
                        Recomendado
                    </div>
                    <div class="flex flex-col items-center text-center mb-6 pt-4">
                        <i data-lucide="rocket" class="w-8 h-8 text-primary mb-4"></i>
                        <h3 class="text-2xl font-semibold leading-none tracking-tight mb-2">Scale</h3>
                        <p class="text-sm text-muted-foreground min-h-[40px]">Para equipes comerciais estruturadas e focadas em conversão.</p>
                    </div>
                    <div class="text-center flex-grow flex flex-col">
                        <div class="text-3xl font-bold mb-2 transition-all duration-300 price-display" data-monthly="497" data-yearly="4970">R$ 497</div>
                        <p class="text-sm text-muted-foreground mb-4 min-h-[20px] price-period">/ mês</p>
                        <button class="w-full mb-6 inline-flex items-center justify-center rounded-lg text-sm font-medium h-9 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm">Assinar Scale</button>
                        
                        <div class="text-left text-sm mt-auto">
                            <h4 class="font-semibold mb-2">Visão Geral</h4>
                            <p class="text-muted-foreground mb-1">✓ Até 10 Usuários de vendas</p>
                            <p class="text-muted-foreground mb-1">✓ Até 5.000 caixas CTO cadastradas</p>
                            <p class="text-muted-foreground mb-1">✓ Até 1.500 leads validados por mês</p>
                            <p class="text-muted-foreground mb-1">✓ Até 30 Tecnico em campo</p>
                            
                            <h4 class="font-semibold mb-2">Destaques</h4>
                            <ul class="space-y-2">
                                <li class="flex items-start gap-2 text-muted-foreground"><i data-lucide="check" class="w-4 h-4 text-primary shrink-0 mt-0.5"></i> <span>Tudo do Pro</span></li>
                                <li class="flex items-start gap-2 text-muted-foreground"><i data-lucide="check" class="w-4 h-4 text-primary shrink-0 mt-0.5"></i> <span>Roleta de Leads automática</span></li>
                                <li class="flex items-start gap-2 text-muted-foreground"><i data-lucide="check" class="w-4 h-4 text-primary shrink-0 mt-0.5"></i> <span>Analytics Avançado (Viabilidade)</span></li>
                                <li class="flex items-start gap-2 text-muted-foreground"><i data-lucide="check" class="w-4 h-4 text-primary shrink-0 mt-0.5"></i> <span>Suporte prioritário via WhatsApp</span></li>
                            </ul>
                        </div>
                    </div>
                </div>

                <!-- Card 4: Enterprise -->
                <div class="relative flex flex-col border border-border rounded-xl bg-card p-6 transition-all hover:shadow-md hover:border-primary/30">
                    <div class="flex flex-col items-center text-center mb-6 pt-2">
                        <i data-lucide="building-2" class="w-8 h-8 text-primary mb-4"></i>
                        <h3 class="text-2xl font-semibold leading-none tracking-tight mb-2">Enterprise</h3>
                        <p class="text-sm text-muted-foreground min-h-[40px]">Para grandes operações que exigem automação.</p>
                    </div>
                    <div class="text-center flex-grow flex flex-col">
                        <!-- Preço personalizado que se ajusta via JS -->
                        <div class="text-2xl font-bold mb-2 transition-all duration-300 price-display" data-monthly="Personalizado" data-yearly="Personalizado">Personalizado</div>
                        <p class="text-sm text-muted-foreground mb-4 min-h-[20px] price-period"></p> <!-- Vazio por padrão -->
                        <button class="w-full mb-6 inline-flex items-center justify-center rounded-lg text-sm font-medium h-9 px-4 py-2 border border-border bg-transparent hover:bg-muted transition-colors text-foreground">Falar com Vendas</button>
                        
                        <div class="text-left text-sm mt-auto">
                            <h4 class="font-semibold mb-2">Visão Geral</h4>
                            <p class="text-muted-foreground mb-1">✓ Limite de usuarios personalizados</p>
                            <p class="text-muted-foreground mb-4">✓ Áreas de cobertura Personalizadas</p>
                            
                            <h4 class="font-semibold mb-2">Destaques</h4>
                            <ul class="space-y-2">
                                <li class="flex items-start gap-2 text-muted-foreground"><i data-lucide="check" class="w-4 h-4 text-primary shrink-0 mt-0.5"></i> <span>Setup VIP (n8n e WhatsApp)</span></li>
                                <li class="flex items-start gap-2 text-muted-foreground"><i data-lucide="check" class="w-4 h-4 text-primary shrink-0 mt-0.5"></i> <span>White-label (Sem marca no Widget)</span></li>
                                <li class="flex items-start gap-2 text-muted-foreground"><i data-lucide="check" class="w-4 h-4 text-primary shrink-0 mt-0.5"></i> <span>Gerente de sucesso dedicado</span></li>
                                <li class="flex items-start gap-2 text-muted-foreground"><i data-lucide="check" class="w-4 h-4 text-primary shrink-0 mt-0.5"></i> <span>Treinamento de equipe de vendas</span></li>
                            </ul>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    </main>

    <!-- Scripts da Página -->
    <script>
        // Inicia ícones
        lucide.createIcons();

        // Lógica do Switch Anual/Mensal
        const toggle = document.getElementById('billing-toggle');
        const priceDisplays = document.querySelectorAll('.price-display');
        const pricePeriods = document.querySelectorAll('.price-period');

        toggle.addEventListener('change', (e) => {
            const isAnnual = e.target.checked;

            priceDisplays.forEach((display, index) => {
                const monthlyPrice = display.getAttribute('data-monthly');
                const yearlyPrice = display.getAttribute('data-yearly');
                const price = isAnnual ? yearlyPrice : monthlyPrice;
                const periodElement = pricePeriods[index];
                
                // Animação de fade-out
                display.style.opacity = '0';
                if(periodElement) periodElement.style.opacity = '0';

                setTimeout(() => {
                    // Lógica especial para o Enterprise (ou se o preço for um texto)
                    if (price === 'Personalizado') {
                        display.textContent = price;
                        display.classList.replace('text-3xl', 'text-2xl'); // Diminui a fonte levemente pro texto caber
                        if(periodElement) periodElement.textContent = ''; // Esconde o "/ mês"
                    } else {
                        display.textContent = 'R$ ' + price;
                        display.classList.replace('text-2xl', 'text-3xl');
                        if(periodElement) periodElement.textContent = isAnnual ? '/ ano' : '/ mês';
                    }
                    
                    // Animação de fade-in
                    display.style.opacity = '1';
                    if(periodElement) periodElement.style.opacity = '1';
                }, 150); // Timing da transição
            });
        });
    </script>
</body>
</html>