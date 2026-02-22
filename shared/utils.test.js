import { describe, expect, it } from 'vitest';
import {
  buildTemplateValues,
  ensureMarkdownExtension,
  normalizeSubfolder,
  renderTemplate,
  sanitizePathSegment,
} from './utils.js';

describe('utils', () => {
  it('sanitizes file names', () => {
    expect(sanitizePathSegment('a:b/c*?d')).toBe('a-b-c--d');
    expect(sanitizePathSegment('   ', 'fallback')).toBe('fallback');
  });

  it('renders template with known tokens', () => {
    const output = renderTemplate('x-{platform}-{unknown}-y', { platform: 'chatgpt' });
    expect(output).toBe('x-chatgpt--y');
  });

  it('normalizes subfolder', () => {
    expect(normalizeSubfolder(' AI Chats\\chatgpt ')).toBe('AI Chats/chatgpt/');
    expect(normalizeSubfolder('')).toBe('');
  });

  it('ensures markdown extension', () => {
    expect(ensureMarkdownExtension('a')).toBe('a.md');
    expect(ensureMarkdownExtension('a.MD')).toBe('a.MD');
  });

  it('builds template values', () => {
    const values = buildTemplateValues({
      platform: 'chatgpt',
      title: 'Hello / World',
      model: 'GPT-4o',
      date: new Date('2026-02-19T12:34:56Z'),
    });

    expect(values.platform).toBe('chatgpt');
    expect(values.title).toBe('Hello - World');
    expect(values.model).toBe('GPT-4o');
    expect(values.date).toBe('2026-02-19');
  });
});
