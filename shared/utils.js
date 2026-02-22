const INVALID_FILE_CHARS = /[\\/:*?"<>|]/g;
const COLLAPSE_WHITESPACE = /\s+/g;

export function sanitizePathSegment(raw, fallback = 'untitled') {
  const value = String(raw || '').trim();
  const normalized = value
    .replace(INVALID_FILE_CHARS, '-')
    .replace(COLLAPSE_WHITESPACE, ' ')
    .replace(/\.+$/g, '')
    .trim();

  if (!normalized) return fallback;
  return normalized.slice(0, 120);
}

export function formatDateForToken(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatTimeForToken(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

export function formatDatetimeForToken(date = new Date()) {
  return `${formatDateForToken(date)}-${formatTimeForToken(date)}`;
}

export function renderTemplate(template, values) {
  return String(template || '').replace(/\{([a-zA-Z0-9_]+)\}/g, (_, token) => {
    const value = values[token];
    if (value == null) return '';
    return String(value);
  });
}

export function normalizeSubfolder(path) {
  const cleaned = String(path || '').replace(/\\/g, '/').trim();
  if (!cleaned) return '';
  return cleaned
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)
    .join('/') + '/';
}

export function splitRelativePath(path) {
  return normalizeSubfolder(path).split('/').filter(Boolean);
}

export function escapeYaml(value) {
  const text = String(value ?? '');
  if (text === '') return '""';
  if (/[:#\n\[\]{}]|^\s|\s$/.test(text)) {
    return JSON.stringify(text);
  }
  return text;
}

export function formatDisplayTimestamp(isoText) {
  if (!isoText) return '';
  const date = new Date(isoText);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().replace('T', ' ').replace('.000Z', 'Z');
}

export function ensureMarkdownExtension(name) {
  if (name.toLowerCase().endsWith('.md')) return name;
  return `${name}.md`;
}

export function buildTemplateValues({ platform, title, model, date = new Date() }) {
  return {
    platform: sanitizePathSegment(platform, 'chat'),
    title: sanitizePathSegment(title, 'untitled-chat'),
    model: sanitizePathSegment(model || 'unknown-model', 'unknown-model'),
    date: formatDateForToken(date),
    time: formatTimeForToken(date),
    datetime: formatDatetimeForToken(date),
  };
}

export function generateImageName(index, date = new Date()) {
  const suffix = Math.random().toString(16).slice(2, 8);
  return `${formatDatetimeForToken(date)}-${index + 1}-${suffix}.png`;
}
