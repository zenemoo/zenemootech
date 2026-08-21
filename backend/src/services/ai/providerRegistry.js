import { groqProvider } from './providers/groqProvider.js';
import { geminiProvider } from './providers/geminiProvider.js';
import { cerebrasProvider } from './providers/cerebrasProvider.js';
import { mistralProvider } from './providers/mistralProvider.js';
import { openrouterProvider } from './providers/openrouterProvider.js';
import { initProviderHealth } from './providerHealth.js';

export const ALL_PROVIDERS = [
  groqProvider,
  geminiProvider,
  cerebrasProvider,
  mistralProvider,
  openrouterProvider,
].sort((a, b) => a.priority - b.priority);

// Initialize Health Registry
initProviderHealth(ALL_PROVIDERS);

export const getAvailableProviders = () => {
  return ALL_PROVIDERS.filter((p) => p.isConfigured());
};

export const getProviderById = (id) => {
  return ALL_PROVIDERS.find((p) => p.id === id);
};
