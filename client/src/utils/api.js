import { config } from '../config.js';

// API wrapper that handles different environments
export const apiCall = async (url, options = {}) => {
  const fullUrl = config.apiBaseUrl + url;
  
  return fetch(fullUrl, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
};

export default apiCall;