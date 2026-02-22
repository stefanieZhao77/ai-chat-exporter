import { BaseAdapter } from './base-adapter.js';
import { collectImages, nodeToMarkdown } from './dom-markdown.js';

function inferModel() {
  const modelTag = document.querySelector('[data-testid="model-switcher-dropdown-button"]');
  if (modelTag) {
    return (modelTag.textContent || '').trim() || 'unknown';
  }
  return 'unknown';
}

export class ChatGPTAdapter extends BaseAdapter {
  constructor() {
    super();
    this.platform = 'chatgpt';
  }

  isSupported() {
    return location.hostname === 'chatgpt.com';
  }

  extractChatData() {
    const messageNodes = Array.from(document.querySelectorAll('[data-message-author-role]'));

    const messages = messageNodes
      .map((node) => {
        const role = node.getAttribute('data-message-author-role') || 'unknown';
        const contentNode =
          node.querySelector('.markdown') ||
          node.querySelector('[data-message-content]') ||
          node;
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

    const title =
      document.title.replace(/\s*[-|].*$/, '').trim() ||
      document.querySelector('h1')?.textContent?.trim() ||
      'Untitled Chat';

    return {
      platform: this.platform,
      url: location.href,
      title,
      messages,
      metadata: {
        exportedAt: new Date().toISOString(),
        model: inferModel(),
        totalMessages: messages.length,
      },
    };
  }
}
