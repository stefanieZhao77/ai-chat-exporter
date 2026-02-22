function getImageUrl(img) {
  if (!img) return '';
  const raw = img.currentSrc || img.getAttribute('src') || img.getAttribute('data-src') || '';
  let url = String(raw || '').trim();

  if (!url) return '';
  if (url.startsWith('//')) url = `https:${url}`;

  if (url.startsWith('blob:')) {
    const anchorHref = img.closest('a')?.getAttribute('href') || '';
    if (anchorHref.startsWith('http')) {
      return anchorHref;
    }
  }

  if (url.startsWith('data:') || url.startsWith('blob:')) return '';
  return url;
}

function extractCodeLanguage(codeEl) {
  if (!codeEl) return '';

  const candidates = [];
  const pre = codeEl.closest('pre');
  const parent = codeEl.parentElement;
  const container = pre?.parentElement || parent;

  const pushClassMatches = (node) => {
    if (!node) return;
    const classText = String(node.className || '');
    const classMatches = classText.matchAll(/(?:language|lang)-([a-zA-Z0-9_+#-]+)/gi);
    for (const match of classMatches) {
      if (match[1]) candidates.push(match[1]);
    }
  };

  const pushDataLanguage = (node) => {
    if (!node) return;
    const value =
      node.getAttribute?.('data-language') ||
      node.getAttribute?.('data-lang') ||
      node.dataset?.language ||
      '';
    if (value) candidates.push(value);
  };

  pushClassMatches(codeEl);
  pushClassMatches(pre);
  pushClassMatches(parent);
  pushClassMatches(container);
  pushDataLanguage(codeEl);
  pushDataLanguage(pre);
  pushDataLanguage(parent);
  pushDataLanguage(container);

  const headerLang =
    container?.querySelector?.('[data-language]')?.getAttribute('data-language') ||
    container?.querySelector?.('[data-testid*="code"] [class*="language-"]')?.className ||
    '';
  if (headerLang) candidates.push(headerLang);

  const aliases = {
    js: 'javascript',
    ts: 'typescript',
    py: 'python',
    sh: 'bash',
    shell: 'bash',
    yml: 'yaml',
    md: 'markdown',
  };

  for (const candidate of candidates) {
    const raw = String(candidate).toLowerCase().trim();
    const cleaned = raw
      .replace(/^language-/, '')
      .replace(/^lang-/, '')
      .replace(/[^a-z0-9_+#-]/g, '');
    if (!cleaned) continue;
    return aliases[cleaned] || cleaned;
  }

  return '';
}

function toMarkdown(node, inPre = false) {
  if (!node) return '';

  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || '';
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return '';

  const el = node;
  const tag = el.tagName.toLowerCase();

  if (tag === 'pre') {
    const codeEl = el.querySelector('code');
    const codeText = (codeEl?.textContent || el.innerText || '').replace(/\n$/, '');
    const lang = extractCodeLanguage(codeEl);
    return `\n\n\`\`\`${lang}\n${codeText}\n\`\`\`\n\n`;
  }

  if (tag === 'code') {
    if (inPre) return el.textContent || '';
    return `\`${(el.textContent || '').trim()}\``;
  }

  if (tag === 'img') {
    const src = getImageUrl(el);
    if (!src) return '';
    const alt = el.getAttribute('alt') || 'image';
    return `![${alt}](${src})`;
  }

  if (tag === 'a') {
    const href = el.getAttribute('href') || '';
    const text = (el.textContent || '').trim();
    if (!href) return text;
    if (el.querySelector('img')) {
      return Array.from(el.childNodes)
        .map((child) => toMarkdown(child, inPre))
        .join('');
    }
    return `[${text || href}](${href})`;
  }

  if (tag === 'br') return '\n';

  const blockTags = new Set([
    'p',
    'div',
    'section',
    'article',
    'blockquote',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'ul',
    'ol',
  ]);

  if (tag === 'li') {
    const content = Array.from(el.childNodes)
      .map((child) => toMarkdown(child, inPre))
      .join('')
      .trim();
    return `- ${content}\n`;
  }

  let content = '';
  for (const child of el.childNodes) {
    content += toMarkdown(child, inPre || tag === 'pre');
  }

  if (tag === 'strong' || tag === 'b') return `**${content}**`;
  if (tag === 'em' || tag === 'i') return `*${content}*`;

  if (blockTags.has(tag)) {
    return `${content.trim()}\n\n`;
  }

  return content;
}

export function cleanMarkdown(text) {
  return String(text || '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/^\n+/, '')
    .trim();
}

export function nodeToMarkdown(node) {
  return cleanMarkdown(toMarkdown(node));
}

export function collectImages(node) {
  if (!node) return [];
  return Array.from(node.querySelectorAll('img'))
    .map((img) => getImageUrl(img))
    .filter(Boolean);
}
