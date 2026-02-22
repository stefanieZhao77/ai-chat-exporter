import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GeminiAdapter } from './gemini-adapter.js';

describe('GeminiAdapter', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.stubGlobal('location', {
      hostname: 'gemini.google.com',
      href: 'https://gemini.google.com/app/test-chat',
    });
    document.title = 'Gemini - Test Chat';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('detects gemini pages', () => {
    const adapter = new GeminiAdapter();
    expect(adapter.isSupported()).toBe(true);
  });

  it('extracts ordered messages with markdown and images', () => {
    document.body.innerHTML = `
      <button data-test-id="model-selector-button">Gemini 2.0 Flash</button>
      <user-query>
        <div data-test-id="user-query-text">How to write hello world?</div>
      </user-query>
      <model-response>
        <div data-test-id="model-response-text">
          <p>Use this:</p>
          <pre><code class="language-js">console.log("hello world")</code></pre>
          <img src="https://example.com/demo.png" alt="demo">
        </div>
      </model-response>
    `;

    const adapter = new GeminiAdapter();
    const chatData = adapter.extractChatData();

    expect(chatData.platform).toBe('gemini');
    expect(chatData.title).toContain('How to write hello world?');
    expect(chatData.metadata.model).toBe('Gemini 2.0 Flash');
    expect(chatData.messages).toHaveLength(2);
    expect(chatData.messages[0].role).toBe('user');
    expect(chatData.messages[0].markdownContent).toContain('How to write hello world?');
    expect(chatData.messages[1].role).toBe('assistant');
    expect(chatData.messages[1].markdownContent).toContain('```javascript');
    expect(chatData.messages[1].images).toEqual(['https://example.com/demo.png']);
  });
});
