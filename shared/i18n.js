import { STORAGE_KEYS } from './constants.js';
import { MESSAGES } from './messages.js';

let overrideLanguage = 'auto';

function resolveLanguage() {
  if (overrideLanguage && overrideLanguage !== 'auto') {
    return overrideLanguage;
  }
  let ui = 'en';
  try {
    ui = globalThis.chrome?.i18n?.getUILanguage?.() || 'en';
  } catch {
    ui = 'en';
  }

  if (String(ui).toLowerCase().startsWith('zh')) return 'zh_CN';
  return 'en';
}

function interpolate(text, substitutions) {
  if (substitutions == null) return text;
  const values = Array.isArray(substitutions) ? substitutions : [substitutions];
  if (!values.length) return text;
  return values.reduce((acc, value, index) => {
    return acc.replaceAll(`$${index + 1}`, String(value));
  }, text);
}

export async function initI18n() {
  try {
    const storageLocal = globalThis.chrome?.storage?.local;
    if (!storageLocal?.get) {
      overrideLanguage = 'auto';
      return;
    }

    const maybePromise = storageLocal.get(STORAGE_KEYS.settings);
    const result =
      typeof maybePromise?.then === 'function'
        ? await maybePromise
        : await new Promise((resolve) => {
            storageLocal.get(STORAGE_KEYS.settings, (value) => resolve(value));
          });
    const lang = result?.[STORAGE_KEYS.settings]?.uiLanguage;
    if (lang) overrideLanguage = lang;
  } catch {
    overrideLanguage = 'auto';
  }
}

export function t(key, substitutions) {
  const lang = resolveLanguage();
  const localText = MESSAGES[lang]?.[key];
  if (localText) return interpolate(localText, substitutions);
  try {
    const text = globalThis.chrome?.i18n?.getMessage?.(key, substitutions);
    if (text) return text;
  } catch {}
  return key;
}

export function applyI18n(root = document) {
  if (!root?.querySelectorAll) return;

  root.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (!key) return;
    el.textContent = t(key);
  });

  root.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.getAttribute('data-i18n-title');
    if (!key) return;
    el.setAttribute('title', t(key));
  });
}
