export const ENV = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000',
  APP_NAME: import.meta.env.VITE_APP_NAME ?? 'Nombre app'
} as const;