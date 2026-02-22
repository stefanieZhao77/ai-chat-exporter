import { escapeYaml, formatDisplayTimestamp } from './utils.js';

function renderFrontmatter(chatData) {
  const fields = {
    title: chatData.title,
    platform: chatData.platform,
    url: chatData.url,
    exportedAt: chatData.metadata?.exportedAt,
    model: chatData.metadata?.model || 'unknown',
    totalMessages: chatData.messages?.length || 0,
  };

  const lines = ['---'];
  for (const [key, value] of Object.entries(fields)) {
    lines.push(`${key}: ${escapeYaml(value)}`);
  }
  lines.push('tags: [ai-chat]');
  lines.push('---', '');
  return lines.join('\n');
}

function renderMessage(message, includeTimestamps) {
  const pieces = [];
  const role = String(message.role || 'unknown').toLowerCase();
  const ts = includeTimestamps ? formatDisplayTimestamp(message.timestamp) : '';
  const heading = ts
    ? `**Time**: ${ts} | **Role**: ${role}`
    : `**Role**: ${role}`;

  pieces.push(heading, '', message.markdownContent || '', '', '---', '');
  return pieces.join('\n');
}

export function generateMarkdown(chatData, settings) {
  const lines = [];
  if (settings.includeFrontmatter) {
    lines.push(renderFrontmatter(chatData));
  }

  lines.push(`# ${chatData.title || 'Untitled Chat'}`, '');

  for (const message of chatData.messages || []) {
    lines.push(renderMessage(message, settings.includeTimestamps));
  }

  return lines.join('\n').trim() + '\n';
}
