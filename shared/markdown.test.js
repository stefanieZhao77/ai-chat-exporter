import { describe, expect, it } from 'vitest';
import { generateMarkdown } from './markdown.js';

describe('generateMarkdown', () => {
  const chatData = {
    platform: 'chatgpt',
    title: 'Test Chat',
    url: 'https://chatgpt.com/c/test',
    messages: [
      {
        role: 'user',
        timestamp: '2026-02-19T10:25:00Z',
        markdownContent: 'Hello',
      },
      {
        role: 'assistant',
        timestamp: '2026-02-19T10:25:10Z',
        markdownContent: 'World',
      },
    ],
    metadata: {
      exportedAt: '2026-02-19T10:30:00Z',
      model: 'GPT-4',
    },
  };

  it('renders frontmatter when enabled', () => {
    const markdown = generateMarkdown(chatData, {
      includeFrontmatter: true,
      includeTimestamps: true,
    });

    expect(markdown).toContain('---');
    expect(markdown).toContain('title: Test Chat');
    expect(markdown).toContain('# Test Chat');
    expect(markdown).toContain('**Role**: user');
  });

  it('omits frontmatter and timestamps when disabled', () => {
    const markdown = generateMarkdown(chatData, {
      includeFrontmatter: false,
      includeTimestamps: false,
    });

    expect(markdown.startsWith('---')).toBe(false);
    expect(markdown).not.toContain('**Time**:');
    expect(markdown).toContain('**Role**: assistant');
  });
});
