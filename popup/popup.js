import { EXPORT_MESSAGE_TYPES, SUPPORTED_CHAT_URL_PREFIXES } from '../shared/constants.js';
import { applyI18n, initI18n, t } from '../shared/i18n.js';

const exportBtn = document.getElementById('exportBtn');
const status = document.getElementById('status');

init().catch(() => {});

async function init() {
  await initI18n();
  applyI18n();
}

exportBtn.addEventListener('click', async () => {
  renderStatus(t('popupStatusExporting'), 'loading');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !isSupportedChatUrl(tab.url)) {
      throw new Error(t('popupErrorOpenChat'));
    }

    const result = await chrome.tabs.sendMessage(tab.id, {
      type: EXPORT_MESSAGE_TYPES.triggerExport,
      trigger: 'popup',
    });

    if (!result?.ok) {
      throw new Error(result?.error || t('popupErrorUnknown'));
    }

    renderStatus(t('popupStatusExported', [result.path]), 'success');
  } catch (error) {
    renderStatus(t('popupStatusFailed', [error.message || String(error)]), 'error');
  }
});

function renderStatus(message, kind = 'loading') {
  status.textContent = message;
  status.classList.remove('is-empty', 'loading', 'success', 'error');
  status.classList.add(kind);
}

function isSupportedChatUrl(url) {
  return SUPPORTED_CHAT_URL_PREFIXES.some((prefix) => String(url || '').startsWith(prefix));
}
