import { describe, expect, it } from 'vitest';
import { buildChatDataForExport, buildSelectableMessageItems } from './chat-selection.js';

describe('chat-selection helpers', () => {
  const chatData = {
    platform: 'chatgpt',
    title: 'Demo',
    messages: [
      { role: 'user', markdownContent: 'First question' },
      { role: 'assistant', markdownContent: 'First answer' },
      { role: 'user', markdownContent: 'Second question' },
      { role: 'assistant', markdownContent: 'Second answer' },
    ],
    metadata: {
      totalMessages: 4,
    },
  };

  it('builds selectable items with source indexes', () => {
    const items = buildSelectableMessageItems(chatData, { includeUserMessages: true });
    expect(items).toHaveLength(4);
    expect(items[0].sourceIndex).toBe(0);
    expect(items[1].sourceIndex).toBe(1);
    expect(items[0].role).toBe('user');
  });

  it('can hide user messages from selectable items', () => {
    const items = buildSelectableMessageItems(chatData, { includeUserMessages: false });
    expect(items).toHaveLength(2);
    expect(items.every((item) => item.role === 'assistant')).toBe(true);
  });

  it('builds export data using selected source index', () => {
    const output = buildChatDataForExport(chatData, {
      includeUserMessages: true,
      selectedSourceIndex: 2,
    });
    expect(output.messages).toHaveLength(1);
    expect(output.messages[0].markdownContent).toBe('Second question');
    expect(output.metadata.totalMessages).toBe(1);
  });

  it('builds export data using multiple selected source indexes', () => {
    const output = buildChatDataForExport(chatData, {
      includeUserMessages: true,
      selectedSourceIndexes: [0, 3],
    });
    expect(output.messages).toHaveLength(2);
    expect(output.messages[0].markdownContent).toBe('First question');
    expect(output.messages[1].markdownContent).toBe('Second answer');
    expect(output.metadata.totalMessages).toBe(2);
  });

  it('respects includeUserMessages for full export', () => {
    const output = buildChatDataForExport(chatData, {
      includeUserMessages: false,
    });
    expect(output.messages).toHaveLength(2);
    expect(output.messages.every((message) => message.role === 'assistant')).toBe(true);
    expect(output.metadata.totalMessages).toBe(2);
  });
});
