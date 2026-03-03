import { BaseAdapter } from './base-adapter.js';
import { collectImages, nodeToMarkdown } from './dom-markdown.js';

function inferModel() {
  const modelTag = document.querySelector('[data-testid="model-switcher-dropdown-button"]');
  if (modelTag) {
    return (modelTag.textContent || '').trim() || 'unknown';
  }
  return 'unknown';
}

function findContentNode(node) {
  return (
    node.querySelector('.markdown') ||
    node.querySelector('[data-message-content]') ||
    node
  );
}

export class ChatGPTAdapter extends BaseAdapter {
  constructor() {
    super();
    this.platform = 'chatgpt';
  }

  isSupported() {
    return location.hostname === 'chatgpt.com';
  }

  extractMessageEntries() {
    const messageNodes = Array.from(document.querySelectorAll('[data-message-author-role]'));

    return messageNodes
      .map((node) => {
        const role = node.getAttribute('data-message-author-role') || 'unknown';
        const contentNode = findContentNode(node);
        const markdownContent = nodeToMarkdown(contentNode);
        const images = collectImages(contentNode);

        if (!markdownContent && images.length === 0) return null;

        return {
          sourceNode: node,
          role,
          markdownContent,
          timestamp: new Date().toISOString(),
          images,
        };
      })
      .filter(Boolean);
  }

  extractChatData() {
    const entries = this.extractMessageEntries();
    const messages = entries.map(({ role, markdownContent, timestamp, images }) => ({
      role,
      markdownContent,
      timestamp,
      images,
    }));

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
