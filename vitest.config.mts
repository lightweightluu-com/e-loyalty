import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { environment: 'node', env: { AUTH_SECRET: 'a'.repeat(40), QR_SIGNING_SECRET: 'b'.repeat(40) } },
});
