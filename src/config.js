// Configuration for Dev Mode vs Production
// In production builds (Vercel / Render / npm run build), IS_DEV_MODE is false by default.
// You can also override it with VITE_DEV_MODE=true in .env if testing production locally.
export const IS_DEV_MODE = 
  import.meta.env.DEV || 
  import.meta.env.VITE_DEV_MODE === 'true' ||
  (typeof window !== 'undefined' && window.location.search.includes('dev=true'));
