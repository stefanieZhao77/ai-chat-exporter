import { EXPORT_MESSAGE_TYPES, SUPPORTED_CHAT_URL_PREFIXES } from './shared/constants.js';
import { initI18n, t } from './shared/i18n.js';
import { generateMarkdown } from './shared/markdown.js';
import { getRootDirectoryHandle, getSettings } from './shared/storage.js';
import {
  buildTemplateValues,
  ensureMarkdownExtension,
  generateImageName,
  normalizeSubfolder,
  renderTemplate,
  sanitizePathSegment,
  splitRelativePath,
} from './shared/utils.js';

chrome.runtime.onInstalled.addListener((details) => {
  initI18n().catch(() => {});
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'ace-export-chat',
      title: t('contextMenuExport'),
      contexts: ['page'],
      documentUrlPatterns: ['https://chatgpt.com/*', 'https://gemini.google.com/*'],
    });
  });

  if (details.reason === 'install') {
    chrome.runtime.openOptionsPage();
  }
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === 'ace-export-chat') {
    triggerActiveTabExport('context-menu');
  }
});

chrome.commands.onCommand.addListener((command) => {
  if (command === 'export-chat') {
    triggerActiveTabExport('keyboard');
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === EXPORT_MESSAGE_TYPES.exportChat) {
    handleExport(message.payload)
      .then((result) => sendResponse(result))
      .catch((error) => {
        sendResponse({ ok: false, error: error.message || String(error) });
      });
    return true;
  }

  if (message?.type === EXPORT_MESSAGE_TYPES.getSettings) {
    getSettings()
      .then((settings) => sendResponse({ ok: true, settings }))
      .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));
    return true;
  }

  return false;
});

async function triggerActiveTabExport(trigger) {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab?.id || !isSupportedChatUrl(tab.url)) return;

  try {
    await chrome.tabs.sendMessage(tab.id, {
      type: EXPORT_MESSAGE_TYPES.triggerExport,
      trigger,
    });
  } catch (error) {
    console.warn('[ai-chat-exporter] failed to trigger export', error);
  }
}

function isSupportedChatUrl(url) {
  return SUPPORTED_CHAT_URL_PREFIXES.some((prefix) => String(url || '').startsWith(prefix));
}

async function handleExport(payload) {
  const chatData = payload?.chatData;
  if (!chatData?.messages?.length) {
    return { ok: false, error: 'No chat messages found' };
  }

  const settings = await getSettings();
  const rootHandle = await getRootDirectoryHandle();
  if (!rootHandle) {
    return { ok: false, error: t('bgNeedFolder') };
  }

  await ensureDirectoryPermission(rootHandle);

  const now = new Date();
  const values = buildTemplateValues({
    platform: chatData.platform,
    title: chatData.title,
    model: chatData.metadata?.model,
    date: now,
  });

  const renderedSubfolder = renderTemplate(settings.subfolderTemplate, values);
  const subfolder = normalizeSubfolder(renderedSubfolder);
  const targetDir = await ensureSubdirectory(rootHandle, subfolder);

  const baseFile = sanitizePathSegment(renderTemplate(settings.filenameTemplate, values), 'chat-export');
  const markdownName = ensureMarkdownExtension(baseFile);

  let markdown = generateMarkdown(chatData, settings);
  const warnings = [];

  const imageResult = await processImages({
    messages: chatData.messages,
    targetDir,
    imageRelativePath: settings.imageRelativePath,
    markdown,
    now,
  });
  markdown = imageResult.markdown;
  warnings.push(...imageResult.warnings);

  const finalName = await writeUniqueTextFile(targetDir, markdownName, markdown);
  const outputPath = `${subfolder}${finalName}`;

  return {
    ok: true,
    path: outputPath,
    warnings,
  };
}

async function ensureDirectoryPermission(dirHandle) {
  const options = { mode: 'readwrite' };
  let permission = await dirHandle.queryPermission(options);
  if (permission === 'granted') return;
  permission = await dirHandle.requestPermission(options);
  if (permission !== 'granted') {
    throw new Error(t('bgPermissionDenied'));
  }
}

async function ensureSubdirectory(rootHandle, subfolderPath) {
  const parts = splitRelativePath(subfolderPath);
  let current = rootHandle;
  for (const part of parts) {
    current = await current.getDirectoryHandle(part, { create: true });
  }
  return current;
}

async function findAvailableFileName(dirHandle, fileName) {
  const dotIndex = fileName.lastIndexOf('.');
  const stem = dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;
  const ext = dotIndex > 0 ? fileName.slice(dotIndex) : '';

  let counter = 0;
  while (counter < 1000) {
    const candidate = counter === 0 ? fileName : `${stem}-${counter}${ext}`;
    try {
      await dirHandle.getFileHandle(candidate, { create: false });
      counter += 1;
    } catch {
      return candidate;
    }
  }

  throw new Error('Too many conflicting filenames');
}

async function writeUniqueTextFile(dirHandle, fileName, content) {
  const availableName = await findAvailableFileName(dirHandle, fileName);
  const fileHandle = await dirHandle.getFileHandle(availableName, { create: true });
  const writer = await fileHandle.createWritable();
  await writer.write(content);
  await writer.close();
  return availableName;
}

async function writeBlobFile(dirHandle, fileName, blob) {
  const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
  const writer = await fileHandle.createWritable();
  await writer.write(blob);
  await writer.close();
}

function inferImageExtension(url, blob) {
  const contentType = blob?.type || '';
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg';
  if (contentType.includes('webp')) return 'webp';

  const match = String(url).match(/\.([a-zA-Z0-9]{2,5})(\?|$)/);
  if (match) return match[1].toLowerCase();

  return 'png';
}

async function processImages({ messages, targetDir, imageRelativePath, markdown, now }) {
  const warnings = [];
  const allUrls = Array.from(new Set(messages.flatMap((m) => m.images || []).filter(Boolean)));

  if (!allUrls.length) {
    return { markdown, warnings };
  }

  const imageDirParts = splitRelativePath(imageRelativePath || 'assets/');
  let imageDir = targetDir;
  for (const part of imageDirParts) {
    imageDir = await imageDir.getDirectoryHandle(part, { create: true });
  }

  for (let i = 0; i < allUrls.length; i += 1) {
    const url = allUrls[i];
    try {
      const response = await fetch(url, { mode: 'cors' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const ext = inferImageExtension(url, blob);
      const baseName = generateImageName(i, now).replace(/\.png$/, `.${ext}`);
      const fileName = await findAvailableFileName(imageDir, baseName);
      await writeBlobFile(imageDir, fileName, blob);

      const relativeDir = normalizeSubfolder(imageRelativePath || 'assets/');
      const replacement = `${relativeDir}${fileName}`;
      markdown = replaceAllImageUrlVariants(markdown, url, replacement);
    } catch (error) {
      const text = String(error?.message || error || '');
      if (/cors|access-control|failed to fetch/i.test(text)) {
        warnings.push(`${t('bgImageCorsWarning')}: ${url}`);
      } else {
        warnings.push(`Image download failed: ${url} (${text})`);
      }
    }
  }

  return { markdown, warnings };
}

function replaceAllImageUrlVariants(markdown, url, replacement) {
  const variants = new Set([url]);
  try {
    variants.add(decodeURIComponent(url));
  } catch {}
  try {
    variants.add(encodeURI(url));
  } catch {}
  variants.add(String(url).replaceAll('&', '&amp;'));

  let output = markdown;
  for (const variant of variants) {
    if (!variant) continue;
    output = output.split(variant).join(replacement);
  }
  return output;
}
