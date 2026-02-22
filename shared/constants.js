export const APP_NAME = 'AI Chat Exporter';

export const DEFAULT_SETTINGS = {
  subfolderTemplate: 'AI Chats/{platform}/',
  filenameTemplate: '{platform}-{title}-{datetime}',
  includeFrontmatter: true,
  includeTimestamps: true,
  enableFab: true,
  autoHideFab: true,
  uiLanguage: 'auto',
  imageRelativePath: 'assets/',
};

export const STORAGE_KEYS = {
  settings: 'settings',
  fabPosition: 'fabPosition',
  introShown: 'introShown',
};

export const DIRECTORY_DB = {
  name: 'ai-chat-exporter-db',
  version: 1,
  store: 'handles',
  key: 'obsidianRoot',
};

export const EXPORT_MESSAGE_TYPES = {
  triggerExport: 'ACE_TRIGGER_EXPORT',
  runExport: 'ACE_RUN_EXPORT',
  exportChat: 'ACE_EXPORT_CHAT',
  exportResult: 'ACE_EXPORT_RESULT',
  getSettings: 'ACE_GET_SETTINGS',
};

export const SUPPORTED_CHAT_URL_PREFIXES = ['https://chatgpt.com/', 'https://gemini.google.com/'];
