export const APP_CONFIG = {
  name: 'TripGenie',
  version: '0.1.0',
  description: 'AI-Powered Travel & Experience Platform',
  defaultPort: {
    web: 3000,
    api: 3001,
  },
} as const;

export type AppConfig = typeof APP_CONFIG;
