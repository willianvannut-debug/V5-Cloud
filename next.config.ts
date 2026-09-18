import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Ignora erros estritos de tipagem e linting no build da Vercel
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Liberação do seu IP de desenvolvimento
  allowedDevOrigins: ['192.168.1.100'],

  // Configuração de Cabeçalhos de Segurança HTTP e HTTPS
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Força o navegador a utilizar conexões seguras HTTPS (Strict-Transport-Security por 1 ano)
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          // Impede que seu site seja emoldurado por sites maliciosos (Proteção contra Clickjacking)
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // Evita que o navegador adivinhe o tipo MIME dos arquivos (Proteção contra sniffing)
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Proteção contra ataques de Cross-Site Scripting (XSS)
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // Controla quanta informação de origem é enviada em links
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;