function isUserRole(role) {
  return String(role || '').toLowerCase() === 'user';
}

function toMessageEntries(messages) {
  return (Array.isArray(messages) ? messages : []).map((message, sourceIndex) => ({
    message,
    sourceIndex,
  }));
}

function buildSnippet(message, snippetLength) {
  const maxLength = Math.max(12, Number(snippetLength) || 72);
  const text = String(message?.markdownContent || '').replace(/\s+/g, ' ').trim();
  if (text) {
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength - 3)}...`;
  }

  if (Array.isArray(message?.images) && message.images.length > 0) {
    return '[image]';
  }

  return '[empty]';
}

function normalizeSelectedSourceIndexes(input) {
  if (input == null) return null;

  const values = Array.isArray(input) ? input : [input];
  const valid = values
    .map((value) => Number.parseInt(String(value), 10))
    .filter((value) => Number.isInteger(value) && value >= 0);

  if (!valid.length) return null;
  return new Set(valid);
}

function filterEntries(entries, includeUserMessages, selectedSourceIndexes) {
  const filteredByRole = includeUserMessages
    ? entries
    : entries.filter(({ message }) => !isUserRole(message?.role));

  const selectedSet = normalizeSelectedSourceIndexes(selectedSourceIndexes);
  if (!selectedSet) return filteredByRole;
  return filteredByRole.filter((entry) => selectedSet.has(entry.sourceIndex));
}

export function buildSelectableMessageItems(chatData, options = {}) {
  const includeUserMessages = options.includeUserMessages !== false;
  const snippetLength = options.snippetLength || 72;
  const entries = toMessageEntries(chatData?.messages);
  const selected = filterEntries(entries, includeUserMessages, null);

  return selected.map(({ message, sourceIndex }) => ({
    sourceIndex,
    role: String(message?.role || 'unknown').toLowerCase(),
    snippet: buildSnippet(message, snippetLength),
  }));
}

export function buildChatDataForExport(chatData, options = {}) {
  const includeUserMessages = options.includeUserMessages !== false;
  const selectedSourceIndexes =
    options.selectedSourceIndexes != null ? options.selectedSourceIndexes : options.selectedSourceIndex;
  const entries = toMessageEntries(chatData?.messages);
  const selectedEntries = filterEntries(entries, includeUserMessages, selectedSourceIndexes);
  const messages = selectedEntries.map((entry) => entry.message);

  return {
    ...chatData,
    messages,
    metadata: {
      ...(chatData?.metadata || {}),
      totalMessages: messages.length,
    },
  };
}
