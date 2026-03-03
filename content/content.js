import { ChatGPTAdapter } from './chatgpt-adapter.js';
import { GeminiAdapter } from './gemini-adapter.js';
import { EXPORT_MESSAGE_TYPES, STORAGE_KEYS } from '../shared/constants.js';
import { buildChatDataForExport, buildSelectableMessageItems } from '../shared/chat-selection.js';
import { initI18n, t } from '../shared/i18n.js';
import { getFabPosition, getSettings, saveFabPosition } from '../shared/storage.js';
import './content.css';

const adapter = [new ChatGPTAdapter(), new GeminiAdapter()].find((item) => item.isSupported());
let pageSelectorObserver;
let pageSelectorRenderTimer = 0;
let includeUserMessagesForSelection = true;
let pickerModeActive = false;

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
  includeUserMessagesForSelection = settings.includeUserMessages !== false;
  await maybeShowIntro();

  if (settings.enableFab) {
    initFab(settings);
  }

  initInPageSelectors();

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === EXPORT_MESSAGE_TYPES.triggerExport) {
      runExport(message.trigger || 'external', message.selection || null)
        .then((result) => sendResponse(result))
        .catch((error) => {
          sendResponse({ ok: false, error: error.message || String(error) });
        });
      return true;
    }

    if (message?.type === EXPORT_MESSAGE_TYPES.previewChat) {
      getExportPreview()
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

async function runExport(trigger, selection = null) {
  if (selection?.mode === 'page-picker') {
    startPickerMode();
    showToast(t('contentPickerModeStarted'));
    return { ok: true, startedSelection: true };
  }

  const chatData = await prepareChatData(selection);
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

async function getExportPreview() {
  const rawChatData = adapter.extractChatData();
  const settings = await getSettings();
  const includeUserMessages = settings.includeUserMessages !== false;
  const messages = buildSelectableMessageItems(rawChatData, { includeUserMessages });

  if (!messages.length) {
    return { ok: false, error: 'No messages found' };
  }

  return {
    ok: true,
    preview: {
      title: rawChatData.title || '',
      messageCount: messages.length,
      messages,
    },
  };
}

async function prepareChatData(selection) {
  const rawChatData = adapter.extractChatData();
  const settings = await getSettings();
  const includeUserMessages = settings.includeUserMessages !== false;
  const ignoreInPageSelection = selection?.mode === 'all-explicit';
  let selectedSourceIndexes = resolveSelectedSourceIndexes(selection);

  if (!ignoreInPageSelection && !selectedSourceIndexes?.length) {
    const inPageSelected = getSelectedSourceIndexesFromPage();
    if (inPageSelected.length) {
      selectedSourceIndexes = inPageSelected;
    }
  }

  return buildChatDataForExport(rawChatData, {
    includeUserMessages,
    selectedSourceIndexes,
  });
}

function resolveSelectedSourceIndexes(selection) {
  const mode = selection?.mode;
  if (mode === 'single') {
    const index = selection?.messageIndex;
    if (!Number.isInteger(index) || index < 0) return null;
    return [index];
  }

  if (mode === 'multi') {
    const values = Array.isArray(selection?.messageIndexes) ? selection.messageIndexes : [];
    const indexes = values.filter((value) => Number.isInteger(value) && value >= 0);
    return indexes.length ? indexes : null;
  }

  return null;
}

function initInPageSelectors() {
  if (pageSelectorObserver) {
    pageSelectorObserver.disconnect();
  }

  pageSelectorObserver = new MutationObserver(() => {
    if (!pickerModeActive) return;
    scheduleInPageSelectorsRender();
  });
  pageSelectorObserver.observe(document.body, { childList: true, subtree: true });
}

function scheduleInPageSelectorsRender() {
  if (pageSelectorRenderTimer) return;
  pageSelectorRenderTimer = window.setTimeout(() => {
    pageSelectorRenderTimer = 0;
    renderInPageSelectors();
  }, 120);
}

function renderInPageSelectors() {
  if (!pickerModeActive) {
    clearInPageSelectors();
    return;
  }
  if (typeof adapter.extractMessageEntries !== 'function') return;

  const selectedIndexes = new Set(getSelectedSourceIndexesFromPage());
  const entries = adapter.extractMessageEntries();
  const validHosts = new Set();

  entries.forEach((entry, sourceIndex) => {
    const host = entry?.sourceNode;
    if (!(host instanceof HTMLElement)) return;
    if (!includeUserMessagesForSelection && String(entry?.role || '').toLowerCase() === 'user') return;

    validHosts.add(host);
    host.classList.add('ace-message-select-host');

    let badge = host.querySelector(':scope > .ace-message-select-badge');
    if (!badge) {
      badge = document.createElement('label');
      badge.className = 'ace-message-select-badge';
      badge.title = t('contentSelectForExport');

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'ace-chat-select';
      checkbox.setAttribute('aria-label', t('contentSelectForExport'));
      badge.appendChild(checkbox);
      host.appendChild(badge);
    }

    const checkbox = badge.querySelector('.ace-chat-select');
    if (!checkbox) return;
    checkbox.dataset.sourceIndex = String(sourceIndex);
    checkbox.checked = selectedIndexes.has(sourceIndex);
    checkbox.onchange = () => updatePickerPanel();
  });

  document.querySelectorAll('.ace-message-select-host').forEach((host) => {
    if (!(host instanceof HTMLElement)) return;
    if (validHosts.has(host)) return;
    host.classList.remove('ace-message-select-host');
    host.querySelector(':scope > .ace-message-select-badge')?.remove();
  });
}

function clearInPageSelectors() {
  document.querySelectorAll('.ace-message-select-host').forEach((host) => {
    if (!(host instanceof HTMLElement)) return;
    host.classList.remove('ace-message-select-host');
    host.querySelector(':scope > .ace-message-select-badge')?.remove();
  });
}

function getSelectedSourceIndexesFromPage() {
  const indexes = Array.from(document.querySelectorAll('.ace-chat-select:checked'))
    .map((item) => Number.parseInt(item.dataset.sourceIndex || '', 10))
    .filter((value) => Number.isInteger(value) && value >= 0);

  return Array.from(new Set(indexes));
}

function startPickerMode() {
  pickerModeActive = true;
  renderInPageSelectors();
  ensurePickerPanel();
  updatePickerPanel();
}

function stopPickerMode() {
  pickerModeActive = false;
  clearInPageSelectors();
  document.getElementById('ace-select-panel')?.remove();
}

function ensurePickerPanel() {
  if (document.getElementById('ace-select-panel')) return;

  const panel = document.createElement('div');
  panel.id = 'ace-select-panel';

  const count = document.createElement('span');
  count.id = 'ace-select-count';
  panel.appendChild(count);

  const exportSelectedBtn = document.createElement('button');
  exportSelectedBtn.type = 'button';
  exportSelectedBtn.id = 'ace-select-export-selected';
  exportSelectedBtn.textContent = t('contentPickerExportSelected');
  exportSelectedBtn.addEventListener('click', async () => {
    try {
      const indexes = getSelectedSourceIndexesFromPage();
      if (!indexes.length) {
        showToast(t('contentPickerNeedSelection'));
        return;
      }

      const result = await runExport('page-picker', {
        mode: 'multi',
        messageIndexes: indexes,
      });
      if (result?.ok) {
        stopPickerMode();
      }
    } catch (error) {
      showToast(t('contentExportFailed', [error.message || String(error)]));
    }
  });
  panel.appendChild(exportSelectedBtn);

  const exportAllBtn = document.createElement('button');
  exportAllBtn.type = 'button';
  exportAllBtn.id = 'ace-select-export-all';
  exportAllBtn.textContent = t('contentPickerExportAll');
  exportAllBtn.addEventListener('click', async () => {
    try {
      const result = await runExport('page-picker', { mode: 'all-explicit' });
      if (result?.ok) {
        stopPickerMode();
      }
    } catch (error) {
      showToast(t('contentExportFailed', [error.message || String(error)]));
    }
  });
  panel.appendChild(exportAllBtn);

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.id = 'ace-select-cancel';
  cancelBtn.textContent = t('contentPickerCancel');
  cancelBtn.addEventListener('click', () => {
    stopPickerMode();
  });
  panel.appendChild(cancelBtn);

  document.body.appendChild(panel);
}

function updatePickerPanel() {
  const countNode = document.getElementById('ace-select-count');
  const exportSelectedBtn = document.getElementById('ace-select-export-selected');
  if (!countNode || !exportSelectedBtn) return;

  const selectedCount = getSelectedSourceIndexesFromPage().length;
  countNode.textContent = t('contentPickerSelectedCount', [selectedCount]);
  exportSelectedBtn.disabled = selectedCount === 0;
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

    runExport('fab', { mode: 'page-picker' }).catch((error) => {
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
