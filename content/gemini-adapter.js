import { BaseAdapter } from './base-adapter.js';
import { collectImages, nodeToMarkdown } from './dom-markdown.js';

function inferGeminiModel() {
  const selectors = [
    '[data-test-id="model-selector-button"]',
    'button[aria-label*="model" i]',
    'button[aria-label*="Model" i]',
    '[class*="model-name"]',
  ];

  for (const selector of selectors) {
    const text = document.querySelector(selector)?.textContent?.trim();
    if (text) return text;
  }
  return 'gemini';
}

function inferTitle(messages) {
  const firstUser = messages.find((msg) => msg.role === 'user')?.markdownContent || '';
  if (!firstUser) return document.title.replace(/\s*[-|].*$/, '').trim() || 'Untitled Chat';
  return firstUser.replace(/\s+/g, ' ').trim().slice(0, 80) || 'Untitled Chat';
}

function findContentNode(node, role) {
  if (!node) return null;

  const userCandidates = [
    '[data-test-id="user-query-text"]',
    '.query-text',
    '[class*="query-text"]',
    '.user-query-text',
  ];

  const assistantCandidates = [
    '[data-test-id="model-response-text"]',
    '.model-response-text',
    '[class*="response-content"]',
    '.response-content',
    '.markdown',
  ];

  const candidates = role === 'user' ? userCandidates : assistantCandidates;

  for (const selector of candidates) {
    const content = node.querySelector(selector);
    if (content) return content;
  }

  return node;
}

export class GeminiAdapter extends BaseAdapter {
  constructor() {
    super();
    this.platform = 'gemini';
  }

  isSupported() {
    return location.hostname === 'gemini.google.com';
  }

  extractChatData() {
    const turnNodes = Array.from(document.querySelectorAll('user-query, model-response'));

    const messages = turnNodes
      .map((node) => {
        const role = node.matches('user-query') ? 'user' : 'assistant';
        const contentNode = findContentNode(node, role);
        const markdownContent = nodeToMarkdown(contentNode);
        const images = collectImages(contentNode);

        if (!markdownContent && images.length === 0) return null;

        return {
          role,
          markdownContent,
          timestamp: new Date().toISOString(),
          images,
        };
      })
      .filter(Boolean);

    return {
      platform: this.platform,
      url: location.href,
      title: inferTitle(messages),
      messages,
      metadata: {
        exportedAt: new Date().toISOString(),
        model: inferGeminiModel(),
        totalMessages: messages.length,
      },
    };
  }
}
