import { DEFAULT_SETTINGS } from '../shared/constants.js';
import { applyI18n, initI18n, t } from '../shared/i18n.js';
import {
  getRootDirectoryHandle,
  getSettings,
  saveRootDirectoryHandle,
  saveSettings,
} from '../shared/storage.js';

const pickFolderBtn = document.getElementById('pickFolderBtn');
const folderStatus = document.getElementById('folderStatus');
const saveBtn = document.getElementById('saveBtn');
const saveStatus = document.getElementById('saveStatus');

const fields = {
  subfolderTemplate: document.getElementById('subfolderTemplate'),
  filenameTemplate: document.getElementById('filenameTemplate'),
  imageRelativePath: document.getElementById('imageRelativePath'),
  uiLanguage: document.getElementById('uiLanguage'),
  includeFrontmatter: document.getElementById('includeFrontmatter'),
  includeTimestamps: document.getElementById('includeTimestamps'),
  enableFab: document.getElementById('enableFab'),
  autoHideFab: document.getElementById('autoHideFab'),
};

bootstrap().catch((error) => {
  saveStatus.textContent = t('optionsInitFailed', [error.message || String(error)]);
});

async function bootstrap() {
  await initI18n();
  applyI18n();
  await init();
}

async function init() {
  const settings = await getSettings();
  applySettingsToForm(settings);

  const handle = await getRootDirectoryHandle();
  folderStatus.textContent = handle
    ? t('optionsSelectedFolder', [handle.name || t('optionsAuthorizedDirectory')])
    : t('optionsNoFolder');
}

pickFolderBtn.addEventListener('click', async () => {
  try {
    const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
    await saveRootDirectoryHandle(handle);
    folderStatus.textContent = t('optionsSelectedFolder', [handle.name]);
    saveStatus.textContent = t('optionsFolderAuthorized');
  } catch (error) {
    if (error?.name === 'AbortError') return;
    saveStatus.textContent = t('optionsFolderSelectionFailed', [error.message || String(error)]);
  }
});

saveBtn.addEventListener('click', async () => {
  const previousLanguage = (await getSettings()).uiLanguage || DEFAULT_SETTINGS.uiLanguage;
  const payload = {
    subfolderTemplate: fields.subfolderTemplate.value || DEFAULT_SETTINGS.subfolderTemplate,
    filenameTemplate: fields.filenameTemplate.value || DEFAULT_SETTINGS.filenameTemplate,
    imageRelativePath: fields.imageRelativePath.value || DEFAULT_SETTINGS.imageRelativePath,
    uiLanguage: fields.uiLanguage.value || DEFAULT_SETTINGS.uiLanguage,
    includeFrontmatter: fields.includeFrontmatter.checked,
    includeTimestamps: fields.includeTimestamps.checked,
    enableFab: fields.enableFab.checked,
    autoHideFab: fields.autoHideFab.checked,
  };

  await saveSettings(payload);
  saveStatus.textContent = t('optionsSettingsSaved');
  if (payload.uiLanguage !== previousLanguage) {
    window.setTimeout(() => window.location.reload(), 120);
  }
});

function applySettingsToForm(settings) {
  fields.subfolderTemplate.value = settings.subfolderTemplate;
  fields.filenameTemplate.value = settings.filenameTemplate;
  fields.imageRelativePath.value = settings.imageRelativePath;
  fields.uiLanguage.value = settings.uiLanguage || DEFAULT_SETTINGS.uiLanguage;
  fields.includeFrontmatter.checked = settings.includeFrontmatter;
  fields.includeTimestamps.checked = settings.includeTimestamps;
  fields.enableFab.checked = settings.enableFab;
  fields.autoHideFab.checked = settings.autoHideFab;
}
