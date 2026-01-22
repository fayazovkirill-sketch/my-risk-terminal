import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Загружаем переменные из .env файла
  // Cast process to any to avoid TS error about missing cwd() in Process type
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // Пробрасываем API_KEY в код так, чтобы process.env.API_KEY работал
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    },
    server: {
      host: true // Позволяет открывать по локальной сети
    }
  };
});