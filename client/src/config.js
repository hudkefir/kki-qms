// QMS Configuration
const isProduction = import.meta.env.PROD;
const isCloudflarePages = window.location.hostname.includes('pages.dev');

export const API_BASE_URL = isCloudflarePages 
  ? 'https://kit-moving-hawaii-association.trycloudflare.com'
  : '';

export const config = {
  apiBaseUrl: API_BASE_URL,
  wsUrl: isCloudflarePages 
    ? 'wss://kit-moving-hawaii-association.trycloudflare.com'
    : 'ws://localhost:3002'
};