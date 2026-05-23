import { loadConfigFromStorage, saveConfigToStorage } from './storage.js';

const DEFAULT_CONFIG = {
  clozeConfig: {
    minCount: 1,
    smallArticleRatio: 0.3,
    largeArticleMin: 3,
    largeArticleMax: 5,
    smallArticleThreshold: 10,
  },
  reviewConfig: {
    reviewClozeCount: 1,
  },
  uiConfig: {
    errorSectionDefaultCollapsed: true,
  },
};

export function getDefaultConfig() {
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
}

export function loadConfig() {
  const saved = loadConfigFromStorage();
  if (saved) {
    return { ...getDefaultConfig(), ...saved, clozeConfig: { ...DEFAULT_CONFIG.clozeConfig, ...(saved.clozeConfig || {}) }, reviewConfig: { ...DEFAULT_CONFIG.reviewConfig, ...(saved.reviewConfig || {}) }, uiConfig: { ...DEFAULT_CONFIG.uiConfig, ...(saved.uiConfig || {}) } };
  }
  const def = getDefaultConfig();
  saveConfigToStorage(def);
  return def;
}

export function saveConfig(config) {
  return saveConfigToStorage(config);
}
