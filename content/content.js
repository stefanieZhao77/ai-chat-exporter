import { ChatGPTAdapter } from './chatgpt-adapter.js';
import { GeminiAdapter } from './gemini-adapter.js';
import { EXPORT_MESSAGE_TYPES, STORAGE_KEYS } from '../shared/constants.js';
import { initI18n, t } from '../shared/i18n.js';
import { getFabPosition, getSettings, saveFabPosition } from '../shared/storage.js';
import './content.css';

const adapter = [new ChatGPTAdapter(), new GeminiAdapter()].find((item) => item.isSupported());

if (!adapter) {
  console.info('[ai-chat-exporter] unsupported page');
} else {
  bootstrap().catch((error) => {
    console.error('[ai-chat-exporter] bootstrap failed', error);
  });
}

async function bootstrap() {
  await initI18n();
  const settings = await getSettings();
  await maybeShowIntro();

  if (settings.enableFab) {
    initFab(settings);
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === EXPORT_MESSAGE_TYPES.triggerExport) {
      runExport(message.trigger || 'external')
        .then((result) => sendResponse(result))
        .catch((error) => {
          sendResponse({ ok: false, error: error.message || String(error) });
        });
      return true;
    }
    return false;
  });
}

async function maybeShowIntro() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.introShown);
    if (result[STORAGE_KEYS.introShown]) return;

    showToast(t('contentIntro'));
    await chrome.storage.local.set({ [STORAGE_KEYS.introShown]: true });
  } catch (error) {
    if (!String(error?.message || error || '').includes('Extension context invalidated')) {
      throw error;
    }
  }
}

async function runExport(trigger) {
  const chatData = adapter.extractChatData();
  if (!chatData.messages.length) {
    showToast(t('contentNoMessages'));
    return { ok: false, error: 'No messages found' };
  }

  showToast(t('contentExporting'));

  const response = await chrome.runtime.sendMessage({
    type: EXPORT_MESSAGE_TYPES.exportChat,
    payload: {
      chatData,
      trigger,
    },
  });

  if (response?.ok) {
    const text = response.warnings?.length
      ? t('contentExportOkWithWarnings', [response.path])
      : t('contentExportOk', [response.path]);
    showToast(text);
  } else {
    showToast(t('contentExportFailed', [response?.error || 'Unknown error']));
  }

  return response;
}

async function initFab(settings) {
  if (document.getElementById('ace-fab')) return;

  const pos = await getFabPosition();
  const fab = document.createElement('button');
  fab.id = 'ace-fab';
  fab.type = 'button';
  fab.title = t('fabTitle');
  fab.textContent = '↓';
  fab.style.left = `${Math.max(12, pos.x)}px`;
  fab.style.top = `${Math.max(12, pos.y)}px`;
  document.body.appendChild(fab);

  const state = {
    pressed: false,
    dragging: false,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
  };

  const dragThreshold = 8;

  function setDockClass() {
    fab.classList.remove('dock-left', 'dock-right');
    if (!settings.autoHideFab) return;

    const x = fab.offsetLeft;
    if (x <= 18) {
      fab.classList.add('dock-left');
      return;
    }

    if (x >= window.innerWidth - 66) {
      fab.classList.add('dock-right');
    }
  }

  fab.addEventListener('pointerdown', (event) => {
    state.pressed = true;
    state.dragging = false;
    state.startX = event.clientX;
    state.startY = event.clientY;
    state.offsetX = event.clientX - fab.offsetLeft;
    state.offsetY = event.clientY - fab.offsetTop;
    fab.setPointerCapture(event.pointerId);
  });

  fab.addEventListener('pointermove', (event) => {
    if (!state.pressed) return;

    const dx = Math.abs(event.clientX - state.startX);
    const dy = Math.abs(event.clientY - state.startY);
    if (!state.dragging && dx + dy > dragThreshold) {
      state.dragging = true;
      fab.classList.add('dragging');
    }

    if (!state.dragging) return;

    const x = Math.max(12, Math.min(window.innerWidth - 60, event.clientX - state.offsetX));
    const y = Math.max(12, Math.min(window.innerHeight - 60, event.clientY - state.offsetY));
    fab.style.left = `${x}px`;
    fab.style.top = `${y}px`;
    setDockClass();
  });

  fab.addEventListener('pointerup', async (event) => {
    if (!state.pressed) return;
    state.pressed = false;
    fab.releasePointerCapture(event.pointerId);

    const x = Number.parseInt(fab.style.left, 10);
    const y = Number.parseInt(fab.style.top, 10);
    await saveFabPosition({ x, y });

    if (state.dragging) {
      state.dragging = false;
      fab.classList.remove('dragging');
      return;
    }

    runExport('fab').catch((error) => {
      showToast(t('contentExportFailed', [error.message || String(error)]));
    });
  });

  window.addEventListener('resize', setDockClass);
  setDockClass();
}

let toastTimer;
function showToast(message) {
  let toast = document.getElementById('ace-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'ace-toast';
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.style.display = 'block';

  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.style.display = 'none';
  }, 3000);
}
