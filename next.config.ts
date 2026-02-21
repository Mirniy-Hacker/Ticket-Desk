import type { NextConfig } from 'next';

/**
 * Next.js конфигурация.
 *
 * output: 'standalone' — создаёт автономный билд (server.js + node_modules подмножество),
 * который не зависит от полного node_modules в рантайме.
 * Это КРИТИЧНО для Docker: итоговый образ содержит только необходимое (~100 MB вместо 500+).
 */
const nextConfig: NextConfig = {
  output: 'standalone',
};

export default nextConfig;
